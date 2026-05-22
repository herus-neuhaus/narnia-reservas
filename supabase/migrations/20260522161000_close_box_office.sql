-- 1. Create or Replace `close_box_office` to generate snapshot and close all batches
CREATE OR REPLACE FUNCTION public.close_box_office(p_event_date DATE)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_closed_by UUID;
  v_is_admin BOOLEAN;
  v_snapshot JSONB;
  v_total_sold INT := 0;
  v_total_revenue NUMERIC := 0;
  v_total_complimentary INT := 0;
  v_report_id UUID;
BEGIN
  v_closed_by := auth.uid();
  IF v_closed_by IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED', 'message', 'Usuário não logado.');
  END IF;

  SELECT public.is_admin_or_manager() INTO v_is_admin;
  IF NOT v_is_admin THEN
    RETURN jsonb_build_object('success', false, 'error', 'FORBIDDEN', 'message', 'Sem permissão para encerrar a bilheteria.');
  END IF;

  -- Verify if already closed
  PERFORM 1 FROM public.box_office_reports WHERE event_date = p_event_date;
  IF FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'ALREADY_CLOSED', 'message', 'A bilheteria já está encerrada para este dia.');
  END IF;

  -- Lock batches for update to close them
  UPDATE public.ticket_batches 
  SET status = 'closed'
  WHERE event_date = p_event_date AND status != 'closed';

  -- Calculate totals
  SELECT COALESCE(SUM(consumed_quantity), 0), COALESCE(SUM(consumed_quantity * price), 0)
  INTO v_total_sold, v_total_revenue
  FROM public.ticket_batches
  WHERE event_date = p_event_date;

  SELECT COUNT(*) INTO v_total_complimentary
  FROM public.complimentary_tickets
  WHERE event_date = p_event_date AND status = 'approved';

  -- Build snapshot
  v_snapshot := jsonb_build_object(
    'total_entered', (SELECT COUNT(*) FROM public.reservations WHERE reservation_date = p_event_date AND check_in_status = 'entered'),
    'by_type', (
      SELECT COALESCE(jsonb_object_agg(type, count), '{}'::jsonb) FROM (
        SELECT type, COUNT(*) as count FROM public.reservations 
        WHERE reservation_date = p_event_date AND check_in_status = 'entered'
        GROUP BY type
      ) t
    ),
    'batches', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'name', name,
        'total_quantity', total_quantity,
        'consumed_quantity', consumed_quantity,
        'price', price,
        'revenue', consumed_quantity * price
      )), '[]'::jsonb) FROM public.ticket_batches WHERE event_date = p_event_date
    ),
    'complimentary', (
      SELECT jsonb_build_object(
        'approved', (SELECT COUNT(*) FROM public.complimentary_tickets WHERE event_date = p_event_date AND status = 'approved'),
        'rejected', (SELECT COUNT(*) FROM public.complimentary_tickets WHERE event_date = p_event_date AND status = 'rejected'),
        'pending', (SELECT COUNT(*) FROM public.complimentary_tickets WHERE event_date = p_event_date AND status = 'pending'),
        'entered', (SELECT COUNT(*) FROM public.reservations WHERE reservation_date = p_event_date AND type = 'cortesia' AND check_in_status = 'entered')
      )
    ),
    'camarotes', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'name', c.name,
        'owner', cu.name,
        'capacity', c.capacity,
        'normal_entries', (SELECT COUNT(*) FROM public.camarote_entries WHERE camarote_id = c.id AND is_extra = false),
        'extra_entries', (SELECT COUNT(*) FROM public.camarote_entries WHERE camarote_id = c.id AND is_extra = true)
      )), '[]'::jsonb) FROM public.camarotes c
      LEFT JOIN public.customers cu ON c.owner_customer_id = cu.id
      WHERE c.event_date = p_event_date
    )
  );

  INSERT INTO public.box_office_reports (
    event_date, closed_by, total_bracelets_sold, total_revenue, total_complimentary, snapshot_data
  ) VALUES (
    p_event_date, v_closed_by, v_total_sold, v_total_revenue, v_total_complimentary, v_snapshot
  ) RETURNING id INTO v_report_id;

  RETURN jsonb_build_object('success', true, 'report_id', v_report_id, 'message', 'Bilheteria encerrada com sucesso!');
END;
$$;

