const { db } = require("../config/database");
const Supplier = require("./Supplier");
const Inventory = require("./Inventory");

class PurchaseOrder {
  // Get all purchase orders with related data (optimized)
  static async getAll(includeDeleted = false, filters = {}) {
    try {
      // Main query with basic PO data and supplier info
      let query = db("purchase_orders as po")
        .leftJoin("suppliers as s", "po.supplier_id", "s.id")
        .leftJoin("supply_requests as sr", "po.supply_request_id", "sr.id")
        .select(
          "po.*",
          "s.name as supplier_name",
          "s.contact_person as supplier_contact",
          "s.email as supplier_email",
          "s.phone as supplier_phone",
          "sr.request_id as supply_request_number"
        );

      if (!includeDeleted) {
        query = query.whereNull("po.deleted_at");
      }

      // Optional filters
      if (filters && filters.supplierId) {
        // Include POs where:
        // 1. supplier_id matches directly, OR
        // 2. supplier_id is null but items have supplier_product_id belonging to this supplier
        query = query.where(function () {
          this.where("po.supplier_id", filters.supplierId).orWhere(function () {
            this.whereNull("po.supplier_id").whereExists(function () {
              this.select("*")
                .from("purchase_order_items as poi")
                .leftJoin(
                  "supplier_products as sp",
                  "poi.supplier_product_id",
                  "sp.id"
                )
                .whereRaw("poi.purchase_order_id = po.id")
                .where("sp.supplier_id", filters.supplierId)
                .whereNotNull("poi.supplier_product_id");
            });
          });
        });
      }

      const purchaseOrders = await query.orderBy("po.created_at", "desc");

      if (purchaseOrders.length === 0) {
        return purchaseOrders;
      }

      const poIds = purchaseOrders.map((po) => po.id);

      // Batch fetch all items for all POs in one query with supplier product info
      const allItems = await db("purchase_order_items as poi")
        .leftJoin(
          "supply_request_items as sri",
          "poi.supply_request_item_id",
          "sri.id"
        )
        .leftJoin("supplier_products as sp", "poi.supplier_product_id", "sp.id")
        .select(
          "poi.*",
          "sri.item_number as original_item_number",
          "sp.product_name as supplier_product_name",
          "sp.sku as supplier_sku",
          "sp.item_type_id as supplier_item_type_id"
        )
        .whereIn("poi.purchase_order_id", poIds)
        .orderBy("poi.purchase_order_id")
        .orderBy("poi.id");

      // Group items by PO ID
      const itemsByPO = {};
      allItems.forEach((item) => {
        if (!itemsByPO[item.purchase_order_id]) {
          itemsByPO[item.purchase_order_id] = [];
        }
        itemsByPO[item.purchase_order_id].push(item);
      });

      // Batch fetch GRN counts and statuses in one query
      const grnData = await db("goods_receipt_notes")
        .whereIn("purchase_order_id", poIds)
        .whereNull("deleted_at")
        .select("purchase_order_id", "status", "created_at")
        .orderBy("purchase_order_id")
        .orderBy("created_at", "desc");

      // Group GRN data by PO ID
      const grnByPO = {};
      grnData.forEach((grn) => {
        if (!grnByPO[grn.purchase_order_id]) {
          grnByPO[grn.purchase_order_id] = [];
        }
        grnByPO[grn.purchase_order_id].push(grn);
      });

      // Batch fetch pending returns counts in one query
      const pendingReturnsData = await db("item_returns as ir")
        .leftJoin(
          "purchase_order_items as poi",
          "ir.purchase_order_item_id",
          "poi.id"
        )
        .whereIn("poi.purchase_order_id", poIds)
        .where("ir.status", "pending")
        .select("poi.purchase_order_id")
        .count("* as count")
        .groupBy("poi.purchase_order_id");

      // Group pending returns by PO ID
      const pendingReturnsByPO = {};
      pendingReturnsData.forEach((returnData) => {
        pendingReturnsByPO[returnData.purchase_order_id] = parseInt(
          returnData.count
        );
      });

      // Combine all data
      purchaseOrders.forEach((po) => {
        // Add items
        po.items = itemsByPO[po.id] || [];
        po.item_count = po.items.length;

        // Add GRN data
        const grns = grnByPO[po.id] || [];
        po.grn_count = grns.length;
        po.grn_statuses = grns.map((grn) => grn.status);
        po.latest_grn_status = grns.length > 0 ? grns[0].status : null;

        // Add pending returns data
        po.pending_returns_count = pendingReturnsByPO[po.id] || 0;
        po.has_pending_returns = po.pending_returns_count > 0;
      });

      return purchaseOrders;
    } catch (error) {
      throw error;
    }
  }

  static async getPendingReturnsCount(purchaseOrderId) {
    try {
      const pendingReturns = await db("item_returns as ir")
        .where("ir.purchase_order_id", purchaseOrderId)
        .where("ir.status", "!=", "Completed")
        .whereNull("ir.deleted_at")
        .count("* as count")
        .first();

      return parseInt(pendingReturns.count);
    } catch (error) {
      console.error("Error getting pending returns count:", error);
      return 0;
    }
  }

