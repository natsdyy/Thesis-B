exports.up = function (knex) {
  return knex.schema
    .createTable("feedback", function (table) {
      table.increments("id").primary();
      table.string("name").notNullable();
      table.string("email").notNullable();
      table.text("message").notNullable();
      table.string("phone").nullable();
      table.integer("rating").nullable().checkBetween([1, 5]);
      table.string("source").defaultTo("Website Contact Form");
      table.string("image_filename").nullable();
      table.string("image_path").nullable();
      table.timestamp("created_at").defaultTo(knex.fn.now());
      table.timestamp("updated_at").defaultTo(knex.fn.now());
    })
    .createTable("order_ratings", function (table) {
      table.increments("id").primary();
      table.string("order_number").notNullable();
      table.decimal("order_total", 10, 2).nullable();
      table.string("branch_name").nullable();
      table.string("cashier_name").nullable();
      table.timestamp("order_timestamp").nullable();
      table.string("customer_name").notNullable();
      table.string("customer_email").notNullable();
      table.integer("overall_rating").nullable().checkBetween([1, 5]);
      table.json("item_ratings").nullable(); // Store item ratings as JSON
      table.text("comments").nullable();
      table.string("source").defaultTo("QR Code Rating");
      table.string("image_filename").nullable();
      table.string("image_path").nullable();
      table.timestamp("created_at").defaultTo(knex.fn.now());
      table.timestamp("updated_at").defaultTo(knex.fn.now());
    });
};

exports.down = function (knex) {
  return knex.schema
    .dropTable("order_ratings")
    .dropTable("feedback");
};
