/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  await knex.schema.alterTable("inventory_items", function (table) {
    table.string("item_name", 255).nullable().after("item_type_id");
  });

  // Update existing records to populate item_name from item_type name
  await knex.raw(`
    UPDATE inventory_items 
    SET item_name = (
      SELECT it.name 
      FROM inventory_item_types it 
      WHERE it.id = inventory_items.item_type_id
    )
  `);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  await knex.schema.alterTable("inventory_items", function (table) {
    table.dropColumn("item_name");
  });
};
