/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('categories', function(table) {
    table.increments('id').primary();
    table.string('name', 100).notNullable().unique();
    table.text('description').nullable();
    table.string('color', 7).nullable(); // For hex color codes
    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true);
  }).then(() => {
    return knex.schema.createTable('item_types', function(table) {
      table.increments('id').primary();
      table.string('name', 100).notNullable().unique();
      table.integer('category_id').unsigned().nullable();
      table.text('description').nullable();
      table.boolean('is_active').defaultTo(true);
      table.timestamps(true, true);
      
      table.foreign('category_id').references('id').inTable('categories');
    });
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('item_types').then(() => {
    return knex.schema.dropTable('categories');
  });
};
