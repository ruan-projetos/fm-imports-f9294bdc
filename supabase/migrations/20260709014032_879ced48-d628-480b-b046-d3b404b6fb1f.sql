
-- 1. Extend order_status enum
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'awaiting_store_confirmation';
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'awaiting_pix_payment';
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'payment_confirmed';
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'separating';
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'out_for_delivery';
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'ready_for_pickup';

-- 2. Extend payment_method enum
ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'pix';
ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'on_delivery';

-- 3. Add new columns to orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS delivery_type text NOT NULL DEFAULT 'delivery',
  ADD COLUMN IF NOT EXISTS delivery_address jsonb,
  ADD COLUMN IF NOT EXISTS customer_phone text;

-- 4. Function: create_order — atomic order creation with stock reservation
CREATE OR REPLACE FUNCTION public.create_order(
  p_items jsonb,
  p_customer jsonb,
  p_delivery_type text,
  p_delivery_address jsonb,
  p_payment_method payment_method,
  p_notes text DEFAULT NULL
)
RETURNS TABLE(id uuid, order_number text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_order_id uuid;
  v_order_number text;
  v_item jsonb;
  v_variant_id uuid;
  v_qty integer;
  v_price numeric(10,2);
  v_stock integer;
  v_product_id uuid;
  v_snapshot jsonb;
  v_subtotal numeric(10,2) := 0;
  v_initial_status order_status;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  IF p_payment_method = 'pix' THEN
    v_initial_status := 'awaiting_store_confirmation';
  ELSE
    v_initial_status := 'pending';
  END IF;

  -- Validate stock and compute subtotal
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_variant_id := (v_item->>'variant_id')::uuid;
    v_qty := (v_item->>'quantity')::integer;
    SELECT stock, product_id INTO v_stock, v_product_id
      FROM product_variants WHERE id = v_variant_id FOR UPDATE;
    IF v_stock IS NULL THEN
      RAISE EXCEPTION 'variant_not_found: %', v_variant_id;
    END IF;
    IF v_stock < v_qty THEN
      RAISE EXCEPTION 'insufficient_stock: %', v_variant_id;
    END IF;
    v_price := (v_item->>'unit_price')::numeric;
    v_subtotal := v_subtotal + (v_price * v_qty);
  END LOOP;

  -- Insert order
  INSERT INTO orders (
    user_id, status, payment_method, payment_status,
    subtotal, discount, shipping, total,
    customer_snapshot, address_snapshot, delivery_address,
    delivery_type, customer_phone, notes
  ) VALUES (
    v_user_id, v_initial_status, p_payment_method, 'pending',
    v_subtotal, 0, 0, v_subtotal,
    p_customer, p_delivery_address, p_delivery_address,
    p_delivery_type, p_customer->>'phone', p_notes
  )
  RETURNING orders.id, orders.order_number INTO v_order_id, v_order_number;

  -- Insert items + decrement stock
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_variant_id := (v_item->>'variant_id')::uuid;
    v_qty := (v_item->>'quantity')::integer;
    v_price := (v_item->>'unit_price')::numeric;
    v_snapshot := v_item->'snapshot';

    SELECT product_id INTO v_product_id FROM product_variants WHERE id = v_variant_id;

    INSERT INTO order_items (order_id, product_id, variant_id, product_snapshot, quantity, unit_price)
    VALUES (v_order_id, v_product_id, v_variant_id, COALESCE(v_snapshot, '{}'::jsonb), v_qty, v_price);

    UPDATE product_variants SET stock = stock - v_qty WHERE id = v_variant_id;
  END LOOP;

  RETURN QUERY SELECT v_order_id, v_order_number;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_order(jsonb, jsonb, text, jsonb, payment_method, text) TO authenticated;

-- 5. Trigger: restore stock on cancellation
CREATE OR REPLACE FUNCTION public.restore_stock_on_cancel()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'cancelled' AND OLD.status IS DISTINCT FROM 'cancelled' THEN
    UPDATE product_variants pv
      SET stock = pv.stock + oi.quantity
    FROM order_items oi
    WHERE oi.order_id = NEW.id AND oi.variant_id = pv.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_restore_stock_on_cancel ON public.orders;
CREATE TRIGGER trg_restore_stock_on_cancel
  AFTER UPDATE OF status ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.restore_stock_on_cancel();
