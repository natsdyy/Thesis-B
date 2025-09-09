/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  // Check if columns already exist and only add them if they don't
  const hasMenuItemId = await knex.schema.hasColumn(
    "production_batches",
    "menu_item_id"
  );
  const hasAssignedTo = await knex.schema.hasColumn(
    "production_batches",
    "assigned_to"
  );
  const hasProductionDate = await knex.schema.hasColumn(
    "production_batches",
    "production_date"
  );

  if (!hasMenuItemId || !hasAssignedTo || !hasProductionDate) {
    await knex.schema.alterTable("production_batches", (table) => {
      if (!hasMenuItemId) {
        table
          .integer("menu_item_id")
          .nullable()
          .references("id")
          .inTable("menu_items");
      }
      if (!hasAssignedTo) {
        table
          .integer("assigned_to")
          .nullable()
          .references("id")
          .inTable("users");
      }
      if (!hasProductionDate) {
        table.date("production_date").nullable();
      }
    });
  }

  // Add indexes if they don't exist
  try {
    await knex.schema.alterTable("production_batches", (table) => {
      table.index("menu_item_id");
      table.index("assigned_to");
      table.index("production_date");
    });
  } catch (error) {
    // Indexes might already exist, ignore error
    console.log("Indexes might already exist:", error.message);
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return Promise.resolve();
};
