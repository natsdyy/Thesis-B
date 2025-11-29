/**
 * Migration: Make branch_id nullable in branch_positions
 * This allows main office positions (department roles) to have NULL branch_id
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  // First, check if the foreign key constraint exists and drop it
  const foreignKeyExists = await knex.schema.hasTable('branch_positions');
  
  if (foreignKeyExists) {
    try {
      // Drop the foreign key constraint
      await knex.raw(`
        DO $$ 
        BEGIN
          IF EXISTS (
            SELECT 1 FROM pg_constraint 
            WHERE conname = 'branch_positions_branch_id_foreign'
          ) THEN
            ALTER TABLE branch_positions DROP CONSTRAINT branch_positions_branch_id_foreign;
          END IF;
        END $$;
      `);
    } catch (error) {
      console.log('Note: Could not drop foreign key constraint (may not exist):', error.message);
    }

    // Make branch_id nullable
    await knex.schema.alterTable('branch_positions', (table) => {
      table.integer('branch_id').unsigned().nullable().alter();
    });

    // Re-add foreign key constraint (now allowing NULL)
    await knex.raw(`
      ALTER TABLE branch_positions
      ADD CONSTRAINT branch_positions_branch_id_foreign
      FOREIGN KEY (branch_id) REFERENCES branches(id)
      ON DELETE CASCADE;
    `);

    console.log('✅ Made branch_id nullable in branch_positions');
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  // Before making branch_id not nullable, we need to ensure all NULL values are handled
  // Option: Set all NULL branch_id to a default branch (e.g., main branch ID 1)
  // Or: Delete all positions with NULL branch_id
  
  const foreignKeyExists = await knex.schema.hasTable('branch_positions');
  
  if (foreignKeyExists) {
    // Get the first branch ID as default (or use 1)
    const defaultBranch = await knex('branches')
      .where('is_active', true)
      .whereNull('deleted_at')
      .orderBy('id', 'asc')
      .first();

    if (defaultBranch) {
      // Update all NULL branch_id to default branch
      await knex('branch_positions')
        .whereNull('branch_id')
        .update({ branch_id: defaultBranch.id });
    } else {
      // If no branches exist, delete positions with NULL branch_id
      await knex('branch_positions')
        .whereNull('branch_id')
        .del();
    }

    // Drop foreign key constraint
    try {
      await knex.raw(`
        ALTER TABLE branch_positions
        DROP CONSTRAINT IF EXISTS branch_positions_branch_id_foreign;
      `);
    } catch (error) {
      console.log('Note: Could not drop foreign key constraint:', error.message);
    }

    // Make branch_id not nullable again
    await knex.schema.alterTable('branch_positions', (table) => {
      table.integer('branch_id').unsigned().notNullable().alter();
    });

    // Re-add foreign key constraint
    await knex.raw(`
      ALTER TABLE branch_positions
      ADD CONSTRAINT branch_positions_branch_id_foreign
      FOREIGN KEY (branch_id) REFERENCES branches(id)
      ON DELETE CASCADE;
    `);

    console.log('✅ Reverted branch_id to not nullable in branch_positions');
  }
};

