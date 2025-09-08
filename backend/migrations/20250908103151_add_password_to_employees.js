exports.up = async function (knex) {
  await knex.schema.alterTable("employees", (table) => {
    table.string("password").nullable().after("email");
    table.timestamp("last_login").nullable().after("password");
    table.boolean("is_active").defaultTo(true).after("last_login");
  });
};

exports.down = async function (knex) {
  await knex.schema.alterTable("employees", (table) => {
    table.dropColumn("password");
    table.dropColumn("last_login");
    table.dropColumn("is_active");
  });
};
