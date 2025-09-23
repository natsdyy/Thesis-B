/**
 * Migration to fix sales data consistency
 * This migration ensures that refunded orders are properly excluded from sales calculations
 */

exports.up = async function (knex) {
  console.log("Running migration: Fix sales data consistency");

  try {
    // First, let's check if there are any voided orders that should be excluded from sales
    const voidedOrders = await knex("pos_sales_orders")
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
      ]);

    console.log(
      `Found ${voidedOrders.length} refunded orders to exclude from sales calculations`
    );

    // Update the voided_at timestamp for orders that don't have it
    const ordersWithoutVoidedAt = await knex("pos_sales_orders")
      .where("status", "void")
      .whereNull("voided_at");

    if (ordersWithoutVoidedAt.length > 0) {
      console.log(
        `Updating ${ordersWithoutVoidedAt.length} orders with missing voided_at timestamps`
      );

      for (const order of ordersWithoutVoidedAt) {
        await knex("pos_sales_orders")
          .where("id", order.id)
          .update({
            voided_at: order.updated_at || order.created_at,
          });
      }
    }

    // Create or update loss_profit_records for voided orders that don't have them
    const voidedOrdersWithoutLossRecords = await knex("pos_sales_orders")
      .leftJoin(
        "loss_profit_records",
        "pos_sales_orders.id",
        "loss_profit_records.order_id"
      )
      .where("pos_sales_orders.status", "void")
      .whereNull("loss_profit_records.order_id")
      .select("pos_sales_orders.*");

    console.log(
      `Found ${voidedOrdersWithoutLossRecords.length} voided orders without loss records`
    );

    for (const order of voidedOrdersWithoutLossRecords) {
      // Determine if this is a loss or refund based on void_reason
      const isRefund = [
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
      ].includes(order.void_reason);

      const lossAmount = isRefund ? 0 : parseFloat(order.total_amount) || 0;

      await knex("loss_profit_records").insert({
        order_id: order.id,
        order_number: order.order_number,
        branch_id: order.branch_id,
        loss_amount: lossAmount,
        void_reason: order.void_reason,
        voided_by: order.voided_by,
        recorded_at: order.voided_at || order.updated_at,
        created_at: new Date(),
        updated_at: new Date(),
      });
    }

    console.log("Sales data consistency migration completed successfully");
  } catch (error) {
    console.error("Error in sales data consistency migration:", error);
    throw error;
  }
};

exports.down = async function (knex) {
  console.log("Rolling back sales data consistency migration");

  try {
    // Remove loss_profit_records that were created by this migration
    // (This is a simplified rollback - in production you might want more sophisticated tracking)
    await knex("loss_profit_records")
      .where("created_at", ">=", new Date().toISOString().split("T")[0])
      .del();

    console.log("Sales data consistency migration rolled back");
  } catch (error) {
    console.error(
      "Error rolling back sales data consistency migration:",
      error
    );
    throw error;
  }
};