-- 2. Modify create_bracelet_entry_v2 to block if closed
CREATE OR REPLACE FUNCTION public.create_bracelet_entry_v2(
  p_cpf TEXT,
  p_name TEXT,
  p_whatsapp TEXT,
  p_birth_date DATE,
  p_event_date DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cpf_digits TEXT;
  v_customer_id UUID;
  v_blacklist_entry RECORD;
  v_active_batch RECORD;
  v_age INT;
BEGIN
  -- CHECK IF CLOSED
  PERFORM 1 FROM public.box_office_reports WHERE event_date = p_event_date;
  IF FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'BOX_OFFICE_CLOSED', 'message', 'A bilheteria já foi encerrada.');
  END IF;

  -- Normalizar CPF
  v_cpf_digits := regexp_replace(p_cpf, '\D', '', 'g');
  IF length(v_cpf_digits) != 11 THEN
    RETURN jsonb_build_object('success', false, 'error', 'CPF_INVALID', 'message', 'O CPF informado é inválido.');
  END IF;

  -- Validar Idade (18+)
  IF p_birth_date IS NOT NULL THEN
    v_age := date_part('year', age(CURRENT_DATE, p_birth_date));
    IF v_age < 18 THEN
      RETURN jsonb_build_object('success', false, 'error', 'UNDERAGE', 'message', 'O cliente é menor de idade (18-).');
    END IF;
  END IF;

  -- Blacklist
  SELECT * INTO v_blacklist_entry FROM public.blacklist WHERE cpf_digits = v_cpf_digits AND end_date::date >= CURRENT_DATE;
  IF FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'BLACKLISTED', 'message', 'CPF consta na blacklist.');
  END IF;

  -- Customer Upsert
  SELECT id INTO v_customer_id FROM public.customers WHERE cpf_digits = v_cpf_digits;
  IF v_customer_id IS NULL THEN
    INSERT INTO public.customers (cpf, cpf_digits, name, whatsapp, birth_date)
    VALUES (p_cpf, v_cpf_digits, p_name, p_whatsapp, p_birth_date)
    RETURNING id INTO v_customer_id;
  ELSE
    UPDATE public.customers
    SET name = p_name, whatsapp = p_whatsapp, birth_date = p_birth_date
    WHERE id = v_customer_id;
  END IF;

  -- Duplicidade de Pulseira (somente 1 por dia)
  PERFORM 1 FROM public.reservations 
  WHERE customer_id = v_customer_id AND reservation_date = p_event_date AND type = 'pulseira';
  IF FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'DUPLICATE', 'message', 'O cliente já possui pulseira para hoje.');
  END IF;

  -- Lote Ativo (Consumo)
  SELECT * INTO v_active_batch FROM public.ticket_batches 
  WHERE event_date = p_event_date AND status = 'active'
  ORDER BY batch_order ASC LIMIT 1 FOR UPDATE;

  IF v_active_batch IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'NO_ACTIVE_BATCH', 'message', 'Nenhum lote ativo disponível para venda.');
  END IF;

  UPDATE public.ticket_batches
  SET consumed_quantity = consumed_quantity + 1
  WHERE id = v_active_batch.id;

  -- Se esgotou com essa venda, fechar lote e ativar próximo
  IF (v_active_batch.consumed_quantity + 1) >= v_active_batch.total_quantity THEN
    UPDATE public.ticket_batches SET status = 'exhausted' WHERE id = v_active_batch.id;
    
    UPDATE public.ticket_batches
    SET status = 'active'
    WHERE id = (
      SELECT id FROM public.ticket_batches 
      WHERE event_date = p_event_date AND status = 'draft' AND batch_order > v_active_batch.batch_order
      ORDER BY batch_order ASC LIMIT 1
    );
  END IF;

  -- Inserir a Reserva consolidada
  INSERT INTO public.reservations (
    customer_id, name, whatsapp, cpf, birth_date,
    reservation_date, reservation_time, num_guests,
    type, status, check_in_status, entered_at,
    payment_status, payment_amount, ticket_batch_id
  ) VALUES (
    v_customer_id, p_name, p_whatsapp, v_cpf_digits, p_birth_date,
    p_event_date, to_char(NOW() AT TIME ZONE 'America/Porto_Velho', 'HH24:MI'), 1,
    'pulseira', 'confirmed', 'entered', NOW() AT TIME ZONE 'America/Porto_Velho',
    'paid', v_active_batch.price, v_active_batch.id
  );

  RETURN jsonb_build_object('success', true, 'message', 'Pulseira registrada com sucesso!');
END;
$$;
