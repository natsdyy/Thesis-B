const { db } = require("../config/database");
const { PHILIPPINE_TIMEZONE } = require("../utils/timezoneUtils");

class POSOrder {
  // Generate unique order number
  static generateOrderNumber() {
    const now = new Date();
    const timestamp = now.getTime().toString().slice(-6);
    const random = Math.floor(Math.random() * 100)
      .toString()
      .padStart(2, "0");
    return `#${timestamp}${random}`;
  }

  // Get all POS orders with filters
  static async getAll(filters = {}) {
    try {
      const {
        branch_id = null,
        cashier_id = null,
        status = null,
        order_type = null,
        date_from = null,
        date_to = null,
        remittance_id = null,
        limit = 20,
        offset = 0,
      } = filters;

      let query = db("pos_sales_orders as pso")
        .leftJoin("branches as b", "pso.branch_id", "b.id")
        .leftJoin("employees as c", "pso.cashier_id", "c.id")
        .leftJoin("employees as m", "pso.manager_id", "m.id")
        .leftJoin("employees as v", "pso.voided_by", "v.id")
        .leftJoin("branch_remittances as br", "pso.remittance_id", "br.id")
        .select(
          "pso.*",
          "b.name as branch_name",
          "c.first_name as cashier_first_name",
          "c.last_name as cashier_last_name",
          "m.first_name as manager_first_name",
          "m.last_name as manager_last_name",
          "v.first_name as voided_by_first_name",
          "v.last_name as voided_by_last_name",
          db.raw("COALESCE(br.status, NULL) as remittance_status")
        );

      // Apply filters
      if (branch_id) {
        query = query.where("pso.branch_id", branch_id);
      }

      if (cashier_id) {
        query = query.where("pso.cashier_id", cashier_id);
      }

      if (status) {
        query = query.where("pso.status", status);
      }

      if (order_type) {
        query = query.where("pso.order_type", order_type);
      }

      if (date_from) {
        query = query.where("pso.created_at", ">=", date_from);
      }

      if (date_to) {
        query = query.where("pso.created_at", "<=", date_to);
      }

      if (remittance_id) {
        query = query.where("pso.remittance_id", remittance_id);
      }

      // Get total count
      const countQuery = query.clone().clearSelect().count({ total: "pso.id" });
      const [countRow] = await countQuery;
      const total = parseInt(countRow?.total || 0, 10);

      // Get paginated results
      const orders = await query
        .orderBy("pso.created_at", "desc")
        .limit(limit)
        .offset(offset);

      // Fetch all items for all orders in a single query to avoid N+1
      const orderIds = orders.map((order) => order.id);
      let items = [];

      if (orderIds.length > 0) {
        // Return only fields used by the UI to keep payload small
        items = await db("pos_order_items as poi")
          .leftJoin("menu_items as mi", "poi.menu_item_id", "mi.id")
          .select(
            "poi.id",
            "poi.order_id",
            "poi.menu_item_id",
            "poi.item_name",
            "poi.quantity",
            "poi.unit_price",
            // fallback display name from menu_items when available
            "mi.menu_item_name as menu_item_name"
          )
          .whereIn("poi.order_id", orderIds)
          .orderBy("poi.order_id")
          .orderBy("poi.id");
      }

      // Group items by order_id
      const itemsByOrderId = items.reduce((acc, item) => {
        if (!acc[item.order_id]) {
          acc[item.order_id] = [];
        }
        acc[item.order_id].push(item);
        return acc;
      }, {});

      // Combine orders with their items
      const ordersWithItems = orders.map((order) => ({
        ...order,
        items: itemsByOrderId[order.id] || [],
      }));

      return { orders: ordersWithItems, total };
    } catch (error) {
      console.error("Error fetching POS orders:", error);
      throw new Error("Failed to fetch POS orders");
    }
  }

  // Mark completed, unremitted orders as remitted for a remittance
  static async markOrdersRemitted({
    branchId,
    remittanceId,
    dateFrom,
    dateTo,
  }) {
    const trx = await db.transaction();
    try {
      const now = new Date();
      // Update completed and void orders in range that are not yet linked
      // Include void orders for complete record-keeping
      await trx("pos_sales_orders")
        .where("branch_id", branchId)
        .whereIn("status", ["completed", "void"])
        .whereNull("remittance_id")
        .modify((qb) => {
          if (dateFrom) qb.where("created_at", ">=", dateFrom);
          if (dateTo) qb.where("created_at", "<=", dateTo);
        })
        .update({
          remittance_id: remittanceId,
          remitted_at: now,
          updated_at: now,
        });

      await trx.commit();
      return true;
    } catch (error) {
      await trx.rollback();
      console.error("Error marking orders as remitted:", error);
      throw new Error("Failed to mark orders as remitted");
    }
  }

