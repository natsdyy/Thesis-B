/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable("branch_positions", (table) => {
    table.increments("id").primary();
    
    // Foreign key to branches table
    table
      .integer("branch_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("branches")
      .onDelete("CASCADE")
      .comment("Branch where this position exists");
    
    // Position details
    table.string("position_title", 100).notNullable().comment("Job position title");
    table.string("position_code", 50).notNullable().comment("Unique position code within branch");
    table.text("description").nullable().comment("Position description");
    table.text("requirements").nullable().comment("Job requirements");
    
    // Salary information
    table
      .decimal("rate_per_hour", 10, 2)
      .notNullable()
      .comment("Hourly rate in PHP");
    table
      .integer("hours_per_month")
      .notNullable()
      .defaultTo(160)
      .comment("Standard hours per month (default 160 for full-time)");
    table
      .decimal("monthly_salary", 12, 2)
      .nullable()
      .comment("Calculated monthly salary (rate_per_hour × hours_per_month)");
    
    // Position management
    table
      .integer("total_slots")
      .notNullable()
      .defaultTo(1)
      .comment("Total number of slots for this position");
    table
      .integer("filled_slots")
      .notNullable()
      .defaultTo(0)
      .comment("Number of filled slots");
    table
      .enum("status", ["open", "filled", "on-hold", "closed"])
      .notNullable()
      .defaultTo("open")
      .comment("Position status");
    
    // Department and category
    table
      .enum("department", [
        "Human Resource",
        "Finance", 
        "SCM",
        "Production",
        "CRM",
        "Branch"
      ])
      .notNullable()
      .comment("Department this position belongs to");
    
    table
      .enum("position_type", ["Full-time", "Part-time", "Contract", "Intern"])
      .notNullable()
      .defaultTo("Full-time")
      .comment("Type of employment");
    
    // System fields
    table
      .boolean("is_active")
      .notNullable()
      .defaultTo(true)
      .comment("Whether position is active");
    table.timestamps(true, true);
    table.timestamp("deleted_at").nullable();
    
    // Indexes
    table.index("branch_id", "idx_branch_positions_branch_id");
    table.index("position_code", "idx_branch_positions_code");
    table.index("status", "idx_branch_positions_status");
    table.index("department", "idx_branch_positions_department");
    table.index("is_active", "idx_branch_positions_is_active");
    
    // Unique constraint for position code within branch
    table.unique(["branch_id", "position_code"], "unique_branch_position_code");
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTable("branch_positions");
};

