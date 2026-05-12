/**
 * Ensure CRM admin and manager roles can manage FAQs.
 * @param { import('knex').Knex } knex
 */
exports.up = async function up(knex) {
  await knex.transaction(async (trx) => {
    const permissionName = "Manage FAQ";
    const permissionKey = "faqs:manage";
    const module = "crm";

    let permission = await trx("user_permissions")
      .where({ permission_key: permissionKey })
      .first();

    if (!permission) {
      const inserted = await trx("user_permissions")
        .insert({
          permission_name: permissionName,
          permission_key: permissionKey,
          module: module,
        })
        .returning(["permission_id"]);

      permission = Array.isArray(inserted) ? inserted[0] : inserted;
    }

    if (!permission) {
      throw new Error("Failed to resolve Manage FAQ permission id");
    }

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

    const crmRoles = await trx("user_roles")
      .select("role_id", "role", "department")
      .whereNull("deleted_at");

    const targetRoles = crmRoles.filter((role) => {
      if (!isCrmDepartment(role.department)) {
        return false;
      }

      const normalizedRole = normalize(role.role);
      return normalizedRole === "manager" || normalizedRole === "admin";
    });

    for (const role of targetRoles) {
      const existingAssignment = await trx("role_permissions")
        .where({
          role_id: role.role_id,
          permission_id: permission.permission_id,
        })
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
        permission_id: permission.permission_id,
        created_at: knex.fn.now(),
        updated_at: knex.fn.now(),
        is_active: true,
      });
    }
  });
};

/**
 * Revoke Manage FAQ access from CRM admin and manager roles.
 * @param { import('knex').Knex } knex
 */
exports.down = async function down(knex) {
  await knex.transaction(async (trx) => {
    const permission = await trx("user_permissions")
      .where({ permission_key: "faqs:manage" })
      .first();

    if (!permission) {
      return;
    }

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

    const crmRoles = await trx("user_roles")
      .select("role_id", "role", "department")
      .whereNull("deleted_at");

    const roleIds = crmRoles
      .filter((role) => {
        if (!isCrmDepartment(role.department)) {
          return false;
        }

        const normalizedRole = normalize(role.role);
        return normalizedRole === "manager" || normalizedRole === "admin";
      })
      .map((role) => role.role_id);

    if (roleIds.length === 0) {
      return;
    }

    await trx("role_permissions")
      .whereIn("role_id", roleIds)
      .where("permission_id", permission.permission_id)
      .update({
        deleted_at: knex.fn.now(),
        is_active: false,
        updated_at: knex.fn.now(),
      });
  });
};
