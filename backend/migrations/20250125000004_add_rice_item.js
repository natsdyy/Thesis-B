/**
 * Migration to add rice item with kg unit
 */
exports.up = async function (knex) {
  // Look up Materials category ID
  const materialsCategory = await knex("inventory_categories")
    .where("name", "Materials")
    .first();

  if (!materialsCategory) {
    throw new Error("Materials category not found. Please run inventory seeding migration first.");
  }

  return knex("inventory_item_types").insert({
    category_id: materialsCategory.id,
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
