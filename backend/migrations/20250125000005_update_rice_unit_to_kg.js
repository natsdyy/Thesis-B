/**
 * Migration to update the unit of rice from 'pieces' to 'kg'
 * Since rice is stored under 'Other Materials',
 * we need to update that item type's unit
 */
exports.up = async function (knex) {
  return knex("inventory_item_types")
    .where("name", "Other Materials")
    .update({
      unit_of_measure: "kg",
      updated_at: new Date(),
    });
};

exports.down = async function (knex) {
  // Revert the unit back to 'pieces' if the migration is rolled back
  return knex("inventory_item_types")
    .where("name", "Other Materials")
    .update({
      unit_of_measure: "pieces",
      updated_at: new Date(),
    });
};