  static async canCreateNewGRN(purchaseOrderId) {
    try {
      // Get all GRNs for this PO
      const grns = await db("goods_receipt_notes")
        .where("purchase_order_id", purchaseOrderId)
        .whereNull("deleted_at")
        .select("id", "status")
        .orderBy("created_at", "desc");

      // If no GRNs exist, allow creation
      if (grns.length === 0) {
        return { canCreate: true, reason: "No existing GRNs" };
      }

      // Check if there are any failed GRNs
      const failedGRNs = grns.filter((grn) => grn.status === "failed");

      if (failedGRNs.length > 0) {
        // Check if there are pending returns for failed GRNs
        const pendingReturns = await db("item_returns as ir")
          .leftJoin(
            "grn_items as gi",
            "ir.purchase_order_item_id",
            "gi.purchase_order_item_id"
          )
          .leftJoin("goods_receipt_notes as grn", "gi.grn_id", "grn.id")
          .where("grn.purchase_order_id", purchaseOrderId)
          .where("grn.status", "failed")
          .where("ir.status", "!=", "Completed")
          .whereNull("ir.deleted_at")
          .count("* as count")
          .first();

        const pendingReturnsCount = parseInt(pendingReturns.count);

        if (pendingReturnsCount > 0) {
          return {
            canCreate: false,
            reason: `Cannot create new GRN: ${pendingReturnsCount} return(s) still pending completion`,
          };
        }

        return {
          canCreate: true,
          reason: "All returns from failed GRNs are completed",
        };
      }

      // Check if there are completed or passed GRNs
      const completedGRNs = grns.filter(
        (grn) => grn.status === "completed" || grn.status === "passed"
      );

      if (completedGRNs.length > 0) {
        // Check if there are any failed items in completed GRNs that could be retried
        const failedItemsInCompletedGRNs = await db("grn_items as gi")
          .leftJoin("goods_receipt_notes as grn", "gi.grn_id", "grn.id")
          .where("grn.purchase_order_id", purchaseOrderId)
          .whereIn("grn.status", ["completed", "passed"])
          .where("gi.quality_status", "failed")
          .where("gi.received_quantity", ">", 0)
          .count("* as count")
          .first();

        const failedItemsCount = parseInt(failedItemsInCompletedGRNs.count);

        if (failedItemsCount > 0) {
          return {
            canCreate: true,
            reason: `Can create new GRN: ${failedItemsCount} failed item(s) from completed GRN(s) can be retried`,
          };
        }

        return {
          canCreate: false,
          reason:
            "Cannot create new GRN: All items already received and processed successfully",
        };
      }

      // Check if there are any active GRNs (draft, pending_inspection)
      const activeGRNs = grns.filter(
        (grn) => grn.status === "draft" || grn.status === "pending_inspection"
      );

      if (activeGRNs.length > 0) {
        return {
          canCreate: false,
          reason: `Cannot create new GRN: ${activeGRNs.length} existing GRN(s) in progress`,
        };
      }

      // If we reach here, there might be other statuses we haven't handled
      return {
        canCreate: false,
        reason: "Cannot create new GRN: Existing GRN found with unknown status",
      };
    } catch (error) {
      console.error("Error checking if PO can create new GRN:", error);
      return { canCreate: false, reason: "Error checking GRN status" };
    }
  }

  // Get purchase order by ID with items
  static async getById(id) {
    try {
      const purchaseOrder = await db("purchase_orders as po")
        .leftJoin("suppliers as s", "po.supplier_id", "s.id")
        .leftJoin("supply_requests as sr", "po.supply_request_id", "sr.id")
        .select(
          "po.*",
          "s.name as supplier_name",
          "s.contact_person as supplier_contact",
          "s.email as supplier_email",
          "s.phone as supplier_phone",
          "sr.request_id as supply_request_number"
        )
        .where("po.id", id)
        .first();

      if (purchaseOrder) {
        purchaseOrder.items = await this.getItems(id);
        purchaseOrder.item_count = purchaseOrder.items.length;
      }

      return purchaseOrder;
    } catch (error) {
      throw error;
    }
  }

  // Get items for a purchase order with supplier product info
  static async getItems(purchaseOrderId) {
    try {
      return await db("purchase_order_items as poi")
        .leftJoin(
          "supply_request_items as sri",
          "poi.supply_request_item_id",
          "sri.id"
        )
        .leftJoin("supplier_products as sp", "poi.supplier_product_id", "sp.id")
        .select(
          "poi.*",
          "sri.item_number as original_item_number",
          "sp.product_name as supplier_product_name",
          "sp.sku as supplier_sku",
          "sp.item_type_id as supplier_item_type_id"
        )
        .where("poi.purchase_order_id", purchaseOrderId)
        .orderBy("poi.id");
    } catch (error) {
      throw error;
    }
  }

  // Add this method to check if PO number can be reused (only if cancelled)
  static async canReusePoNumber(poNumber) {
    try {
      console.log(`Checking if PO number ${poNumber} can be reused...`);

      const existing = await db("purchase_orders")
        .where("po_number", poNumber)
        .whereNull("deleted_at")
        .first();

      console.log(`Existing PO found:`, existing);

      if (!existing) {
        console.log(`No existing PO found, can reuse number ${poNumber}`);
        return true; // PO number doesn't exist, can be used
      }

      console.log(`Existing PO status: "${existing.status}"`);
      console.log(
        `Status comparison: existing.status === "Cancelled" = ${existing.status === "Cancelled"}`
      );

      // Only allow reuse if the existing PO is cancelled
      const canReuse = existing.status === "Cancelled";
      console.log(`Can reuse PO number ${poNumber}: ${canReuse}`);

      return canReuse;
    } catch (error) {
      console.error(`Error in canReusePoNumber:`, error);
      throw error;
    }
  }

