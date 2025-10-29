exports.up = async function (knex) {
  const hasTable = await knex.schema.hasTable("board_members");
  if (!hasTable) return;
  const hasColumn = await knex.schema.hasColumn(
    "board_members",
    "deactivation_reason"
  );
  if (hasColumn) return;
  await knex.schema.alterTable("board_members", (table) => {
    table
      .text("deactivation_reason")
      .nullable()
      .comment("Reason provided when account was deactivated");
  });
};

exports.down = async function (knex) {
  const hasTable = await knex.schema.hasTable("board_members");
  if (!hasTable) return;
  const hasColumn = await knex.schema.hasColumn(
    "board_members",
    "deactivation_reason"
  );
  if (!hasColumn) return;
  await knex.schema.alterTable("board_members", (table) => {
    table.dropColumn("deactivation_reason");
  });
};
