exports.up = async function (knex) {
  const exists = await knex.schema.hasTable("org_chart_positions");
  if (exists) return;

  await knex.schema.createTable("org_chart_positions", (table) => {
    table.increments("id").primary();
    table.string("title").notNullable();
    table.string("person_name");
    table
      .integer("employee_id")
      .unsigned()
      .references("id")
      .inTable("employees")
      .onDelete("SET NULL");
    table
      .integer("parent_id")
      .unsigned()
      .references("id")
      .inTable("org_chart_positions")
      .onDelete("SET NULL");
    table.string("department").defaultTo("Administration");
    table.integer("order_index").defaultTo(0);
    table.text("notes");
    table.integer("created_by").unsigned().nullable();
    table.integer("updated_by").unsigned().nullable();
    table.timestamp("created_at").defaultTo(knex.fn.now());
    table.timestamp("updated_at").defaultTo(knex.fn.now());
    table.timestamp("deleted_at").nullable();
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists("org_chart_positions");
};
