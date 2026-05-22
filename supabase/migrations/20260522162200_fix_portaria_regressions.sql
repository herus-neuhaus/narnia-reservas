-- Final regression fixes for advanced portaria flows:
-- 1. Mesa/camarote reservations must remain occupied after the payment lock window.
-- 2. Bracelet entry must use one canonical RPC signature and never hit the older overload.
-- 3. Complimentary requests/approval must tolerate staff users that are not in team_members
--    while still using auth.uid() for authorization checks.

CREATE OR REPLACE FUNCTION public.get_reserved_locations(p_date DATE)
RETURNS TABLE (location_id TEXT)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT r.location_id
  FROM public.reservations r
  WHERE r.reservation_date = p_date
    AND r.location_id IS NOT NULL
    AND r.type IN ('mesa', 'camarote')
    AND COALESCE(r.status, 'pending') <> 'cancelled';
$$;

CREATE OR REPLACE FUNCTION public.create_reservation_v2(
  p_cpf TEXT,
  p_name TEXT,
  p_email TEXT,
  p_whatsapp TEXT,
  p_birth_date DATE,
  p_date DATE,
  p_time TEXT,
  p_guests INT,
  p_type TEXT,
  p_location_id TEXT,
  p_notes TEXT,
  p_expires_at TIMESTAMP WITH TIME ZONE
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
  v_event RECORD;
  v_active_list_count INT;
  v_payment_status TEXT;
  v_payment_amount NUMERIC;
BEGIN
  PERFORM 1 FROM public.box_office_reports WHERE event_date = p_date;
  IF FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'BOX_OFFICE_CLOSED', 'message', 'A bilheteria ja foi encerrada.');
  END IF;

  v_cpf_digits := regexp_replace(p_cpf, '\D', '', 'g');
  IF length(v_cpf_digits) != 11 THEN
    RETURN jsonb_build_object('success', false, 'error', 'CPF_INVALID', 'message', 'O CPF informado e invalido.');
  END IF;

  SELECT * INTO v_blacklist_entry
  FROM public.blacklist
  WHERE cpf_digits = v_cpf_digits AND end_date::date >= CURRENT_DATE;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'BLACKLISTED',
      'message', 'Acesso negado. O CPF informado consta na blacklist.',
      'reason', v_blacklist_entry.reason,
      'end_date', v_blacklist_entry.end_date
    );
  END IF;

  SELECT id INTO v_customer_id FROM public.customers WHERE cpf_digits = v_cpf_digits;

  IF v_customer_id IS NULL THEN
    INSERT INTO public.customers (cpf, cpf_digits, name, email, whatsapp, birth_date)
    VALUES (p_cpf, v_cpf_digits, p_name, COALESCE(p_email, ''), COALESCE(p_whatsapp, ''), p_birth_date)
    RETURNING id INTO v_customer_id;
  ELSE
    UPDATE public.customers
    SET name = p_name,
        email = COALESCE(p_email, email, ''),
        whatsapp = COALESCE(p_whatsapp, whatsapp, ''),
        birth_date = COALESCE(p_birth_date, birth_date)
    WHERE id = v_customer_id;
  END IF;

  -- One active reservation/entry per customer per date, regardless of old pending payment locks.
  PERFORM 1
  FROM public.reservations
  WHERE customer_id = v_customer_id
    AND reservation_date = p_date
    AND COALESCE(status, 'pending') <> 'cancelled';

  IF FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'CPF_DUPLICATE',
      'message', 'Este CPF ja possui uma reserva ou entrada para este dia.'
    );
  END IF;

  IF p_type = 'mesa' OR p_type = 'camarote' THEN
    IF p_location_id IS NULL OR p_location_id = '' THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'LOCATION_REQUIRED',
        'message', 'A selecao de uma mesa ou camarote e obrigatoria.'
      );
    END IF;

    -- Serialize attempts for the same date/type/location to avoid double booking races.
    PERFORM pg_advisory_xact_lock(hashtext(p_date::text || ':' || p_type || ':' || p_location_id));

    PERFORM 1
    FROM public.reservations
    WHERE location_id = p_location_id
      AND reservation_date = p_date
      AND type = p_type
      AND COALESCE(status, 'pending') <> 'cancelled';

    IF FOUND THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'LOCATION_OCCUPIED',
        'message', 'A mesa ou camarote escolhido ja esta reservado.'
      );
    END IF;
  END IF;

  IF p_type = 'lista' THEN
    SELECT * INTO v_event FROM public.events WHERE event_date = p_date;

    IF FOUND AND COALESCE(v_event.list_limit_capacity, 0) > 0 THEN
      SELECT COUNT(*) INTO v_active_list_count
      FROM public.reservations
      WHERE reservation_date = p_date
        AND type = 'lista'
        AND COALESCE(status, 'pending') <> 'cancelled';

      IF v_active_list_count >= v_event.list_limit_capacity THEN
        RETURN jsonb_build_object(
          'success', false,
          'error', 'LIST_FULL',
          'message', 'A lista de convidados para este evento atingiu a capacidade maxima.'
        );
      END IF;
    END IF;
  END IF;

  v_payment_status := CASE WHEN p_type = 'mesa' OR p_type = 'camarote' THEN 'pending' ELSE 'not_required' END;
  v_payment_amount := CASE WHEN p_type = 'mesa' THEN 100 WHEN p_type = 'camarote' THEN 1000 ELSE 0 END;

  INSERT INTO public.reservations (
    customer_id,
    name,
    email,
    whatsapp,
    cpf,
    birth_date,
    reservation_date,
    reservation_time,
    num_guests,
    type,
    location_id,
    notes,
    status,
    payment_status,
    payment_amount,
    expires_at
  ) VALUES (
    v_customer_id,
    p_name,
    COALESCE(p_email, ''),
    COALESCE(p_whatsapp, ''),
    v_cpf_digits,
    p_birth_date,
    p_date,
    COALESCE(NULLIF(p_time, ''), '22:00')::time,
    COALESCE(p_guests, 1),
    p_type,
    NULLIF(p_location_id, ''),
    p_notes,
    'pending',
    v_payment_status,
    v_payment_amount,
    p_expires_at
  );

  IF p_type = 'camarote' THEN
    INSERT INTO public.camarotes (name, event_date, owner_customer_id, capacity)
    VALUES (p_location_id, p_date, v_customer_id, 12)
    ON CONFLICT (event_date, name) DO NOTHING;
  END IF;

  RETURN jsonb_build_object('success', true, 'message', 'Reserva realizada com sucesso!');
