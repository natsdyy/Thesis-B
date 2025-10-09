/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  // This migration was already run - tables exist
  // This is a placeholder to fix migration directory
  return Promise.resolve();
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
<<<<<<< HEAD
exports.down = function(knex) {
  return knex.schema.dropTable('item_types').then(() => {
    return knex.schema.dropTable('categories');
  });
=======
exports.down = function (knex) {
  // This migration was already run - tables exist
  // This is a placeholder to fix migration directory
  return Promise.resolve();
>>>>>>> origin/ako_si_ced
};
