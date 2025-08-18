/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('supply_request_items', function(table) {
    table.increments('id').primary();
    table.integer('supply_request_id').unsigned().references('id').inTable('supply_requests').onDelete('CASCADE');
    table.string('item_name').notNullable();
    table.integer('item_quantity').notNullable();
    table.string('item_unit').notNullable();
    table.string('item_type').notNullable();
    table.decimal('item_unit_price', 10, 2).notNullable();
    table.decimal('item_amount', 10, 2).notNullable();
    table.timestamps(true, true);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('supply_request_items');
};

