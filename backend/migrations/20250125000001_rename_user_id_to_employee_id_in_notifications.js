/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  const hasUserId = await knex.schema.hasColumn("notifications", "user_id");
  
  if (!hasUserId) {
    console.log("Notifications table already has employee_id or missing user_id. Skipping rename.");
    return;
  }

  return knex.schema.alterTable("notifications", function (table) {
    // Drop the existing index on user_id
    // We use raw SQL for drop index if exists to be safe
    table.dropIndex("user_id").catch(() => {});
    table.dropIndex(["user_id", "is_read"]).catch(() => {});

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
exports.down = async function (knex) {
  const hasEmployeeId = await knex.schema.hasColumn("notifications", "employee_id");
  const hasUserId = await knex.schema.hasColumn("notifications", "user_id");

  if (!hasEmployeeId || hasUserId) return;

  return knex.schema.alterTable("notifications", function (table) {
    // Drop the indexes on employee_id
    table.dropIndex("employee_id").catch(() => {});
    table.dropIndex(["employee_id", "is_read"]).catch(() => {});

    // Rename employee_id back to user_id
    table.renameColumn("employee_id", "user_id");

    // Recreate original indexes
    table.index("user_id");
    table.index(["user_id", "is_read"]);
  });
};
