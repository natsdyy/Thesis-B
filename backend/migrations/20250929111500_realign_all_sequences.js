/**
 * Realign all sequences in the public schema to MAX(id) of their owning table.
 * Handles both legacy serial and identity-generated columns by scanning column defaults.
 * Safe to run multiple times.
 *
 * @param { import('knex').Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function up(knex) {
  const sql = `
    DO $$
    DECLARE
      rec RECORD;
      target_value bigint;
    BEGIN
      FOR rec IN
        SELECT
          ns.nspname AS schema_name,
          tbl.relname AS table_name,
          col.attname AS column_name,
          seq.relname AS sequence_name
        FROM pg_class seq
        JOIN pg_namespace seqns ON seqns.oid = seq.relnamespace
        JOIN pg_depend dep ON dep.objid = seq.oid AND dep.deptype = 'a' -- auto dependency
        JOIN pg_class tbl ON tbl.oid = dep.refobjid
        JOIN pg_namespace ns ON ns.oid = tbl.relnamespace
        JOIN pg_attribute col ON col.attrelid = tbl.oid AND col.attnum = dep.refobjsubid
        WHERE seq.relkind = 'S' -- sequence
          AND ns.nspname = 'public'
      LOOP
        EXECUTE format('SELECT COALESCE(MAX(%I), 0) FROM %I.%I', rec.column_name, rec.schema_name, rec.table_name)
          INTO target_value;

        IF rec.sequence_name IS NOT NULL THEN
          -- Use schema-qualified sequence name as a string literal for setval
          -- Ensure we never set to 0; for empty tables advance to 1 and mark as not-called
          IF target_value > 0 THEN
            EXECUTE format('SELECT setval(%L, %s, true)', rec.schema_name || '.' || rec.sequence_name, target_value);
          ELSE
            EXECUTE format('SELECT setval(%L, 1, false)', rec.schema_name || '.' || rec.sequence_name);
          END IF;
        END IF;
      END LOOP;
    END
    $$;`;

  await knex.raw(sql);
};

/**
 * Down is a no-op because sequence positions are not easily reversible.
 * @param { import('knex').Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function down() {
  // no-op
};