  // Aggregate sales trends by time bucket
  static async getSalesTrends(
    branchId,
    dateFrom = null,
    dateTo = null,
    bucket = "day"
  ) {
    try {
      const dateColCompleted = "pos_sales_orders.created_at";
      const dateColVoided = "pos_sales_orders.voided_at";

      const bucketExpr = (col) => {
        // Normalize to Philippine time for consistent bucket labels
        const tzWrapped = db.raw("timezone(?, ??)", [PHILIPPINE_TIMEZONE, col]);
        if (bucket === "hour")
          return db.raw("to_char((" + tzWrapped + "), 'HH24:00')");
        if (bucket === "month")
          return db.raw("to_char((" + tzWrapped + "), 'YYYY-MM')");
        return db.raw("to_char((" + tzWrapped + "), 'YYYY-MM-DD')");
      };

      // Completed (gross) sales by bucket
      let grossQ = db("pos_sales_orders")
        .where("pos_sales_orders.branch_id", branchId)
        .where("pos_sales_orders.status", "completed");
      if (dateFrom) grossQ = grossQ.where(dateColCompleted, ">=", dateFrom);
      if (dateTo) grossQ = grossQ.where(dateColCompleted, "<=", dateTo);
      const grossRows = await grossQ
        .select({ label: bucketExpr(dateColCompleted) })
        .sum({ value: "pos_sales_orders.total_amount" })
        .groupBy("label");

      // Refunded amount (subset of void) by bucket
      const refundReasons = [
        "customer_cancelled",
        "wrong_order",
        "duplicate_order",
        "payment_issue",
        "system_error",
        "Customer Cancelled",
        "Wrong Order",
        "Duplicate Order",
        "Payment Issue",
        "System Error",
      ];

      let refundQ = db("pos_sales_orders")
        .where("pos_sales_orders.branch_id", branchId)
        .where("pos_sales_orders.status", "void")
        .whereIn("pos_sales_orders.void_reason", refundReasons);
      if (dateFrom) refundQ = refundQ.where(dateColVoided, ">=", dateFrom);
      if (dateTo) refundQ = refundQ.where(dateColVoided, "<=", dateTo);
      const refundRows = await refundQ
        .select({ label: bucketExpr(dateColVoided) })
        .sum({ value: "pos_sales_orders.total_amount" })
        .groupBy("label");

      // Disposed/void count by bucket (all voids)
      let voidQ = db("pos_sales_orders")
        .where("pos_sales_orders.branch_id", branchId)
        .where("pos_sales_orders.status", "void");
      if (dateFrom) voidQ = voidQ.where(dateColVoided, ">=", dateFrom);
      if (dateTo) voidQ = voidQ.where(dateColVoided, "<=", dateTo);
      const voidRows = await voidQ
        .select({ label: bucketExpr(dateColVoided) })
        .count({ value: "pos_sales_orders.id" })
        .groupBy("label");

      // Actually remitted amount by bucket (only orders that are linked to approved remittances)
      let remittedQ = db("pos_sales_orders as pso")
        .leftJoin("branch_remittances as br", "pso.remittance_id", "br.id")
        .where("pso.branch_id", branchId)
        .where("pso.status", "completed")
        .whereNotNull("pso.remittance_id")
        .where("br.status", "approved");
      if (dateFrom)
        remittedQ = remittedQ.where("pso.created_at", ">=", dateFrom);
      if (dateTo) remittedQ = remittedQ.where("pso.created_at", "<=", dateTo);
      const remittedRows = await remittedQ
        .select({ label: bucketExpr("pso.created_at") })
        .sum({ value: "pso.total_amount" })
        .groupBy("label");

      // Merge maps
      const labelsSet = new Set();
      const toMap = (rows) => {
        const m = new Map();
        rows.forEach((r) => {
          const k = String(r.label);
          labelsSet.add(k);
          m.set(k, Number(r.value) || 0);
        });
        return m;
      };

      const grossMap = toMap(grossRows);
      const refundMap = toMap(refundRows);
      const voidMap = toMap(voidRows);
      const remittedMap = toMap(remittedRows);

      const allLabels = Array.from(labelsSet).sort((a, b) => {
        // Sort dates chronologically, not alphabetically
        return new Date(a) - new Date(b);
      });

      const gross = allLabels.map((l) => Number(grossMap.get(l) || 0));
      const refunds = allLabels.map((l) => Number(refundMap.get(l) || 0));
      const disposed = allLabels.map((l) => Number(voidMap.get(l) || 0));
      const net = allLabels.map((_, idx) =>
        Math.max(0, gross[idx] - refunds[idx])
      );

      // For remitted amounts, only include labels that have actual remitted orders (remittance_id not null)
      const remittedLabels = [];
      const remittedValues = [];

      remittedRows.forEach((r) => {
        if (Number(r.value) > 0) {
          remittedLabels.push(String(r.label));
          remittedValues.push(Number(r.value));
        }
      });

      // Use remitted labels for remitted data, all labels for other metrics
      const labels = remittedLabels.length > 0 ? remittedLabels : allLabels;
      const remitted =
        remittedLabels.length > 0
          ? remittedValues
          : allLabels.map((l) => Number(remittedMap.get(l) || 0));

      return {
        labels,
        gross_sales: gross,
        refunds,
        disposed,
        net_sales: net,
        remitted_amount: remitted,
      };
    } catch (error) {
      console.error("Error building sales trends:", error);
      throw new Error("Failed to build sales trends");
    }
  }

