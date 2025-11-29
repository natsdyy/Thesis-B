exports.up = async function (knex) {
  const exists = await knex.schema.hasTable("board_members");
  if (exists) return;

  await knex.schema.createTable("board_members", (table) => {
    table.increments("id").primary();
    table
      .string("board_id", 20)
      .unique()
      .notNullable()
      .comment("Generated board ID (e.g., BD001234)");

    // Basic Information
    table.string("first_name", 100).notNullable();
    table.string("middle_name", 100).nullable();
    table.string("last_name", 100).notNullable();
    table.string("email", 255).unique().notNullable();
    table.string("phone_number", 20).nullable();

    // Board Position
    table
      .enum("position", [
        "Chairman of the Board",
        "Board of Directors",
        "Independent Director",
        "Executive Director",
      ])
      .notNullable();

    table.string("department", 50).defaultTo("Administration");

    // Authentication
    table.string("password").notNullable();
    table.boolean("is_active").defaultTo(true);

    // Timestamps
    table.timestamp("created_at").defaultTo(knex.fn.now());
    table.timestamp("updated_at").defaultTo(knex.fn.now());
    table.timestamp("deleted_at").nullable();

    // Indexes
    table.index("board_id");
    table.index("email");
    table.index("position");
    table.index("is_active");
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists("board_members");
};
