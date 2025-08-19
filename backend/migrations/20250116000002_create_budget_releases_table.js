/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
<<<<<<< HEAD
exports.up = function (knex) {
  return knex.schema.createTable("budget_releases", function (table) {
    table.increments("id").primary();
    table
      .string("release_id", 50)
      .notNullable()
      .unique()
      .comment("Unique release identifier");
    table
      .integer("supply_request_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("supply_requests")
      .onDelete("RESTRICT")
      .onUpdate("CASCADE")
      .comment("Reference to supply request");
    table
      .decimal("released_amount", 15, 2)
      .notNullable()
      .comment("Amount released");
    table
      .string("released_by", 255)
      .notNullable()
      .comment("Finance user who released budget");
    table
      .timestamp("released_at")
      .notNullable()
      .comment("Budget release timestamp");
    table
      .text("release_remarks")
      .nullable()
      .comment("Remarks for budget release");
    table
      .boolean("receipt_confirmed")
      .defaultTo(false)
      .comment("SCM confirmed receipt");
    table
      .string("receipt_confirmed_by", 255)
      .nullable()
      .comment("SCM user who confirmed");
    table
      .timestamp("receipt_confirmed_at")
      .nullable()
      .comment("Receipt confirmation timestamp");
    table.timestamps(true, true);

    // Indexes
    table.index("release_id", "idx_budget_releases_release_id");
    table.index("supply_request_id", "idx_budget_releases_request_id");
    table.index("released_at", "idx_budget_releases_date");
    table.index("receipt_confirmed", "idx_budget_releases_confirmed");
=======
exports.up = function(knex) {
  return knex.schema.createTable('budget_releases', function(table) {
    table.increments('id').primary();
    table.string('release_number').unique().notNullable();
    table.date('release_date').notNullable();
    table.integer('supply_request_id').unsigned().references('id').inTable('supply_requests');
    table.integer('branch_id').unsigned().references('id').inTable('branches');
    table.decimal('amount_released', 10, 2).notNullable();
    table.string('status').defaultTo('Pending');
    table.text('remarks');
    table.integer('approved_by').unsigned().references('id').inTable('users');
    table.timestamps(true, true);
>>>>>>> f9b8338ccee227920f0d00d7c674d084059303a3
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
<<<<<<< HEAD
exports.down = function (knex) {
  return knex.schema.dropTable("budget_releases");
};
=======
exports.down = function(knex) {
  return knex.schema.dropTable('budget_releases');
};

>>>>>>> f9b8338ccee227920f0d00d7c674d084059303a3