END;
$$;

DROP FUNCTION IF EXISTS public.create_bracelet_entry_v2(TEXT, TEXT, TEXT, DATE, DATE);
DROP FUNCTION IF EXISTS public.create_bracelet_entry_v2(TEXT, TEXT, TEXT, DATE, TEXT, DATE);

CREATE OR REPLACE FUNCTION public.create_bracelet_entry_v2(
  p_cpf TEXT,
  p_name TEXT,
  p_whatsapp TEXT,
  p_birth_date DATE,
  p_photo TEXT,
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
  v_active_batch RECORD;
  v_next_batch RECORD;
  v_blacklist_entry RECORD;
  v_age INT;
BEGIN
  PERFORM 1 FROM public.box_office_reports WHERE event_date = p_event_date;
  IF FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'BOX_OFFICE_CLOSED', 'message', 'A bilheteria ja foi encerrada para esta data.');
  END IF;

  v_cpf_digits := regexp_replace(p_cpf, '\D', '', 'g');
  IF length(v_cpf_digits) != 11 THEN
    RETURN jsonb_build_object('success', false, 'error', 'CPF_INVALID', 'message', 'O CPF informado e invalido.');
  END IF;

  IF p_birth_date IS NOT NULL THEN
    v_age := extract(year from age(CURRENT_DATE, p_birth_date));
    IF v_age < 18 THEN
      RETURN jsonb_build_object('success', false, 'error', 'UNDERAGE', 'message', 'Entrada proibida para menores de 18 anos.');
    END IF;
  END IF;

  SELECT * INTO v_blacklist_entry
  FROM public.blacklist
  WHERE cpf_digits = v_cpf_digits AND end_date::date >= CURRENT_DATE;

  IF FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'BLACKLISTED', 'message', 'CPF consta na blacklist.');
  END IF;

  SELECT id INTO v_customer_id FROM public.customers WHERE cpf_digits = v_cpf_digits;
  IF v_customer_id IS NULL THEN
    INSERT INTO public.customers (cpf, cpf_digits, name, email, whatsapp, birth_date, photo)
    VALUES (p_cpf, v_cpf_digits, p_name, '', COALESCE(p_whatsapp, ''), p_birth_date, NULLIF(p_photo, ''))
    RETURNING id INTO v_customer_id;
  ELSE
    UPDATE public.customers
    SET name = p_name,
        whatsapp = COALESCE(p_whatsapp, whatsapp, ''),
        birth_date = COALESCE(p_birth_date, birth_date),
        photo = COALESCE(NULLIF(p_photo, ''), photo)
    WHERE id = v_customer_id;
  END IF;

  PERFORM 1
  FROM public.reservations
  WHERE customer_id = v_customer_id
    AND reservation_date = p_event_date
    AND COALESCE(status, 'pending') <> 'cancelled';

  IF FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'DUPLICATE', 'message', 'Cliente ja possui entrada/reserva hoje.');
  END IF;

  SELECT * INTO v_active_batch
  FROM public.ticket_batches
  WHERE event_date = p_event_date
    AND status = 'active'
    AND consumed_quantity < total_quantity
  ORDER BY batch_order ASC, created_at ASC
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'NO_ACTIVE_BATCH', 'message', 'Nenhum lote de pulseiras ativo com saldo disponivel.');
  END IF;

  UPDATE public.ticket_batches
  SET consumed_quantity = consumed_quantity + 1
  WHERE id = v_active_batch.id;

  INSERT INTO public.reservations (
    customer_id, name, email, whatsapp, cpf, birth_date,
    reservation_date, reservation_time, num_guests,
    type, status, check_in_status, entered_at, photo,
    payment_status, payment_amount, ticket_batch_id
  ) VALUES (
    v_customer_id, p_name, '', COALESCE(p_whatsapp, ''), v_cpf_digits, p_birth_date,
    p_event_date, (to_char(NOW() AT TIME ZONE 'America/Porto_Velho', 'HH24:MI'))::time, 1,
    'pulseira', 'confirmed', 'entered', NOW() AT TIME ZONE 'America/Porto_Velho', NULLIF(p_photo, ''),
    'paid', v_active_batch.price, v_active_batch.id
  );

  IF (v_active_batch.consumed_quantity + 1) >= v_active_batch.total_quantity THEN
    UPDATE public.ticket_batches
    SET status = 'exhausted'
    WHERE id = v_active_batch.id;

    SELECT * INTO v_next_batch
    FROM public.ticket_batches
    WHERE event_date = p_event_date
      AND status = 'draft'
      AND batch_order > v_active_batch.batch_order
      AND consumed_quantity < total_quantity
    ORDER BY batch_order ASC, created_at ASC
    LIMIT 1
    FOR UPDATE;

    IF FOUND THEN
      UPDATE public.ticket_batches
      SET status = 'active'
      WHERE id = v_next_batch.id;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Pulseira vendida e entrada registrada com sucesso!',
    'batch_id', v_active_batch.id,
    'payment_amount', v_active_batch.price
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.create_bracelet_entry_v2(
  p_cpf TEXT,
  p_name TEXT,
  p_whatsapp TEXT,
  p_birth_date DATE,
  p_event_date DATE
)
RETURNS JSONB
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.create_bracelet_entry_v2(p_cpf, p_name, p_whatsapp, p_birth_date, NULL::TEXT, p_event_date);
$$;

