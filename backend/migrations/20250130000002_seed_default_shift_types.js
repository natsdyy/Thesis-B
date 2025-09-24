/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex("shift_types").insert([
    {
      name: "Morning Shift",
      start_time: "06:00",
      end_time: "14:00",
      color_class: "bg-blue-100 text-blue-800",
      description: "Early morning to afternoon shift",
      is_active: true,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now(),
    },
    {
      name: "Afternoon Shift",
      start_time: "14:00",
      end_time: "22:00",
      color_class: "bg-green-100 text-green-800",
      description: "Afternoon to evening shift",
      is_active: true,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now(),
    },
    {
      name: "Night Shift",
      start_time: "22:00",
      end_time: "06:00",
      color_class: "bg-purple-100 text-purple-800",
      description: "Night to early morning shift",
      is_active: true,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now(),
    },
  ]);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex("shift_types").del();
};
