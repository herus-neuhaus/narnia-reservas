-- Fix camarote_entries insert

CREATE OR REPLACE FUNCTION public.register_camarote_guest_entry(
  p_camarote_id UUID,
  p_cpf TEXT,
  p_name TEXT,
  p_whatsapp TEXT,
  p_birth_date DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_camarote RECORD;
  v_cpf_digits TEXT;
  v_customer_id UUID;
  v_blacklist_entry RECORD;
  v_age INT;
  v_normal_count INT;
BEGIN
  v_cpf_digits := regexp_replace(p_cpf, '\D', '', 'g');
  IF length(v_cpf_digits) != 11 THEN
    RETURN jsonb_build_object('success', false, 'error', 'CPF_INVALID', 'message', 'O CPF informado é inválido.');
  END IF;

  IF p_birth_date IS NOT NULL THEN
    v_age := extract(year from age(CURRENT_DATE, p_birth_date));
    IF v_age < 18 THEN
      RETURN jsonb_build_object('success', false, 'error', 'UNDERAGE', 'message', 'Entrada proibida para menores de 18 anos.');
    END IF;
  END IF;

  SELECT * INTO v_blacklist_entry FROM public.blacklist WHERE cpf_digits = v_cpf_digits AND end_date::date >= CURRENT_DATE;
  IF FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'BLACKLISTED', 'message', 'CPF consta na blacklist.');
  END IF;

  SELECT * INTO v_camarote FROM public.camarotes WHERE id = p_camarote_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'NOT_FOUND', 'message', 'Camarote não encontrado.');
  END IF;

  PERFORM 1 FROM public.box_office_reports WHERE event_date = v_camarote.event_date;
  IF FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'BOX_OFFICE_CLOSED', 'message', 'A bilheteria já foi encerrada.');
  END IF;

  SELECT id INTO v_customer_id FROM public.customers WHERE cpf_digits = v_cpf_digits;
  IF v_customer_id IS NULL THEN
    INSERT INTO public.customers (cpf, cpf_digits, name, whatsapp, birth_date)
    VALUES (p_cpf, v_cpf_digits, p_name, COALESCE(p_whatsapp, ''), p_birth_date)
    RETURNING id INTO v_customer_id;
  ELSE
    UPDATE public.customers
    SET name = p_name, whatsapp = COALESCE(p_whatsapp, ''), birth_date = COALESCE(p_birth_date, birth_date)
    WHERE id = v_customer_id;
  END IF;

  PERFORM 1 FROM public.camarote_entries WHERE camarote_id = p_camarote_id AND customer_id = v_customer_id;
  IF FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'DUPLICATE', 'message', 'Cliente já registrado neste camarote.');
  END IF;

  SELECT count(*) INTO v_normal_count FROM public.camarote_entries WHERE camarote_id = p_camarote_id AND is_extra = false;
  IF v_normal_count >= v_camarote.capacity THEN
    RETURN jsonb_build_object('success', false, 'error', 'FULL', 'message', 'Camarote lotado! Requer autorização de extra.');
  END IF;

  INSERT INTO public.camarote_entries (
    camarote_id, customer_id, is_extra
  ) VALUES (
    p_camarote_id, v_customer_id, false
  );

  INSERT INTO public.reservations (
    customer_id, name, email, whatsapp, cpf, birth_date,
    reservation_date, reservation_time, num_guests,
    type, location_id, status, check_in_status, entered_at,
    payment_status, payment_amount
  ) VALUES (
    v_customer_id, p_name, '', COALESCE(p_whatsapp, ''), v_cpf_digits, p_birth_date,
    v_camarote.event_date, (to_char(NOW() AT TIME ZONE 'America/Porto_Velho', 'HH24:MI'))::time, 1,
    'camarote', v_camarote.name, 'confirmed', 'entered', NOW() AT TIME ZONE 'America/Porto_Velho',
    'paid', 0
  );

  RETURN jsonb_build_object('success', true, 'message', 'Entrada de camarote registrada com sucesso.');
END;
$$;


CREATE OR REPLACE FUNCTION public.authorize_camarote_extra_entry(
  p_camarote_id UUID,
  p_cpf TEXT,
  p_name TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_authorized_by UUID;
  v_is_admin BOOLEAN;
  v_camarote RECORD;
  v_cpf_digits TEXT;
  v_customer_id UUID;
BEGIN
  v_authorized_by := auth.uid();
  IF v_authorized_by IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED', 'message', 'Usuário não autenticado.');
  END IF;

  SELECT public.is_admin_or_manager() INTO v_is_admin;
  IF NOT v_is_admin THEN
    RETURN jsonb_build_object('success', false, 'error', 'FORBIDDEN', 'message', 'Apenas administradores podem liberar extra.');
  END IF;

  SELECT * INTO v_camarote FROM public.camarotes WHERE id = p_camarote_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'NOT_FOUND', 'message', 'Camarote não encontrado.');
  END IF;

  PERFORM 1 FROM public.box_office_reports WHERE event_date = v_camarote.event_date;
  IF FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'BOX_OFFICE_CLOSED', 'message', 'A bilheteria já foi encerrada.');
  END IF;

  v_cpf_digits := regexp_replace(p_cpf, '\D', '', 'g');
  SELECT id INTO v_customer_id FROM public.customers WHERE cpf_digits = v_cpf_digits;
  IF v_customer_id IS NULL THEN
    INSERT INTO public.customers (cpf, cpf_digits, name, email, whatsapp)
    VALUES (p_cpf, v_cpf_digits, p_name, '', '')
    RETURNING id INTO v_customer_id;
  END IF;

  PERFORM 1 FROM public.camarote_entries WHERE camarote_id = p_camarote_id AND customer_id = v_customer_id;
  IF FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'DUPLICATE', 'message', 'Cliente já registrado neste camarote.');
  END IF;

  INSERT INTO public.camarote_entries (
    camarote_id, customer_id, is_extra, authorized_by
  ) VALUES (
    p_camarote_id, v_customer_id, true, v_authorized_by
  );

  INSERT INTO public.reservations (
    customer_id, name, email, whatsapp, cpf,
    reservation_date, reservation_time, num_guests,
    type, location_id, status, check_in_status, entered_at,
    payment_status, payment_amount
  ) VALUES (
    v_customer_id, p_name, '', '', v_cpf_digits,
    v_camarote.event_date, (to_char(NOW() AT TIME ZONE 'America/Porto_Velho', 'HH24:MI'))::time, 1,
    'camarote', v_camarote.name || ' (EXTRA)', 'confirmed', 'entered', NOW() AT TIME ZONE 'America/Porto_Velho',
    'not_required', 0
  );

  RETURN jsonb_build_object('success', true, 'message', 'Extra autorizado com sucesso.');
END;
$$;
