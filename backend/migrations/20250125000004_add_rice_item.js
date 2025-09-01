/**
 * Migration to add rice item with kg unit
 */
exports.up = function (knex) {
  return knex("inventory_item_types").insert({
    category_id: 5, // Materials category
    name: "Rice",
    description: "White rice for food production",
    unit_of_measure: "kg",
    requires_expiry: true,
    requires_batch: true,
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
  });
};

exports.down = function (knex) {
  return knex("inventory_item_types").where("name", "Rice").del();
};
