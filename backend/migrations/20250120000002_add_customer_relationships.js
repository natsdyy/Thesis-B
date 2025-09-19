exports.up = function (knex) {
  return knex.schema
    .createTable("customers", function (table) {
      table.increments("id").primary();
      table.string("name").notNullable();
      table.string("email").notNullable().unique();
      table.string("phone").nullable();
      table.string("address").nullable();
      table.string("city").nullable();
      table.string("province").nullable();
      table.string("postal_code").nullable();
      table.date("birth_date").nullable();
      table.enum("gender", ["male", "female", "other"]).nullable();
      table.text("notes").nullable();
      table.integer("total_orders").defaultTo(0);
      table.decimal("total_spent", 10, 2).defaultTo(0);
      table.decimal("average_rating", 3, 2).nullable();
      table.timestamp("last_visit").nullable();
      table.timestamp("created_at").defaultTo(knex.fn.now());
      table.timestamp("updated_at").defaultTo(knex.fn.now());
    })
    .alterTable("feedback", function (table) {
      table.integer("customer_id").nullable();
      table.foreign("customer_id").references("id").inTable("customers").onDelete("SET NULL");
    })
    .alterTable("order_ratings", function (table) {
      table.integer("customer_id").nullable();
      table.foreign("customer_id").references("id").inTable("customers").onDelete("SET NULL");
    });
};

exports.down = function (knex) {
  return knex.schema
    .alterTable("feedback", function (table) {
      table.dropForeign("customer_id");
      table.dropColumn("customer_id");
    })
    .alterTable("order_ratings", function (table) {
      table.dropForeign("customer_id");
      table.dropColumn("customer_id");
    })
    .dropTable("customers");
};
