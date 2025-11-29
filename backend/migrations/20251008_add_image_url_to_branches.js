exports.up = async function (knex) {
  const exists = await knex.schema.hasColumn("branches", "image_url");
  if (!exists) {
    await knex.schema.alterTable("branches", (table) => {
      table.string("image_url");
    });
  }
};

exports.down = async function (knex) {
  const exists = await knex.schema.hasColumn("branches", "image_url");
  if (exists) {
    await knex.schema.alterTable("branches", (table) => {
      table.dropColumn("image_url");
    });
  }
};
