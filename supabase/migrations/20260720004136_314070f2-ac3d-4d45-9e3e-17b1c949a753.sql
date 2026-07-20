-- Fase 4: colunas extras do Mercado Pago em orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS mp_status text,
  ADD COLUMN IF NOT EXISTS mp_status_detail text,
  ADD COLUMN IF NOT EXISTS installments integer,
  ADD COLUMN IF NOT EXISTS card_brand text,
  ADD COLUMN IF NOT EXISTS card_last_four text,
  ADD COLUMN IF NOT EXISTS customer_document text,
  ADD COLUMN IF NOT EXISTS paid_at timestamptz;

CREATE INDEX IF NOT EXISTS orders_mp_payment_id_idx ON public.orders (mp_payment_id);

-- RPC segura que recalcula preços no servidor e reserva estoque.
-- p_items: [{ variant_id, quantity }]  (SEM preço vindo do cliente)
CREATE OR REPLACE FUNCTION public.create_order_secure(
  p_items jsonb,
  p_customer jsonb,
  p_delivery_type text,
  p_delivery_address jsonb,
  p_payment_method payment_method,
  p_customer_document text DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS TABLE(id uuid, order_number text, total numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
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
  v_product_name text;
  v_color text;
  v_size text;
  v_image text;
  v_slug text;
  v_snapshot jsonb;
  v_subtotal numeric(10,2) := 0;
  v_initial_status order_status;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  IF p_payment_method IN ('mercado_pago_card','mercado_pago_pix') THEN
    v_initial_status := 'pending';
  ELSIF p_payment_method = 'pix' THEN
    v_initial_status := 'awaiting_store_confirmation';
  ELSE
    v_initial_status := 'pending';
  END IF;

  -- Validação de estoque + recálculo do subtotal
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_variant_id := (v_item->>'variant_id')::uuid;
    v_qty := (v_item->>'quantity')::integer;
    IF v_qty IS NULL OR v_qty <= 0 THEN
      RAISE EXCEPTION 'invalid_quantity';
    END IF;
    SELECT pv.stock, pv.product_id, pv.price_override
      INTO v_stock, v_product_id, v_price
      FROM product_variants pv WHERE pv.id = v_variant_id FOR UPDATE;
    IF v_stock IS NULL THEN
      RAISE EXCEPTION 'variant_not_found: %', v_variant_id;
    END IF;
    IF v_stock < v_qty THEN
      RAISE EXCEPTION 'insufficient_stock: %', v_variant_id;
    END IF;
    IF v_price IS NULL THEN
      SELECT COALESCE(p.sale_price, p.price)
        INTO v_price FROM products p WHERE p.id = v_product_id;
    END IF;
    IF v_price IS NULL THEN
      RAISE EXCEPTION 'price_not_found: %', v_variant_id;
    END IF;
    v_subtotal := v_subtotal + (v_price * v_qty);
  END LOOP;

  INSERT INTO orders (
    user_id, status, payment_method, payment_status,
    subtotal, discount, shipping, total,
    customer_snapshot, address_snapshot, delivery_address,
    delivery_type, customer_phone, notes, customer_document
  ) VALUES (
    v_user_id, v_initial_status, p_payment_method, 'pending',
    v_subtotal, 0, 0, v_subtotal,
    p_customer, p_delivery_address, p_delivery_address,
    p_delivery_type, p_customer->>'phone', p_notes, p_customer_document
  )
  RETURNING orders.id, orders.order_number INTO v_order_id, v_order_number;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_variant_id := (v_item->>'variant_id')::uuid;
    v_qty := (v_item->>'quantity')::integer;

    SELECT pv.product_id, COALESCE(pv.price_override, p.sale_price, p.price),
           p.name, p.slug, pv.color, pv.size
      INTO v_product_id, v_price, v_product_name, v_slug, v_color, v_size
      FROM product_variants pv
      JOIN products p ON p.id = pv.product_id
      WHERE pv.id = v_variant_id;

    SELECT url INTO v_image FROM product_images
      WHERE product_id = v_product_id
      ORDER BY sort_order LIMIT 1;

    v_snapshot := jsonb_build_object(
      'name', v_product_name,
      'slug', v_slug,
      'color', v_color,
      'size', v_size,
      'image', v_image
    );

    INSERT INTO order_items (order_id, product_id, variant_id, product_snapshot, quantity, unit_price)
    VALUES (v_order_id, v_product_id, v_variant_id, v_snapshot, v_qty, v_price);

    UPDATE product_variants SET stock = stock - v_qty WHERE id = v_variant_id;
  END LOOP;

  RETURN QUERY SELECT v_order_id, v_order_number, v_subtotal;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_order_secure(jsonb, jsonb, text, jsonb, payment_method, text, text) TO authenticated;