  // Create purchase order from supply request
  static async createFromSupplyRequest(supplyRequestId, supplierId, poData) {
    const trx = await db.transaction();

    try {
      // Validate supplier only when provided (manual requests may omit supplier)
      if (supplierId) {
        await Supplier.validateForPurchaseOrder(supplierId);
      }

      // Check if PO number can be reused
      const canReuse = await this.canReusePoNumber(poData.po_number);
      if (!canReuse) {
        throw new Error(
          `PO number ${poData.po_number} already exists and is not cancelled`
        );
      }

      // If there's a cancelled PO with this number, we'll create a new one
      // The cancelled one remains for audit purposes

      // Get supply request and its items
      const supplyRequest = await trx("supply_requests")
        .where("id", supplyRequestId)
        .where("request_status", "Completed")
        .first();

      if (!supplyRequest) {
        throw new Error("Supply request not found or not approved");
      }

      const supplyRequestItems = await trx("supply_request_items").where(
        "supply_request_id",
        supplyRequestId
      );

      // Resolve supplier from param or fall back to supply request
      let resolvedSupplierId = supplierId || supplyRequest?.supplier_id || null;

      // If still null, try to get from supply request items' supplier_product
      if (!resolvedSupplierId && supplyRequestItems.length > 0) {
        const firstItemWithSupplier = supplyRequestItems.find(
          (item) => item.supplier_product_id
        );
        if (firstItemWithSupplier?.supplier_product_id) {
          const supplierProduct = await trx("supplier_products")
            .where("id", firstItemWithSupplier.supplier_product_id)
            .first();
          if (supplierProduct?.supplier_id) {
            resolvedSupplierId = supplierProduct.supplier_id;
            console.log(
              `Auto-resolved supplier_id ${resolvedSupplierId} from supplier_product for PO from supply request ${supplyRequestId}`
            );
          }
        }
      }

      // If the supply request is supplier-sourced, supplier must be present
      if (supplyRequest?.is_supplier_sourced && !resolvedSupplierId) {
        throw new Error(
          "Supplier is required for supplier-sourced supply requests"
        );
      }

      // Create purchase order
      const [purchaseOrder] = await trx("purchase_orders")
        .insert({
          po_number: poData.po_number,
          supplier_id: resolvedSupplierId,
          supply_request_id: supplyRequestId,
          status: poData.status || "Draft",
          total_amount: supplyRequestItems.reduce(
            (sum, item) => sum + parseFloat(item.item_amount),
            0
          ),
          order_date: poData.order_date || new Date(),
          expected_delivery: poData.expected_delivery,
          notes: poData.notes,
          created_by: poData.created_by,
        })
        .returning("*");

      // Create purchase order items from supply request items
      const poItems = supplyRequestItems.map((item) => ({
        purchase_order_id: purchaseOrder.id,
        supply_request_item_id: item.id,
        item_name: item.item_name,
        quantity: item.item_quantity,
        unit: item.item_unit,
        unit_price: item.item_unit_price,
        total_price: item.item_amount,
        description: item.item_notes,
        received_quantity: null,
        received_unit_price: null,
        received_total_price: null,
        received_at: null,
        received_by: null,
      }));

      const createdItems = await trx("purchase_order_items")
        .insert(poItems)
        .returning("*");

      await trx.commit();
      return purchaseOrder.id;
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  }

  // Create purchase order from supply request with selected items
  static async createFromSupplyRequestWithItems(
    supplyRequestId,
    supplierId,
    poData,
    selectedItems
  ) {
    const trx = await db.transaction();

    try {
      // Validate supplier only when provided (manual requests may omit supplier)
      if (supplierId) {
        await Supplier.validateForPurchaseOrder(supplierId);
      }

      // Check if PO number can be reused
      const canReuse = await this.canReusePoNumber(poData.po_number);
      if (!canReuse) {
        throw new Error(
          `PO number ${poData.po_number} already exists and is not cancelled`
        );
      }

      // Get supply request
      const supplyRequest = await trx("supply_requests")
        .where("id", supplyRequestId)
        .where("request_status", "Completed")
        .first();

      if (!supplyRequest) {
        throw new Error("Supply request not found or not approved");
      }

      // Validate that all selected items belong to the supply request
      const selectedItemIds = selectedItems.map((item) => item.id);
      const supplyRequestItems = await trx("supply_request_items")
        .select("*") // Explicitly select all fields including supplier_product_id and item_sku
        .where("supply_request_id", supplyRequestId)
        .whereIn("id", selectedItemIds);

      // Resolve supplier from param or fall back to supply request
      let resolvedSupplierId = supplierId || supplyRequest?.supplier_id || null;

      // If still null, try to get from selected items' supplier_product
      if (!resolvedSupplierId && supplyRequestItems.length > 0) {
        const firstItemWithSupplier = supplyRequestItems.find(
          (item) => item.supplier_product_id
        );
        if (firstItemWithSupplier?.supplier_product_id) {
          const supplierProduct = await trx("supplier_products")
            .where("id", firstItemWithSupplier.supplier_product_id)
            .first();
          if (supplierProduct?.supplier_id) {
            resolvedSupplierId = supplierProduct.supplier_id;
            console.log(
              `Auto-resolved supplier_id ${resolvedSupplierId} from supplier_product for PO from supply request ${supplyRequestId}`
            );
          }
        }
      }

      // If the supply request is supplier-sourced, supplier must be present
      if (supplyRequest?.is_supplier_sourced && !resolvedSupplierId) {
        throw new Error(
          "Supplier is required for supplier-sourced supply requests"
        );
      }

      if (supplyRequestItems.length !== selectedItems.length) {
        throw new Error(
          "Some selected items do not belong to the supply request"
        );
      }

      // Check if any of the selected items are already used in other POs
      const usedItems = await trx("purchase_order_items as poi")
        .join("purchase_orders as po", "poi.purchase_order_id", "po.id")
        .whereIn("poi.supply_request_item_id", selectedItemIds)
        .where("po.status", "!=", "Cancelled")
        .select("poi.supply_request_item_id", "po.po_number");

      if (usedItems.length > 0) {
        const usedItemIds = usedItems.map(
          (item) => item.supply_request_item_id
        );
        const usedItemNames = supplyRequestItems
          .filter((item) => usedItemIds.includes(item.id))
          .map((item) => item.item_name);

        throw new Error(
          `The following items are already used in other purchase orders: ${usedItemNames.join(", ")}`
        );
      }

      // Calculate total amount from selected items
      const totalAmount = selectedItems.reduce(
        (sum, item) => sum + parseFloat(item.total_price || 0),
        0
      );

      // Create purchase order
      const [purchaseOrder] = await trx("purchase_orders")
        .insert({
          po_number: poData.po_number,
          supplier_id: resolvedSupplierId,
          supply_request_id: supplyRequestId,
          status: poData.status || "Draft",
          total_amount: totalAmount,
          order_date: poData.order_date || new Date(),
          expected_delivery: poData.expected_delivery,
          notes: poData.notes,
          created_by: poData.created_by,
        })
        .returning("*");

      // Create purchase order items from selected items
      // Create a map of supply request items for quick lookup
      const supplyRequestItemsMap = supplyRequestItems.reduce((map, item) => {
        map[item.id] = item;
        return map;
      }, {});

      const poItems = selectedItems.map((item) => {
        const supplyRequestItem = supplyRequestItemsMap[item.id];
        return {
          purchase_order_id: purchaseOrder.id,
          supply_request_item_id: item.id,
          item_name: item.item_name,
          quantity: item.quantity,
          unit: item.unit,
          unit_price: item.unit_price,
          total_price: item.total_price,
          description: item.description,
          received_quantity: null,
          received_unit_price: null,
          received_total_price: null,
          received_at: null,
          received_by: null,
          // Copy supplier product information from supply request item
          supplier_product_id: supplyRequestItem?.supplier_product_id || null,
          item_sku: supplyRequestItem?.item_sku || null,
        };
      });

      const createdItems = await trx("purchase_order_items")
        .insert(poItems)
        .returning("*");

      await trx.commit();
      return purchaseOrder.id;
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  }

  // Get available items from a supply request (items not used in other POs)
  static async getAvailableSupplyRequestItems(supplyRequestId) {
    try {
      const items = await db("supply_request_items as sri")
        .leftJoin(
          "purchase_order_items as poi",
          "sri.id",
          "poi.supply_request_item_id"
        )
        .leftJoin("purchase_orders as po", "poi.purchase_order_id", "po.id")
        .where("sri.supply_request_id", supplyRequestId)
        .where(function () {
          this.whereNull("poi.id").orWhere("po.status", "Cancelled");
        })
        .select(
          "sri.*",
          db.raw(
            "CASE WHEN poi.id IS NOT NULL AND po.status != 'Cancelled' THEN true ELSE false END as is_used"
          )
        );

      return items.filter((item) => !item.is_used);
    } catch (error) {
      console.error("Error fetching available supply request items:", error);
      throw new Error("Failed to retrieve available supply request items");
    }
  }

  // Create manual purchase order
  static async create(poData, items) {
    const trx = await db.transaction();

    try {
      // Validate supplier only when provided (manual POs may omit supplier)
      if (poData.supplier_id) {
        await Supplier.validateForPurchaseOrder(poData.supplier_id);
      }

      // Check if PO number can be reused
      const canReuse = await this.canReusePoNumber(poData.po_number);
      if (!canReuse) {
        throw new Error(
          `PO number ${poData.po_number} already exists and is not cancelled`
        );
      }

      const [purchaseOrder] = await trx("purchase_orders")
        .insert({
          po_number: poData.po_number,
          supplier_id: poData.supplier_id || null,
          supply_request_id: poData.supply_request_id || null,
          status: poData.status || "Draft",
          total_amount: items.reduce(
            (sum, item) => sum + parseFloat(item.total_price),
            0
          ),
          order_date: poData.order_date,
          expected_delivery: poData.expected_delivery,
          notes: poData.notes,
          created_by: poData.created_by,
        })
        .returning("*");

      const poItems = items.map((item) => ({
        purchase_order_id: purchaseOrder.id,
        supply_request_item_id: item.supply_request_item_id || null,
        supplier_product_id: item.supplier_product_id || null,
        item_sku: item.item_sku || null,
        item_name: item.item_name,
        quantity: item.quantity,
        unit: item.unit,
        unit_price: item.unit_price,
        total_price: item.total_price,
        description: item.description,
      }));

      const createdItems = await trx("purchase_order_items")
        .insert(poItems)
        .returning("*");

      await trx.commit();
      return purchaseOrder.id;
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  }

  // Helper method to auto-populate supplier_id from items if missing
  static async autoPopulateSupplierId(trx, purchaseOrderId) {
    try {
      // Get the current PO
      const currentOrder = await trx("purchase_orders")
        .where("id", purchaseOrderId)
        .first();

      if (!currentOrder || currentOrder.supplier_id) {
        return currentOrder?.supplier_id || null;
      }

      // Try to get supplier_id from supply_request first
      if (currentOrder.supply_request_id) {
        const supplyRequest = await trx("supply_requests")
          .where("id", currentOrder.supply_request_id)
          .first();
        if (supplyRequest?.supplier_id) {
          return supplyRequest.supplier_id;
        }
      }

      // Try to get supplier_id from first item's supplier_product
      const firstItem = await trx("purchase_order_items")
        .where("purchase_order_id", purchaseOrderId)
        .whereNotNull("supplier_product_id")
        .first();

      if (firstItem?.supplier_product_id) {
        const supplierProduct = await trx("supplier_products")
          .where("id", firstItem.supplier_product_id)
          .first();
        if (supplierProduct?.supplier_id) {
          return supplierProduct.supplier_id;
        }
      }

      return null;
    } catch (error) {
      console.error("Error auto-populating supplier_id:", error);
      return null;
    }
  }

  // Update purchase order
  static async update(id, poData, items = null) {
    const trx = await db.transaction();

    try {
      // Get the current purchase order to check for status changes
      const currentOrder = await trx("purchase_orders").where("id", id).first();

      if (!currentOrder) {
        throw new Error("Purchase order not found");
      }

      // NEW: Auto-populate supplier_id if missing (both in current order and poData)
      if (!poData.supplier_id && !currentOrder.supplier_id) {
        const autoSupplierId = await this.autoPopulateSupplierId(trx, id);
        if (autoSupplierId) {
          poData.supplier_id = autoSupplierId;
          console.log(
            `Auto-populated supplier_id ${autoSupplierId} for PO ${id}`
          );
        }
      }

      // NEW: Validate supplier if it's being changed
      if (poData.supplier_id) {
        const supplier = await Supplier.validateForPurchaseOrder(
          poData.supplier_id
        );
      }

      const updateData = {
        supplier_id: poData.supplier_id || currentOrder.supplier_id || null,
        status: poData.status,
        total_amount: poData.total_amount,
        expected_delivery: poData.expected_delivery,
        notes: poData.notes,
        updated_at: new Date(),
      };

      // Add completion fields if status is being changed to Completed
      if (
        currentOrder.status !== "Completed" &&
        poData.status === "Completed"
      ) {
        updateData.completion_notes = poData.completion_notes || null;
        updateData.completed_at = new Date();
        updateData.completed_by = poData.completed_by || "System";
      }

      const [updatedPurchaseOrder] = await trx("purchase_orders")
        .where("id", id)
        .update(updateData)
        .returning("*");

      // AUTO-INVENTORY INTEGRATION: When PO status changes to "Completed", add items to inventory
      if (
        currentOrder.status !== "Completed" &&
        poData.status === "Completed"
      ) {
        await this.createGRNOnCompletion(trx, updatedPurchaseOrder);
      }

      if (items) {
        // Update existing items with received quantities instead of recreating them
        for (const item of items) {
          await trx("purchase_order_items")
            .where("id", item.id)
            .update({
              received_quantity: item.received_quantity || null,
              received_unit_price: item.received_unit_price || null,
              received_total_price: item.received_total_price || null,
              received_at: item.received_at || null,
              received_by: item.received_by || null,
            });
        }
      }

      // BUDGET VARIANCE: On first transition to Completed, reconcile actual vs released budget
      if (
        currentOrder.status !== "Completed" &&
        poData.status === "Completed"
      ) {
        await this.handleBudgetVarianceOnCompletion(trx, updatedPurchaseOrder);
      }

      await trx.commit();
      return updatedPurchaseOrder;
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  }

  // Handle budget return for under-delivered items when PO is completed
  static async handleBudgetReturnForUnderDelivery(trx, purchaseOrder, items) {
    try {
      // Calculate total under-delivered amount
      let totalUnderDeliveredAmount = 0;
      const underDeliveredItems = [];

      for (const item of items) {
        const orderedQty = Number(item.quantity || 0);
        const receivedQty = Number(item.received_quantity || 0);
        const unitPrice = Number(item.unit_price || 0);

        if (receivedQty < orderedQty) {
          const underDeliveredQty = orderedQty - receivedQty;
          const underDeliveredAmount = underDeliveredQty * unitPrice;
          totalUnderDeliveredAmount += underDeliveredAmount;

          underDeliveredItems.push({
            item_name: item.item_name,
            ordered_qty: orderedQty,
            received_qty: receivedQty,
            under_delivered_qty: underDeliveredQty,
            unit_price: unitPrice,
            under_delivered_amount: underDeliveredAmount,
          });
        }
      }

      // Only proceed if there's under-delivered amount to return
      if (totalUnderDeliveredAmount <= 0) {
        return;
      }

      // Get the supply request and budget release info
      const supplyRequest = await trx("supply_requests")
        .where("id", purchaseOrder.supply_request_id)
        .first();

      if (!supplyRequest) {
        console.warn(`No supply request found for PO ${purchaseOrder.id}`);
        return;
      }

      const budgetRelease = await trx("budget_releases")
        .where("supply_request_id", supplyRequest.id)
        .first();

      if (!budgetRelease) {
        console.warn(
          `No budget release found for supply request ${supplyRequest.id}`
        );
        return;
      }

      // Return unused budget to capital
      const currentBalance = await trx("finance_balances")
        .whereNull("deleted_at")
        .orderBy("balance_date", "desc")
        .first();

      const newCapital =
        Number(currentBalance?.capital || 0) + totalUnderDeliveredAmount;

      // Create new finance balance snapshot with returned amount
      await trx("finance_balances").insert({
        capital: newCapital,
        profit: Number(currentBalance?.profit || 0),
        sales_remittances: Number(currentBalance?.sales_remittances || 0),
        total_balance:
          newCapital +
          Number(currentBalance?.profit || 0) +
          Number(currentBalance?.sales_remittances || 0),
        balance_date: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      });

      // Create cash movement record for inflow (budget return)
      await trx("cash_movements").insert({
        branch_id: supplyRequest?.branch_id || null,
        movement_type: "in",
        amount: totalUnderDeliveredAmount,
        source: "budget_return",
        reference_id: purchaseOrder.id,
        reference_type: "purchase_order",
        notes: `Budget return from under-delivered PO ${purchaseOrder.po_number}. Under-delivered items: ${underDeliveredItems.map((item) => `${item.item_name} (${item.under_delivered_qty} ${item.ordered_qty > item.received_qty ? "less" : "more"})`).join(", ")}`,
        occurred_at: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      });

      console.log(
        `Returned ${totalUnderDeliveredAmount} to capital from under-delivered PO ${purchaseOrder.po_number}`
      );
    } catch (error) {
      console.error("Error handling budget return for under-delivery:", error);
      // Don't throw error here to avoid breaking the main transaction
      // Just log the error for debugging
    }
  }

  // Handle overall budget variance (excess or deficit) on PO completion
  static async handleBudgetVarianceOnCompletion(trx, purchaseOrder) {
    try {
      // Need a linked supply request and its budget release
      if (!purchaseOrder?.supply_request_id) return;

      const supplyRequest = await trx("supply_requests")
        .where("id", purchaseOrder.supply_request_id)
        .first();
      if (!supplyRequest) return;

      const budgetRelease = await trx("budget_releases")
        .where("supply_request_id", supplyRequest.id)
        .first();
      if (!budgetRelease) return; // No released budget; nothing to reconcile

      const releasedAmount = Number(budgetRelease.released_amount || 0);

      // Compute actual amount based on received totals (fallback to ordered totals)
      const poItems = await trx("purchase_order_items").where(
        "purchase_order_id",
        purchaseOrder.id
      );

      const actualAmount = poItems.reduce((sum, item) => {
        const receivedTotal = item.received_total_price;
        if (receivedTotal != null) return sum + Number(receivedTotal || 0);
        const qty =
          item.received_quantity != null
            ? item.received_quantity
            : item.quantity;
        const unitPrice =
          item.received_unit_price != null
            ? item.received_unit_price
            : item.unit_price;
        return sum + Number(qty || 0) * Number(unitPrice || 0);
      }, 0);

      const variance = Number((actualAmount - releasedAmount).toFixed(2));
      if (variance === 0) return;

      // Get latest finance balance snapshot
      const currentBalance = await trx("finance_balances")
        .whereNull("deleted_at")
        .orderBy("balance_date", "desc")
        .first();

      const currentCapital = Number(currentBalance?.capital || 0);
      const currentProfit = Number(currentBalance?.profit || 0);
      const currentSales = Number(currentBalance?.sales_remittances || 0);

      if (variance < 0) {
        // Excess budget (released > actual): inflow back to capital
        const inflow = Math.abs(variance);

        await trx("finance_balances").insert({
          capital: currentCapital + inflow,
          profit: currentProfit,
          sales_remittances: currentSales,
          total_balance: currentCapital + inflow + currentProfit + currentSales,
          balance_date: new Date(),
          created_at: new Date(),
          updated_at: new Date(),
        });

        await trx("cash_movements").insert({
          branch_id: supplyRequest?.branch_id || null,
          movement_type: "in",
          amount: inflow,
          source: "budget_return",
          reference_id: purchaseOrder.id,
          reference_type: "purchase_order",
          notes: `Budget return after PO completion ${purchaseOrder.po_number}. Released: ${releasedAmount}, Actual: ${actualAmount}`,
          occurred_at: new Date(),
          created_at: new Date(),
          updated_at: new Date(),
        });
      } else if (variance > 0) {
        // Insufficient budget (actual > released): outflow to cover deficit
        const outflow = variance;

        await trx("finance_balances").insert({
          capital: Math.max(0, currentCapital - outflow),
          profit: currentProfit,
          sales_remittances: currentSales,
          total_balance:
            Math.max(0, currentCapital - outflow) +
            currentProfit +
            currentSales,
          balance_date: new Date(),
          created_at: new Date(),
          updated_at: new Date(),
        });

        await trx("cash_movements").insert({
          branch_id: supplyRequest?.branch_id || null,
          movement_type: "out",
          amount: outflow,
          source: "po_deficit",
          reference_id: purchaseOrder.id,
          reference_type: "purchase_order",
          notes: `Budget deficit after PO completion ${purchaseOrder.po_number}. Released: ${releasedAmount}, Actual: ${actualAmount}`,
          occurred_at: new Date(),
          created_at: new Date(),
          updated_at: new Date(),
        });
      }
    } catch (error) {
      console.error("Error handling budget variance on completion:", error);
      // Do not throw; keep completion transaction intact
    }
  }

  // Add a method to cancel a purchase order
  static async cancel(id, cancellationReason = null) {
    try {
      // First get the current purchase order to access its notes
      const currentOrder = await db("purchase_orders")
        .where("id", id)
        .whereNull("deleted_at")
        .first();

      if (!currentOrder) {
        throw new Error("Purchase order not found");
      }

      const [cancelledPurchaseOrder] = await db("purchase_orders")
        .where("id", id)
        .update({
          status: "Cancelled",
          notes: cancellationReason
            ? `${currentOrder.notes || ""}\n\nCANCELLED: ${cancellationReason}`
            : currentOrder.notes,
          updated_at: new Date(),
        })
        .returning("*");

      return cancelledPurchaseOrder;
    } catch (error) {
      throw error;
    }
  }

  // Delete purchase order
  static async delete(id) {
    try {
      const [deletedPurchaseOrder] = await db("purchase_orders")
        .where("id", id)
        .update({ deleted_at: new Date() })
        .returning("*");

      return deletedPurchaseOrder;
    } catch (error) {
      throw error;
    }
  }

  // Log item return
  static async logReturn(returnData) {
    try {
      const [itemReturn] = await db("item_returns")
        .insert({
          purchase_order_id: returnData.purchase_order_id,
          purchase_order_item_id: returnData.purchase_order_item_id,
          return_quantity: returnData.return_quantity,
          return_reason: returnData.return_reason,
          notes: returnData.notes,
          logged_by: returnData.logged_by,
        })
        .returning("*");

      return itemReturn.id;
    } catch (error) {
      throw error;
    }
  }

  // Get approved supply requests for PO creation
  static async getApprovedSupplyRequests() {
    try {
      return await db("supply_requests")
        .where("request_status", "Completed")
        .orderBy("created_at", "desc");
    } catch (error) {
      throw error;
    }
  }

  // Get supply request items
  static async getSupplyRequestItems(supplyRequestId) {
    try {
      return await db("supply_request_items")
        .where("supply_request_id", supplyRequestId)
        .orderBy("item_number");
    } catch (error) {
      throw error;
    }
  }

  // Get return statistics
  static async getReturnStats() {
    try {
      // First, let's get basic stats without status filtering
      const basicStats = await db("item_returns")
        .select(db.raw("COUNT(*) as total_returns"))
        .first();

      // Get status-specific counts using proper enum values
      const statusStats = await db("item_returns")
        .select(
          db.raw(
            "COUNT(CASE WHEN status = 'Pending' THEN 1 END) as pending_returns"
          ),
          db.raw(
            "COUNT(CASE WHEN status = 'Processed' THEN 1 END) as processed_returns"
          ),
          db.raw(
            "COUNT(CASE WHEN status = 'Completed' THEN 1 END) as completed_returns"
          )
        )
        .first();

      // Combine the stats
      return {
        total_returns: parseInt(basicStats.total_returns) || 0,
        pending_returns: parseInt(statusStats.pending_returns) || 0,
        processed_returns: parseInt(statusStats.processed_returns) || 0,
        completed_returns: parseInt(statusStats.completed_returns) || 0,
      };
    } catch (error) {
      // Return default stats if there's an error
      console.error("Error fetching return stats:", error);
      return {
        total_returns: 0,
        pending_returns: 0,
        processed_returns: 0,
        completed_returns: 0,
      };
    }
  }

  // Create GRN when PO is completed (instead of auto-adding to inventory)
  static async createGRNOnCompletion(trx, purchaseOrder) {
    try {
      console.log(
        `PO ${purchaseOrder.po_number} completed. GRN should be created manually for receipt.`
      );

      // Note: GRN creation is now manual through the GRN workflow
      // This ensures proper quality inspection and partial receipt handling
    } catch (error) {
      console.error("Error in PO completion workflow:", error);
      throw error;
    }
  }

  // Helper method to add individual inventory item
  static async addInventoryItem(trx, itemData) {
    // Generate batch number if not provided
    const batchNumber =
      itemData.batch_number ||
      this.generateBatchNumber(
        itemData.item_type_id,
        itemData.supplier_id,
        itemData.received_date ? new Date(itemData.received_date) : new Date()
      );

    const [newItem] = await trx("inventory_items")
      .insert({
        item_type_id: itemData.item_type_id,
        supplier_id: itemData.supplier_id || null,
        purchase_order_id: itemData.purchase_order_id || null,
        batch_number: batchNumber, // Use generated batch number
        quantity: itemData.quantity,
        unit_cost: itemData.unit_cost,
        total_value: itemData.quantity * itemData.unit_cost,
        expiry_date: itemData.expiry_date || null,
        received_date: itemData.received_date || new Date(),
        status: "available",
        notes: itemData.notes || null,
        received_by: itemData.received_by,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning("*");

    // Log the transaction
    await trx("inventory_transactions").insert({
      inventory_item_id: newItem.id,
      transaction_type: "receipt",
      quantity: itemData.quantity,
      unit_cost: itemData.unit_cost,
      total_value: itemData.quantity * itemData.unit_cost,
      reference_number: itemData.reference_number || null,
      reason: "PO completion - automatic receipt",
      notes: itemData.notes || null,
      performed_by: itemData.received_by,
      transaction_date: new Date(),
      created_at: new Date(),
      updated_at: new Date(),
    });

    return newItem;
  }

  // Add this function at the top of the PurchaseOrder class
  static generateBatchNumber(
    itemTypeId,
    supplierId,
    poNumber,
    date = new Date()
  ) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    // Format: PO-ITEM-SUPPLIER-YYYYMMDD
    return `PO-${poNumber}-ITEM-${itemTypeId}-${supplierId || "NONE"}-${year}${month}${day}`;
  }

  // Get comprehensive statistics for a purchase order including ordered vs received quantities
  static async getOrderStatistics(purchaseOrderId) {
    try {
      const purchaseOrder = await db("purchase_orders")
        .where("id", purchaseOrderId)
        .first();

      if (!purchaseOrder) {
        throw new Error("Purchase order not found");
      }

      // Get all items with ordered and received quantities
      const items = await db("purchase_order_items as poi")
        .leftJoin("supplier_products as sp", "poi.supplier_product_id", "sp.id")
        .select(
          "poi.id",
          "poi.item_name",
          "poi.quantity as ordered_quantity",
          "poi.unit",
          "poi.unit_price as ordered_unit_price",
          "poi.total_price as ordered_total_price",
          "poi.received_quantity",
          "poi.received_unit_price",
          "poi.received_total_price",
          "poi.supplier_product_id",
          "sp.product_name as supplier_product_name",
          "sp.sku as supplier_sku"
        )
        .where("poi.purchase_order_id", purchaseOrderId);

      // Get return statistics for each item
      const itemStats = await Promise.all(
        items.map(async (item) => {
          // Get total returned quantity for this item
          const returnData = await db("item_returns")
            .where("purchase_order_item_id", item.id)
            .whereIn("status", ["Pending", "Processed", "Completed"])
            .select(
              db.raw("COALESCE(SUM(return_quantity), 0) as total_returned"),
              db.raw(
                "COUNT(CASE WHEN status = 'Pending' THEN 1 END) as pending_returns"
              ),
              db.raw(
                "COUNT(CASE WHEN status = 'Completed' THEN 1 END) as completed_returns"
              )
            )
            .first();

          // Calculate actual received (received - completed returns)
          const receivedQty = parseFloat(item.received_quantity || 0);
          const totalReturned = parseFloat(returnData.total_returned || 0);
          const actualReceived = receivedQty - totalReturned;

          // Calculate variance
          const orderedQty = parseFloat(item.ordered_quantity);
          const variance = receivedQty - orderedQty;
          const variancePercentage =
            orderedQty > 0 ? ((variance / orderedQty) * 100).toFixed(2) : 0;

          return {
            ...item,
            ordered_quantity: orderedQty,
            received_quantity: receivedQty,
            total_returned: totalReturned,
            actual_received: actualReceived,
            variance: variance,
            variance_percentage: variancePercentage,
            pending_returns: parseInt(returnData.pending_returns || 0),
            completed_returns: parseInt(returnData.completed_returns || 0),
          };
        })
      );

      // Calculate totals
      const totals = {
        total_ordered_amount: items.reduce(
          (sum, item) => sum + parseFloat(item.ordered_total_price || 0),
          0
        ),
        total_received_amount: items.reduce(
          (sum, item) => sum + parseFloat(item.received_total_price || 0),
          0
        ),
        total_items: items.length,
        items_fully_received: itemStats.filter(
          (item) => item.received_quantity >= item.ordered_quantity
        ).length,
        items_partially_received: itemStats.filter(
          (item) =>
            item.received_quantity > 0 &&
            item.received_quantity < item.ordered_quantity
        ).length,
        items_not_received: itemStats.filter(
          (item) => !item.received_quantity || item.received_quantity === 0
        ).length,
        items_with_returns: itemStats.filter((item) => item.total_returned > 0)
          .length,
        items_with_pending_returns: itemStats.filter(
          (item) => item.pending_returns > 0
        ).length,
      };

      return {
        purchase_order: purchaseOrder,
        items: itemStats,
        totals: totals,
      };
    } catch (error) {
      console.error("Error getting order statistics:", error);
      throw error;
    }
  }

  // Get supplier product fulfillment rate
  static async getSupplierProductFulfillment(supplierId, productId = null) {
    try {
      let query = db("purchase_order_items as poi")
        .join("purchase_orders as po", "poi.purchase_order_id", "po.id")
        .leftJoin("supplier_products as sp", "poi.supplier_product_id", "sp.id")
        .where("po.supplier_id", supplierId)
        .whereNotNull("poi.supplier_product_id")
        .whereIn("po.status", ["Completed", "Received"]);

      if (productId) {
        query = query.where("poi.supplier_product_id", productId);
      }

      const results = await query
        .select(
          "poi.supplier_product_id",
          "sp.product_name",
          "sp.sku",
          db.raw("SUM(poi.quantity) as total_ordered"),
          db.raw("SUM(COALESCE(poi.received_quantity, 0)) as total_received"),
          db.raw("COUNT(DISTINCT po.id) as order_count")
        )
        .groupBy("poi.supplier_product_id", "sp.product_name", "sp.sku");

      return results.map((row) => ({
        supplier_product_id: row.supplier_product_id,
        product_name: row.product_name,
        sku: row.sku,
        total_ordered: parseFloat(row.total_ordered || 0),
        total_received: parseFloat(row.total_received || 0),
        order_count: parseInt(row.order_count || 0),
        fulfillment_rate:
          row.total_ordered > 0
            ? ((row.total_received / row.total_ordered) * 100).toFixed(2)
            : 0,
      }));
    } catch (error) {
      console.error("Error getting supplier product fulfillment:", error);
      throw error;
    }
  }
}

module.exports = PurchaseOrder;
