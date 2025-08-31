const { db } = require("../config/database");

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
        .leftJoin("users as u", "it.approved_by", "u.id")
        .select(
          "it.*",
          "ic.name as category_name",
          "ic.description as category_description",
          "u.name as approved_by_name"
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
      const today = new Date().toISOString().split("T")[0];
      await db("inventory_items")
        .where("expiry_date", "<=", today)
        .where("status", "available")
        .update({
          status: "expired",
          updated_at: new Date(),
        });

      let query = db("inventory_items as ii")
        .leftJoin("inventory_item_types as it", "ii.item_type_id", "it.id")
        .leftJoin("inventory_categories as ic", "it.category_id", "ic.id")
        .leftJoin("suppliers as s", "ii.supplier_id", "s.id")
        .select(
          "ii.*",
          "ii.item_name", // Make sure this line is included
          "it.name as item_type_name",
          "it.unit_of_measure",
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
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + filters.expiry_within_days);
        query = query.where(
          "ii.expiry_date",
          "<=",
          futureDate.toISOString().split("T")[0]
        );
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

  static generateBatchNumber(itemTypeId, supplierId, date = new Date()) {
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
          itemData.received_date ? new Date(itemData.received_date) : new Date()
        );

      const [newItem] = await trx("inventory_items")
        .insert({
          item_type_id: itemData.item_type_id,
          item_name: itemData.item_name, // Include item_name
          supplier_id: itemData.supplier_id || null,
          purchase_order_id: itemData.purchase_order_id || null,
          batch_number: batchNumber,
          quantity: itemData.quantity,
          unit_cost: itemData.unit_cost,
          total_value: itemData.quantity * itemData.unit_cost,
          expiry_date: itemData.expiry_date || null,
          received_date: itemData.received_date || new Date(),
          status: "available",
          notes: itemData.notes || null,
          received_by: itemData.received_by || "System",
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
        reason: isFirstReceipt
          ? "First receipt for this item type"
          : "Replenishment",
        notes: itemData.notes || null,
        performed_by: itemData.received_by,
        transaction_date: new Date(),
        is_first_receipt: isFirstReceipt,
        created_at: new Date(),
        updated_at: new Date(),
      });

      // Update item type counters
      const newReceiptsCount = parseInt(itemType.receipts_count || 0, 10) + 1;
      const updates = {
        receipts_count: newReceiptsCount,
        updated_at: new Date(),
      };
      if (isFirstReceipt) {
        updates.first_received_at = new Date();
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
              const todayIso = new Date().toISOString().split("T")[0];
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
          updated_at: new Date(),
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
        transaction_date: transactionData.transaction_date || new Date(),
        adjustment_type: transactionData.adjustment_type || null,
        disposal_cost: transactionData.disposal_cost || null,
        // For clarity in reporting, mark transaction_type as 'disposal' when disposing
        // but keep inventory_items.status as 'expired' due to enum constraint.
        created_at: new Date(),
        updated_at: new Date(),
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
          "it.unit_of_measure",
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

  // Get low stock items (this would need alert configuration)
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
}

module.exports = Inventory;
