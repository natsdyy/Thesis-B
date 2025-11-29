/**
 * Create feedback and ratings tables
 * This migration creates tables for customer feedback and ratings
 */

exports.up = async function (knex) {
  // Create feedback table
  await knex.schema.createTable("feedback", (table) => {
    table.increments("id").primary();
    table.string("name").notNullable();
    table.string("email").notNullable();
    table.text("message").notNullable();
    table.string("phone").nullable();
    table.integer("rating").nullable().checkBetween([1, 5]);
    table.string("source").defaultTo("Website Contact Form");
    table.string("status").defaultTo("new");
    table.string("image_filename").nullable();
    table.string("image_path").nullable();
    table.integer("customer_id").unsigned().nullable();
    table.timestamps(true, true);

    // Foreign key constraints
    table
      .foreign("customer_id")
      .references("id")
      .inTable("customers")
      .onDelete("SET NULL");

    // Indexes
    table.index("email");
    table.index("status");
    table.index("rating");
    table.index("source");
    table.index("created_at");
  });

  // Create order_ratings table
  await knex.schema.createTable("order_ratings", (table) => {
    table.increments("id").primary();
    table.string("order_number").notNullable();
    table.decimal("order_total", 12, 2).nullable();
    table.string("branch_name").nullable();
    table.string("cashier_name").nullable();
    table.timestamp("order_timestamp").nullable();
    table.string("customer_name").notNullable();
    table.string("customer_email").notNullable();
    table.integer("overall_rating").nullable().checkBetween([1, 5]);
    table.text("item_ratings").nullable(); // JSON string
    table.text("comments").nullable();
    table.string("source").defaultTo("QR Code Rating");
    table.string("status").defaultTo("new");
    table.string("image_filename").nullable();
    table.string("image_path").nullable();
    table.integer("customer_id").unsigned().nullable();
    table.timestamps(true, true);

    // Foreign key constraints
    table
      .foreign("customer_id")
      .references("id")
      .inTable("customers")
      .onDelete("SET NULL");

    // Indexes
    table.index("order_number");
    table.index("customer_email");
    table.index("overall_rating");
    table.index("source");
    table.index("status");
    table.index("created_at");
    table.index("branch_name");
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists("order_ratings");
  await knex.schema.dropTableIfExists("feedback");
};
