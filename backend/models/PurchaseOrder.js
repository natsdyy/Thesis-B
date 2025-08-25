const { db } = require("../config/database");
const Supplier = require("./Supplier");
const Inventory = require("./Inventory");

class PurchaseOrder {
  // Get all purchase orders with related data
  static async getAll(includeDeleted = false) {
    try {
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

      const purchaseOrders = await query.orderBy("po.created_at", "desc");

      // Get items and GRN count for each purchase order
      for (let po of purchaseOrders) {
        po.items = await this.getItems(po.id);
        po.item_count = po.items.length;

        // Add GRN count
        const grnCount = await db("goods_receipt_notes")
          .where("purchase_order_id", po.id)
          .whereNull("deleted_at")
          .count("* as count")
          .first();
        po.grn_count = parseInt(grnCount.count);
      }

      return purchaseOrders;
    } catch (error) {
      throw error;
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

  // Get items for a purchase order
  static async getItems(purchaseOrderId) {
    try {
      return await db("purchase_order_items as poi")
        .leftJoin(
          "supply_request_items as sri",
          "poi.supply_request_item_id",
          "sri.id"
        )
        .select("poi.*", "sri.item_number as original_item_number")
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
      // NEW: Validate supplier before creating PO
      const supplier = await Supplier.validateForPurchaseOrder(supplierId);

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

      // Create purchase order
      const [purchaseOrder] = await trx("purchase_orders")
        .insert({
          po_number: poData.po_number,
          supplier_id: supplierId,
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

  // Create manual purchase order
  static async create(poData, items) {
    const trx = await db.transaction();

    try {
      // NEW: Validate supplier before creating PO
      const supplier = await Supplier.validateForPurchaseOrder(
        poData.supplier_id
      );

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
          supplier_id: poData.supplier_id,
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

  // Update purchase order
  static async update(id, poData, items = null) {
    const trx = await db.transaction();

    try {
      // Get the current purchase order to check for status changes
      const currentOrder = await trx("purchase_orders").where("id", id).first();

      if (!currentOrder) {
        throw new Error("Purchase order not found");
      }

      // NEW: Validate supplier if it's being changed
      if (poData.supplier_id) {
        const supplier = await Supplier.validateForPurchaseOrder(
          poData.supplier_id
        );
      }

      const [updatedPurchaseOrder] = await trx("purchase_orders")
        .where("id", id)
        .update({
          supplier_id: poData.supplier_id,
          status: poData.status,
          total_amount: poData.total_amount,
          expected_delivery: poData.expected_delivery,
          notes: poData.notes,
          updated_at: new Date(),
        })
        .returning("*");

      // AUTO-INVENTORY INTEGRATION: When PO status changes to "Completed", add items to inventory
      if (
        currentOrder.status !== "Completed" &&
        poData.status === "Completed"
      ) {
        await this.createGRNOnCompletion(trx, updatedPurchaseOrder);
      }

      if (items) {
        // Delete existing items
        await trx("purchase_order_items").where("purchase_order_id", id).del();

        // Insert new items
        const poItems = items.map((item) => ({
          purchase_order_id: id,
          supply_request_item_id: item.supply_request_item_id || null,
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
      }

      await trx.commit();
      return updatedPurchaseOrder;
    } catch (error) {
      await trx.rollback();
      throw error;
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
}

module.exports = PurchaseOrder;
