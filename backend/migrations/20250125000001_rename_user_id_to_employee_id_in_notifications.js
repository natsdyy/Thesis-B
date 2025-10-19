/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.alterTable("notifications", function (table) {
    // Drop the existing index on user_id
    table.dropIndex("user_id");
    table.dropIndex(["user_id", "is_read"]);

    // Rename user_id column to employee_id
    table.renameColumn("user_id", "employee_id");

    // Update the comment
    table.comment(
      "FK to employees.id (nullable for department-wide notifications)"
    );

    // Recreate indexes with new column name
    table.index("employee_id");
    table.index(["employee_id", "is_read"]);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.alterTable("notifications", function (table) {
    // Drop the indexes on employee_id
    table.dropIndex("employee_id");
    table.dropIndex(["employee_id", "is_read"]);

    // Rename employee_id back to user_id
    table.renameColumn("employee_id", "user_id");

    // Recreate original indexes
    table.index("user_id");
    table.index(["user_id", "is_read"]);
  });
};
