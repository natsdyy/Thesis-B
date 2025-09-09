/**
 * Add photo_url column to employees for storing uploaded photo path
 */

exports.up = async function up(knex) {
  const hasColumn = await knex.schema.hasColumn("employees", "photo_url");
  if (!hasColumn) {
    await knex.schema.alterTable("employees", (table) => {
      table.string("photo_url").nullable();
    });
  }
};

exports.down = async function down(knex) {
  const hasColumn = await knex.schema.hasColumn("employees", "photo_url");
  if (hasColumn) {
    await knex.schema.alterTable("employees", (table) => {
      table.dropColumn("photo_url");
    });
  }
};