  // Get order by ID with items
  static async getById(id) {
    try {
      const order = await db("pos_sales_orders as pso")
        .leftJoin("branches as b", "pso.branch_id", "b.id")
        .leftJoin("employees as c", "pso.cashier_id", "c.id")
        .leftJoin("employees as m", "pso.manager_id", "m.id")
        .leftJoin("employees as v", "pso.voided_by", "v.id")
        .select(
          "pso.*",
          "b.name as branch_name",
          "c.first_name as cashier_first_name",
          "c.last_name as cashier_last_name",
          "m.first_name as manager_first_name",
          "m.last_name as manager_last_name",
          "v.first_name as voided_by_first_name",
          "v.last_name as voided_by_last_name"
        )
        .where("pso.id", id)
        .first();

      if (!order) {
        throw new Error("POS order not found");
      }

      // Get order items
      const items = await db("pos_order_items as poi")
        .leftJoin("menu_items as mi", "poi.menu_item_id", "mi.id")
        .select("poi.*", "mi.menu_item_name", "mi.image_url", "mi.category")
        .where("poi.order_id", id)
        .orderBy("poi.id");

      return {
        ...order,
        items,
      };
    } catch (error) {
      console.error("Error fetching POS order by ID:", error);
      throw new Error("Failed to retrieve POS order");
    }
  }

  // Get order by order number (for public rating)
  static async getByOrderNumber(orderNumber) {
    try {
      const order = await db("pos_sales_orders as pso")
        .leftJoin("branches as b", "pso.branch_id", "b.id")
        .leftJoin("employees as c", "pso.cashier_id", "c.id")
        .leftJoin("employees as m", "pso.manager_id", "m.id")
        .leftJoin("employees as v", "pso.voided_by", "v.id")
        .select(
          "pso.*",
          "b.name as branch_name",
          "c.first_name as cashier_first_name",
          "c.last_name as cashier_last_name",
          "m.first_name as manager_first_name",
          "m.last_name as manager_last_name",
          "v.first_name as voided_by_first_name",
          "v.last_name as voided_by_last_name"
        )
        .where("pso.order_number", orderNumber)
        .first();

      if (!order) {
        return null;
      }

      // Get order items
      const items = await db("pos_order_items as poi")
        .leftJoin("menu_items as mi", "poi.menu_item_id", "mi.id")
        .select("poi.*", "mi.menu_item_name", "mi.image_url", "mi.category")
        .where("poi.order_id", order.id)
        .orderBy("poi.id");

      return {
        ...order,
        items,
        branch: order.branch_name ? { name: order.branch_name } : null,
        cashier: order.cashier_first_name
          ? {
              name: `${order.cashier_first_name} ${order.cashier_last_name}`.trim(),
            }
          : null,
      };
    } catch (error) {
      console.error("Error fetching POS order by order number:", error);
      throw new Error("Failed to retrieve POS order");
    }
  }

