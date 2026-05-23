CREATE OR REPLACE FUNCTION public.create_bracelet_entry_v2(
  p_cpf text, 
  p_name text, 
  p_whatsapp text, 
  p_birth_date date, 
  p_photo text, 
  p_event_date date
)
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
  v_existing_res RECORD; 
  v_payment_amount NUMERIC := 0;
  v_batch_id UUID;
  v_age INT;
BEGIN
  -- 1. Normalizar CPF
  v_cpf_digits := regexp_replace(p_cpf, '\D', '', 'g');
  IF length(v_cpf_digits) != 11 THEN
    RAISE EXCEPTION 'O CPF informado é inválido.';
  END IF;

  -- 2. Validar Idade (18+)
  v_age := date_part('year', age(CURRENT_DATE, p_birth_date));
  IF v_age < 18 THEN
    RAISE EXCEPTION 'O cliente é menor de idade (18-). Acesso negado.';
  END IF;

  -- 3. Blacklist
  SELECT * INTO v_blacklist_entry FROM public.blacklist WHERE cpf_digits = v_cpf_digits AND end_date::date >= CURRENT_DATE;
  IF FOUND THEN
    RAISE EXCEPTION 'CPF consta na blacklist: %', v_blacklist_entry.reason;
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

  -- 5. Lógica de Estoque (Ticket Batches) - Adquirir lote atual
  SELECT * INTO v_active_batch FROM public.ticket_batches WHERE event_date = p_event_date AND status = 'active' FOR UPDATE;
  IF v_active_batch IS NULL THEN
    RAISE EXCEPTION 'Nenhum lote de pulseira ativo para esta data.';
  END IF;

  v_batch_id := v_active_batch.id;
  v_payment_amount := v_active_batch.price;

  -- 6. Validação de Duplicidade / Conflito de Reservas
  SELECT * INTO v_existing_res 
  FROM public.reservations 
  WHERE customer_id = v_customer_id 
    AND reservation_date = p_event_date 
    AND status ILIKE 'cancelled' = false
  LIMIT 1;

  IF FOUND THEN
    IF v_existing_res.type = 'lista' AND v_existing_res.entered_at IS NULL THEN
      -- Atualiza direto a reserva existente para refletir a pulseira e o check-in
      UPDATE public.reservations
      SET type = 'pulseira',
          check_in_status = 'entered',
          entered_at = timezone('America/Porto_Velho', now()),
          payment_status = 'paid',
          payment_amount = v_payment_amount,
          ticket_batch_id = v_batch_id,
          photo = COALESCE(p_photo, photo)
      WHERE id = v_existing_res.id;
    ELSE
      -- Bloqueia mantendo o RAISE EXCEPTION caso seja cortesia/camarote ou já tenha entrado
      RAISE EXCEPTION 'O cliente já possui uma entrada realizada ou uma reserva ativa (%) para hoje.', v_existing_res.type;
    END IF;
  ELSE
    -- Nova Reserva
    INSERT INTO public.reservations (
      customer_id, name, email, whatsapp, cpf, birth_date,
      reservation_date, reservation_time, num_guests,
      type, status, check_in_status, entered_at, photo,
      payment_status, payment_amount, ticket_batch_id
    ) VALUES (
      v_customer_id, p_name, '', p_whatsapp, v_cpf_digits, p_birth_date,
      p_event_date, (to_char(timezone('America/Porto_Velho', now()), 'HH24:MI'))::time, 1,
      'pulseira', 'confirmed', 'entered', timezone('America/Porto_Velho', now()), p_photo,
      'paid', v_payment_amount, v_batch_id
    );
  END IF;

  -- 7. Consumir e Rotacionar Lote
  UPDATE public.ticket_batches SET consumed_quantity = consumed_quantity + 1 WHERE id = v_active_batch.id;
  v_active_batch.consumed_quantity := v_active_batch.consumed_quantity + 1;

  IF v_active_batch.consumed_quantity >= v_active_batch.total_quantity THEN
    UPDATE public.ticket_batches SET status = 'exhausted' WHERE id = v_active_batch.id;
    SELECT * INTO v_next_batch FROM public.ticket_batches WHERE event_date = p_event_date AND status = 'draft' AND batch_order > v_active_batch.batch_order ORDER BY batch_order ASC LIMIT 1 FOR UPDATE;
    IF v_next_batch IS NOT NULL THEN
      UPDATE public.ticket_batches SET status = 'active' WHERE id = v_next_batch.id;
    END IF;
  END IF;

  RETURN jsonb_build_object('success', true, 'message', 'Pulseira vendida com sucesso!');
END;
$function$;
