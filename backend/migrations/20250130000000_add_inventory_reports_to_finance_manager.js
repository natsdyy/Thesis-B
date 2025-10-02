/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  try {
    console.log(
      '🌱 Adding "View Inventory Reports" permission to Finance Manager role...'
    );

    // Get the permission ID for "View Inventory Reports"
    const inventoryReportsPermission = await knex("user_permissions")
      .where("permission_name", "View Inventory Reports")
      .first();

    if (!inventoryReportsPermission) {
      console.log(
        '❌ "View Inventory Reports" permission not found. Creating it...'
      );

      // Create the permission if it doesn't exist
      const [newPermission] = await knex("user_permissions")
        .insert({
          permission_name: "View Inventory Reports",
          permission_key: "inventory:view_reports",
          module: "inventory",
          description:
            "View inventory reports and analytics for forecasting purposes",
          is_active: true,
          created_at: knex.fn.now(),
          updated_at: knex.fn.now(),
        })
        .returning("*");

      console.log(
        `✅ Created permission: ${newPermission.permission_name} (ID: ${newPermission.permission_id})`
      );
    }

    // Get the role ID for Finance Manager
    const financeManagerRole = await knex("user_roles")
      .where("role", "Manager")
      .where("department", "Finance")
      .first();

    if (!financeManagerRole) {
      throw new Error("Finance Manager role not found");
    }

    console.log(
      `📋 Found Finance Manager role: ${financeManagerRole.role}-${financeManagerRole.department} (ID: ${financeManagerRole.role_id})`
    );

    // Check if the permission is already assigned to Finance Manager
    const existingAssignment = await knex("role_permissions")
      .where("role_id", financeManagerRole.role_id)
      .where(
        "permission_id",
        inventoryReportsPermission?.permission_id ||
          (
            await knex("user_permissions")
              .where("permission_name", "View Inventory Reports")
              .first()
          ).permission_id
      )
      .first();

    if (existingAssignment) {
      console.log("⏭️  Permission already assigned to Finance Manager");
      return;
    }

    // Get the permission ID (either existing or newly created)
    const permissionId =
      inventoryReportsPermission?.permission_id ||
      (
        await knex("user_permissions")
          .where("permission_name", "View Inventory Reports")
          .first()
      ).permission_id;

    // Add the permission to Finance Manager role
    await knex("role_permissions").insert({
      role_id: financeManagerRole.role_id,
      permission_id: permissionId,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now(),
    });

    console.log(
      `✅ Added "View Inventory Reports" permission to Finance Manager role`
    );
  } catch (error) {
    console.error(
      "❌ Error adding inventory reports permission to Finance Manager:",
      error
    );
    throw error;
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  try {
    console.log(
      '🔄 Removing "View Inventory Reports" permission from Finance Manager role...'
    );

    // Get the role ID for Finance Manager
    const financeManagerRole = await knex("user_roles")
      .where("role", "Manager")
      .where("department", "Finance")
      .first();

    if (!financeManagerRole) {
      console.log("⏭️  Finance Manager role not found, nothing to remove");
      return;
    }

    // Get the permission ID for "View Inventory Reports"
    const inventoryReportsPermission = await knex("user_permissions")
      .where("permission_name", "View Inventory Reports")
      .first();

    if (!inventoryReportsPermission) {
      console.log(
        '⏭️  "View Inventory Reports" permission not found, nothing to remove'
      );
      return;
    }

    // Remove the permission from Finance Manager role
    const deletedCount = await knex("role_permissions")
      .where("role_id", financeManagerRole.role_id)
      .where("permission_id", inventoryReportsPermission.permission_id)
      .del();

    if (deletedCount > 0) {
      console.log(
        `✅ Removed "View Inventory Reports" permission from Finance Manager role`
      );
    } else {
      console.log("⏭️  Permission was not assigned to Finance Manager role");
    }
  } catch (error) {
    console.error(
      "❌ Error removing inventory reports permission from Finance Manager:",
      error
    );
    throw error;
  }
};