  // Create new POS order
  static async create(orderData) {
    const trx = await db.transaction();

    try {
      // Validate that no expired items are being sold
      if (orderData.items && orderData.items.length > 0) {
        const today = new Date().toISOString().split("T")[0];

        for (const item of orderData.items) {
          // Check if the menu item has branch inventory with expiry date
          const branchInventory = await trx("branch_inventory")
            .where("item_name", item.item_name)
            .where("item_type", "production")
            .where("branch_id", orderData.branch_id)
            .whereNull("deleted_at")
            .first();

          if (branchInventory && branchInventory.expiry_date) {
            const expiryDate = new Date(branchInventory.expiry_date)
              .toISOString()
              .split("T")[0];

            // If the recorded expiry is past/today, double-check if a newer
            // distribution batch exists after that expiry. If so, allow selling.
            if (expiryDate <= today) {
              const latestDistribution = await trx(
                "branch_inventory_transactions"
              )
                .where({
                  branch_id: orderData.branch_id,
                  item_name: item.item_name,
                  item_type: "production",
                  transaction_type: "distribution",
                })
                .whereNull("deleted_at")
                .orderBy("created_at", "desc")
                .select("created_at", "transaction_date", "new_expiry_date")
                .first();

              let allowSell = false;
              if (latestDistribution) {
                const distDate = new Date(
                  latestDistribution.transaction_date ||
                    latestDistribution.created_at
                )
                  .toISOString()
                  .split("T")[0];

                // If the latest distribution explicitly carries a new future expiry, honor it
                if (latestDistribution.new_expiry_date) {
                  const distExpiry = new Date(
                    latestDistribution.new_expiry_date
                  )
                    .toISOString()
                    .split("T")[0];
                  if (distExpiry > today) {
                    allowSell = true;
                  }
                }

                // Otherwise, if the distribution happened after the old expiry, treat as new batch
                if (!allowSell && distDate > expiryDate) {
                  allowSell = true;
                }
              }

              if (!allowSell) {
                throw new Error(
                  `Cannot sell expired item: ${item.item_name} (expired on ${expiryDate})`
                );
              }
            }
          }
        }
      }

      // Generate order number
      const orderNumber = this.generateOrderNumber();

      // Create the order
      const [order] = await trx("pos_sales_orders")
        .insert({
          order_number: orderNumber,
          branch_id: orderData.branch_id,
          cashier_id: orderData.cashier_id,
          manager_id: orderData.manager_id || null,
          order_type: orderData.order_type || "Dine In",
          subtotal: orderData.subtotal,
          tax_amount: orderData.tax_amount || 0,
          total_amount: orderData.total_amount,
          amount_paid: orderData.amount_paid,
          change_amount: orderData.change_amount,
          status: "pending",
          notes: orderData.notes || null,
        })
        .returning("*");

      // Create order items
      if (orderData.items && orderData.items.length > 0) {
        const orderItems = orderData.items.map((item) => {
          // Handle SCM items that don't have a valid menu_item_id
          let menuItemId = item.menu_item_id;

          // If the item ID starts with 'scm_', it's an SCM item and shouldn't have a menu_item_id
          if (typeof item.id === "string" && item.id.startsWith("scm_")) {
            menuItemId = null;
          }
          // If menu_item_id is not a valid number, set it to null
          else if (
            !Number.isFinite(Number(menuItemId)) ||
            Number(menuItemId) <= 0
          ) {
            menuItemId = null;
          }

          return {
            order_id: order.id,
            menu_item_id: menuItemId,
            item_name: item.item_name || item.name,
            quantity: item.quantity,
            unit_price: item.unit_price || item.price,
            total_price: item.total_price,
            notes: item.notes || null,
          };
        });

        await trx("pos_order_items").insert(orderItems);
      }

      await trx.commit();

      // Return the full order with items
      return await this.getById(order.id);
    } catch (error) {
      await trx.rollback();
      console.error("Error creating POS order:", error);
      throw new Error("Failed to create POS order");
    }
  }

  // Process order (change status from pending to processing)
  static async processOrder(id, processedBy = null) {
    try {
      const [updatedOrder] = await db("pos_sales_orders")
        .where("id", id)
        .where("status", "pending")
        .update({
          status: "processing",
          processed_at: new Date(),
          updated_at: new Date(),
        })
        .returning("*");

      if (!updatedOrder) {
        throw new Error("Order not found or not in pending status");
      }

      // Get order items
      const items = await db("pos_order_items as poi")
        .leftJoin("menu_items as mi", "poi.menu_item_id", "mi.id")
        .select("poi.*", "mi.menu_item_name", "mi.image_url", "mi.category")
        .where("poi.order_id", id)
        .orderBy("poi.id");

      return {
        ...updatedOrder,
        items,
      };
    } catch (error) {
      console.error("Error processing POS order:", error);
      throw new Error("Failed to process order");
    }
  }

