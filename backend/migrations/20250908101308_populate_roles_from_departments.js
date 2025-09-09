/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  // Clear existing roles first
  await knex("user_roles").del();

  // Insert roles based on department structure from the image
  const roles = [
    // Super Admin (system role)
    {
      role: "Super Admin",
      department: "System",
      description: "System administrator with full access to all modules",
      is_active: true,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now(),
    },

    // HR Department
    {
      role: "Manager",
      department: "HR",
      description: "HR Department Manager",
      is_active: true,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now(),
    },
    {
      role: "Staff",
      department: "HR",
      description: "HR Department Staff",
      is_active: true,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now(),
    },

    // Finance Department
    {
      role: "Manager",
      department: "Finance",
      description: "Finance Department Manager",
      is_active: true,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now(),
    },
    {
      role: "Staff",
      department: "Finance",
      description: "Finance Department Staff",
      is_active: true,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now(),
    },

    // SCM Department
    {
      role: "Manager",
      department: "SCM",
      description: "Supply Chain Management Department Manager",
      is_active: true,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now(),
    },
    {
      role: "Staff",
      department: "SCM",
      description: "Supply Chain Management Department Staff",
      is_active: true,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now(),
    },

    // Production Department
    {
      role: "Manager",
      department: "Production",
      description: "Production Department Manager",
      is_active: true,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now(),
    },
    {
      role: "Staff",
      department: "Production",
      description: "Production Department Staff",
      is_active: true,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now(),
    },

    // CRM Department
    {
      role: "Manager",
      department: "CRM",
      description: "Customer Relationship Management Department Manager",
      is_active: true,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now(),
    },
    {
      role: "Staff",
      department: "CRM",
      description: "Customer Relationship Management Department Staff",
      is_active: true,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now(),
    },

    // Branch Department
    {
      role: "Manager",
      department: "Branch",
      description: "Branch Manager",
      is_active: true,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now(),
    },
    {
      role: "Cook",
      department: "Branch",
      description: "Branch Cook",
      is_active: true,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now(),
    },
    {
      role: "Kitchen Assistant",
      department: "Branch",
      description: "Branch Kitchen Assistant",
      is_active: true,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now(),
    },
    {
      role: "Cashier",
      department: "Branch",
      description: "Branch Cashier",
      is_active: true,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now(),
    },
    {
      role: "Waiter",
      department: "Branch",
      description: "Branch Waiter",
      is_active: true,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now(),
    },
  ];

  // Insert all roles
  await knex("user_roles").insert(roles);

  console.log("✅ Successfully populated roles from department structure");
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  // Remove all roles created by this migration
  await knex("user_roles").del();
  console.log("🗑️ Removed all roles from department structure");
};
