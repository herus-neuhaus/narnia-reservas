-- Fix time cast in create_bracelet_entry_v2

CREATE OR REPLACE FUNCTION public.create_bracelet_entry_v2(p_cpf text, p_name text, p_whatsapp text, p_birth_date date, p_photo text, p_event_date date)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_cpf_digits TEXT;
  v_customer_id UUID;
  v_blacklist_entry RECORD;
  v_active_batch RECORD;
  v_next_batch RECORD;
  v_payment_amount NUMERIC := 0;
  v_batch_id UUID;
  v_age INT;
BEGIN
  -- 1. Normalizar CPF
  v_cpf_digits := regexp_replace(p_cpf, '\D', '', 'g');
  IF length(v_cpf_digits) != 11 THEN
    RETURN jsonb_build_object('success', false, 'error', 'CPF_INVALID', 'message', 'O CPF informado é inválido.');
  END IF;

  -- 2. Validar Idade (18+)
  v_age := date_part('year', age(CURRENT_DATE, p_birth_date));
  IF v_age < 18 THEN
    RETURN jsonb_build_object('success', false, 'error', 'UNDERAGE', 'message', 'O cliente é menor de idade (18-). Acesso negado.');
  END IF;

  -- 3. Blacklist
  SELECT * INTO v_blacklist_entry FROM public.blacklist WHERE cpf_digits = v_cpf_digits AND end_date::date >= CURRENT_DATE;
  IF FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'BLACKLISTED', 'message', 'CPF consta na blacklist.', 'reason', v_blacklist_entry.reason);
  END IF;

  -- 4. Customer Upsert
  SELECT id INTO v_customer_id FROM public.customers WHERE cpf_digits = v_cpf_digits;
  IF v_customer_id IS NULL THEN
    INSERT INTO public.customers (cpf, cpf_digits, name, whatsapp, birth_date, photo)
    VALUES (p_cpf, v_cpf_digits, p_name, p_whatsapp, p_birth_date, p_photo)
    RETURNING id INTO v_customer_id;
  ELSE
    UPDATE public.customers
    SET name = p_name, whatsapp = p_whatsapp, birth_date = p_birth_date, photo = COALESCE(p_photo, photo)
    WHERE id = v_customer_id;
  END IF;

  -- 5. Duplicidade
  PERFORM 1 FROM public.reservations
  WHERE customer_id = v_customer_id
    AND reservation_date = p_event_date
    AND status ILIKE 'cancelled' = false
    AND (type = 'pulseira' OR check_in_status = 'entered');
    
  IF FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'DUPLICATE', 'message', 'O cliente já comprou pulseira ou já tem entrada hoje.');
  END IF;

  -- 6. Consumir Pulseira do Lote Ativo
  SELECT * INTO v_active_batch FROM public.ticket_batches WHERE event_date = p_event_date AND status = 'active' FOR UPDATE;
  IF v_active_batch IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'NO_BATCH', 'message', 'Nenhum lote de pulseira ativo para esta data.');
  END IF;

  UPDATE public.ticket_batches SET consumed_quantity = consumed_quantity + 1 WHERE id = v_active_batch.id;
  v_batch_id := v_active_batch.id;
  v_payment_amount := v_active_batch.price;

  v_active_batch.consumed_quantity := v_active_batch.consumed_quantity + 1;
  
  -- Se esgotou, rotaciona
  IF v_active_batch.consumed_quantity >= v_active_batch.total_quantity THEN
    UPDATE public.ticket_batches SET status = 'exhausted' WHERE id = v_active_batch.id;
    SELECT * INTO v_next_batch FROM public.ticket_batches WHERE event_date = p_event_date AND status = 'draft' AND batch_order > v_active_batch.batch_order ORDER BY batch_order ASC LIMIT 1 FOR UPDATE;
    IF v_next_batch IS NOT NULL THEN
      UPDATE public.ticket_batches SET status = 'active' WHERE id = v_next_batch.id;
    END IF;
  END IF;

  -- 7. Criar a Reservation / Entrada
  INSERT INTO public.reservations (
    customer_id, name, email, whatsapp, cpf, birth_date,
    reservation_date, reservation_time, num_guests,
    type, status, check_in_status, entered_at, photo,
    payment_status, payment_amount, ticket_batch_id
  ) VALUES (
    v_customer_id, p_name, '', p_whatsapp, v_cpf_digits, p_birth_date,
    p_event_date, (to_char(NOW() AT TIME ZONE 'America/Porto_Velho', 'HH24:MI'))::time, 1,
    'pulseira', 'confirmed', 'entered', NOW() AT TIME ZONE 'America/Porto_Velho', p_photo,
    'paid', v_payment_amount, v_batch_id
  );

  RETURN jsonb_build_object('success', true, 'message', 'Pulseira vendida e entrada registrada com sucesso!');
END;
$function$;
