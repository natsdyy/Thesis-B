exports.up = function (knex) {
  return knex.schema.alterTable("pos_sales_orders", function (table) {
    table.index(["branch_id", "created_at"], "idx_pos_orders_branch_date");
    table.index(["status", "created_at"], "idx_pos_orders_status_date");
    table.index(["order_type", "created_at"], "idx_pos_orders_type_date");
  });
};

exports.down = function (knex) {
  return knex.schema.alterTable("pos_sales_orders", function (table) {
    table.dropIndex(["branch_id", "created_at"], "idx_pos_orders_branch_date");
    table.dropIndex(["status", "created_at"], "idx_pos_orders_status_date");
    table.dropIndex(["order_type", "created_at"], "idx_pos_orders_type_date");
  });
};
