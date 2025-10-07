/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('supplier_products', function(table) {
    table.increments('id').primary();
    table.integer('supplier_id').unsigned().notNullable();
    table.string('product_name', 255).notNullable();
    table.text('description').nullable();
    table.decimal('price', 10, 2).notNullable();
    table.string('unit', 50).notNullable();
    table.integer('min_order_quantity').defaultTo(1);
    table.boolean('is_available').defaultTo(true);
    table.string('category', 100).nullable();
    table.string('sku', 100).nullable();
    table.timestamps(true, true);
    
    table.foreign('supplier_id').references('id').inTable('suppliers');
    
    table.index(['supplier_id', 'is_available']);
    table.index(['category']);
    table.unique(['supplier_id', 'sku']);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('supplier_products');
};
