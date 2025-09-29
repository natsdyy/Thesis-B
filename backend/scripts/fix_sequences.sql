-- Realign sequences for critical tables used by app and migrations

-- 1) knex_migrations.id sequence
DO $$
DECLARE
  seq_name text;
BEGIN
  SELECT pg_get_serial_sequence('knex_migrations', 'id') INTO seq_name;
  IF seq_name IS NOT NULL THEN
    PERFORM setval(seq_name, COALESCE((SELECT MAX(id) FROM knex_migrations), 0));
  END IF;
END
$$;

-- 2) pos_sales_orders.id sequence
DO $$
DECLARE
  seq_name text;
BEGIN
  SELECT pg_get_serial_sequence('pos_sales_orders', 'id') INTO seq_name;
  IF seq_name IS NOT NULL THEN
    PERFORM setval(seq_name, COALESCE((SELECT MAX(id) FROM pos_sales_orders), 0));
  END IF;
END
$$;

-- 3) pos_order_items.id sequence
DO $$
DECLARE
  seq_name text;
BEGIN
  SELECT pg_get_serial_sequence('pos_order_items', 'id') INTO seq_name;
  IF seq_name IS NOT NULL THEN
    PERFORM setval(seq_name, COALESCE((SELECT MAX(id) FROM pos_order_items), 0));
  END IF;
END
$$;

