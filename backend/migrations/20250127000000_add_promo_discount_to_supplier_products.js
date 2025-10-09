/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.alterTable("supplier_products", function (table) {
    // Promo discount fields
    table
      .boolean("has_promo_discount")
      .defaultTo(false)
      .comment("Whether this product has a promotional discount");
    table
      .integer("promo_minimum_quantity")
      .nullable()
      .comment("Minimum quantity required for promo discount");
    table
      .decimal("promo_discount_percentage", 5, 2)
      .nullable()
      .comment("Discount percentage (0-100)");
    table
      .decimal("promo_discount_amount", 10, 2)
      .nullable()
      .comment("Fixed discount amount");
    table
      .string("promo_discount_type", 20)
      .defaultTo("percentage")
      .comment("Type of discount: percentage or fixed_amount");
    table
      .text("promo_description")
      .nullable()
      .comment("Description of the promotional offer");
    table.timestamp("promo_start_date").nullable().comment("Promo start date");
    table.timestamp("promo_end_date").nullable().comment("Promo end date");
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.alterTable("supplier_products", function (table) {
    table.dropColumn("has_promo_discount");
    table.dropColumn("promo_minimum_quantity");
    table.dropColumn("promo_discount_percentage");
    table.dropColumn("promo_discount_amount");
    table.dropColumn("promo_discount_type");
    table.dropColumn("promo_description");
    table.dropColumn("promo_start_date");
    table.dropColumn("promo_end_date");
  });
};
