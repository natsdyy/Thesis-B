/**
 * Add granular announcement permissions and assign them to CRM roles.
 * @param { import('knex').Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function up(knex) {
  await knex.transaction(async (trx) => {
    const permissionsToAdd = [
      {
        name: "announcements:create",
        key: "announcements:create",
        module: "crm",
      },
      {
        name: "announcements:update",
        key: "announcements:update",
        module: "crm",
      },
      {
        name: "announcements:delete",
        key: "announcements:delete",
        module: "crm",
      },
    ];

    const permissionIdMap = {};

    for (const p of permissionsToAdd) {
      const existing = await trx("user_permissions")
        .where({ permission_key: p.key })
        .first();

      if (existing) {
        permissionIdMap[p.name] = existing.permission_id;
        continue;
      }

      const inserted = await trx("user_permissions")
        .insert({
          permission_name: p.name,
          permission_key: p.key,
          module: p.module,
        })
        .returning(["permission_id"]);

      const permissionRow = Array.isArray(inserted) ? inserted[0] : inserted;
      permissionIdMap[p.name] = permissionRow.permission_id;
    }

    const roles = await trx("user_roles")
      .select("role_id", "role", "department", "deleted_at")
      .whereNull("deleted_at");

    const normalize = (value) => (value || "").toLowerCase().trim();
    const isCrmDepartment = (department) => {
      const normalized = normalize(department);
      return [
        "crm",
        "customer relationship",
        "customer_relationship",
        "customer relationship management",
        "customer_relationship_management",
        "customer-relations",
        "customer relations",
      ].includes(normalized);
    };

    const crmAdminRoles = roles.filter(
      (role) =>
        isCrmDepartment(role.department) && normalize(role.role) === "admin"
    );

    const crmManagerRoles = roles.filter(
      (role) =>
        isCrmDepartment(role.department) && normalize(role.role) === "manager"
    );

    const assignPermissions = async (role, permissionNamesToAssign) => {
      for (const permissionName of permissionNamesToAssign) {
        const permissionId = permissionIdMap[permissionName];
        if (!permissionId) continue;

        const existingAssignment = await trx("role_permissions")
          .where({ role_id: role.role_id, permission_id: permissionId })
          .first();

        if (existingAssignment) {
          if (existingAssignment.deleted_at) {
            await trx("role_permissions")
              .where({ id: existingAssignment.id })
              .update({
                deleted_at: null,
                is_active: true,
                updated_at: knex.fn.now(),
              });
          }
          continue;
        }

        await trx("role_permissions").insert({
          role_id: role.role_id,
          permission_id: permissionId,
          created_at: knex.fn.now(),
          updated_at: knex.fn.now(),
          is_active: true,
        });
      }
    };

    for (const role of crmAdminRoles) {
      await assignPermissions(
        role,
        permissionsToAdd.map((p) => p.name)
      );
    }

    const managerPermissions = ["announcements:create", "announcements:update"];
    for (const role of crmManagerRoles) {
      await assignPermissions(role, managerPermissions);
    }
  });
};

/**
 * Remove previously added announcement permissions.
 * @param { import('knex').Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function down(knex) {
  await knex.transaction(async (trx) => {
    const permissionKeys = [
      "announcements:create",
      "announcements:update",
      "announcements:delete",
    ];

    const permissions = await trx("user_permissions").whereIn(
      "permission_key",
      permissionKeys
    );

    if (!permissions || permissions.length === 0) {
      return;
    }

    const permissionIds = permissions.map((perm) => perm.permission_id);

    await trx("role_permissions").whereIn("permission_id", permissionIds).del();
    await trx("user_permissions").whereIn("permission_id", permissionIds).del();
  });
};
