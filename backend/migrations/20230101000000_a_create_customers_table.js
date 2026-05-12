/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable("customers", (table) => {
    table.increments("id").primary();
    table.string("name").notNullable();
    table.string("email").notNullable().unique();
    table.string("phone").nullable();
    table.text("address").nullable();
    table.string("city").nullable();
    table.string("province").nullable();
    table.string("postal_code").nullable();
    table.date("birth_date").nullable();
    table.string("gender").nullable();
    table.text("notes").nullable();
    table.integer("total_orders").defaultTo(0);
    table.decimal("total_spent", 15, 2).defaultTo(0);
    table.decimal("average_rating", 3, 2).nullable();
    table.timestamp("last_visit").nullable();
    table.timestamps(true, true);
    table.timestamp("deleted_at").nullable();

    table.index("email");
    table.index("name");
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists("customers");
};
