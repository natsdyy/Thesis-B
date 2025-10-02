const { db } = require("../config/database");
const {
  getCurrentPhilippineTime,
  getCurrentPhilippineDate,
  formatPhilippineTime,
} = require("../utils/timezoneUtils");

class Inventory {
  // Get all inventory categories
  static async getCategories() {
    try {
      return await db("inventory_categories")
        .whereNull("deleted_at")
        .where("is_active", true)
        .orderBy("name");
    } catch (error) {
      console.error("Error fetching inventory categories:", error);
      throw new Error("Failed to fetch inventory categories");
    }
  }

  // Get item types by category
  static async getItemTypesByCategory(categoryId) {
    try {
      return await db("inventory_item_types")
        .where("category_id", categoryId)
        .whereNull("deleted_at")
        .where("is_active", true)
        .orderBy("name");
    } catch (error) {
      console.error("Error fetching item types:", error);
      throw new Error("Failed to fetch item types");
    }
  }

  // Get all item types with category info
  static async getAllItemTypes() {
    try {
      return await db("inventory_item_types as it")
        .leftJoin("inventory_categories as ic", "it.category_id", "ic.id")
        .leftJoin("employees as e", "it.approved_by", "e.id")
        .select(
          "it.*",
          "ic.name as category_name",
          "ic.description as category_description",
          db.raw("CONCAT(e.first_name, ' ', e.last_name) as approved_by_name")
        )
        .whereNull("it.deleted_at")
        .whereNull("ic.deleted_at")
        .where("it.is_active", true)
        .where("ic.is_active", true)
        .orderBy(["ic.name", "it.name"]);
    } catch (error) {
      console.error("Error fetching all item types:", error);
      throw new Error("Failed to fetch item types");
    }
  }

  // Get draft item types (pending approval)
  static async getDraftItemTypes() {
    try {
      return await db("inventory_item_types as it")
        .leftJoin("inventory_categories as ic", "it.category_id", "ic.id")
        .select(
          "it.*",
          "ic.name as category_name",
          "ic.description as category_description"
        )
        .whereNull("it.deleted_at")
        .whereNull("ic.deleted_at")
        .where("it.status", "draft")
        .where("ic.is_active", true)
        .orderBy(["ic.name", "it.name"]);
    } catch (error) {
      console.error("Error fetching draft item types:", error);
      throw new Error("Failed to fetch draft item types");
    }
  }

  // Get current inventory with aggregated data
  static async getCurrentInventory(filters = {}) {
    try {
      // First, automatically update status of expired items
      const today = getCurrentPhilippineDate();
      await db("inventory_items")
        .where("expiry_date", "<=", today)
        .where("status", "available")
        .update({
          status: "expired",
          updated_at: getCurrentPhilippineTime(),
        });

      let query = db("inventory_items as ii")
        .leftJoin("inventory_item_types as it", "ii.item_type_id", "it.id")
        .leftJoin("inventory_categories as ic", "it.category_id", "ic.id")
        .leftJoin("suppliers as s", "ii.supplier_id", "s.id")
        .select(
          "ii.*",
          "ii.item_name", // Make sure this line is included
          "it.name as item_type_name",
          db.raw(
            "COALESCE(ii.unit_of_measure, it.unit_of_measure) as unit_of_measure"
          ),
          "it.requires_expiry",
          "it.requires_batch",
          "it.first_received_at",
          "it.receipts_count",
          "ic.name as category_name",
          "s.name as supplier_name"
        )
        .whereNull("ii.deleted_at")
        .where("ii.quantity", ">", 0) // Exclude disposed items (quantity = 0)
        .whereIn("ii.status", ["available", "expired"]); // Include expired items

      // Apply filters
      if (filters.category_id) {
        query = query.where("it.category_id", filters.category_id);
      }
      if (filters.item_type_id) {
        query = query.where("ii.item_type_id", filters.item_type_id);
      }
      if (filters.expiry_within_days) {
        const futureDate = getCurrentPhilippineTime();
        futureDate.setDate(futureDate.getDate() + filters.expiry_within_days);
        const futureISO = formatPhilippineTime(futureDate, "date");
        query = query.where("ii.expiry_date", "<=", futureISO);
      }
      if (filters.supplier_id) {
        query = query.where("ii.supplier_id", filters.supplier_id);
      }

      return await query.orderBy(["ic.name", "it.name", "ii.received_date"]);
    } catch (error) {
      console.error("Error fetching current inventory:", error);
      throw new Error("Failed to fetch current inventory");
    }
  }

  // Get disposed items for reporting
  static async getDisposedItems(filters = {}) {
    try {
      let query = db("inventory_items as ii")
        .leftJoin("inventory_item_types as it", "ii.item_type_id", "it.id")
        .leftJoin("inventory_categories as ic", "it.category_id", "ic.id")
        .leftJoin("suppliers as s", "ii.supplier_id", "s.id")
        .leftJoin("inventory_transactions as tr", function () {
          this.on("tr.inventory_item_id", "ii.id").andOnVal(
            "tr.adjustment_type",
            "disposal"
          );
        })
        .select(
          "ii.*",
          "ii.item_name",
          "it.name as item_type_name",
          "it.unit_of_measure",
          "ic.name as category_name",
          "s.name as supplier_name",
          "tr.transaction_date as disposed_date",
          "tr.disposal_cost",
          "tr.performed_by as disposed_by",
          "tr.reason as disposal_reason",
          "tr.notes as disposal_notes",
          db.raw("COALESCE(tr.quantity, 0) as original_quantity")
        )
        .whereNull("ii.deleted_at")
        .where("ii.quantity", "=", 0) // Only disposed items (quantity = 0)
        .where("ii.status", "expired") // Disposed items keep 'expired' status
        .whereNotNull("tr.adjustment_type"); // Must have disposal transaction

      // Apply filters
      if (filters.category_id) {
        query = query.where("it.category_id", filters.category_id);
      }
      if (filters.item_type_id) {
        query = query.where("ii.item_type_id", filters.item_type_id);
      }
      if (filters.disposed_from && filters.disposed_to) {
        query = query.whereBetween("tr.transaction_date", [
          filters.disposed_from,
          filters.disposed_to,
        ]);
      }

      const disposedItems = await query.orderBy("tr.transaction_date", "desc");
      return disposedItems;
    } catch (error) {
      console.error("Error fetching disposed items:", error);
      throw new Error("Failed to fetch disposed items");
    }
  }

  // Get inventory summary by category with detailed breakdown
  static async getInventorySummary() {
    try {
      // Get category-level summary
      const categorySummary = await db("inventory_items as ii")
        .leftJoin("inventory_item_types as it", "ii.item_type_id", "it.id")
        .leftJoin("inventory_categories as ic", "it.category_id", "ic.id")
        .select(
          "ic.id as category_id",
          "ic.name as category_name",
          "ic.is_active",
          db.raw("COUNT(DISTINCT ii.item_type_id) as unique_items"),
          db.raw("SUM(ii.quantity) as total_quantity"),
          db.raw("SUM(ii.total_value) as total_value"),
          db.raw("COUNT(ii.id) as total_entries")
        )
        .whereNull("ii.deleted_at")
        .where("ii.status", "available")
        .groupBy("ic.id", "ic.name", "ic.is_active")
        .orderBy("ic.name");

      // Get detailed breakdown by item type within each category
      const itemTypeBreakdown = await db("inventory_items as ii")
        .leftJoin("inventory_item_types as it", "ii.item_type_id", "it.id")
        .leftJoin("inventory_categories as ic", "it.category_id", "ic.id")
        .select(
          "ic.id as category_id",
          "ic.name as category_name",
          "it.id as item_type_id",
          "it.name as item_type_name",
          "it.unit_of_measure",
          db.raw("SUM(ii.quantity) as quantity"),
          db.raw("SUM(ii.total_value) as total_value"),
          db.raw("COUNT(ii.id) as batch_count")
        )
        .whereNull("ii.deleted_at")
        .where("ii.status", "available")
        .groupBy("ic.id", "ic.name", "it.id", "it.name", "it.unit_of_measure")
        .orderBy("ic.name")
        .orderBy("it.name");

      // Group item types by category
      const breakdownByCategory = {};
      itemTypeBreakdown.forEach((item) => {
        if (!breakdownByCategory[item.category_id]) {
          breakdownByCategory[item.category_id] = [];
        }
        breakdownByCategory[item.category_id].push({
          item_type_id: item.item_type_id,
          item_type_name: item.item_type_name,
          unit_of_measure: item.unit_of_measure,
          quantity: parseFloat(item.quantity || 0),
          total_value: parseFloat(item.total_value || 0),
          batch_count: parseInt(item.batch_count || 0),
        });
      });

      // Combine category summary with detailed breakdown
      const enhancedSummary = categorySummary.map((category) => {
        // Determine category status based on multiple factors
        const hasItems = parseInt(category.unique_items || 0) > 0;
        const hasStock = parseFloat(category.total_quantity || 0) > 0;
        const isActive = category.is_active === true;
        const totalValue = parseFloat(category.total_value || 0);

        // Category is considered "active" if:
        // 1. It's marked as active in the database AND
        // 2. It has items AND
        // 3. It has stock
        let categoryStatus;
        let statusDescription;

        if (!isActive) {
          categoryStatus = "disabled";
          statusDescription = "Category is disabled in the system";
        } else if (!hasItems) {
          categoryStatus = "empty";
          statusDescription = "Category has no items configured";
        } else if (!hasStock) {
          categoryStatus = "out_of_stock";
          statusDescription = "Category has items but no current stock";
        } else if (totalValue > 10000) {
          categoryStatus = "active";
          statusDescription =
            "Category has active items with good stock levels";
        } else {
          categoryStatus = "low_stock";
          statusDescription = "Category has items with limited stock";
        }

        return {
          ...category,
          unique_items: parseInt(category.unique_items || 0),
          total_quantity: parseFloat(category.total_quantity || 0),
          total_value: parseFloat(category.total_value || 0),
          total_entries: parseInt(category.total_entries || 0),
          item_breakdown: breakdownByCategory[category.category_id] || [],
          category_status: categoryStatus,
          status_description: statusDescription,
          is_active: isActive,
          has_items: hasItems,
          has_stock: hasStock,
        };
      });

      return enhancedSummary;
    } catch (error) {
      console.error("Error fetching inventory summary:", error);
      throw new Error("Failed to fetch inventory summary");
    }
  }

