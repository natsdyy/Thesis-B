/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.raw(`
    -- Drop the existing unique constraint
    ALTER TABLE employee_schedules DROP CONSTRAINT IF EXISTS unique_employee_date;
    
    -- Create a partial unique index that only applies to active schedules
    CREATE UNIQUE INDEX unique_active_employee_date 
    ON employee_schedules (employee_id, schedule_date) 
    WHERE is_active = true;
  `);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.raw(`
    -- Drop the partial unique index
    DROP INDEX IF EXISTS unique_active_employee_date;
    
    -- Restore the original unique constraint
    ALTER TABLE employee_schedules ADD CONSTRAINT unique_employee_date 
    UNIQUE (employee_id, schedule_date);
  `);
};
