/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable("shift_types", function (table) {
    table.increments("id").primary();
    table.string("name", 100).notNullable().unique(); // Morning Shift, Afternoon Shift, etc.
    table.time("start_time").notNullable();
    table.time("end_time").notNullable();
    table.string("color_class", 50).defaultTo("bg-gray-100 text-gray-800"); // Tailwind color classes
    table.text("description").nullable();
    table.boolean("is_active").defaultTo(true);
    table.timestamps(true, true);

    // Index for better performance
    table.index(["is_active"]);
    table.index(["name"]);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTable("shift_types");
};
