exports.up = async function (knex) {
  // Add board_member_id column to org_chart_positions
  await knex.schema.alterTable("org_chart_positions", (table) => {
    table
      .integer("board_member_id")
      .unsigned()
      .nullable()
      .references("id")
      .inTable("board_members")
      .onDelete("SET NULL")
      .after("employee_id");
  });

  // Update existing org chart positions to reference board members
  // First, let's get the board members
  const chairman = await knex("board_members")
    .where("position", "Chairman of the Board")
    .first();

  const boardDirectors = await knex("board_members").where(
    "position",
    "Board of Directors"
  );

  // Update chairman position
  if (chairman) {
    await knex("org_chart_positions")
      .where("title", "Chairman of the Board")
      .update({ board_member_id: chairman.id });
  }

  // Update board director positions
  if (boardDirectors.length > 0) {
    for (let i = 0; i < boardDirectors.length; i++) {
      const director = boardDirectors[i];
      const position = await knex("org_chart_positions")
        .where("title", "Board of Directors (Legal)")
        .orWhere("title", "Board of Directors (Audit)")
        .orderBy("id")
        .offset(i)
        .first();

      if (position) {
        await knex("org_chart_positions")
          .where("id", position.id)
          .update({ board_member_id: director.id });
      }
    }
  }
};

exports.down = async function (knex) {
  await knex.schema.alterTable("org_chart_positions", (table) => {
    table.dropForeign("board_member_id");
    table.dropColumn("board_member_id");
  });
};
