exports.up = function (knex) {
  return Promise.all([
    // Index for sales stats queries
    knex.schema.raw(`
      CREATE INDEX IF NOT EXISTS idx_pos_sales_orders_branch_status_created 
      ON pos_sales_orders (branch_id, status, created_at)
    `),

    // Index for voided orders queries
    knex.schema.raw(`
      CREATE INDEX IF NOT EXISTS idx_pos_sales_orders_branch_status_voided 
      ON pos_sales_orders (branch_id, status, voided_at)
    `),

    // Index for void reason queries
    knex.schema.raw(`
      CREATE INDEX IF NOT EXISTS idx_pos_sales_orders_void_reason 
      ON pos_sales_orders (void_reason)
    `),

    // Index for loss profit records
    knex.schema.raw(`
      CREATE INDEX IF NOT EXISTS idx_loss_profit_records_order_branch 
      ON loss_profit_records (order_id, branch_id)
    `),

    // Index for loss profit records by date
    knex.schema.raw(`
      CREATE INDEX IF NOT EXISTS idx_loss_profit_records_recorded_at 
      ON loss_profit_records (recorded_at)
    `),
  ]);
};

exports.down = function (knex) {
  return Promise.all([
    knex.schema.raw(
      `DROP INDEX IF EXISTS idx_pos_sales_orders_branch_status_created`
    ),
    knex.schema.raw(
      `DROP INDEX IF EXISTS idx_pos_sales_orders_branch_status_voided`
    ),
    knex.schema.raw(`DROP INDEX IF EXISTS idx_pos_sales_orders_void_reason`),
    knex.schema.raw(
      `DROP INDEX IF EXISTS idx_loss_profit_records_order_branch`
    ),
    knex.schema.raw(`DROP INDEX IF EXISTS idx_loss_profit_records_recorded_at`),
  ]);
};
