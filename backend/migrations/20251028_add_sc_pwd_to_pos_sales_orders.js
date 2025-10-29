/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function up(knex) {
  await knex.schema.alterTable("pos_sales_orders", (table) => {
    table
      .enum("discount_type", ["NONE", "SC", "PWD"])
      .notNullable()
      .defaultTo("NONE")
      .comment("PH Senior Citizen / PWD discount applied to entire order");
    table.string("beneficiary_name").nullable();
    table.string("beneficiary_id_no").nullable();
    table.decimal("discount_rate", 5, 4).notNullable().defaultTo(0.2);
    table.boolean("is_vat_exempt").notNullable().defaultTo(false);
    table.decimal("gross_amount", 12, 2).notNullable().defaultTo(0);
    table.decimal("vat_exempt_sales", 12, 2).notNullable().defaultTo(0);
    table.decimal("discount_amount", 12, 2).notNullable().defaultTo(0);
    table.decimal("net_amount", 12, 2).notNullable().defaultTo(0);
    table.decimal("output_vat", 12, 2).notNullable().defaultTo(0);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function down(knex) {
  await knex.schema.alterTable("pos_sales_orders", (table) => {
    table.dropColumn("discount_type");
    table.dropColumn("beneficiary_name");
    table.dropColumn("beneficiary_id_no");
    table.dropColumn("discount_rate");
    table.dropColumn("is_vat_exempt");
    table.dropColumn("gross_amount");
    table.dropColumn("vat_exempt_sales");
    table.dropColumn("discount_amount");
    table.dropColumn("net_amount");
    table.dropColumn("output_vat");
  });
};