CREATE OR REPLACE FUNCTION public.request_complimentary_ticket(
  p_cpf TEXT,
  p_name TEXT,
  p_whatsapp TEXT,
  p_birth_date DATE,
  p_notes TEXT,
  p_event_date DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_requested_by UUID;
  v_requested_by_member UUID;
  v_cpf_digits TEXT;
  v_customer_id UUID;
  v_blacklist_entry RECORD;
BEGIN
  v_requested_by := auth.uid();
  IF v_requested_by IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED', 'message', 'Usuario nao autenticado.');
  END IF;

  PERFORM 1 FROM public.box_office_reports WHERE event_date = p_event_date;
  IF FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'BOX_OFFICE_CLOSED', 'message', 'A bilheteria ja foi encerrada.');
  END IF;

  v_cpf_digits := regexp_replace(p_cpf, '\D', '', 'g');
  IF length(v_cpf_digits) != 11 THEN
    RETURN jsonb_build_object('success', false, 'error', 'CPF_INVALID', 'message', 'O CPF informado e invalido.');
  END IF;

  SELECT * INTO v_blacklist_entry
  FROM public.blacklist
  WHERE cpf_digits = v_cpf_digits AND end_date::date >= CURRENT_DATE;

  IF FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'BLACKLISTED', 'message', 'CPF consta na blacklist.');
  END IF;

  SELECT id INTO v_customer_id FROM public.customers WHERE cpf_digits = v_cpf_digits;
  IF v_customer_id IS NULL THEN
    INSERT INTO public.customers (cpf, cpf_digits, name, email, whatsapp, birth_date)
    VALUES (p_cpf, v_cpf_digits, p_name, '', COALESCE(p_whatsapp, ''), p_birth_date)
    RETURNING id INTO v_customer_id;
  ELSE
    UPDATE public.customers
    SET name = p_name,
        whatsapp = COALESCE(p_whatsapp, whatsapp, ''),
        birth_date = COALESCE(p_birth_date, birth_date)
    WHERE id = v_customer_id;
  END IF;

  PERFORM 1
  FROM public.complimentary_tickets
  WHERE customer_id = v_customer_id
    AND event_date = p_event_date
    AND status IN ('pending', 'approved');

  IF FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'DUPLICATE_REQUEST', 'message', 'Este cliente ja possui uma cortesia para esta data.');
  END IF;

  SELECT id INTO v_requested_by_member FROM public.team_members WHERE id = v_requested_by;

  INSERT INTO public.complimentary_tickets (customer_id, event_date, status, requested_by, notes)
  VALUES (v_customer_id, p_event_date, 'pending', v_requested_by_member, p_notes);

  RETURN jsonb_build_object('success', true, 'message', 'Cortesia solicitada com sucesso!');
