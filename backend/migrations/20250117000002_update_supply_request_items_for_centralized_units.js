/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  // Step 1: Add inventory_item_type_id column
  await knex.schema.alterTable("supply_request_items", function (table) {
    table
      .integer("inventory_item_type_id")
      .unsigned()
      .nullable()
      .references("id")
      .inTable("inventory_item_types")
      .onDelete("SET NULL")
      .onUpdate("CASCADE")
      .comment(
        "Reference to inventory item type for centralized unit management"
      );
  });

  // Step 2: Update existing records to link with inventory_item_types
  // This will try to match item_type names with inventory_item_types names
  const itemTypes = await knex("inventory_item_types").select("id", "name");
  const itemTypeMap = {};

  itemTypes.forEach((type) => {
    itemTypeMap[type.name.toLowerCase()] = type.id;
  });

  // Get all supply request items
  const supplyRequestItems = await knex("supply_request_items").select("*");

  for (const item of supplyRequestItems) {
    // Try to find matching inventory item type by name
    const matchingType = itemTypes.find(
      (type) => type.name.toLowerCase() === item.item_type.toLowerCase()
    );

    if (matchingType) {
      await knex("supply_request_items").where("id", item.id).update({
        inventory_item_type_id: matchingType.id,
        item_unit: matchingType.unit_of_measure, // Update unit to match inventory
      });
    }
  }

  // Step 3: Add index for the new foreign key
  await knex.schema.alterTable("supply_request_items", function (table) {
    table.index(
      "inventory_item_type_id",
      "idx_supply_request_items_inventory_type"
    );
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  await knex.schema.alterTable("supply_request_items", function (table) {
    table.dropIndex(
      "inventory_item_type_id",
      "idx_supply_request_items_inventory_type"
    );
    table.dropColumn("inventory_item_type_id");
  });
};
