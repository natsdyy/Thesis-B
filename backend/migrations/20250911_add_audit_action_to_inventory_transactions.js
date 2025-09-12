/**
 * @param { import('knex').Knex } knex
 */

exports.up = async function up(knex) {
  await knex.schema.alterTable("inventory_transactions", (table) => {
    table
      .string("audit_action", 50)
      .nullable()
      .comment("Semantic tag for audits, e.g., transfer_out");
  });
};

/**
 * @param { import('knex').Knex } knex
 */

exports.down = async function down(knex) {
  await knex.schema.alterTable("inventory_transactions", (table) => {
    table.dropColumn("audit_action");
  });
};
