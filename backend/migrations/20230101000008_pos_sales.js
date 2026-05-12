/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return (
    knex.schema
      // POS Sales Orders Table
      .createTable("pos_sales_orders", function (table) {
        table.increments("id").primary();
        table
          .string("order_number", 50)
          .notNullable()
          .unique()
          .comment("Unique order number");
        table
          .integer("branch_id")
          .unsigned()
          .notNullable()
          .references("id")
          .inTable("branches")
          .onDelete("RESTRICT")
          .comment("Branch where order was placed");
        table
          .integer("cashier_id")
          .unsigned()
          .notNullable()
          .references("id")
          .inTable("employees")
          .onDelete("RESTRICT")
          .comment("Cashier who processed the order");
        table
          .integer("manager_id")
          .unsigned()
          .nullable()
          .references("id")
          .inTable("employees")
          .onDelete("SET NULL")
          .comment("Manager who authorized the order (for cashier orders)");
        table
          .enum("order_type", ["Dine In", "Take Out", "Delivery"])
          .notNullable()
          .defaultTo("Dine In")
          .comment("Type of order");
        table
          .decimal("subtotal", 12, 2)
          .notNullable()
          .comment("Subtotal before tax");
        table.decimal("tax_amount", 12, 2).defaultTo(0).comment("Tax amount");
        table
          .decimal("total_amount", 12, 2)
          .notNullable()
          .comment("Total order amount");
        table
          .decimal("amount_paid", 12, 2)
          .notNullable()
          .comment("Amount paid by customer");
        table
          .decimal("change_amount", 12, 2)
          .notNullable()
          .comment("Change given to customer");
        table
          .enum("status", [
            "pending",
            "processing",
            "completed",
            "void",
            "refunded",
          ])
          .notNullable()
          .defaultTo("pending")
          .comment("Order status");
        table
          .text("void_reason")
          .nullable()
          .comment("Reason for voiding the order");
        table
          .integer("voided_by")
          .unsigned()
          .nullable()
          .references("id")
          .inTable("employees")
          .onDelete("SET NULL")
          .comment("Employee who voided the order");
        table
          .timestamp("voided_at")
          .nullable()
          .comment("When the order was voided");
        table
          .timestamp("processed_at")
          .nullable()
          .comment("When the order was processed");
        table
          .timestamp("completed_at")
          .nullable()
          .comment("When the order was completed");
        table.text("notes").nullable().comment("Additional order notes");
        table.timestamps(true, true);

        // Indexes
        table.index("order_number");
        table.index("branch_id");
        table.index("cashier_id");
        table.index("status");
        table.index("created_at");
        table.index(["branch_id", "status"]);
        table.index(["cashier_id", "created_at"]);
      })

      // POS Order Items Table
      .createTable("pos_order_items", function (table) {
        table.increments("id").primary();
        table
          .integer("order_id")
          .unsigned()
          .notNullable()
          .references("id")
          .inTable("pos_sales_orders")
          .onDelete("CASCADE")
          .comment("Reference to the order");
        table
          .integer("menu_item_id")
          .unsigned()
          .notNullable()
          .references("id")
          .inTable("menu_items")
          .onDelete("RESTRICT")
          .comment("Menu item sold");
        table
          .string("item_name", 255)
          .notNullable()
          .comment("Item name at time of sale (for historical reference)");
        table.integer("quantity").notNullable().comment("Quantity sold");
        table
          .decimal("unit_price", 12, 2)
          .notNullable()
          .comment("Price per unit at time of sale");
        table
          .decimal("total_price", 12, 2)
          .notNullable()
          .comment("Total price for this line item");
        table
          .text("notes")
          .nullable()
          .comment("Special instructions or notes for this item");
        table.timestamps(true, true);

        // Indexes
        table.index("order_id");
        table.index("menu_item_id");
        table.index(["order_id", "menu_item_id"]);
      })

      // POS Daily Summaries Table (for reporting)
      .createTable("pos_daily_summaries", function (table) {
        table.increments("id").primary();
        table
          .integer("branch_id")
          .unsigned()
          .notNullable()
          .references("id")
          .inTable("branches")
          .onDelete("RESTRICT");
        table.date("summary_date").notNullable().comment("Date of the summary");
        table
          .integer("total_orders")
          .notNullable()
          .defaultTo(0)
          .comment("Total number of orders");
        table
          .integer("completed_orders")
          .notNullable()
          .defaultTo(0)
          .comment("Number of completed orders");
        table
          .integer("voided_orders")
          .notNullable()
          .defaultTo(0)
          .comment("Number of voided orders");
        table
          .decimal("total_sales", 15, 2)
          .notNullable()
          .defaultTo(0)
          .comment("Total sales amount");
        table
          .decimal("total_tax", 12, 2)
          .notNullable()
          .defaultTo(0)
          .comment("Total tax collected");
        table
          .decimal("average_order_value", 12, 2)
          .notNullable()
          .defaultTo(0)
          .comment("Average order value");
        table.timestamps(true, true);

        // Unique constraint for one summary per branch per day
        table.unique(["branch_id", "summary_date"]);
        table.index("summary_date");
        table.index(["branch_id", "summary_date"]);
      })
  );
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema
    .dropTableIfExists("pos_daily_summaries")
    .dropTableIfExists("pos_order_items")
    .dropTableIfExists("pos_sales_orders");
};