  // Complete order (change status from processing to completed)
  static async completeOrder(id) {
    const trx = await db.transaction();

    try {
      // Update order status
      const [updatedOrder] = await trx("pos_sales_orders")
        .where("id", id)
        .where("status", "processing")
        .update({
          status: "completed",
          completed_at: new Date(),
          updated_at: new Date(),
        })
        .returning("*");

      if (!updatedOrder) {
        throw new Error("Order not found or not in processing status");
      }

      // Deduct inventory for each item
      const orderItems = await trx("pos_order_items").where("order_id", id);

      for (const item of orderItems) {
        // Determine item type based on whether menu_item_id exists
        const itemType = item.menu_item_id ? "production" : "scm";

        // Fetch eligible branch inventory rows for this item in this branch
        // - item_type: production or scm based on whether it has menu_item_id
        // - not soft-deleted
        // - status not disposed/expired
        // Sort by expiry date ASC (earliest first), nulls last; then by updated_at DESC as tiebreaker
        const eligibleRows = await trx("branch_inventory")
          .where({
            branch_id: updatedOrder.branch_id,
            item_name: item.item_name,
            item_type: itemType,
          })
          .whereNull("deleted_at")
          .whereNotIn("status", ["disposed", "expired"]) // skip disposed/expired batches
          .orderByRaw(
            "CASE WHEN expiry_date IS NULL THEN 1 ELSE 0 END, expiry_date ASC"
          )
          .orderBy("updated_at", "desc");

        let remainingToConsume = parseFloat(item.quantity || 0);

        for (const row of eligibleRows) {
          if (remainingToConsume <= 0) break;

          const available = Math.max(0, parseFloat(row.quantity || 0));
          if (available <= 0) continue;

          const consumeQty = Math.min(available, remainingToConsume);

          // Log consumption transaction against the actual branch_inventory row
          await trx("branch_inventory_transactions").insert({
            branch_id: updatedOrder.branch_id,
            inventory_item_id: row.id, // link to branch_inventory row
            item_name: row.item_name,
            item_type: row.item_type,
            transaction_type: "consumption",
            quantity: consumeQty,
            unit_of_measure: row.unit || "servings",
            unit_cost: row.unit_cost, // use branch unit cost for accurate COGS
            total_value: parseFloat(row.unit_cost || 0) * consumeQty,
            reference_number: updatedOrder.order_number,
            reason: "POS Sale",
            notes: `Sold via POS Order ${updatedOrder.order_number}`,
            performed_by: updatedOrder.cashier_id,
            transaction_date: new Date(),
            created_at: new Date(),
            updated_at: new Date(),
          });

          // Decrement this batch
          const newQty = available - consumeQty;
          await trx("branch_inventory")
            .where("id", row.id)
            .update({
              quantity: newQty,
              total_value: newQty * parseFloat(row.unit_cost || 0),
              last_updated: new Date(),
              updated_at: new Date(),
              status:
                newQty <= 0
                  ? "out_of_stock"
                  : newQty <= parseFloat(row.minimum_stock || 0)
                    ? "low_stock"
                    : "available",
            });

          remainingToConsume -= consumeQty;
        }

        // If we couldn't consume the full requested quantity, we still allow completion
        // but we have already deducted everything available from eligible batches.
      }

      // Get order items for the response
      const items = await db("pos_order_items as poi")
        .leftJoin("menu_items as mi", "poi.menu_item_id", "mi.id")
        .select("poi.*", "mi.menu_item_name", "mi.image_url", "mi.category")
        .where("poi.order_id", id)
        .orderBy("poi.id");

      await trx.commit();
      return {
        ...updatedOrder,
        items,
      };
    } catch (error) {
      await trx.rollback();
      console.error("Error completing POS order:", error);
      throw new Error("Failed to complete order");
    }
  }

