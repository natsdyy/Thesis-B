/**
 * Adds proof HTML fields to branch_distributions
 */

exports.up = async function (knex) {
  const hasTable = await knex.schema.hasTable("branch_distributions");
  if (!hasTable) return;

  const hasPrepared = await knex.schema.hasColumn(
    "branch_distributions",
    "prepared_proof_html"
  );
  const hasReceived = await knex.schema.hasColumn(
    "branch_distributions",
    "received_proof_html"
  );

  return knex.schema.alterTable("branch_distributions", (table) => {
    if (!hasPrepared) table.text("prepared_proof_html").nullable();
    if (!hasReceived) table.text("received_proof_html").nullable();
  });
};

exports.down = async function (knex) {
  const hasTable = await knex.schema.hasTable("branch_distributions");
  if (!hasTable) return;
  return knex.schema.alterTable("branch_distributions", (table) => {
    table.dropColumn("prepared_proof_html");
    table.dropColumn("received_proof_html");
  });
};
