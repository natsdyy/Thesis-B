/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema
    .alterTable('order_ratings', function (table) {
      // Ensure order_total column exists and is properly typed
      table.decimal('order_total', 10, 2).nullable().alter();
      
      // Add index for better query performance
      table.index('order_total');
      table.index('created_at');
      table.index('customer_id');
    })
    .alterTable('feedback', function (table) {
      // Ensure rating column exists and is properly typed
      table.integer('rating').nullable().checkBetween([1, 5]).alter();
      
      // Add index for better query performance
      table.index('rating');
      table.index('created_at');
      table.index('customer_id');
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema
    .alterTable('order_ratings', function (table) {
      // Drop indexes
      table.dropIndex('order_total');
      table.dropIndex('created_at');
      table.dropIndex('customer_id');
    })
    .alterTable('feedback', function (table) {
      // Drop indexes
      table.dropIndex('rating');
      table.dropIndex('created_at');
      table.dropIndex('customer_id');
    });
};
