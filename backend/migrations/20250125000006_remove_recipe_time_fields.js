/**
 * Migration to remove prep_time_minutes, cooking_time_minutes, and difficulty_level
 * from recipes table as they are not relevant for food production management
 */
exports.up = function (knex) {
  return knex.schema.table("recipes", function (table) {
    table.dropColumn("prep_time_minutes");
    table.dropColumn("cooking_time_minutes");
    table.dropColumn("difficulty_level");
  });
};

exports.down = function (knex) {
  return knex.schema.table("recipes", function (table) {
    table.integer("prep_time_minutes").nullable();
    table.integer("cooking_time_minutes").nullable();
    table.string("difficulty_level", 50).defaultTo("Medium");
  });
};
