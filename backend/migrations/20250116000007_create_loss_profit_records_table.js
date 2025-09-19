exports.up = function (knex) {
  return knex.schema.createTable("loss_profit_records", function (table) {
    table.increments("id").primary();
    table.string("record_type").notNullable(); // 'loss' or 'profit'
    table.decimal("amount", 10, 2).notNullable();
    table.text("description").nullable();
    table.string("reference_number").nullable();
    table.timestamp("record_date").defaultTo(knex.fn.now());
    table.timestamp("created_at").defaultTo(knex.fn.now());
    table.timestamp("updated_at").defaultTo(knex.fn.now());
  });
};

exports.down = function (knex) {
  return knex.schema.dropTable("loss_profit_records");
};
