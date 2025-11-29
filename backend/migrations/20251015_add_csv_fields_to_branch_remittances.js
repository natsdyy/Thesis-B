/**
 * Add CSV metadata fields to branch_remittances
 */

exports.up = async function (knex) {
  const hasTable = await knex.schema.hasTable("branch_remittances");
  if (!hasTable) return;

  const hasCsvUrl = await knex.schema.hasColumn(
    "branch_remittances",
    "csv_url"
  );
  if (!hasCsvUrl) {
    await knex.schema.alterTable("branch_remittances", (table) => {
      table.string("csv_url").nullable();
      table.string("csv_filename").nullable();
      table.integer("csv_size").nullable();
      table.string("csv_mime").nullable();
      table.timestamp("csv_uploaded_at").nullable();
    });
  }
};

exports.down = async function (knex) {
  const hasTable = await knex.schema.hasTable("branch_remittances");
  if (!hasTable) return;
  const hasCsvUrl = await knex.schema.hasColumn(
    "branch_remittances",
    "csv_url"
  );
  if (hasCsvUrl) {
    await knex.schema.alterTable("branch_remittances", (table) => {
      table.dropColumn("csv_url");
      table.dropColumn("csv_filename");
      table.dropColumn("csv_size");
      table.dropColumn("csv_mime");
      table.dropColumn("csv_uploaded_at");
    });
  }
};
