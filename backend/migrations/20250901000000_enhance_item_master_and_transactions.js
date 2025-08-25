/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */

exports.up = async function (knex) {
  await knex.schema.alterTable("inventory_item_types", (table) => {
    table.timestamp("first_received_at").nullable();
    table.integer("receipts_count").notNullable().defaultTo(0);
    table
      .enu("status", ["draft", "active", "discontinued"], {
        useNative: true,
        enumName: "item_type_status",
      })
      .notNullable()
      .defaultTo("active");
  });

  await knex.schema.alterTable("inventory_transactions", (table) => {
    table.boolean("is_first_receipt").notNullable().defaultTo(false);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  await knex.schema.alterTable("inventory_transactions", (table) => {
    table.dropColumn("is_first_receipt");
  });

  await knex.schema.alterTable("inventory_item_types", (table) => {
    table.dropColumn("first_received_at");
    table.dropColumn("receipts_count");
    table.dropColumn("status");
  });
};
