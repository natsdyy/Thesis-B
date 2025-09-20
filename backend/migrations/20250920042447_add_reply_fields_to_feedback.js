/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.table('feedback', function(table) {
    table.string('status', 50).defaultTo('new');
    table.text('reply_message').nullable();
    table.text('reply_internal_note').nullable();
    table.timestamp('reply_sent_at').nullable();
    table.index('status');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.table('feedback', function(table) {
    table.dropIndex('status');
    table.dropColumn('status');
    table.dropColumn('reply_message');
    table.dropColumn('reply_internal_note');
    table.dropColumn('reply_sent_at');
  });
};