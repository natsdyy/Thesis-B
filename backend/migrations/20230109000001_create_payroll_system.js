/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  // Create payroll_periods table
  await knex.schema.createTable("payroll_periods", (table) => {
    table.increments("id").primary();
    table.string("period_name", 255).notNullable();
    table.enum("period_type", ["weekly", "bi-weekly", "monthly"]).notNullable();
    table.date("date_from").notNullable();
    table.date("date_to").notNullable();
    table
      .integer("generated_by")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("employees")
      .onDelete("RESTRICT");
    table
      .enum("status", [
        "draft",
        "pending_approval",
        "approved",
        "budget_released",
        "paid",
      ])
      .notNullable()
      .defaultTo("draft");
    table.decimal("total_gross_amount", 12, 2).defaultTo(0);
    table.decimal("total_deductions", 12, 2).defaultTo(0);
    table.decimal("total_net_amount", 12, 2).defaultTo(0);
    table
      .integer("finance_approved_by")
      .unsigned()
      .nullable()
      .references("id")
      .inTable("employees")
      .onDelete("SET NULL");
    table.timestamp("finance_approved_at").nullable();
    table.text("finance_remarks").nullable();
    table.integer("budget_release_id").unsigned().nullable();
    table.timestamp("budget_released_at").nullable();
    table
      .integer("paid_by")
      .unsigned()
      .nullable()
      .references("id")
      .inTable("employees")
      .onDelete("SET NULL");
    table.timestamp("paid_at").nullable();
    table.timestamp("created_at").defaultTo(knex.fn.now());
    table.timestamp("updated_at").defaultTo(knex.fn.now());
    table.timestamp("deleted_at").nullable();

    // Indexes
    table.index("status");
    table.index("date_from");
    table.index("date_to");
    table.index("generated_by");
  });

  // Create payroll_records table
  await knex.schema.createTable("payroll_records", (table) => {
    table.increments("id").primary();
    table
      .integer("payroll_period_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("payroll_periods")
      .onDelete("CASCADE");
    table
      .integer("employee_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("employees")
      .onDelete("RESTRICT");
    table.string("employee_name", 255).notNullable();
    table.string("department", 100).notNullable();
    table
      .integer("branch_id")
      .unsigned()
      .nullable()
      .references("id")
      .inTable("branches")
      .onDelete("SET NULL");
    table.string("role_name", 100).notNullable();
    table.decimal("rate_per_hour", 8, 2).notNullable();
    table.string("employee_type", 50).notNullable();

    // Attendance data
    table.decimal("days_worked", 5, 2).defaultTo(0);
    table.decimal("hours_worked", 8, 2).defaultTo(0);
    table.decimal("overtime_hours", 8, 2).defaultTo(0);
    table.integer("late_count").defaultTo(0);
    table.decimal("absent_from_lates", 5, 2).defaultTo(0);
    table.decimal("leave_days", 5, 2).defaultTo(0);
    table.decimal("sil_used_days", 5, 2).defaultTo(0);
    table.decimal("sil_converted_days", 5, 2).defaultTo(0);

    // Salary components
    table.decimal("basic_salary", 12, 2).defaultTo(0);
    table.decimal("regular_holiday_pay", 12, 2).defaultTo(0);
    table.decimal("special_holiday_pay", 12, 2).defaultTo(0);
    table.decimal("double_holiday_pay", 12, 2).defaultTo(0);
    table.decimal("holiday_hours_worked", 8, 2).defaultTo(0);
    table.decimal("overtime_pay", 12, 2).defaultTo(0);
    table.decimal("sil_conversion_pay", 12, 2).defaultTo(0);

    // Deductions - Employee share
    table.decimal("sss_employee_share", 12, 2).defaultTo(0);
    table.decimal("philhealth_employee_share", 12, 2).defaultTo(0);
    table.decimal("pagibig_employee_share", 12, 2).defaultTo(0);

    // Deductions - Employer share
    table.decimal("sss_employer_share", 12, 2).defaultTo(0);
    table.decimal("philhealth_employer_share", 12, 2).defaultTo(0);
    table.decimal("pagibig_employer_share", 12, 2).defaultTo(0);

    // Totals
    table.decimal("total_deductions", 12, 2).defaultTo(0);
    table.decimal("total_employer_contributions", 12, 2).defaultTo(0);
    table.decimal("gross_salary", 12, 2).defaultTo(0);
    table.decimal("net_salary", 12, 2).defaultTo(0);

    // Status and metadata
    table
      .enum("status", ["pending", "approved", "rejected", "paid"])
      .notNullable()
      .defaultTo("pending");
    table.text("remarks").nullable();
    table.boolean("email_sent").defaultTo(false);
    table.timestamp("email_sent_at").nullable();
    table.timestamp("created_at").defaultTo(knex.fn.now());
    table.timestamp("updated_at").defaultTo(knex.fn.now());
    table.timestamp("deleted_at").nullable();

    // Indexes
    table.index("payroll_period_id");
    table.index("employee_id");
    table.index("status");
  });

  // Create employee_sil_credits table
  await knex.schema.createTable("employee_sil_credits", (table) => {
    table.increments("id").primary();
    table
      .integer("employee_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("employees")
      .onDelete("CASCADE");
    table.decimal("total_credits", 5, 2).defaultTo(5.0);
    table.decimal("used_credits", 5, 2).defaultTo(0);
    table.decimal("available_credits", 5, 2).defaultTo(5.0);
    table.date("last_accrual_date").nullable();
    table.integer("year").notNullable();
    table.timestamp("created_at").defaultTo(knex.fn.now());
    table.timestamp("updated_at").defaultTo(knex.fn.now());

    // Unique constraint
    table.unique(["employee_id", "year"]);

    // Indexes
    table.index("employee_id");
    table.index("year");
  });

  // Create philippine_holidays table (for custom/company-specific holidays)
  await knex.schema.createTable("philippine_holidays", (table) => {
    table.increments("id").primary();
    table.string("holiday_name", 255).notNullable();
    table.date("holiday_date").notNullable();
    table
      .enum("holiday_type", [
        "regular",
        "special_non_working",
        "special_working",
        "double",
      ])
      .notNullable();
    table.integer("year").notNullable();
    table.boolean("is_active").defaultTo(true);
    table.text("description").nullable();
    table.timestamp("created_at").defaultTo(knex.fn.now());
    table.timestamp("updated_at").defaultTo(knex.fn.now());

    // Unique constraint
    table.unique(["holiday_date", "year"]);

    // Indexes
    table.index("holiday_date");
    table.index("year");
    table.index("holiday_type");
  });

  console.log("✅ Created payroll system tables");
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  await knex.schema.dropTableIfExists("philippine_holidays");
  await knex.schema.dropTableIfExists("employee_sil_credits");
  await knex.schema.dropTableIfExists("payroll_records");
  await knex.schema.dropTableIfExists("payroll_periods");

  console.log("✅ Dropped payroll system tables");
};