END;
$$;

CREATE OR REPLACE FUNCTION public.approve_complimentary_ticket(
  p_ticket_id UUID,
  p_status TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_approved_by UUID;
  v_approved_by_member UUID;
  v_ticket RECORD;
  v_customer RECORD;
BEGIN
  v_approved_by := auth.uid();
  IF v_approved_by IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED', 'message', 'Usuario nao autenticado.');
  END IF;

  IF NOT public.is_admin_or_manager() THEN
    RETURN jsonb_build_object('success', false, 'error', 'FORBIDDEN', 'message', 'Apenas administradores podem aprovar ou reprovar cortesias.');
  END IF;

  IF p_status NOT IN ('approved', 'rejected') THEN
    RETURN jsonb_build_object('success', false, 'error', 'INVALID_STATUS', 'message', 'Status invalido para cortesia.');
  END IF;

  SELECT * INTO v_ticket
  FROM public.complimentary_tickets
  WHERE id = p_ticket_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'NOT_FOUND', 'message', 'Cortesia nao encontrada.');
  END IF;

  IF v_ticket.status <> 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'ALREADY_PROCESSED', 'message', 'A cortesia ja foi processada.');
  END IF;

  PERFORM 1 FROM public.box_office_reports WHERE event_date = v_ticket.event_date;
  IF FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'BOX_OFFICE_CLOSED', 'message', 'A bilheteria ja foi encerrada.');
  END IF;

  SELECT id INTO v_approved_by_member FROM public.team_members WHERE id = v_approved_by;

  UPDATE public.complimentary_tickets
  SET status = p_status,
      approved_by = v_approved_by_member,
      updated_at = NOW()
  WHERE id = p_ticket_id;

  IF p_status = 'approved' THEN
    SELECT * INTO v_customer FROM public.customers WHERE id = v_ticket.customer_id;

    PERFORM 1
    FROM public.reservations
    WHERE customer_id = v_ticket.customer_id
      AND reservation_date = v_ticket.event_date
      AND COALESCE(status, 'pending') <> 'cancelled';

    IF NOT FOUND THEN
      INSERT INTO public.reservations (
        customer_id, name, email, whatsapp, cpf, birth_date,
        reservation_date, reservation_time, num_guests,
        type, status, check_in_status,
        payment_status, payment_amount
      ) VALUES (
        v_customer.id, v_customer.name, '', COALESCE(v_customer.whatsapp, ''), v_customer.cpf_digits, v_customer.birth_date,
        v_ticket.event_date, (to_char(NOW() AT TIME ZONE 'America/Porto_Velho', 'HH24:MI'))::time, 1,
        'cortesia', 'confirmed', 'pending',
        'not_required', 0
      );
    END IF;
  END IF;

  RETURN jsonb_build_object('success', true, 'message', 'Cortesia processada com sucesso!');
END;
$$;
