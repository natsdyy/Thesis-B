/**
 * @param { import('knex').Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function up(knex) {
  const hasAckBy = await knex.schema.hasColumn(
    "branch_returns",
    "branch_acknowledged_by"
  );
  if (!hasAckBy) {
    await knex.schema.alterTable("branch_returns", (table) => {
      table
        .integer("branch_acknowledged_by")
        .references("id")
        .inTable("employees");
      table.index("branch_acknowledged_by");

      table.timestamp("branch_acknowledged_at");
      table.text("branch_acknowledgment_notes");
    });
  }
};

/**
 * @param { import('knex').Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function down(knex) {
  const hasAckBy = await knex.schema.hasColumn(
    "branch_returns",
    "branch_acknowledged_by"
  );
  if (hasAckBy) {
    await knex.schema.alterTable("branch_returns", (table) => {
      table.dropColumn("branch_acknowledged_by");
      table.dropColumn("branch_acknowledged_at");
      table.dropColumn("branch_acknowledgment_notes");
    });
  }
};