  // Void order (cancel the order)
  static async voidOrder(
    id,
    voidReason,
    voidedBy,
    lossAmount = 0,
    refundOnCompleted = false
  ) {
    const trx = await db.transaction();

    try {
      // Check if order can be voided/refunded
      const order = await trx("pos_sales_orders")
        .where("id", id)
        .whereIn("status", ["pending", "processing", "completed"])
        .first();

      if (!order) {
        throw new Error(
          "Order not found or cannot be voided/refunded (already voided)"
        );
      }

      // Determine if this is a refund (completed order) or void (pending/processing order)
      const isCompletedOrder = order.status === "completed";
      const isPendingOrder =
        order.status === "pending" || order.status === "processing";

      // Define void reasons that should be treated as refunds (no inventory deduction, no loss profit)
      const refundReasons = [
        "customer_cancelled",
        "wrong_order",
        "duplicate_order",
        "payment_issue",
        "system_error",
      ];

      // Define void reasons that should deduct inventory and record loss profit
      const lossReasons = [
        "staff_error",
        "item_damaged",
        "expired_item",
        "quality_issue",
        "preparation_error",
        "custom",
      ];

      // Normalize reason to snake_case to accept labels from older clients
      const normalize = (s) =>
        String(s || "")
          .toLowerCase()
          .replaceAll(" ", "_");
      const normalizedReason = normalize(voidReason);

      const isRefundReason =
        refundReasons.includes(voidReason) ||
        refundReasons.includes(normalizedReason);
      const isLossReason =
        lossReasons.includes(voidReason) ||
        lossReasons.includes(normalizedReason);

      // Update order status
      const [updatedOrder] = await trx("pos_sales_orders")
        .where("id", id)
        .update({
          status: "void",
          void_reason: voidReason,
          voided_by: voidedBy,
          voided_at: new Date(),
          updated_at: new Date(),
        })
        .returning("*");

      // Handle inventory deduction and loss profit recording based on void reason and order status
      if (isCompletedOrder) {
        // For completed orders (refunds):
        // Treat BOTH refund and loss reasons as business loss. Inventory already deducted at completion.
        // We do not re-deduct inventory; we only record loss profit.
        if (isLossReason || isRefundReason) {
          // Completed refunds/loss: DO NOT re-deduct inventory (it was deducted at completion)
          // Only record the loss profit
          console.log(
            `Refund(${voidReason}) on completed order - inventory stays deducted, recording loss profit`
          );

          // Record loss profit if amount is greater than 0
          const amountToRecord =
            parseFloat(lossAmount) > 0
              ? parseFloat(lossAmount)
              : parseFloat(order.total_amount) || 0;
          if (amountToRecord > 0) {
            await trx("loss_profit_records").insert({
              order_id: id,
              order_number: order.order_number,
              branch_id: order.branch_id,
              loss_amount: amountToRecord,
              void_reason: voidReason,
              voided_by: voidedBy,
              recorded_at: new Date(),
              created_at: new Date(),
              updated_at: new Date(),
            });
          }
        } else {
          // Refund: do NOT deduct inventory, do NOT record loss profit
          console.log(
            `Refund reason "${voidReason}" treated as REFUND - no inventory deduction, no loss profit`
          );
          // Inventory stays the same, no loss profit recorded
        }
      } else if (isPendingOrder) {
        // For pending/processing orders (voids): handle based on reason type
        if (isLossReason) {
          // Loss void: deduct inventory and record loss profit
          console.log(
            `Void reason "${voidReason}" treated as LOSS - deducting inventory and recording loss profit`
          );

          // Deduct inventory for each item in the order
          const orderItems = await trx("pos_sales_order_items")
            .where("order_id", id)
            .select("menu_item_id", "quantity");

          for (const item of orderItems) {
            await trx("inventory_items")
              .where("menu_item_id", item.menu_item_id)
              .where("branch_id", order.branch_id)
              .decrement("current_stock", item.quantity);
          }

          // Record loss profit if amount is greater than 0
          if (lossAmount > 0) {
            await trx("loss_profit_records").insert({
              order_id: id,
              order_number: order.order_number,
              branch_id: order.branch_id,
              loss_amount: lossAmount,
              void_reason: voidReason,
              voided_by: voidedBy,
              recorded_at: new Date(),
              created_at: new Date(),
              updated_at: new Date(),
            });
          }
        } else {
          // Refund void: do NOT deduct inventory, do NOT record loss profit
          console.log(
            `Void reason "${voidReason}" treated as REFUND - no inventory deduction, no loss profit`
          );
          // Inventory stays the same, no loss profit recorded
        }
      } else {
        // For unknown reasons, default to loss behavior for safety
        console.log(
          `Unknown void reason "${voidReason}" - defaulting to LOSS behavior`
        );

        // Deduct inventory for each item in the order
        const orderItems = await trx("pos_sales_order_items")
          .where("order_id", id)
          .select("menu_item_id", "quantity");

        for (const item of orderItems) {
          await trx("inventory_items")
            .where("menu_item_id", item.menu_item_id)
            .where("branch_id", order.branch_id)
            .decrement("current_stock", item.quantity);
        }

        // Record loss profit if amount is greater than 0
        if (lossAmount > 0) {
          await trx("loss_profit_records").insert({
            order_id: id,
            order_number: order.order_number,
            branch_id: order.branch_id,
            loss_amount: lossAmount,
            void_reason: voidReason,
            voided_by: voidedBy,
            recorded_at: new Date(),
            created_at: new Date(),
            updated_at: new Date(),
          });
        }
      }

      await trx.commit();
      return updatedOrder;
    } catch (error) {
      await trx.rollback();
      console.error("Error voiding POS order:", error);
      throw new Error("Failed to void order");
    }
  }

