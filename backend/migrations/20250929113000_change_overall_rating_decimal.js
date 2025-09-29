/**
 * Change order_ratings.overall_rating to numeric(3,1) to support half-star ratings
 */

exports.up = async function (knex) {
  // Use raw to ensure Postgres performs a safe cast
  await knex.schema.raw(
    "ALTER TABLE order_ratings ALTER COLUMN overall_rating TYPE numeric(3,1) USING overall_rating::numeric(3,1)"
  );
};

exports.down = async function (knex) {
  // Revert to integer; decimals will be truncated (floor)
  await knex.schema.raw(
    "ALTER TABLE order_ratings ALTER COLUMN overall_rating TYPE integer USING floor(overall_rating)"
  );
};
