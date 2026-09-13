-- Preparación para la purga física de clientes (RGPD, derecho al olvido).
--
-- interactions/purchases/purchase_items/returns ya tienen ON DELETE CASCADE
-- hacia customers (ver 00000000000000_init y 20260907000100_...), así que
-- un DELETE FROM customers los arrastra automáticamente.
--
-- leads.converted_customer_id es la única referencia que quedaría bloqueando
-- ese DELETE (era RESTRICT por defecto, al no especificarse ON DELETE): un
-- cliente que vino de un lead convertido no debería poder bloquear su propia
-- purga. Se cambia a SET NULL — el lead conserva su propio historial (no es
-- el dato que se está purgando), solo pierde el enlace a un cliente que ya
-- no existe.
ALTER TABLE leads DROP CONSTRAINT leads_converted_customer_id_fkey;
ALTER TABLE leads
  ADD CONSTRAINT leads_converted_customer_id_fkey
  FOREIGN KEY (converted_customer_id) REFERENCES customers(id) ON DELETE SET NULL;
