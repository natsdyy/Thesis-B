exports.up = async function (knex) {
  // Insert Chairman (root)
  const [chairman] = await knex("org_chart_positions")
    .insert({
      title: "Chairman of the Board",
      person_name: "Marvin B. Flor",
      parent_id: null,
      department: "Administration",
      order_index: 0,
    })
    .returning("*");

  // Insert Board of Directors (Legal)
  await knex("org_chart_positions").insert({
    title: "Board of Directors (Legal)",
    person_name: "Marissa G. Flor",
    parent_id: chairman.id,
    department: "Administration",
    order_index: 0,
  });

  // Insert Board of Directors (Audit)
  await knex("org_chart_positions").insert({
    title: "Board of Directors (Audit)",
    person_name: "Angie F. Cruz",
    parent_id: chairman.id,
    department: "Administration",
    order_index: 1,
  });
};

exports.down = async function (knex) {
  await knex("org_chart_positions").del();
};
