const { db } = require("../config/database");

class GoodsReceiptNote {
  // Generate unique GRN number
  static generateGRNNumber() {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, "0");
    const day = String(new Date().getDate()).padStart(2, "0");
    const timestamp = Date.now().toString().slice(-4);
    return `GRN${year}${month}${day}-${timestamp}`;
  }

  // Get all GRNs with optional filters
  static async getAll(filters = {}) {
    try {
      let query = db("goods_receipt_notes as grn")
        .leftJoin("purchase_orders as po", "grn.purchase_order_id", "po.id")
        .leftJoin("suppliers as s", "grn.supplier_id", "s.id")
        .leftJoin("users as u", "grn.received_by", "u.id")
        .select(
          "grn.*",
          "po.po_number",
          "s.name as supplier_name",
          "u.name as received_by_name"
        )
        .whereNull("grn.deleted_at");

      if (filters.status) {
        query = query.where("grn.status", filters.status);
      }
      if (filters.supplier_id) {
        query = query.where("grn.supplier_id", filters.supplier_id);
      }

      const grns = await query.orderBy("grn.created_at", "desc");

      for (let grn of grns) {
        grn.items = await this.getItems(grn.id);
        grn.item_count = grn.items.length;
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
        .leftJoin("users as u", "grn.received_by", "u.id")
        .select(
          "grn.*",
          "po.po_number",
          "s.name as supplier_name",
          "u.name as received_by_name"
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

  // Get GRN items
  static async getItems(grnId) {
    try {
      return await db("grn_items as gi")
        .leftJoin(
          "purchase_order_items as poi",
          "gi.purchase_order_item_id",
          "poi.id"
        )
        .leftJoin("inventory_item_types as it", "gi.item_type_id", "it.id")
        .leftJoin("users as u", "gi.inspected_by", "u.id")
        .select(
          "gi.*",
          "poi.item_name as po_item_name",
          "poi.quantity as po_quantity",
          "poi.unit as po_unit",
          "it.name as item_type_name",
          "u.name as inspector_name"
        )
        .where("gi.grn_id", grnId)
        .orderBy("gi.id");
    } catch (error) {
      console.error("Error fetching GRN items:", error);
      throw new Error("Failed to retrieve GRN items");
    }
  }

  // Create GRN from PO
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

      const poItems = await trx("purchase_order_items")
        .where("purchase_order_id", purchaseOrderId)
        .whereNull("deleted_at");

      const grnItems = poItems.map((item) => ({
        grn_id: grn.id,
        purchase_order_item_id: item.id,
        item_type_id: null,
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

  // Update GRN status
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

        const notPassed = items.filter((i) => i.quality_status !== "passed");
        const unmapped = items.filter((i) => !i.item_type_id);

        if (notPassed.length || unmapped.length) {
          const reasons = [];
          if (notPassed.length)
            reasons.push("all items must have quality_status = 'passed'");
          if (unmapped.length)
            reasons.push("all items must be mapped to an inventory item type");
          const message = `GRN cannot be completed: ${reasons.join(" and ")}.`;
          throw new Error(message);
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

      // Return the full GRN data with joins (same as getById)
      return await this.getById(id);
    } catch (error) {
      await trx.rollback();
      console.error("Error updating GRN status:", error);
      throw error;
    }
  }

  // Add items to inventory after GRN completion
  static async addToInventory(trx, grnId, addedBy) {
    try {
      const grnItems = await trx("grn_items as gi")
        .leftJoin("goods_receipt_notes as grn", "gi.grn_id", "grn.id")
        .leftJoin("purchase_orders as po", "grn.purchase_order_id", "po.id")
        .select(
          "gi.*",
          "po.supplier_id",
          trx.ref("grn.purchase_order_id").as("purchase_order_id")
        )
        .where("gi.grn_id", grnId)
        .where("gi.quality_status", "passed");

      for (const item of grnItems) {
        if (item.received_quantity > 0 && item.item_type_id) {
          const [inventoryItem] = await trx("inventory_items")
            .insert({
              item_type_id: item.item_type_id,
              supplier_id: item.supplier_id,
              purchase_order_id: item.purchase_order_id,
              grn_id: grnId,
              grn_item_id: item.id,
              batch_number:
                item.batch_number ||
                this.generateBatchNumber(item.item_type_id, item.supplier_id),
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
  static generateBatchNumber(itemTypeId, supplierId, date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hour = String(date.getHours()).padStart(2, "0");
    const minute = String(date.getMinutes()).padStart(2, "0");
    return `GRN-${itemTypeId}-${supplierId || "NONE"}-${year}${month}${day}-${hour}${minute}`;
  }

  // Quality inspection methods
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

      // Return the updated GRN with full data
      return await this.getById(grnId);
    } catch (error) {
      await trx.rollback();
      console.error("Error performing quality inspection:", error);
      throw error;
    }
  }

  // Bulk quality inspection for all items in a GRN
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

      // Update GRN status
      await trx("goods_receipt_notes").where("id", grnId).update({
        status: result,
        updated_at: new Date(),
      });

      await trx.commit();

      // Return the updated GRN with full data
      return await this.getById(grnId);
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
}

module.exports = GoodsReceiptNote;
