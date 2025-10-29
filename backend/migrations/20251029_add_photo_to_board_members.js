exports.up = async function (knex) {
  const hasTable = await knex.schema.hasTable("board_members");
  if (!hasTable) return;
  const hasColumn = await knex.schema.hasColumn("board_members", "photo_url");
  if (hasColumn) return;
  await knex.schema.alterTable("board_members", (table) => {
    table.string("photo_url", 512).nullable().after("phone_number");
    table.index(["photo_url"], "idx_board_members_photo_url");
  });
};

exports.down = async function (knex) {
  const hasTable = await knex.schema.hasTable("board_members");
  if (!hasTable) return;
  const hasColumn = await knex.schema.hasColumn("board_members", "photo_url");
  if (!hasColumn) return;
  await knex.schema.alterTable("board_members", (table) => {
    table.dropIndex(["photo_url"], "idx_board_members_photo_url");
    table.dropColumn("photo_url");
  });
};
