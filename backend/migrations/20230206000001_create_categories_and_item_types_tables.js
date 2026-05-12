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
exports.down = function (knex) {
  // This migration was already run - tables exist
  // This is a placeholder to fix migration directory
  return Promise.resolve();
};
