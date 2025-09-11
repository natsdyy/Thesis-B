const { db } = require("../config/database");
const SupplyRequest = require("./SupplyRequest");

class GoodsReceiptNote {
  // Generate unique GRN number
  static generateGRNNumber() {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, "0");
    const day = String(new Date().getDate()).padStart(2, "0");
    const timestamp = Date.now().toString().slice(-4);
    return `GRN${year}${month}${day}-${timestamp}`;
  }

  // Get all GRNs with optional filters and stats (optimized)
  static async getAll(filters = {}) {
    try {
      // Main query with basic GRN data and related info
      let query = db("goods_receipt_notes as grn")
        .leftJoin("purchase_orders as po", "grn.purchase_order_id", "po.id")
        .leftJoin("suppliers as s", "grn.supplier_id", "s.id")
        .leftJoin("employees as u", "grn.received_by", "u.id")
        .select(
          "grn.*",
          "po.po_number",
          "s.name as supplier_name",
          db.raw(
            "COALESCE(u.first_name,'') || ' ' || COALESCE(u.last_name,'') as received_by_name"
          )
        )
        .whereNull("grn.deleted_at");

      if (filters.status) {
        query = query.where("grn.status", filters.status);
      }
      if (filters.supplier_id) {
        query = query.where("grn.supplier_id", filters.supplier_id);
      }

      const grns = await query.orderBy("grn.created_at", "desc");

      if (grns.length === 0) {
        // Calculate stats if requested even with no GRNs
        if (filters.include_stats) {
          const stats = await this.getStats();
          return { grns, stats };
        }
        return grns;
      }

      const grnIds = grns.map((grn) => grn.id);

      // Batch fetch all items for all GRNs in one query
      const allItems = await db("grn_items as gi")
        .leftJoin(
          "purchase_order_items as poi",
          "gi.purchase_order_item_id",
          "poi.id"
        )
        .leftJoin("inventory_item_types as it", "gi.item_type_id", "it.id")
        .leftJoin("inventory_categories as ic", "it.category_id", "ic.id")
        .leftJoin("employees as u", "gi.inspected_by", "u.id")
        .select(
          "gi.*",
          "poi.item_name as po_item_name",
          "poi.quantity as po_quantity",
          "poi.unit as po_unit",
          "it.name as item_type_name",
          "it.unit_of_measure as item_unit_of_measure",
          "ic.name as category_name",
          "ic.description as category_description",
          db.raw(
            "COALESCE(u.first_name,'') || ' ' || COALESCE(u.last_name,'') as inspector_name"
          )
        )
        .whereIn("gi.grn_id", grnIds)
        .orderBy("gi.grn_id")
        .orderBy("gi.id");

      // Group items by GRN ID
      const itemsByGRN = {};
      allItems.forEach((item) => {
        if (!itemsByGRN[item.grn_id]) {
          itemsByGRN[item.grn_id] = [];
        }
        itemsByGRN[item.grn_id].push(item);
      });

      // Combine all data
      grns.forEach((grn) => {
        grn.items = itemsByGRN[grn.id] || [];
        grn.item_count = grn.items.length;
      });

      // Calculate stats if requested
      if (filters.include_stats) {
        const stats = await this.getStats();
        return { grns, stats };
      }

      return grns;
    } catch (error) {
      console.error("Error fetching GRNs:", error);
      throw new Error("Failed to retrieve GRNs");
    }
  }

  // Get GRN by ID with items
  static async getById(id) {
    try {
      const grn = await db("goods_receipt_notes as grn")
        .leftJoin("purchase_orders as po", "grn.purchase_order_id", "po.id")
        .leftJoin("suppliers as s", "grn.supplier_id", "s.id")
        .leftJoin("employees as u", "grn.received_by", "u.id")
        .select(
          "grn.*",
          "po.po_number",
          "s.name as supplier_name",
          db.raw(
            "COALESCE(u.first_name,'') || ' ' || COALESCE(u.last_name,'') as received_by_name"
          )
        )
        .where("grn.id", id)
        .first();

      if (grn) {
        grn.items = await this.getItems(id);
        grn.item_count = grn.items.length;
      }

      return grn;
    } catch (error) {
      console.error("Error fetching GRN:", error);
      throw new Error("Failed to retrieve GRN");
    }
  }

  // Get GRN items with enhanced inventory data
  static async getItems(grnId) {
    try {
      return await db("grn_items as gi")
        .leftJoin(
          "purchase_order_items as poi",
          "gi.purchase_order_item_id",
          "poi.id"
        )
        .leftJoin("inventory_item_types as it", "gi.item_type_id", "it.id")
        .leftJoin("inventory_categories as ic", "it.category_id", "ic.id")
        .leftJoin("employees as u", "gi.inspected_by", "u.id")
        .select(
          "gi.*",
          "poi.item_name as po_item_name",
          "poi.quantity as po_quantity",
          "poi.unit as po_unit",
          "it.name as item_type_name",
          "it.unit_of_measure as item_unit_of_measure",
          "ic.name as category_name",
          "ic.description as category_description",
          db.raw(
            "COALESCE(u.first_name,'') || ' ' || COALESCE(u.last_name,'') as inspector_name"
          )
        )
        .where("gi.grn_id", grnId)
        .orderBy("gi.id");
    } catch (error) {
      console.error("Error fetching GRN items:", error);
      throw new Error("Failed to retrieve GRN items");
    }
  }

  // Create GRN from PO with auto-populated inventory data
  static async createFromPO(purchaseOrderId, grnData) {
    const trx = await db.transaction();

    try {
      const po = await trx("purchase_orders")
        .where("id", purchaseOrderId)
        .where("status", "Completed")
        .first();

      if (!po) {
        throw new Error("Purchase order not found or not completed");
      }

      // Check if we can create a new GRN for this PO
      const PurchaseOrder = require("./PurchaseOrder");
      const canCreateCheck =
        await PurchaseOrder.canCreateNewGRN(purchaseOrderId);

      if (!canCreateCheck.canCreate) {
        throw new Error(canCreateCheck.reason);
      }

      const grnNumber = this.generateGRNNumber();

      const [grn] = await trx("goods_receipt_notes")
        .insert({
          grn_number: grnNumber,
          purchase_order_id: purchaseOrderId,
          supplier_id: po.supplier_id,
          received_by: grnData.received_by,
          received_date: grnData.received_date || new Date(),
          status: "draft",
          notes: grnData.notes,
          is_partial: grnData.is_partial || false,
        })
        .returning("*");

      // Check if this is a retry scenario (there are existing completed GRNs with failed items)
      const existingGRNs = await trx("goods_receipt_notes")
        .where("purchase_order_id", purchaseOrderId)
        .whereIn("status", ["completed", "passed"])
        .whereNull("deleted_at");

      let poItemsWithInventoryData;

      if (existingGRNs.length > 0) {
        // This is a retry scenario - only include failed items from previous GRNs
        poItemsWithInventoryData = await trx("purchase_order_items as poi")
          .leftJoin(
            "supply_request_items as sri",
            "poi.supply_request_item_id",
            "sri.id"
          )
          .leftJoin(
            "inventory_item_types as iit",
            "sri.inventory_item_type_id",
            "iit.id"
          )
          .leftJoin("grn_items as gi", "poi.id", "gi.purchase_order_item_id")
          .leftJoin("goods_receipt_notes as grn", "gi.grn_id", "grn.id")
          .select(
            "poi.*",
            "sri.inventory_item_type_id",
            "iit.name as item_type_name",
            "iit.unit_of_measure as item_unit_of_measure"
          )
          .where("poi.purchase_order_id", purchaseOrderId)
          .where("gi.quality_status", "failed")
          .whereIn("grn.status", ["completed", "passed"])
          .whereNull("poi.deleted_at")
          .whereNull("grn.deleted_at");
      } else {
        // First time GRN creation - include all PO items
        poItemsWithInventoryData = await trx("purchase_order_items as poi")
          .leftJoin(
            "supply_request_items as sri",
            "poi.supply_request_item_id",
            "sri.id"
          )
          .leftJoin(
            "inventory_item_types as iit",
            "sri.inventory_item_type_id",
            "iit.id"
          )
          .select(
            "poi.*",
            "sri.inventory_item_type_id",
            "iit.name as item_type_name",
            "iit.unit_of_measure as item_unit_of_measure"
          )
          .where("poi.purchase_order_id", purchaseOrderId)
          .whereNull("poi.deleted_at");
      }

      const grnItems = poItemsWithInventoryData.map((item) => ({
        grn_id: grn.id,
        purchase_order_item_id: item.id,
        // Auto-populate item_type_id from supply request data
        item_type_id: item.inventory_item_type_id || null,
        received_quantity: grnData.is_partial ? 0 : item.quantity,
        ordered_quantity: item.quantity,
        unit_cost: item.unit_price,
        total_value: (grnData.is_partial ? 0 : item.quantity) * item.unit_price,
        batch_number: null,
        expiry_date: null,
        quality_status: "pending",
      }));

      await trx("grn_items").insert(grnItems);

      await trx.commit();
      return grn.id;
    } catch (error) {
      await trx.rollback();
      console.error("Error creating GRN:", error);
      throw error;
    }
  }

  // Update GRN status with stats recalculation
  static async updateStatus(id, status, updatedBy, notes = null) {
    const trx = await db.transaction();

    try {
      const updateData = {
        status: status,
        updated_at: new Date(),
      };

      if (notes) {
        updateData.notes = notes;
      }

      // If moving to completed, enforce robust prechecks
      if (status === "completed") {
        const items = await trx("grn_items")
          .where("grn_id", id)
          .select("id", "quality_status", "item_type_id");

        if (!items.length) {
          throw new Error("Cannot complete GRN without items.");
        }

        // Check if all items have been inspected (not pending)
        const pendingItems = items.filter(
          (i) => i.quality_status === "pending"
        );
        if (pendingItems.length > 0) {
          throw new Error(
            `Cannot complete GRN: ${pendingItems.length} item(s) still pending inspection.`
          );
        }

        // Get passed items that need to be mapped
        const passedItems = items.filter((i) => i.quality_status === "passed");
        const unmappedPassedItems = passedItems.filter((i) => !i.item_type_id);

        if (unmappedPassedItems.length > 0) {
          throw new Error(
            `Cannot complete GRN: ${unmappedPassedItems.length} passed item(s) must be mapped to an inventory item type.`
          );
        }

        // Check if there are any passed items to add to inventory
        if (passedItems.length === 0) {
          throw new Error(
            "Cannot complete GRN: No items passed quality inspection to add to inventory."
          );
        }
      }

      const [updatedGRN] = await trx("goods_receipt_notes")
        .where("id", id)
        .update(updateData)
        .returning("*");

      if (status === "completed") {
        await this.addToInventory(trx, id, updatedBy);
      }

      await trx.commit();

      // Return the full GRN data with joins and updated stats
      const fullGRN = await this.getById(id);
      const stats = await this.updateStats();

      return { grn: fullGRN, stats };
    } catch (error) {
      await trx.rollback();
      console.error("Error updating GRN status:", error);
      throw error;
    }
  }

  // Add items to inventory after GRN completion
  static async addToInventory(trx, grnId, addedBy) {
    try {
      // Enhanced query to get GRN items with purchase order item names and inventory data
      const grnItems = await trx("grn_items as gi")
        .leftJoin("goods_receipt_notes as grn", "gi.grn_id", "grn.id")
        .leftJoin("purchase_orders as po", "grn.purchase_order_id", "po.id")
        .leftJoin(
          "purchase_order_items as poi",
          "gi.purchase_order_item_id",
          "poi.id"
        )
        .leftJoin("inventory_item_types as iit", "gi.item_type_id", "iit.id")
        .leftJoin("inventory_categories as ic", "iit.category_id", "ic.id")
        .select(
          "gi.*",
          "po.supplier_id",
          "poi.item_name as po_item_name", // Get the specific item name from PO
          "poi.unit as po_unit", // Get the unit from PO
          "iit.name as item_type_name", // Get the item type name
          "ic.name as category_name", // Get the category name
          trx.ref("grn.purchase_order_id").as("purchase_order_id")
        )
        .where("gi.grn_id", grnId)
        .where("gi.quality_status", "passed");

      for (const item of grnItems) {
        if (item.received_quantity > 0 && item.item_type_id) {
          // Use only the PO item name without the unit
          const itemName = item.po_item_name;

          const [inventoryItem] = await trx("inventory_items")
            .insert({
              item_type_id: item.item_type_id,
              item_name: itemName, // Use only the item name from PO
              supplier_id: item.supplier_id,
              purchase_order_id: item.purchase_order_id,
              grn_id: grnId,
              grn_item_id: item.id,
              batch_number:
                item.batch_number ||
                this.generateBatchNumber(
                  item.item_type_id,
                  item.supplier_id,
                  grnId
                ),
              quantity: item.received_quantity,
              unit_cost: item.unit_cost,
              total_value: item.total_value,
              expiry_date: item.expiry_date,
              received_date: new Date(),
              status: "available",
              received_by: addedBy,
              created_at: new Date(),
              updated_at: new Date(),
            })
            .returning("*");

          await trx("inventory_transactions").insert({
            inventory_item_id: inventoryItem.id,
            transaction_type: "receipt",
            quantity: item.received_quantity,
            unit_cost: item.unit_cost,
            total_value: item.total_value,
            reference_number: `GRN-${grnId}`,
            reason: "GRN completion",
            performed_by: addedBy,
            transaction_date: new Date(),
            created_at: new Date(),
            updated_at: new Date(),
          });
        }
      }
    } catch (error) {
      console.error("Error adding GRN items to inventory:", error);
      throw error;
    }
  }

  // Generate batch number
  static generateBatchNumber(itemTypeId, supplierId, grnId, date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hour = String(date.getHours()).padStart(2, "0");
    const minute = String(date.getMinutes()).padStart(2, "0");
    return `GRN-${grnId}-${itemTypeId}-${supplierId || "NONE"}-${year}${month}${day}-${hour}${minute}`;
  }

  // Quality inspection methods with stats update
  static async performQualityInspection(
    grnId,
    grnItemId,
    inspectorId,
    result,
    notes = null,
    inspectionCriteria = null
  ) {
    const trx = await db.transaction();

    try {
      // Update the GRN item quality status
      const [updatedItem] = await trx("grn_items")
        .where("id", grnItemId)
        .where("grn_id", grnId)
        .update({
          quality_status: result,
          quality_notes: notes,
          inspected_by: inspectorId,
          inspected_at: new Date(),
          updated_at: new Date(),
        })
        .returning("*");

      // Create quality inspection record
      await trx("quality_inspections").insert({
        grn_id: grnId,
        grn_item_id: grnItemId,
        inspector_id: inspectorId,
        result: result,
        notes: notes,
        inspection_criteria: inspectionCriteria,
        created_at: new Date(),
        updated_at: new Date(),
      });

      // If the item failed inspection, ensure an item return is recorded (only if GRN not completed)
      if (result === "failed") {
        // Check if GRN is already completed (items added to inventory)
        const grnStatus = await trx("goods_receipt_notes")
          .where("id", grnId)
          .select("status")
          .first();

        if (grnStatus && grnStatus.status === "completed") {
          console.warn(
            `Cannot create returns for completed GRN ${grnId} - items already added to inventory`
          );
          await trx.commit();
          const fullGRN = await this.getById(grnId);
          const stats = await this.updateStats();
          return { grn: fullGRN, stats };
        }
        // Load required context for creating an item return
        const ctx = await trx("grn_items as gi")
          .leftJoin("goods_receipt_notes as grn", "gi.grn_id", "grn.id")
          .leftJoin(
            "purchase_order_items as poi",
            "gi.purchase_order_item_id",
            "poi.id"
          )
          .select(
            "grn.purchase_order_id as purchase_order_id",
            "gi.purchase_order_item_id as purchase_order_item_id",
            trx.ref("poi.quantity").as("po_quantity")
          )
          .where("gi.id", grnItemId)
          .first();

        if (ctx && ctx.purchase_order_id && ctx.purchase_order_item_id) {
          // Only create return if the item was actually received in this GRN
          const grnItem = await trx("grn_items")
            .where("id", grnItemId)
            .select("received_quantity")
            .first();

          if (grnItem && grnItem.received_quantity > 0) {
            // Check if a return already exists for this specific GRN item
            const existing = await trx("item_returns")
              .where("purchase_order_item_id", ctx.purchase_order_item_id)
              .where("notes", "like", `%GRN-${grnId}%`)
              .whereNull("deleted_at")
              .first();

            if (!existing) {
              await trx("item_returns").insert({
                purchase_order_id: ctx.purchase_order_id,
                purchase_order_item_id: ctx.purchase_order_item_id,
                return_quantity: Math.round(grnItem.received_quantity), // Convert decimal to integer
                return_reason: "Poor Quality",
                notes: `${notes || "Quality inspection failed"} (GRN-${grnId})`,
                logged_by: "Quality Inspection",
                status: "Pending",
                created_at: new Date(),
                updated_at: new Date(),
              });
            }
          }
        }
      }

      // Check if all items in the GRN have been inspected
      const allItems = await trx("grn_items")
        .where("grn_id", grnId)
        .select("quality_status");

      const allInspected = allItems.every(
        (item) => item.quality_status !== "pending"
      );

      if (allInspected) {
        // Determine overall GRN status based on inspection results
        const hasFailed = allItems.some(
          (item) => item.quality_status === "failed"
        );
        const hasConditional = allItems.some(
          (item) => item.quality_status === "conditional"
        );

        let newGRNStatus = "passed";
        if (hasFailed) {
          newGRNStatus = "failed";
        } else if (hasConditional) {
          newGRNStatus = "conditional";
        }

        // Update GRN status
        await trx("goods_receipt_notes").where("id", grnId).update({
          status: newGRNStatus,
          updated_at: new Date(),
        });
      }

      await trx.commit();

      // Return the updated GRN with full data and stats
      const fullGRN = await this.getById(grnId);
      const stats = await this.updateStats();
      return { grn: fullGRN, stats };
    } catch (error) {
      await trx.rollback();
      console.error("Error performing quality inspection:", error);
      throw error;
    }
  }

  // Bulk quality inspection for all items in a GRN with stats update
  static async performBulkQualityInspection(
    grnId,
    inspectorId,
    result,
    notes = null
  ) {
    const trx = await db.transaction();

    try {
      // Get all GRN items
      const grnItems = await trx("grn_items")
        .where("grn_id", grnId)
        .select("id");

      // Update all items with the same result
      for (const item of grnItems) {
        await trx("grn_items").where("id", item.id).update({
          quality_status: result,
          quality_notes: notes,
          inspected_by: inspectorId,
          inspected_at: new Date(),
          updated_at: new Date(),
        });

        // Create quality inspection record for each item
        await trx("quality_inspections").insert({
          grn_id: grnId,
          grn_item_id: item.id,
          inspector_id: inspectorId,
          result: result,
          notes: notes,
          inspection_criteria: null,
          created_at: new Date(),
          updated_at: new Date(),
        });
      }

      // If failed, create returns only for items received in this GRN (and not yet completed)
      if (result === "failed") {
        // Check if GRN is already completed (items added to inventory)
        const grnStatus = await trx("goods_receipt_notes")
          .where("id", grnId)
          .select("status")
          .first();

        if (grnStatus && grnStatus.status === "completed") {
          console.warn(
            `Cannot create returns for completed GRN ${grnId} - items already added to inventory`
          );
          await trx.commit();
          const fullGRN = await this.getById(grnId);
          const stats = await this.updateStats();
          return { grn: fullGRN, stats };
        }
        const ctxRows = await trx("grn_items as gi")
          .leftJoin("goods_receipt_notes as grn", "gi.grn_id", "grn.id")
          .leftJoin(
            "purchase_order_items as poi",
            "gi.purchase_order_item_id",
            "poi.id"
          )
          .select(
            "gi.id as grn_item_id",
            "gi.received_quantity as grn_received_quantity",
            "grn.purchase_order_id as purchase_order_id",
            "gi.purchase_order_item_id as purchase_order_item_id"
          )
          .where("gi.grn_id", grnId)
          .where("gi.received_quantity", ">", 0); // Only items actually received

        for (const ctx of ctxRows) {
          if (
            ctx.purchase_order_id &&
            ctx.purchase_order_item_id &&
            ctx.grn_received_quantity > 0
          ) {
            // Check if a return already exists for this specific GRN item
            const exists = await trx("item_returns")
              .where("purchase_order_item_id", ctx.purchase_order_item_id)
              .where("notes", "like", `%GRN-${grnId}%`)
              .whereNull("deleted_at")
              .first();

            if (!exists) {
              await trx("item_returns").insert({
                purchase_order_id: ctx.purchase_order_id,
                purchase_order_item_id: ctx.purchase_order_item_id,
                return_quantity: Math.round(ctx.grn_received_quantity), // Convert decimal to integer
                return_reason: "Poor Quality",
                notes: `${notes || "Quality inspection failed"} (GRN-${grnId})`,
                logged_by: "Quality Inspection",
                status: "Pending",
                created_at: new Date(),
                updated_at: new Date(),
              });
            }
          }
        }
      }

      // Update GRN status
      await trx("goods_receipt_notes").where("id", grnId).update({
        status: result,
        updated_at: new Date(),
      });

      await trx.commit();

      // Return the updated GRN with full data and stats
      const fullGRN = await this.getById(grnId);
      const stats = await this.updateStats();
      return { grn: fullGRN, stats };
    } catch (error) {
      await trx.rollback();
      console.error("Error performing bulk quality inspection:", error);
      throw error;
    }
  }

  // List active inventory item types for mapping
  static async getActiveItemTypes() {
    try {
      return await db("inventory_item_types")
        .where({ status: "active" })
        .orderBy("name", "asc")
        .select("id", "name");
    } catch (error) {
      console.error("Error fetching active item types:", error);
      throw error;
    }
  }

  // Map a GRN item to an inventory item type
  static async mapItemType(grnId, grnItemId, itemTypeId, mappedBy) {
    const trx = await db.transaction();
    try {
      // validate target item type exists and is active
      const itemType = await trx("inventory_item_types")
        .where({ id: itemTypeId, status: "active" })
        .first();
      if (!itemType) {
        throw new Error("Invalid or inactive item type");
      }

      // ensure grn item exists
      const grnItem = await trx("grn_items")
        .where({ id: grnItemId, grn_id: grnId })
        .first();
      if (!grnItem) {
        throw new Error("GRN item not found");
      }

      await trx("grn_items")
        .where({ id: grnItemId })
        .update({ item_type_id: itemTypeId, updated_at: new Date() });

      await trx.commit();

      return await this.getById(grnId);
    } catch (error) {
      await trx.rollback();
      console.error("Error mapping GRN item type:", error);
      throw error;
    }
  }

  // Update existing GRN items with inventory data from supply request
  static async updateGRNItemsWithInventoryData(grnId) {
    const trx = await db.transaction();

    try {
      // First, try to update any supply request items that don't have inventory data
      const supplyUpdated =
        await SupplyRequest.updateSupplyRequestItemsWithInventoryData();
      console.log(
        `Updated ${supplyUpdated} supply request items with inventory data`
      );

      // Get GRN items that don't have item_type_id populated
      const unmappedItems = await trx("grn_items as gi")
        .leftJoin(
          "purchase_order_items as poi",
          "gi.purchase_order_item_id",
          "poi.id"
        )
        .leftJoin(
          "supply_request_items as sri",
          "poi.supply_request_item_id",
          "sri.id"
        )
        .leftJoin(
          "inventory_item_types as iit",
          "sri.inventory_item_type_id",
          "iit.id"
        )
        .select(
          "gi.id as grn_item_id",
          "sri.inventory_item_type_id",
          "iit.name as item_type_name",
          "sri.item_type as supply_request_item_type",
          "poi.item_name as po_item_name"
        )
        .where("gi.grn_id", grnId)
        .whereNull("gi.item_type_id");

      console.log(
        `Found ${unmappedItems.length} unmapped GRN items:`,
        unmappedItems
      );

      let updatedCount = 0;
      // Update each unmapped item with inventory data
      for (const item of unmappedItems) {
        if (item.inventory_item_type_id) {
          await trx("grn_items").where("id", item.grn_item_id).update({
            item_type_id: item.inventory_item_type_id,
            updated_at: new Date(),
          });
          updatedCount++;
          console.log(
            `Updated GRN item ${item.grn_item_id} (${item.po_item_name}) with inventory type ${item.item_type_name}`
          );
        } else {
          console.log(
            `No inventory type found for GRN item ${item.grn_item_id} (${item.po_item_name}), supply request item type: ${item.supply_request_item_type}`
          );
        }
      }

      await trx.commit();

      console.log(
        `Updated ${updatedCount} GRN items with inventory data for GRN ${grnId}`
      );
      return updatedCount;
    } catch (error) {
      await trx.rollback();
      console.error("Error updating GRN items with inventory data:", error);
      throw error;
    }
  }

  // Debug method to check supply request inventory data
  static async debugSupplyRequestData(grnId) {
    try {
      const grn = await db("goods_receipt_notes").where("id", grnId).first();

      if (!grn) {
        throw new Error("GRN not found");
      }

      const debugData = await db("grn_items as gi")
        .leftJoin(
          "purchase_order_items as poi",
          "gi.purchase_order_item_id",
          "poi.id"
        )
        .leftJoin(
          "supply_request_items as sri",
          "poi.supply_request_item_id",
          "sri.id"
        )
        .leftJoin(
          "inventory_item_types as iit",
          "sri.inventory_item_type_id",
          "iit.id"
        )
        .select(
          "gi.id as grn_item_id",
          "gi.item_type_id as current_item_type_id",
          "poi.item_name as po_item_name",
          "sri.item_type as supply_request_item_type",
          "sri.inventory_item_type_id as supply_request_inventory_type_id",
          "iit.name as inventory_item_type_name"
        )
        .where("gi.grn_id", grnId);

      return {
        grn_id: grnId,
        purchase_order_id: grn.purchase_order_id,
        items: debugData,
      };
    } catch (error) {
      console.error("Error debugging supply request data:", error);
      throw error;
    }
  }

  // Get GRN statistics
  static async getStats() {
    try {
      const today = new Date();
      const startOfDay = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate()
      );
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay() + 1); // Monday
      startOfWeek.setHours(0, 0, 0, 0);
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

      const stats = await db("goods_receipt_notes")
        .whereNull("deleted_at")
        .select(
          db.raw("COUNT(*) as total"),
          db.raw("COUNT(CASE WHEN status = 'draft' THEN 1 END) as draft"),
          db.raw(
            "COUNT(CASE WHEN status = 'pending_inspection' THEN 1 END) as pending_inspection"
          ),
          db.raw("COUNT(CASE WHEN status = 'passed' THEN 1 END) as passed"),
          db.raw("COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed"),
          db.raw(
            "COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed"
          ),
          db.raw("COUNT(CASE WHEN created_at >= ? THEN 1 END) as today", [
            startOfDay,
          ]),
          db.raw("COUNT(CASE WHEN created_at >= ? THEN 1 END) as week", [
            startOfWeek,
          ]),
          db.raw("COUNT(CASE WHEN created_at >= ? THEN 1 END) as month", [
            startOfMonth,
          ])
        )
        .first();

      return {
        total: parseInt(stats.total) || 0,
        draft: parseInt(stats.draft) || 0,
        pending_inspection: parseInt(stats.pending_inspection) || 0,
        passed: parseInt(stats.passed) || 0,
        failed: parseInt(stats.failed) || 0,
        completed: parseInt(stats.completed) || 0,
        today: parseInt(stats.today) || 0,
        week: parseInt(stats.week) || 0,
        month: parseInt(stats.month) || 0,
      };
    } catch (error) {
      console.error("Error calculating GRN stats:", error);
      throw new Error("Failed to calculate GRN statistics");
    }
  }

  // Update stats after critical operations
  static async updateStats() {
    try {
      return await this.getStats();
    } catch (error) {
      console.error("Error updating GRN stats:", error);
      throw error;
    }
  }
}

module.exports = GoodsReceiptNote;
