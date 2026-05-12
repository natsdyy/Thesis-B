/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  // Check if roles already exist
  const existingRoles = await knex("user_roles").select("*");
  if (existingRoles.length > 0) return;

  const roles = [
    {
      role: "Super Admin",
      department: "System",
      description: "System administrator with full access to all modules",
      is_active: true,
    },
    {
      role: "Manager",
      department: "HR",
      description: "HR Department Manager",
      is_active: true,
    },
    {
      role: "Manager",
      department: "Finance",
      description: "Finance Department Manager",
      is_active: true,
    },
    {
      role: "Manager",
      department: "SCM",
      description: "Supply Chain Management Department Manager",
      is_active: true,
    },
    {
      role: "Manager",
      department: "Production",
      description: "Production Department Manager",
      is_active: true,
    },
    {
      role: "Manager",
      department: "CRM",
      description: "Customer Relationship Management Department Manager",
      is_active: true,
    },
    {
      role: "Manager",
      department: "Branch",
      description: "Branch Manager",
      is_active: true,
    },
  ];

  await knex("user_roles").insert(roles);
};

exports.down = function (knex) {
  return knex("user_roles").del();
};