  // Get sales statistics for a branch
  static async getSalesStats(branchId, dateFrom = null, dateTo = null) {
    try {
      let query = db("pos_sales_orders")
        .where("branch_id", branchId)
        .where("status", "completed");

      if (dateFrom) {
        query = query.where("created_at", ">=", dateFrom);
      }

      if (dateTo) {
        query = query.where("created_at", "<=", dateTo);
      }

      const stats = await query
        .select(
          db.raw("COUNT(*) as total_orders"),
          db.raw("SUM(total_amount) as total_sales"),
          db.raw("AVG(total_amount) as average_order_value"),
          db.raw("SUM(tax_amount) as total_tax")
        )
        .first();

      // Get refunded orders to adjust total sales
      // Only deduct voided orders that were completed first (actual refunds)
      // Orders cancelled before completion should not be deducted
      let refundedAmount = 0;
      try {
        const refundedQuery = db("pos_sales_orders")
          .where("branch_id", branchId)
          .where("status", "void")
          .whereIn("void_reason", [
            "customer_cancelled",
            "wrong_order",
            "duplicate_order",
            "payment_issue",
            "system_error",
            "Customer Cancelled",
            "Wrong Order",
            "Duplicate Order",
            "Payment Issue",
            "System Error",
          ])
          .whereNotNull("completed_at"); // Only include orders that were completed first

        if (dateFrom) {
          refundedQuery.where("voided_at", ">=", dateFrom);
        }
        if (dateTo) {
          refundedQuery.where("voided_at", "<=", dateTo);
        }

        const refundedStats = await refundedQuery
          .select(db.raw("SUM(total_amount) as total_refunded"))
          .first();

        refundedAmount = parseFloat(refundedStats.total_refunded) || 0;
      } catch (error) {
        console.error("Error fetching refunded amount:", error);
      }

      // Get disposal and loss profit data in a single optimized query
      let disposalStats = { total_disposed: 0, loss_profit: 0 };

      try {
        // Single query to get both voided orders count and loss profit
        // Only count orders that were completed first as "disposed" (actual disposals)
        // Orders cancelled before completion should not be counted as disposed
        const disposalQuery = db("pos_sales_orders")
          .leftJoin(
            "loss_profit_records",
            "pos_sales_orders.id",
            "loss_profit_records.order_id"
          )
          .where("pos_sales_orders.branch_id", branchId)
          .where("pos_sales_orders.status", "void")
          .whereNotNull("pos_sales_orders.completed_at"); // Only include orders that were completed first

        if (dateFrom) {
          disposalQuery.where("pos_sales_orders.voided_at", ">=", dateFrom);
        }
        if (dateTo) {
          disposalQuery.where("pos_sales_orders.voided_at", "<=", dateTo);
        }

        const disposalResult = await disposalQuery
          .select(
            db.raw("COUNT(DISTINCT pos_sales_orders.id) as total_voided"),
            db.raw(
              "COALESCE(SUM(loss_profit_records.loss_amount), 0) as total_loss"
            )
          )
          .first();

        disposalStats = {
          total_disposed: parseInt(disposalResult.total_voided) || 0,
          loss_profit: parseFloat(disposalResult.total_loss) || 0,
        };
      } catch (error) {
        console.error("Error fetching disposal stats:", error);
        // Keep default values if there's an error
      }

      // Calculate adjusted total sales (subtract refunded amounts)
      const originalTotalSales = parseFloat(stats.total_sales) || 0;
      const adjustedTotalSales = Math.max(
        0,
        originalTotalSales - refundedAmount
      );

      return {
        total_orders: parseInt(stats.total_orders) || 0,
        total_sales: adjustedTotalSales,
        average_order_value: parseFloat(stats.average_order_value) || 0,
        total_tax: parseFloat(stats.total_tax) || 0,
        total_disposed: disposalStats.total_disposed,
        loss_profit: disposalStats.loss_profit,
        refunded_amount: refundedAmount,
        original_total_sales: originalTotalSales, // For debugging
      };
    } catch (error) {
      console.error("Error fetching sales stats:", error);
      throw new Error("Failed to fetch sales statistics");
    }
  }

  // Get disposal statistics
  static async getDisposalStats(branchId, dateFrom = null, dateTo = null) {
    try {
      // Get voided orders count and total amount
      let voidedQuery = db("pos_sales_orders")
        .where("branch_id", branchId)
        .where("status", "void");

      if (dateFrom) {
        voidedQuery = voidedQuery.where("created_at", ">=", dateFrom);
      }
      if (dateTo) {
        voidedQuery = voidedQuery.where("created_at", "<=", dateTo);
      }

      const voidedStats = await voidedQuery
        .select(
          db.raw("COUNT(*) as total_voided"),
          db.raw("SUM(total_amount) as total_voided_amount")
        )
        .first();

      // Get loss profit from loss_profit_records
      let lossQuery = db("loss_profit_records")
        .leftJoin(
          "pos_sales_orders",
          "loss_profit_records.order_id",
          "pos_sales_orders.id"
        )
        .where("pos_sales_orders.branch_id", branchId);

      if (dateFrom) {
        lossQuery = lossQuery.where(
          "loss_profit_records.recorded_at",
          ">=",
          dateFrom
        );
      }
      if (dateTo) {
        lossQuery = lossQuery.where(
          "loss_profit_records.recorded_at",
          "<=",
          dateTo
        );
      }

      const lossStats = await lossQuery
        .select(
          db.raw("SUM(loss_profit_records.loss_amount) as total_loss"),
          db.raw("COUNT(*) as total_loss_records")
        )
        .first();

      return {
        total_disposed: parseInt(voidedStats.total_voided) || 0,
        total_voided_amount: parseFloat(voidedStats.total_voided_amount) || 0,
        loss_profit: parseFloat(lossStats.total_loss) || 0,
        total_loss_records: parseInt(lossStats.total_loss_records) || 0,
      };
    } catch (error) {
      console.error("Error fetching disposal stats:", error);
      throw new Error("Failed to fetch disposal statistics");
    }
  }

