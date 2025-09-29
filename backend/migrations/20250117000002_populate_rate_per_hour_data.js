/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  // Update rate_per_hour for existing roles based on Positions.vue mock data
  const roleRates = [
    // Branch Department
    { role: "Manager", department: "Branch", rate_per_hour: 35.0 },
    { role: "Cook", department: "Branch", rate_per_hour: 22.0 },
    {
      role: "Kitchen Assistant",
      department: "Branch",
      rate_per_hour: 16.0,
    },
    { role: "Cashier", department: "Branch", rate_per_hour: 18.5 },
    { role: "Waiter", department: "Branch", rate_per_hour: 17.5 },

    // Customer Relationship Department (CRM)
    { role: "Manager", department: "CRM", rate_per_hour: 40.0 },
    { role: "Staff", department: "CRM", rate_per_hour: 25.0 },

    // Finance Department
    { role: "Manager", department: "Finance", rate_per_hour: 45.0 },
    { role: "Staff", department: "Finance", rate_per_hour: 30.0 },

    // Human Resource Department
    { role: "Manager", department: "Human Resource", rate_per_hour: 38.0 },
    { role: "Staff", department: "Human Resource", rate_per_hour: 26.0 },

    // Production Department
    { role: "Manager", department: "Production", rate_per_hour: 40.0 },
    { role: "Staff", department: "Production", rate_per_hour: 24.0 },

    // Supply Chain Department (SCM)
    { role: "Manager", department: "SCM", rate_per_hour: 42.0 },
    { role: "Staff", department: "SCM", rate_per_hour: 28.0 },
  ];

  // Update each role with its corresponding rate per hour
  for (const roleRate of roleRates) {
    await knex("user_roles")
      .where({
        role: roleRate.role,
        department: roleRate.department,
      })
      .update({
        rate_per_hour: roleRate.rate_per_hour,
        updated_at: knex.fn.now(),
      });
  }
};

exports.down = async function (knex) {
  // Reset all rate_per_hour values to 0
  await knex("user_roles").update({
    rate_per_hour: 0.0,
    updated_at: knex.fn.now(),
  });
};