  static generateBatchNumber(
    itemTypeId,
    supplierId,
    date = getCurrentPhilippineTime()
  ) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hour = String(date.getHours()).padStart(2, "0");
    const minute = String(date.getMinutes()).padStart(2, "0");

    // Format: ITEM-SUPPLIER-YYYYMMDD-HHMM
    return `ITEM-${itemTypeId}-${supplierId || "NONE"}-${year}${month}${day}-${hour}${minute}`;
  }

  // Add inventory item (usually from PO receipt)
  static async addInventoryItem(itemData) {
    const trx = await db.transaction();
    try {
      // Read item type counters
      const itemType = await trx("inventory_item_types")
        .where("id", itemData.item_type_id)
        .first();

      if (!itemType) {
        throw new Error("Invalid item_type_id");
      }

      const isFirstReceipt = parseInt(itemType.receipts_count || 0, 10) === 0;

      // Set default item_name if not provided
      if (!itemData.item_name) {
        itemData.item_name = itemType.name;
      }

      // Generate batch number if not provided
      const batchNumber =
        itemData.batch_number ||
        this.generateBatchNumber(
          itemData.item_type_id,
          itemData.supplier_id,
          itemData.received_date
            ? new Date(itemData.received_date)
            : getCurrentPhilippineTime()
        );

      let targetItem;
      // If the item type does not require batch tracking, merge into an existing row
      if (itemType && itemType.requires_batch === false) {
        // Find an existing available row for this item_type
        targetItem = await trx("inventory_items")
          .where({ item_type_id: itemData.item_type_id })
          .whereNull("deleted_at")
          .where("status", "available")
          .first();

        if (targetItem) {
          // Weighted average unit cost
          const existingQty = parseFloat(targetItem.quantity || 0);
          const existingValue = parseFloat(targetItem.total_value || 0);
          const incomingQty = parseFloat(itemData.quantity || 0);
          const incomingValue =
            parseFloat(itemData.unit_cost || 0) * incomingQty;
          const newQty = existingQty + incomingQty;
          const newTotalValue = existingValue + incomingValue;
          const newUnitCost =
            newQty > 0 ? newTotalValue / newQty : targetItem.unit_cost;

          await trx("inventory_items").where({ id: targetItem.id }).update({
            quantity: newQty,
            total_value: newTotalValue,
            unit_cost: newUnitCost,
            updated_at: getCurrentPhilippineTime(),
          });

          // Log the transaction against the existing row
          await trx("inventory_transactions").insert({
            inventory_item_id: targetItem.id,
            transaction_type: "receipt",
            quantity: incomingQty,
            unit_cost: itemData.unit_cost,
            total_value: incomingValue,
            reference_number: itemData.reference_number || null,
            reason: isFirstReceipt
              ? "First receipt for this item type"
              : "Replenishment",
            notes: itemData.notes || null,
            performed_by: itemData.received_by,
            transaction_date: getCurrentPhilippineTime(),
            is_first_receipt: isFirstReceipt,
            created_at: getCurrentPhilippineTime(),
            updated_at: getCurrentPhilippineTime(),
          });
        }
      }

      // If batching is required or no existing row to merge, create a new batch
      if (!targetItem) {
        const [newItem] = await trx("inventory_items")
          .insert({
            item_type_id: itemData.item_type_id,
            item_name: itemData.item_name, // Include item_name
            supplier_id: itemData.supplier_id || null,
            purchase_order_id: itemData.purchase_order_id || null,
            unit_of_measure: itemData.unit_of_measure || null,
            batch_number: batchNumber,
            quantity: itemData.quantity,
            unit_cost: itemData.unit_cost,
            total_value: itemData.quantity * itemData.unit_cost,
            expiry_date: itemData.expiry_date || null,
            received_date: itemData.received_date || getCurrentPhilippineTime(),
            status: "available",
            notes: itemData.notes || null,
            received_by: itemData.received_by || "System",
            created_at: getCurrentPhilippineTime(),
            updated_at: getCurrentPhilippineTime(),
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
          reason: isFirstReceipt
            ? "First receipt for this item type"
            : "Replenishment",
          notes: itemData.notes || null,
          performed_by: itemData.received_by,
          transaction_date: getCurrentPhilippineTime(),
          is_first_receipt: isFirstReceipt,
          created_at: getCurrentPhilippineTime(),
          updated_at: getCurrentPhilippineTime(),
        });
      }

      // Update item type counters
      const newReceiptsCount = parseInt(itemType.receipts_count || 0, 10) + 1;
      const updates = {
        receipts_count: newReceiptsCount,
        updated_at: getCurrentPhilippineTime(),
      };
      if (isFirstReceipt) {
        updates.first_received_at = getCurrentPhilippineTime();
      }
      await trx("inventory_item_types")
        .where("id", itemData.item_type_id)
        .update(updates);

      await trx.commit();
      return newItem;
    } catch (error) {
      await trx.rollback();
      console.error("Error adding inventory item:", error);
      throw new Error("Failed to add inventory item");
    }
  }

  // Enhanced updateInventoryQuantity with transaction support
  static async updateInventoryQuantity(
    inventoryItemId,
    transactionData,
    trx = null
  ) {
    const dbTrx = trx || (await db.transaction());

    try {
      // Get current item
      const currentItem = await dbTrx("inventory_items")
        .where("id", inventoryItemId)
        .first();

      if (!currentItem) {
        throw new Error("Inventory item not found");
      }

      // Block consuming or transferring expired items
      if (
        currentItem.status === "expired" &&
        ["consumption", "transfer"].includes(transactionData.transaction_type)
      ) {
        throw new Error("Operation not allowed on expired item");
      }

      let newQuantity;
      let newTotalValue;
      // Quantity to log in the transaction row. For disposal, this should be the
      // full current quantity being disposed, not the user-provided value.
      let transactionLoggedQuantity = parseFloat(transactionData.quantity || 0);
      let newStatus = currentItem.status;

      // Handle different transaction types
      switch (transactionData.transaction_type) {
        case "consumption":
          newQuantity =
            parseFloat(currentItem.quantity) -
            parseFloat(transactionData.quantity);
          if (newQuantity < 0) {
            throw new Error("Insufficient stock available");
          }
          break;

        case "adjustment":
          switch (transactionData.adjustment_type) {
            case "set_quantity":
              newQuantity = parseFloat(transactionData.quantity);
              break;
            case "add_quantity":
              newQuantity =
                parseFloat(currentItem.quantity) +
                parseFloat(transactionData.quantity);
              break;
            case "reduce_quantity":
              newQuantity =
                parseFloat(currentItem.quantity) -
                parseFloat(transactionData.quantity);
              if (newQuantity < 0) {
                throw new Error("Insufficient stock for reduction");
              }
              break;
            case "mark_expired":
              newQuantity = parseFloat(currentItem.quantity);
              newStatus = "expired";
              break;
            case "mark_damaged":
              newQuantity = parseFloat(currentItem.quantity);
              newStatus = "damaged";
              break;
            case "disposal": {
              // Only allow disposal for expired items; keep status as 'expired' to satisfy enum
              const todayIso = getCurrentPhilippineDate();
              const isExpiredByDate =
                currentItem.expiry_date && currentItem.expiry_date <= todayIso;
              const isAlreadyExpired = currentItem.status === "expired";
              if (!isExpiredByDate && !isAlreadyExpired) {
                throw new Error("Only expired items can be disposed");
              }
              // Log the quantity being disposed as the item's current quantity
              transactionLoggedQuantity = parseFloat(currentItem.quantity || 0);
              // Set the remaining quantity to zero after disposal
              newQuantity = 0; // Dispose all quantity
              newStatus = "expired";
              break;
            }
            case "set_expiry_date":
              newQuantity = parseFloat(currentItem.quantity);
              // status unchanged; only expiry_date is updated below
              break;
            default:
              throw new Error("Invalid adjustment type");
          }
          break;

        case "production_consumption":
          // Production consumption behaves like regular consumption
          newQuantity =
            parseFloat(currentItem.quantity) -
            parseFloat(transactionData.quantity);
          if (newQuantity < 0) {
            throw new Error("Insufficient stock available for production");
          }
          break;

        case "production_output":
          // Production output behaves like receipt (add to quantity)
          newQuantity =
            parseFloat(currentItem.quantity) +
            parseFloat(transactionData.quantity);
          break;

        default:
          // For other transaction types, use the quantity as adjustment
          newQuantity =
            parseFloat(currentItem.quantity) +
            parseFloat(transactionData.quantity);
      }

      // Update status based on quantity
      if (newQuantity <= 0 && newStatus === "available") {
        newStatus = "consumed";
      }

      newTotalValue = newQuantity * parseFloat(currentItem.unit_cost);

      // Update inventory item
      // Update inventory item
      const [updatedItem] = await dbTrx("inventory_items")
        .where("id", inventoryItemId)
        .update({
          quantity: newQuantity,
          total_value: newQuantity * parseFloat(currentItem.unit_cost),
          status: newStatus,
          expiry_date:
            transactionData.adjustment_type === "set_expiry_date"
              ? transactionData.new_expiry_date
              : currentItem.expiry_date,
          updated_at: getCurrentPhilippineTime(),
        })
        .returning("*");

      // Log the transaction
      await dbTrx("inventory_transactions").insert({
        inventory_item_id: inventoryItemId,
        transaction_type: transactionData.transaction_type,
        quantity: transactionLoggedQuantity,
        unit_cost: currentItem.unit_cost,
        total_value:
          parseFloat(transactionLoggedQuantity) *
          parseFloat(currentItem.unit_cost),
        reference_number: transactionData.reference_number || null,
        reason: transactionData.reason || null,
        notes: transactionData.notes || null,
        performed_by: transactionData.performed_by,
        transaction_date:
          transactionData.transaction_date || getCurrentPhilippineTime(),
        adjustment_type: transactionData.adjustment_type || null,
        disposal_cost: transactionData.disposal_cost || null,
        audit_action:
          transactionData.audit_action ||
          (transactionData.reason === "Branch Distribution"
            ? "transfer_out"
            : null),
        // For clarity in reporting, mark transaction_type as 'disposal' when disposing
        // but keep inventory_items.status as 'expired' due to enum constraint.
        created_at: getCurrentPhilippineTime(),
        updated_at: getCurrentPhilippineTime(),
      });

      if (!trx) {
        await dbTrx.commit();
      }

      return updatedItem;
    } catch (error) {
      if (!trx) {
        await dbTrx.rollback();
      }
      console.error("Error updating inventory quantity:", error);
      throw error;
    }
  }

  // Get inventory item by ID with full details
  static async getInventoryItemById(id) {
    try {
      return await db("inventory_items as ii")
        .leftJoin("inventory_item_types as it", "ii.item_type_id", "it.id")
        .leftJoin("inventory_categories as ic", "it.category_id", "ic.id")
        .leftJoin("suppliers as s", "ii.supplier_id", "s.id")
        .select(
          "ii.*",
          "it.name as item_type_name",
          db.raw(
            "COALESCE(ii.unit_of_measure, it.unit_of_measure) as unit_of_measure"
          ),
          "it.requires_expiry",
          "it.requires_batch",
          "ic.name as category_name",
          "s.name as supplier_name"
        )
        .where("ii.id", id)
        .first();
    } catch (error) {
      console.error("Error fetching inventory item:", error);
      throw new Error("Failed to fetch inventory item");
    }
  }

  // Enhanced getRecentActivity with better joins
  static async getRecentActivity(limit = 10) {
    try {
      return await db("inventory_transactions as it")
        .leftJoin("inventory_items as ii", "it.inventory_item_id", "ii.id")
        .leftJoin("inventory_item_types as iit", "ii.item_type_id", "iit.id")
        .leftJoin("inventory_categories as ic", "iit.category_id", "ic.id")
        .select(
          "it.*",
          "ii.item_name",
          "ii.batch_number",
          "iit.name as item_type_name",
          "iit.unit_of_measure",
          "ic.name as category_name"
        )
        .whereNull("ii.deleted_at")
        .orderBy("it.transaction_date", "desc")
        .limit(limit);
    } catch (error) {
      console.error("Error fetching recent activity:", error);
      throw new Error("Failed to fetch recent activity");
    }
  }

  // Get all transactions with filters and pagination
  static async getAllTransactions(filters = {}, limit = 20, offset = 0) {
    try {
      let query = db("inventory_transactions as it")
        .leftJoin("inventory_items as ii", "it.inventory_item_id", "ii.id")
        .leftJoin("inventory_item_types as iit", "ii.item_type_id", "iit.id")
        .leftJoin("inventory_categories as ic", "iit.category_id", "ic.id")
        .select(
          "it.*",
          "ii.item_name",
          "ii.batch_number",
          "iit.name as item_type_name",
          "iit.unit_of_measure",
          "ic.name as category_name"
        )
        .whereNull("ii.deleted_at");

      // Apply filters
      if (filters.search) {
        query = query.where(function () {
          this.whereILike("ii.item_name", `%${filters.search}%`)
            .orWhereILike("iit.name", `%${filters.search}%`)
            .orWhereILike("ic.name", `%${filters.search}%`)
            .orWhereILike("it.reference_number", `%${filters.search}%`)
            .orWhereILike("it.reason", `%${filters.search}%`)
            .orWhereILike("it.performed_by", `%${filters.search}%`);
        });
      }

      if (filters.transaction_type) {
        query = query.where("it.transaction_type", filters.transaction_type);
      }

      if (filters.date_from) {
        query = query.where("it.transaction_date", ">=", filters.date_from);
      }

      if (filters.date_to) {
        query = query.where(
          "it.transaction_date",
          "<=",
          filters.date_to + " 23:59:59"
        );
      }

      if (filters.category_id) {
        query = query.where("ic.id", filters.category_id);
      }

      if (filters.item_type_id) {
        query = query.where("iit.id", filters.item_type_id);
      }

      // Get total count for pagination
      const countQuery = db("inventory_transactions as it")
        .leftJoin("inventory_items as ii", "it.inventory_item_id", "ii.id")
        .leftJoin("inventory_item_types as iit", "ii.item_type_id", "iit.id")
        .leftJoin("inventory_categories as ic", "iit.category_id", "ic.id")
        .whereNull("ii.deleted_at");

      // Apply the same filters to count query
      if (filters.search) {
        countQuery.where(function () {
          this.whereILike("ii.item_name", `%${filters.search}%`)
            .orWhereILike("iit.name", `%${filters.search}%`)
            .orWhereILike("ic.name", `%${filters.search}%`)
            .orWhereILike("it.reference_number", `%${filters.search}%`)
            .orWhereILike("it.reason", `%${filters.search}%`)
            .orWhereILike("it.performed_by", `%${filters.search}%`);
        });
      }

      if (filters.transaction_type) {
        countQuery.where("it.transaction_type", filters.transaction_type);
      }

      if (filters.date_from) {
        countQuery.where("it.transaction_date", ">=", filters.date_from);
      }

      if (filters.date_to) {
        countQuery.where(
          "it.transaction_date",
          "<=",
          filters.date_to + " 23:59:59"
        );
      }

      if (filters.category_id) {
        countQuery.where("ic.id", filters.category_id);
      }

      if (filters.item_type_id) {
        countQuery.where("iit.id", filters.item_type_id);
      }

      const totalResult = await countQuery.count("* as total").first();
      const total = parseInt(totalResult.total);

      // Get paginated results
      const transactions = await query
        .orderBy("it.transaction_date", "desc")
        .limit(limit)
        .offset(offset);

      return {
        transactions,
        total,
      };
    } catch (error) {
      console.error("Error fetching all transactions:", error);
      throw new Error("Failed to fetch transactions");
    }
  }

  // Get transaction history for an item
  static async getTransactionHistory(inventoryItemId) {
    try {
      return await db("inventory_transactions")
        .where("inventory_item_id", inventoryItemId)
        .orderBy("transaction_date", "desc");
    } catch (error) {
      console.error("Error fetching transaction history:", error);
      throw new Error("Failed to fetch transaction history");
    }
  }

  // Log a transaction
  static async logTransaction(transactionData) {
    try {
      return await db("inventory_transactions")
        .insert({
          ...transactionData,
          created_at: new Date(),
          updated_at: new Date(),
        })
        .returning("*");
    } catch (error) {
      console.error("Error logging transaction:", error);
      throw new Error("Failed to log transaction");
    }
  }

  // Get items expiring soon
  // Get items expiring soon
  static async getExpiringItems(days = 7) {
    try {
      const today = new Date();
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + days);

      const todayISO = today.toISOString().split("T")[0];
      const futureISO = futureDate.toISOString().split("T")[0];

      return await db("inventory_items as ii")
        .leftJoin("inventory_item_types as it", "ii.item_type_id", "it.id")
        .leftJoin("inventory_categories as ic", "it.category_id", "ic.id")
        .select(
          "ii.*",
          "it.name as item_type_name",
          "it.unit_of_measure",
          "ic.name as category_name"
        )
        .whereNull("ii.deleted_at")
        .where("ii.status", "available")
        .whereNotNull("ii.expiry_date")
        // Only items that will expire from today up to the next N days
        .whereBetween("ii.expiry_date", [todayISO, futureISO])
        .orderBy("ii.expiry_date");
    } catch (error) {
      console.error("Error fetching expiring items:", error);
      throw new Error("Failed to fetch expiring items");
    }
  }

  // Get low stock items (GROUPED by item_type) — used by /alerts/low-stock
  static async getLowStockItems() {
    try {
      // Fallback rule: if no alert config exists, use the reorder_level stored on inventory_items
      // Threshold used = COALESCE(ia.min_stock_level, MAX(ii.reorder_level)) per item_type
      return await db("inventory_items as ii")
        .leftJoin("inventory_item_types as it", "ii.item_type_id", "it.id")
        .leftJoin("inventory_categories as ic", "it.category_id", "ic.id")
        .leftJoin("inventory_alerts as ia", "it.id", "ia.item_type_id")
        .select(
          "it.id as item_type_id",
          "it.name as item_type_name",
          "ic.name as category_name",
          db.raw(
            "COALESCE(ia.min_stock_level, MAX(ii.reorder_level)) as min_stock_level"
          ),
          db.raw("SUM(ii.quantity) as current_stock")
        )
        .whereNull("ii.deleted_at")
        .where("ii.status", "available")
        // Exclude Equipment category from alerts
        .whereNot("ic.name", "Equipment")
        .modify((qb) => {
          // If alert exists but is deactivated, ignore it and rely on reorder_level
          qb.whereRaw("(ia.is_active = true OR ia.is_active IS NULL)");
        })
        .groupBy("it.id", "it.name", "ic.name", "ia.min_stock_level")
        .havingRaw(
          "SUM(ii.quantity) <= COALESCE(ia.min_stock_level, MAX(ii.reorder_level))"
        )
        .orderBy(["ic.name", "it.name"]);
    } catch (error) {
      console.error("Error fetching low stock items:", error);
      throw new Error("Failed to fetch low stock items");
    }
  }

  // Get low stock items PER BATCH — used by /alerts/low-stock-batches
  static async getLowStockItemsPerBatch() {
    try {
      const SAFETY_MARGIN_FACTOR = 0.9; // 90%
      return await db("inventory_items as ii")
        .leftJoin("inventory_item_types as it", "ii.item_type_id", "it.id")
        .leftJoin("inventory_categories as ic", "it.category_id", "ic.id")
        .leftJoin("inventory_alerts as ia", "it.id", "ia.item_type_id")
        .select(
          "ii.id",
          "ii.item_type_id",
          "ii.item_name",
          "ii.batch_number",
          "ii.unit_of_measure",
          "ii.unit_cost",
          "ii.total_value",
          "ii.quantity as current_stock",
          db.raw(
            "COALESCE(ia.min_stock_level, ii.reorder_level) as min_stock_level"
          ),
          "it.name as item_type_name",
          "ic.name as category_name"
        )
        .whereNull("ii.deleted_at")
        .where("ii.status", "available")
        .whereNot("ic.name", "Equipment")
        .modify((qb) => {
          qb.whereRaw("(ia.is_active = true OR ia.is_active IS NULL)");
        })
        // Only flag when a positive threshold exists
        .whereRaw(
          "COALESCE(ia.min_stock_level, ii.reorder_level) IS NOT NULL AND COALESCE(ia.min_stock_level, ii.reorder_level) > 0"
        )
        // Quantity must be non-negative and at/below threshold
        .whereRaw("ii.quantity >= 0")
        .whereRaw(
          `ii.quantity < COALESCE(ia.min_stock_level, ii.reorder_level) * ${SAFETY_MARGIN_FACTOR}`
        )
        .orderBy([
          { column: "ic.name", order: "asc" },
          { column: "it.name", order: "asc" },
          { column: "ii.quantity", order: "asc" },
        ]);
    } catch (error) {
      console.error("Error fetching low stock items per batch:", error);
      throw new Error("Failed to fetch low stock items per batch");
    }
  }

  // Get inventory statistics
  static async getInventoryStats() {
    try {
      const stats = await db("inventory_items as ii")
        .leftJoin("inventory_item_types as it", "ii.item_type_id", "it.id")
        .leftJoin("inventory_categories as ic", "it.category_id", "ic.id")
        .select(
          // Count only item types that have visible entries (quantity > 0 and status in scope)
          db.raw("COUNT(DISTINCT ii.item_type_id) as total_item_types"),
          // Count only visible entries
          db.raw("COUNT(ii.id) as total_inventory_entries"),
          db.raw(
            "SUM(CASE WHEN ii.status = 'available' THEN ii.quantity ELSE 0 END) as total_available_quantity"
          ),
          db.raw(
            "SUM(CASE WHEN ii.status = 'available' THEN ii.total_value ELSE 0 END) as total_available_value"
          ),
          db.raw(
            "COUNT(CASE WHEN ii.expiry_date <= CURRENT_DATE + INTERVAL '7 days' AND ii.status = 'available' THEN 1 END) as expiring_soon_count"
          ),
          db.raw(
            "COUNT(CASE WHEN ii.status = 'expired' THEN 1 END) as expired_count"
          )
        )
        .whereNull("ii.deleted_at")
        // Match Current Inventory visibility: exclude zero quantity and disposed, include available/expired
        .where("ii.quantity", ">", 0)
        .whereIn("ii.status", ["available", "expired"])
        .first();

      return stats;
    } catch (error) {
      console.error("Error fetching inventory stats:", error);
      throw new Error("Failed to fetch inventory stats");
    }
  }

  // Approve item type
  static async approveItemType(itemTypeId, approvedBy, notes = null) {
    try {
      const [updatedItemType] = await db("inventory_item_types")
        .where("id", itemTypeId)
        .where("status", "draft")
        .update({
          status: "active",
          approved_by: approvedBy,
          approved_at: new Date(),
          approval_notes: notes,
          updated_at: new Date(),
        })
        .returning("*");

      if (!updatedItemType) {
        throw new Error("Item type not found or already approved");
      }

      return updatedItemType;
    } catch (error) {
      console.error("Error approving item type:", error);
      throw new Error("Failed to approve item type");
    }
  }

  // Reject item type
  static async rejectItemType(itemTypeId, rejectedBy, notes = null) {
    try {
      const [updatedItemType] = await db("inventory_item_types")
        .where("id", itemTypeId)
        .where("status", "draft")
        .update({
          status: "discontinued",
          approved_by: rejectedBy,
          approved_at: new Date(),
          approval_notes: notes,
          updated_at: new Date(),
        })
        .returning("*");

      if (!updatedItemType) {
        throw new Error("Item type not found or already processed");
      }

      return updatedItemType;
    } catch (error) {
      console.error("Error rejecting item type:", error);
      throw new Error("Failed to reject item type");
    }
  }

  // Configure alert for item type
  static async configureAlert(alertData) {
    try {
      const [alertConfig] = await db("inventory_alerts")
        .insert({
          item_type_id: alertData.item_type_id,
          min_stock_level: alertData.min_stock_level,
          max_stock_level: alertData.max_stock_level,
          expiry_warning_days: alertData.expiry_warning_days,
          is_active: alertData.is_active,
          created_at: new Date(),
          updated_at: new Date(),
        })
        .onConflict("item_type_id")
        .merge([
          "min_stock_level",
          "max_stock_level",
          "expiry_warning_days",
          "is_active",
          "updated_at",
        ])
        .returning("*");

      return alertConfig;
    } catch (error) {
      console.error("Error configuring alert:", error);
      throw new Error("Failed to configure alert");
    }
  }

  // Get alert configuration for item type
  static async getAlertConfiguration(itemTypeId) {
    try {
      return await db("inventory_alerts")
        .where("item_type_id", itemTypeId)
        .first();
    } catch (error) {
      console.error("Error fetching alert configuration:", error);
      throw new Error("Failed to fetch alert configuration");
    }
  }

  // Get all active alerts
  static async getActiveAlerts() {
    try {
      return await db("inventory_alerts as ia")
        .leftJoin("inventory_item_types as iit", "ia.item_type_id", "iit.id")
        .leftJoin("inventory_categories as ic", "iit.category_id", "ic.id")
        .select(
          "ia.*",
          "iit.name as item_type_name",
          "iit.unit_of_measure",
          "ic.name as category_name"
        )
        .where("ia.is_active", true)
        .whereNull("iit.deleted_at")
        .orderBy(["ic.name", "iit.name"]);
    } catch (error) {
      console.error("Error fetching active alerts:", error);
      throw new Error("Failed to fetch active alerts");
    }
  }

  // Acknowledge alert
  static async acknowledgeAlert(alertId, acknowledgedBy, notes) {
    try {
      const [acknowledgedAlert] = await db("inventory_alerts")
        .where("id", alertId)
        .update({
          acknowledged_at: new Date(),
          acknowledged_by: acknowledgedBy,
          acknowledgment_notes: notes,
          updated_at: new Date(),
        })
        .returning("*");

      return acknowledgedAlert;
    } catch (error) {
      console.error("Error acknowledging alert:", error);
      throw new Error("Failed to acknowledge alert");
    }
  }

  // ==================== PRODUCTION INTEGRATION METHODS ====================

  // Check ingredient availability for production
  static async checkProductionIngredientAvailability(
    recipeId,
    batchSize = null
  ) {
    try {
      // Get recipe ingredients
      const ingredients = await db("recipe_ingredients as ri")
        .select("ri.*", "iit.name as ingredient_name", "iit.unit_of_measure")
        .leftJoin("inventory_items as ii", "ri.inventory_item_id", "ii.id")
        .leftJoin("inventory_item_types as iit", "ii.item_type_id", "iit.id")
        .where("ri.recipe_id", recipeId);

      const recipe = await db("recipes").where("id", recipeId).first();
      if (!recipe) {
        throw new Error("Recipe not found");
      }

      const scaleFactor = batchSize ? batchSize / recipe.batch_size : 1;

      const availability = await Promise.all(
        ingredients.map(async (ingredient) => {
          const requiredQuantity =
            parseFloat(ingredient.quantity_required) * scaleFactor;

          // Get current available inventory for this ingredient
          const currentStock = await db("inventory_items as ii")
            .select(db.raw("SUM(ii.quantity) as total_available"))
            .where("ii.id", ingredient.inventory_item_id)
            .where("ii.quantity", ">", 0)
            .where("ii.status", "available")
            .first();

          const availableQuantity = parseFloat(
            currentStock?.total_available || 0
          );
          const isAvailable = availableQuantity >= requiredQuantity;

          return {
            ...ingredient,
            required_quantity: requiredQuantity,
            available_quantity: availableQuantity,
            is_available: isAvailable,
            shortage: isAvailable ? 0 : requiredQuantity - availableQuantity,
          };
        })
      );

      const allAvailable = availability.every((ing) => ing.is_available);

      return {
        recipe_id: recipeId,
        batch_size: batchSize || recipe.batch_size,
        scale_factor: scaleFactor,
        all_ingredients_available: allAvailable,
        ingredient_availability: availability,
      };
    } catch (error) {
      console.error(
        "Error checking production ingredient availability:",
        error
      );
      throw new Error("Failed to check ingredient availability");
    }
  }

  // Reserve ingredients for production
  static async reserveIngredientsForProduction(
    recipeId,
    batchSize,
    productionOrderId
  ) {
    const trx = await db.transaction();

    try {
      const availability = await this.checkProductionIngredientAvailability(
        recipeId,
        batchSize
      );

      if (!availability.all_ingredients_available) {
        throw new Error("Not all ingredients are available for production");
      }

      const reservations = [];

      for (const ingredient of availability.ingredient_availability) {
        // Get inventory items for this ingredient (FIFO - First In, First Out)
        const inventoryItems = await trx("inventory_items as ii")
          .select("ii.*")
          .where("ii.id", ingredient.inventory_item_id)
          .where("ii.quantity", ">", 0)
          .where("ii.status", "available")
          .orderBy("ii.received_date", "asc"); // FIFO

        let remainingNeeded = ingredient.required_quantity;

        for (const item of inventoryItems) {
          if (remainingNeeded <= 0) break;

          const quantityToReserve = Math.min(item.quantity, remainingNeeded);

          // Create reservation transaction
          await trx("inventory_transactions").insert({
            inventory_item_id: item.id,
            transaction_type: "reservation",
            quantity: -quantityToReserve,
            reference_number: `PROD-${productionOrderId}`,
            reason: "Production ingredient reservation",
            notes: `Reserved for production order ${productionOrderId}`,
            performed_by: "Production System",
            transaction_date: new Date(),
          });

          // Update inventory item quantity
          await trx("inventory_items")
            .where("id", item.id)
            .update({
              quantity: item.quantity - quantityToReserve,
              updated_at: new Date(),
            });

          reservations.push({
            inventory_item_id: item.id,
            ingredient_name: ingredient.ingredient_name,
            quantity_reserved: quantityToReserve,
            batch_number: item.batch_number,
          });

          remainingNeeded -= quantityToReserve;
        }
      }

      await trx.commit();
      return {
        production_order_id: productionOrderId,
        recipe_id: recipeId,
        batch_size: batchSize,
        reservations,
      };
    } catch (error) {
      await trx.rollback();
      console.error("Error reserving ingredients for production:", error);
      throw new Error("Failed to reserve ingredients for production");
    }
  }

  // Consume ingredients during production
  static async consumeIngredientsForProduction(
    productionBatchId,
    ingredientConsumption
  ) {
    const trx = await db.transaction();

    try {
      // Normalize batch id to a scalar value for references
      const batchIdScalar =
        typeof productionBatchId === "object" && productionBatchId !== null
          ? productionBatchId.id ||
            productionBatchId.batch_id ||
            productionBatchId.batchId ||
            null
          : productionBatchId;
      const batchIdText = batchIdScalar != null ? String(batchIdScalar) : "";
      const consumptionRecords = [];

      for (const consumption of ingredientConsumption) {
        // Get inventory item first to get unit cost
        const inventoryItem = await trx("inventory_items")
          .where("id", consumption.inventory_item_id)
          .first();

        if (!inventoryItem) {
          throw new Error(
            `Inventory item ${consumption.inventory_item_id} not found`
          );
        }

        // Create consumption transaction
        const quantityConsumed = parseFloat(consumption.quantity_consumed);
        const unitCost = parseFloat(inventoryItem.unit_cost || 0);
        const totalValue = quantityConsumed * unitCost;

        const [transaction] = await trx("inventory_transactions")
          .insert({
            inventory_item_id: consumption.inventory_item_id,
            transaction_type: "production_consumption",
            quantity: -quantityConsumed,
            unit_cost: unitCost,
            total_value: totalValue,
            reference_number: `BATCH-${batchIdText}`,
            reason: "Production ingredient consumption",
            notes: `Consumed for production batch ${batchIdText}`,
            performed_by: consumption.performed_by || "Production System",
            transaction_date: new Date(),
          })
          .returning("*");

        const newQuantity =
          parseFloat(inventoryItem.quantity) -
          parseFloat(consumption.quantity_consumed);

        if (newQuantity < 0) {
          throw new Error(
            `Insufficient inventory for item ${inventoryItem.item_name}`
          );
        }

        await trx("inventory_items")
          .where("id", consumption.inventory_item_id)
          .update({
            quantity: newQuantity,
            updated_at: new Date(),
          });

        consumptionRecords.push({
          ...consumption,
          transaction_id: transaction.id,
          new_quantity: newQuantity,
        });
      }

      await trx.commit();
      return {
        production_batch_id: batchIdScalar,
        consumption_records: consumptionRecords,
      };
    } catch (error) {
      await trx.rollback();
      console.error("Error consuming ingredients for production:", error);
      throw new Error("Failed to consume ingredients for production");
    }
  }

  // Add finished goods to inventory from production
  static async addFinishedGoodsFromProduction(
    productionBatchId,
    finishedGoodsData
  ) {
    const trx = await db.transaction();

    try {
      // Get production batch details
      const batch = await trx("production_batches as pb")
        .select("pb.*", "po.product_name", "r.recipe_name")
        .join("production_orders as po", "pb.production_order_id", "po.id")
        .leftJoin("recipes as r", "pb.recipe_id", "r.id")
        .where("pb.id", productionBatchId)
        .first();

      if (!batch) {
        throw new Error("Production batch not found");
      }

      // Find or create item type for finished goods
      let itemType = await trx("inventory_item_types")
        .where("name", batch.product_name)
        .where("category_id", finishedGoodsData.category_id || 1) // Default to first category
        .first();

      if (!itemType) {
        // Create new item type for finished goods
        [itemType] = await trx("inventory_item_types")
          .insert({
            name: batch.product_name,
            description: `Finished product from ${batch.recipe_name || "production"}`,
            category_id: finishedGoodsData.category_id || 1,
            unit_of_measure: finishedGoodsData.unit_of_measure || "pieces",
            status: "active",
          })
          .returning("*");
      }

      // Generate batch number for finished goods
      const finishedGoodsBatch = `FG-${batch.batch_number}`;

      // Add finished goods to inventory
      const [inventoryItem] = await trx("inventory_items")
        .insert({
          item_type_id: itemType.id,
          item_name: batch.product_name,
          quantity:
            finishedGoodsData.quantity_produced || batch.quantity_produced,
          unit_cost:
            finishedGoodsData.unit_cost ||
            batch.actual_cost / (batch.quantity_produced || 1),
          total_value: finishedGoodsData.total_value || batch.actual_cost,
          batch_number: finishedGoodsBatch,
          expiry_date: finishedGoodsData.expiry_date,
          received_date: new Date(),
          location: finishedGoodsData.location || "Production Floor",
          status: "available",
          supplier_id: null, // Internal production
          notes: `Produced from batch ${batch.batch_number}`,
          received_by: finishedGoodsData.received_by || "Production System",
        })
        .returning("*");

      // Create inventory transaction
      const quantityProduced =
        finishedGoodsData.quantity_produced || batch.quantity_produced;
      const unitCost =
        finishedGoodsData.unit_cost ||
        batch.actual_cost / (batch.quantity_produced || 1);
      const totalValue = finishedGoodsData.total_value || batch.actual_cost;

      // Normalize batch id to a scalar value for references
      const batchIdScalar =
        typeof productionBatchId === "object" && productionBatchId !== null
          ? productionBatchId.id ||
            productionBatchId.batch_id ||
            productionBatchId.batchId ||
            null
          : productionBatchId;
      const batchIdText = batchIdScalar != null ? String(batchIdScalar) : "";

      await trx("inventory_transactions").insert({
        inventory_item_id: inventoryItem.id,
        transaction_type: "production_output",
        quantity: quantityProduced,
        unit_cost: unitCost,
        total_value: totalValue,
        reference_number: `BATCH-${batchIdText}`,
        reason: "Production output",
        notes: `Finished goods from production batch ${batch.batch_number}`,
        performed_by: finishedGoodsData.received_by || "Production System",
        transaction_date: new Date(),
      });

      await trx.commit();
      return {
        production_batch_id: batchIdScalar,
        inventory_item: inventoryItem,
        item_type: itemType,
      };
    } catch (error) {
      await trx.rollback();
      console.error("Error adding finished goods from production:", error);
      throw new Error("Failed to add finished goods to inventory");
    }
  }

  // Get low stock items that need restocking for production
  static async getLowStockForProduction() {
    try {
      const lowStockItems = await db("inventory_items as ii")
        .select(
          "ii.id",
          "ii.item_name",
          "ii.quantity",
          "iit.name as item_type_name",
          "iit.unit_of_measure",
          "ic.name as category_name",
          db.raw("SUM(ii.quantity) as total_quantity"),
          db.raw("COUNT(ii.id) as batch_count")
        )
        .join("inventory_item_types as iit", "ii.item_type_id", "iit.id")
        .join("inventory_categories as ic", "iit.category_id", "ic.id")
        .where("ii.status", "available")
        .where("ii.quantity", ">", 0)
        .groupBy(
          "ii.item_type_id",
          "ii.item_name",
          "iit.name",
          "iit.unit_of_measure",
          "ic.name"
        )
        .having(db.raw("SUM(ii.quantity)"), "<", 50) // Low stock threshold
        .orderBy("total_quantity", "asc");

      // Check if these items are used in active recipes
      const itemsWithRecipeUsage = await Promise.all(
        lowStockItems.map(async (item) => {
          const recipeUsage = await db("recipe_ingredients as ri")
            .join("inventory_items as ii", "ri.inventory_item_id", "ii.id")
            .join("recipes as r", "ri.recipe_id", "r.id")
            .select("r.recipe_name", "ri.quantity_required")
            .where("ii.item_type_id", item.item_type_id)
            .where("r.is_active", true);

          return {
            ...item,
            recipe_usage: recipeUsage,
            is_critical: recipeUsage.length > 0,
          };
        })
      );

      return itemsWithRecipeUsage.filter((item) => item.is_critical);
    } catch (error) {
      console.error("Error fetching low stock for production:", error);
      throw new Error("Failed to retrieve low stock items for production");
    }
  }

  // Get ingredient usage analytics for production planning
  static async getIngredientUsageAnalytics(dateFrom, dateTo) {
    try {
      const usage = await db("inventory_transactions as it")
        .select(
          "iit.name as ingredient_name",
          "ic.name as category_name",
          db.raw("SUM(ABS(it.quantity)) as total_consumed"),
          db.raw("COUNT(it.id) as transaction_count"),
          db.raw("AVG(ABS(it.quantity)) as avg_consumption")
        )
        .join("inventory_items as ii", "it.inventory_item_id", "ii.id")
        .join("inventory_item_types as iit", "ii.item_type_id", "iit.id")
        .join("inventory_categories as ic", "iit.category_id", "ic.id")
        .where("it.transaction_type", "production_consumption")
        .where("it.transaction_date", ">=", dateFrom)
        .where("it.transaction_date", "<=", dateTo)
        .groupBy("iit.id", "iit.name", "ic.name")
        .orderBy("total_consumed", "desc");

      return usage;
    } catch (error) {
      console.error("Error fetching ingredient usage analytics:", error);
      throw new Error("Failed to retrieve ingredient usage analytics");
    }
  }

  // Trigger automatic restocking based on production demand
  static async triggerProductionRestocking(
    itemTypeId,
    requiredQuantity,
    urgentLevel = "Normal"
  ) {
    const trx = await db.transaction();

    try {
      // Get item type details
      const itemType = await trx("inventory_item_types as iit")
        .select("iit.*", "ic.name as category_name")
        .join("inventory_categories as ic", "iit.category_id", "ic.id")
        .where("iit.id", itemTypeId)
        .first();

      if (!itemType) {
        throw new Error("Item type not found");
      }

      // Check current stock
      const currentStock = await trx("inventory_items")
        .select(db.raw("SUM(quantity) as total_stock"))
        .where("item_type_id", itemTypeId)
        .where("status", "available")
        .first();

      const totalStock = parseFloat(currentStock?.total_stock || 0);

      if (totalStock >= requiredQuantity) {
        return {
          status: "sufficient_stock",
          message: "Current stock is sufficient",
          current_stock: totalStock,
          required_quantity: requiredQuantity,
        };
      }

      // Calculate shortage
      const shortage = requiredQuantity - totalStock;

      // Find the most recent supplier for this item
      const recentSupplier = await trx("inventory_items as ii")
        .select("s.id", "s.name", "s.contact_person", "s.email")
        .join("suppliers as s", "ii.supplier_id", "s.id")
        .where("ii.item_type_id", itemTypeId)
        .whereNotNull("ii.supplier_id")
        .orderBy("ii.received_date", "desc")
        .first();

      // Create automatic supply request for restocking
      const requestId = Date.now();

      const [supplyRequest] = await trx("supply_requests")
        .insert({
          request_id: requestId,
          request_type: "Production Restocking",
          request_description: `Automatic restocking request for ${itemType.name} due to production demand`,
          request_date: new Date(),
          priority: urgentLevel,
          department: "Production",
          requested_by: "Production System",
          request_status: "To Request",
          total_amount: 0, // Will be calculated when supplier prices are added
          item_count: 1,
        })
        .returning("*");

      // Create supply request item
      await trx("supply_request_items").insert({
        supply_request_id: supplyRequest.id,
        item_number: 1,
        item_name: itemType.name,
        item_quantity: Math.ceil(shortage * 1.2), // Add 20% buffer
        item_unit: itemType.unit_of_measure,
        item_type: itemType.category_name,
        item_unit_price: 0, // To be filled by procurement
        item_amount: 0,
        item_notes: `Production shortage: ${shortage} ${itemType.unit_of_measure}`,
      });

      await trx.commit();

      return {
        status: "restocking_triggered",
        message: "Automatic restocking request created",
        supply_request_id: supplyRequest.id,
        shortage_quantity: shortage,
        requested_quantity: Math.ceil(shortage * 1.2),
        suggested_supplier: recentSupplier,
      };
    } catch (error) {
      await trx.rollback();
      console.error("Error triggering production restocking:", error);
      throw new Error("Failed to trigger automatic restocking");
    }
  }

  // Get production impact analysis for inventory changes
  static async getProductionImpactAnalysis(itemTypeId) {
    try {
      // Find recipes that use this ingredient
      const affectedRecipes = await db("recipe_ingredients as ri")
        .select(
          "r.id",
          "r.recipe_name",
          "r.recipe_code",
          "r.is_active",
          "ri.quantity_required",
          "ri.unit"
        )
        .join("inventory_items as ii", "ri.inventory_item_id", "ii.id")
        .join("recipes as r", "ri.recipe_id", "r.id")
        .where("ii.item_type_id", itemTypeId)
        .where("r.is_active", true);

      // Find active production orders using these recipes
      const affectedOrders = await Promise.all(
        affectedRecipes.map(async (recipe) => {
          const orders = await db("production_orders")
            .select(
              "id",
              "order_number",
              "product_name",
              "quantity_planned",
              "status",
              "planned_start_date"
            )
            .where("recipe_id", recipe.id)
            .whereIn("status", ["Draft", "Scheduled", "In Progress"]);

          return {
            recipe,
            affected_orders: orders,
          };
        })
      );

      const totalAffectedOrders = affectedOrders.reduce(
        (sum, item) => sum + item.affected_orders.length,
        0
      );

      return {
        item_type_id: itemTypeId,
        affected_recipes: affectedRecipes,
        affected_production_orders: affectedOrders,
        total_affected_orders: totalAffectedOrders,
        impact_level:
          totalAffectedOrders > 5
            ? "high"
            : totalAffectedOrders > 2
              ? "medium"
              : "low",
      };
    } catch (error) {
      console.error("Error analyzing production impact:", error);
      throw new Error("Failed to analyze production impact");
    }
  }

  // ========================================
  // ANALYTICS & FORECASTING METHODS
  // ========================================

  // Get comprehensive usage analytics
  static async getUsageAnalytics(timeframe = "month") {
    try {
      let dateFilter;
      const now = new Date();

      // Handle numeric timeframes (days)
      if (typeof timeframe === "string" && !isNaN(parseInt(timeframe))) {
        const days = parseInt(timeframe);
        dateFilter = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
      } else {
        // Handle string timeframes
        switch (timeframe) {
          case "week":
            dateFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case "month":
            dateFilter = new Date(
              now.getFullYear(),
              now.getMonth() - 1,
              now.getDate()
            );
            break;
          case "quarter":
            dateFilter = new Date(
              now.getFullYear(),
              now.getMonth() - 3,
              now.getDate()
            );
            break;
          case "year":
            dateFilter = new Date(
              now.getFullYear() - 1,
              now.getMonth(),
              now.getDate()
            );
            break;
          default:
            dateFilter = new Date(
              now.getFullYear(),
              now.getMonth() - 1,
              now.getDate()
            );
        }
      }

      const analytics = await db("inventory_transactions as it")
        .leftJoin("inventory_items as ii", "it.inventory_item_id", "ii.id")
        .leftJoin("inventory_item_types as iit", "ii.item_type_id", "iit.id")
        .leftJoin("inventory_categories as ic", "iit.category_id", "ic.id")
        .select(
          "ii.item_name",
          "iit.name as item_type",
          "ic.name as category",
          db.raw(
            "SUM(CASE WHEN it.transaction_type IN ('consumption', 'production_consumption') OR (it.transaction_type = 'adjustment' AND it.audit_action = 'transfer_out') THEN it.quantity ELSE 0 END) as total_consumed"
          ),
          db.raw(
            "SUM(CASE WHEN it.transaction_type = 'receipt' THEN it.quantity ELSE 0 END) as total_received"
          ),
          db.raw(
            "COUNT(CASE WHEN it.transaction_type IN ('consumption', 'production_consumption') OR (it.transaction_type = 'adjustment' AND it.audit_action = 'transfer_out') THEN 1 END) as consumption_frequency"
          ),
          db.raw(
            "AVG(CASE WHEN it.transaction_type IN ('consumption', 'production_consumption') OR (it.transaction_type = 'adjustment' AND it.audit_action = 'transfer_out') THEN it.quantity ELSE NULL END) as avg_consumption_per_transaction"
          ),
          db.raw("MAX(it.transaction_date) as last_consumption_date")
        )
        .where("it.transaction_date", ">=", dateFilter)
        .groupBy("ii.item_name", "iit.name", "ic.name")
        .orderBy("total_consumed", "desc");

      return analytics;
    } catch (error) {
      console.error("Error getting usage analytics:", error);
      throw new Error("Failed to get usage analytics");
    }
  }

  // Get most used items ranking
  static async getMostUsedItems(limit = 10, timeframe = "month") {
    try {
      const analytics = await this.getUsageAnalytics(timeframe);

      return analytics
        .filter((item) => item.total_consumed > 0)
        .slice(0, limit)
        .map((item, index) => ({
          rank: index + 1,
          item_name: item.item_name,
          category: item.category,
          item_type: item.item_type,
          total_consumed: parseFloat(item.total_consumed || 0),
          consumption_frequency: parseInt(item.consumption_frequency || 0),
          avg_consumption: parseFloat(
            item.avg_consumption_per_transaction || 0
          ),
          usage_score:
            parseFloat(item.total_consumed || 0) *
            parseInt(item.consumption_frequency || 0),
          last_consumption: item.last_consumption_date,
        }));
    } catch (error) {
      console.error("Error getting most used items:", error);
      throw new Error("Failed to get most used items");
    }
  }

  // Get least used items (slow movers)
  static async getLeastUsedItems(limit = 10, timeframe = "month") {
    try {
      const analytics = await this.getUsageAnalytics(timeframe);

      return analytics
        .filter((item) => item.total_consumed > 0)
        .sort(
          (a, b) => parseFloat(a.total_consumed) - parseFloat(b.total_consumed)
        )
        .slice(0, limit)
        .map((item, index) => ({
          rank: index + 1,
          item_name: item.item_name,
          category: item.category,
          item_type: item.item_type,
          total_consumed: parseFloat(item.total_consumed || 0),
          consumption_frequency: parseInt(item.consumption_frequency || 0),
          risk_level:
            parseFloat(item.total_consumed) < 5
              ? "High"
              : parseFloat(item.total_consumed) < 10
                ? "Medium"
                : "Low",
          last_consumption: item.last_consumption_date,
        }));
    } catch (error) {
      console.error("Error getting least used items:", error);
      throw new Error("Failed to get least used items");
    }
  }

  // Get consumption forecasting for specific item
  static async getForecast(itemName, periods = 3) {
    try {
      const historicalData = await db("inventory_transactions as it")
        .leftJoin("inventory_items as ii", "it.inventory_item_id", "ii.id")
        .select(
          db.raw("DATE_TRUNC('month', it.transaction_date) as month"),
          db.raw(
            "SUM(CASE WHEN it.transaction_type IN ('consumption', 'production_consumption') OR (it.transaction_type = 'adjustment' AND it.audit_action = 'transfer_out') THEN it.quantity ELSE 0 END) as monthly_consumption"
          )
        )
        .where("ii.item_name", itemName)
        .whereIn("it.transaction_type", [
          "consumption",
          "production_consumption",
          // also allow adjustments; filter via CASE audit_action
          "adjustment",
        ])
        .groupBy(db.raw("DATE_TRUNC('month', it.transaction_date)"))
        .orderBy("month", "desc")
        .limit(periods);

      if (historicalData.length < periods) {
        return {
          forecast: 0,
          confidence: "Low - Insufficient data",
          data_points: historicalData.length,
        };
      }

      const avgConsumption =
        historicalData.reduce(
          (sum, item) => sum + parseFloat(item.monthly_consumption || 0),
          0
        ) / historicalData.length;

      // Calculate trend (simple linear regression)
      const trend = this.calculateTrend(historicalData);

      return {
        item_name: itemName,
        forecast: Math.round(avgConsumption + trend),
        confidence:
          historicalData.length >= 6
            ? "High"
            : historicalData.length >= 3
              ? "Medium"
              : "Low",
        historical_data: historicalData,
        trend: trend,
        data_points: historicalData.length,
        next_month_forecast: Math.round(avgConsumption + trend),
      };
    } catch (error) {
      console.error("Error getting forecast:", error);
      throw new Error("Failed to get forecast");
    }
  }

  // Calculate trend for forecasting
  static calculateTrend(historicalData) {
    try {
      if (historicalData.length < 2) return 0;

      const sortedData = historicalData.sort(
        (a, b) => new Date(a.month) - new Date(b.month)
      );
      const n = sortedData.length;

      let sumX = 0,
        sumY = 0,
        sumXY = 0,
        sumX2 = 0;

      sortedData.forEach((item, index) => {
        const x = index;
        const y = parseFloat(item.monthly_consumption || 0);
        sumX += x;
        sumY += y;
        sumXY += x * y;
        sumX2 += x * x;
      });

      const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
      return slope;
    } catch (error) {
      console.error("Error calculating trend:", error);
      return 0;
    }
  }

  // Get seasonal consumption patterns
  static async getSeasonalPatterns(itemName) {
    try {
      const seasonalData = await db("inventory_transactions as it")
        .leftJoin("inventory_items as ii", "it.inventory_item_id", "ii.id")
        .select(
          db.raw("EXTRACT(MONTH FROM it.transaction_date) as month"),
          db.raw("EXTRACT(YEAR FROM it.transaction_date) as year"),
          db.raw(
            "SUM(CASE WHEN it.transaction_type IN ('consumption', 'production_consumption') THEN it.quantity ELSE 0 END) as consumption"
          )
        )
        .where("ii.item_name", itemName)
        .whereIn("it.transaction_type", [
          "consumption",
          "production_consumption",
        ])
        .groupBy("month", "year")
        .orderBy("year", "desc")
        .orderBy("month", "asc");

      // Group by month across years
      const monthlyPatterns = {};
      seasonalData.forEach((item) => {
        const month = parseInt(item.month);
        if (!monthlyPatterns[month]) {
          monthlyPatterns[month] = [];
        }
        monthlyPatterns[month].push(parseFloat(item.consumption || 0));
      });

      // Calculate average consumption per month
      const monthlyAverages = {};
      Object.keys(monthlyPatterns).forEach((month) => {
        const values = monthlyPatterns[month];
        monthlyAverages[month] =
          values.reduce((sum, val) => sum + val, 0) / values.length;
      });

      // Find peak months
      const peakMonths = Object.entries(monthlyAverages)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([month, avg]) => ({
          month: parseInt(month),
          month_name: this.getMonthName(parseInt(month)),
          average: Math.round(avg * 100) / 100,
        }));

      return {
        item_name: itemName,
        monthly_patterns: monthlyAverages,
        peak_months: peakMonths,
        total_data_points: seasonalData.length,
      };
    } catch (error) {
      console.error("Error getting seasonal patterns:", error);
      throw new Error("Failed to get seasonal patterns");
    }
  }

  // Helper method to get month names
  static getMonthName(month) {
    const months = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    return months[month - 1] || "Unknown";
  }

  // Get comprehensive analytics dashboard
  static async getAnalyticsDashboard(timeframe = "month") {
    try {
      const [
        mostUsed,
        leastUsed,
        totalItems,
        totalConsumption,
        categoryBreakdown,
        recentTransactions,
      ] = await Promise.all([
        this.getMostUsedItems(5, timeframe),
        this.getLeastUsedItems(5, timeframe),
        db("inventory_items").count("* as total").first(),
        db("inventory_transactions")
          .where("transaction_type", "consumption")
          .sum("quantity as total")
          .first(),
        this.getCategoryBreakdown(timeframe),
        this.getRecentTransactions(10),
      ]);

      return {
        most_used_items: mostUsed,
        least_used_items: leastUsed,
        total_inventory_items: parseInt(totalItems.total || 0),
        total_consumption: parseFloat(totalConsumption.total || 0),
        category_breakdown: categoryBreakdown,
        recent_transactions: recentTransactions,
        timeframe: timeframe,
        last_updated: new Date(),
        // Add fields that the frontend expects
        low_stock_items: [], // TODO: Implement low stock detection
        reorder_recommendations: [], // TODO: Implement reorder recommendations
      };
    } catch (error) {
      console.error("Error getting analytics dashboard:", error);
      throw new Error("Failed to get analytics dashboard");
    }
  }

  // Get consumption breakdown by category
  static async getCategoryBreakdown(timeframe = "month") {
    try {
      let dateFilter;
      const now = new Date();

      // Handle numeric timeframes (days)
      if (typeof timeframe === "string" && !isNaN(parseInt(timeframe))) {
        const days = parseInt(timeframe);
        dateFilter = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
      } else {
        // Handle string timeframes
        if (timeframe === "month") {
          dateFilter = new Date(
            now.getFullYear(),
            now.getMonth() - 1,
            now.getDate()
          );
        } else if (timeframe === "week") {
          dateFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        } else {
          dateFilter = new Date(
            now.getFullYear(),
            now.getMonth() - 1,
            now.getDate()
          );
        }
      }

      const breakdown = await db("inventory_transactions as it")
        .leftJoin("inventory_items as ii", "it.inventory_item_id", "ii.id")
        .leftJoin("inventory_item_types as iit", "ii.item_type_id", "iit.id")
        .leftJoin("inventory_categories as ic", "iit.category_id", "ic.id")
        .select(
          "ic.name as category",
          db.raw(
            "SUM(CASE WHEN it.transaction_type IN ('consumption', 'production_consumption') OR (it.transaction_type = 'adjustment' AND it.audit_action = 'transfer_out') THEN it.quantity ELSE 0 END) as total_consumed"
          ),
          db.raw(
            "COUNT(CASE WHEN it.transaction_type IN ('consumption', 'production_consumption') OR (it.transaction_type = 'adjustment' AND it.audit_action = 'transfer_out') THEN 1 END) as transaction_count"
          )
        )
        // include consumption-like outflows: consumption, production_consumption, and transfer_out adjustments
        .where("it.transaction_date", ">=", dateFilter)
        .groupBy("ic.name")
        .orderBy("total_consumed", "desc");

      return breakdown;
    } catch (error) {
      console.error("Error getting category breakdown:", error);
      throw new Error("Failed to get category breakdown");
    }
  }

  // Get recent transactions for dashboard
  static async getRecentTransactions(limit = 10) {
    try {
      return await db("inventory_transactions as it")
        .leftJoin("inventory_items as ii", "it.inventory_item_id", "ii.id")
        .leftJoin("inventory_item_types as iit", "ii.item_type_id", "iit.id")
        .leftJoin("inventory_categories as ic", "iit.category_id", "ic.id")
        .select(
          "it.transaction_type",
          "it.quantity",
          "it.transaction_date",
          "it.reason",
          "ii.item_name",
          "ic.name as category",
          "iit.unit_of_measure"
        )
        .orderBy("it.transaction_date", "desc")
        .limit(limit);
    } catch (error) {
      console.error("Error getting recent transactions:", error);
      throw new Error("Failed to get recent transactions");
    }
  }

  // Get inventory turnover analysis
  static async getInventoryTurnover(timeframe = "month") {
    try {
      let dateFilter;
      const now = new Date();

      // Handle numeric timeframes (days)
      if (typeof timeframe === "string" && !isNaN(parseInt(timeframe))) {
        const days = parseInt(timeframe);
        dateFilter = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
      } else {
        // Handle string timeframes
        if (timeframe === "month") {
          dateFilter = new Date(
            now.getFullYear(),
            now.getMonth() - 1,
            now.getDate()
          );
        } else if (timeframe === "week") {
          dateFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        } else {
          dateFilter = new Date(
            now.getFullYear(),
            now.getMonth() - 1,
            now.getDate()
          );
        }
      }

      const turnover = await db("inventory_transactions as it")
        .leftJoin("inventory_items as ii", "it.inventory_item_id", "ii.id")
        .select(
          "ii.item_name",
          db.raw(
            "SUM(CASE WHEN it.transaction_type = 'receipt' THEN it.quantity ELSE 0 END) as total_received"
          ),
          db.raw(
            "SUM(CASE WHEN it.transaction_type IN ('consumption', 'production_consumption') OR (it.transaction_type = 'adjustment' AND it.audit_action = 'transfer_out') THEN it.quantity ELSE 0 END) as total_consumed"
          ),
          db.raw(
            "AVG(CASE WHEN it.transaction_type IN ('consumption', 'production_consumption') OR (it.transaction_type = 'adjustment' AND it.audit_action = 'transfer_out') THEN it.quantity ELSE NULL END) as avg_consumption"
          )
        )
        .where("it.transaction_date", ">=", dateFilter)
        .groupBy("ii.item_name")
        .having(
          db.raw(
            "SUM(CASE WHEN it.transaction_type = 'receipt' THEN it.quantity ELSE 0 END) > 0"
          )
        )
        .orderBy("total_consumed", "desc");

      return turnover.map((item) => ({
        item_name: item.item_name,
        total_received: parseFloat(item.total_received || 0),
        total_consumed: parseFloat(item.total_consumed || 0),
        turnover_rate:
          item.total_received > 0
            ? (parseFloat(item.total_consumed || 0) /
                parseFloat(item.total_received || 1)) *
              100
            : 0,
        avg_consumption: parseFloat(item.avg_consumption || 0),
      }));
    } catch (error) {
      console.error("Error getting inventory turnover:", error);
      throw new Error("Failed to get inventory turnover");
    }
  }
}

module.exports = Inventory;