  // Precise, bucketed loss/disposed trends
  static async getLossTrends(
    branchId,
    dateFrom = null,
    dateTo = null,
    bucket = "day"
  ) {
    try {
      // Determine date column for grouping
      const voidedAtCol = "pos_sales_orders.voided_at";
      const recordedAtCol = "loss_profit_records.recorded_at";

      // Helper: build date bucket expression
      const bucketExpr = (col) => {
        const tzWrapped = db.raw("timezone(?, ??)", [PHILIPPINE_TIMEZONE, col]);
        if (bucket === "hour") {
          return db.raw("to_char((" + tzWrapped + "), 'HH24:00')");
        }
        // default day bucket
        return db.raw("to_char((" + tzWrapped + "), 'YYYY-MM-DD')");
      };

      // 1) Build time range array of labels
      const start = dateFrom ? new Date(dateFrom) : null;
      const end = dateTo ? new Date(dateTo) : null;
      let labels = [];
      if (bucket === "hour") {
        labels = Array.from(
          { length: 24 },
          (_, i) => `${String(i).padStart(2, "0")}:00`
        );
      } else {
        // daily labels between dateFrom and dateTo
        const s = start ? new Date(start) : null;
        const e = end ? new Date(end) : null;
        if (s && e) {
          const cur = new Date(s.getFullYear(), s.getMonth(), s.getDate());
          const stop = new Date(e.getFullYear(), e.getMonth(), e.getDate());
          while (cur <= stop) {
            const y = cur.getFullYear();
            const m = String(cur.getMonth() + 1).padStart(2, "0");
            const d = String(cur.getDate()).padStart(2, "0");
            labels.push(`${y}-${m}-${d}`);
            cur.setDate(cur.getDate() + 1);
          }
        }
      }

      // 2) Query disposed counts grouped by bucket from voided orders
      let disposedQuery = db("pos_sales_orders")
        .where("pos_sales_orders.branch_id", branchId)
        .where("pos_sales_orders.status", "void");
      if (dateFrom)
        disposedQuery = disposedQuery.where(voidedAtCol, ">=", dateFrom);
      if (dateTo)
        disposedQuery = disposedQuery.where(voidedAtCol, "<=", dateTo);

      const disposedRows = await disposedQuery
        .select({ label: bucketExpr(voidedAtCol) })
        .count({ value: "pos_sales_orders.id" })
        .groupBy("label");

      // 3) Query precise loss amounts grouped by bucket from loss_profit_records
      let lossQuery = db("loss_profit_records")
        .leftJoin(
          "pos_sales_orders",
          "loss_profit_records.order_id",
          "pos_sales_orders.id"
        )
        .where("pos_sales_orders.branch_id", branchId);
      if (dateFrom) lossQuery = lossQuery.where(recordedAtCol, ">=", dateFrom);
      if (dateTo) lossQuery = lossQuery.where(recordedAtCol, "<=", dateTo);

      const lossRows = await lossQuery
        .select({ label: bucketExpr(recordedAtCol) })
        .sum({ value: "loss_profit_records.loss_amount" })
        .groupBy("label");

      // 4) Merge to dictionary
      const disposedMap = new Map();
      disposedRows.forEach((r) =>
        disposedMap.set(String(r.label), parseInt(r.value) || 0)
      );
      const lossMap = new Map();
      lossRows.forEach((r) =>
        lossMap.set(String(r.label), parseFloat(r.value) || 0)
      );

      // 5) Build aligned arrays using labels; if labels empty (no range), fall back to rows' labels
      if (labels.length === 0) {
        const unique = new Set([...disposedMap.keys(), ...lossMap.keys()]);
        labels = Array.from(unique).sort((a, b) => {
          // Sort dates chronologically, not alphabetically
          return new Date(a) - new Date(b);
        });
      }

      const disposed = labels.map((l) => disposedMap.get(l) || 0);
      const loss = labels.map((l) => lossMap.get(l) || 0);

      return { labels, disposed, loss };
    } catch (error) {
      console.error("Error building loss trends:", error);
      throw new Error("Failed to build loss trends");
    }
  }

  // Get daily sales summary
  static async getDailySummary(branchId, date) {
    try {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const summary = await db("pos_sales_orders")
        .where("branch_id", branchId)
        .whereBetween("created_at", [startOfDay, endOfDay])
        .select(
          db.raw("COUNT(*) as total_orders"),
          db.raw(
            "COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_orders"
          ),
          db.raw(
            "COUNT(CASE WHEN status = 'void' THEN 1 END) as voided_orders"
          ),
          db.raw(
            "SUM(CASE WHEN status = 'completed' THEN total_amount ELSE 0 END) as total_sales"
          ),
          db.raw(
            "SUM(CASE WHEN status = 'completed' THEN tax_amount ELSE 0 END) as total_tax"
          ),
          db.raw(
            "AVG(CASE WHEN status = 'completed' THEN total_amount ELSE NULL END) as average_order_value"
          )
        )
        .first();

      return {
        date: date,
        branch_id: branchId,
        total_orders: parseInt(summary.total_orders) || 0,
        completed_orders: parseInt(summary.completed_orders) || 0,
        voided_orders: parseInt(summary.voided_orders) || 0,
        total_sales: parseFloat(summary.total_sales) || 0,
        total_tax: parseFloat(summary.total_tax) || 0,
        average_order_value: parseFloat(summary.average_order_value) || 0,
      };
    } catch (error) {
      console.error("Error fetching daily summary:", error);
      throw new Error("Failed to fetch daily summary");
    }
  }
}

module.exports = POSOrder;
