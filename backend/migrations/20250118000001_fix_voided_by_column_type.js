/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema
    .alterTable("pos_sales_orders", function (table) {
      // First, drop the existing column
      table.dropColumn("voided_by");
    })
    .then(() => {
      // Then add it back with the correct type and foreign key
      return knex.schema.alterTable("pos_sales_orders", function (table) {
        table
          .integer("voided_by")
          .unsigned()
          .nullable()
          .references("id")
          .inTable("employees")
          .onDelete("SET NULL")
          .comment("Employee who voided the order");
      });
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema
    .alterTable("pos_sales_orders", function (table) {
      // Drop the foreign key constraint first
      table.dropForeign("voided_by");
      table.dropColumn("voided_by");
    })
    .then(() => {
      // Add it back as string (original type)
      return knex.schema.alterTable("pos_sales_orders", function (table) {
        table
          .string("voided_by", 255)
          .nullable()
          .comment("Employee who voided the order");
      });
    });
};
