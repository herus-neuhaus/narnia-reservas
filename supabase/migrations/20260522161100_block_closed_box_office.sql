-- 3. Modify create_reservation_v2 to block if closed
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
  v_camarote_id UUID;
BEGIN
  -- CHECK IF CLOSED
  PERFORM 1 FROM public.box_office_reports WHERE event_date = p_date;
  IF FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'BOX_OFFICE_CLOSED', 'message', 'A bilheteria já foi encerrada.');
  END IF;

  -- 1. Normalizar o CPF (apenas dígitos)
  v_cpf_digits := regexp_replace(p_cpf, '\D', '', 'g');
  IF length(v_cpf_digits) != 11 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'CPF_INVALID',
      'message', 'O CPF informado é inválido. Certifique-se de preencher todos os 11 dígitos.'
    );
  END IF;

  -- 2. Verificar Blacklist
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

  -- 3. Obter ou Upsert do Cliente na tabela customers
  SELECT id INTO v_customer_id FROM public.customers WHERE cpf_digits = v_cpf_digits;
  
  IF v_customer_id IS NULL THEN
    INSERT INTO public.customers (cpf, cpf_digits, name, email, whatsapp, birth_date)
    VALUES (p_cpf, v_cpf_digits, p_name, p_email, p_whatsapp, p_birth_date)
    RETURNING id INTO v_customer_id;
  ELSE
    UPDATE public.customers
    SET name = p_name, email = p_email, whatsapp = p_whatsapp, birth_date = p_birth_date
    WHERE id = v_customer_id;
  END IF;

  -- 4. Verificar Duplicidade de CPF/Reserva no mesmo Dia
  PERFORM 1
  FROM public.reservations
  WHERE customer_id = v_customer_id
    AND reservation_date = p_date
    AND status ILIKE 'cancelled' = false
    AND (
      payment_status != 'pending'
      OR created_at >= (NOW() AT TIME ZONE 'America/Porto_Velho') - INTERVAL '10 minutes'
    );

  IF FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'CPF_DUPLICATE',
      'message', 'Este CPF já possui uma reserva ou entrada pendente/confirmada para este mesmo dia!'
    );
  END IF;

  -- 5. Verificar Disponibilidade de Mesa ou Camarote (com Lock de 10 min)
  IF p_type = 'mesa' OR p_type = 'camarote' THEN
    IF p_location_id IS NULL OR p_location_id = '' THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'LOCATION_REQUIRED',
        'message', 'A seleção de uma mesa ou camarote é obrigatória.'
      );
    END IF;

    PERFORM 1
    FROM public.reservations
    WHERE location_id = p_location_id
      AND reservation_date = p_date
      AND status ILIKE 'cancelled' = false
      AND (
        payment_status != 'pending'
        OR created_at >= (NOW() AT TIME ZONE 'America/Porto_Velho') - INTERVAL '10 minutes'
      );
    
    IF FOUND THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'LOCATION_OCCUPIED',
        'message', 'A mesa ou camarote escolhido já está ocupado ou reservado temporariamente por outro cliente.'
      );
    END IF;
  END IF;

  -- 6. Verificar Limite da Lista de Convidados (Se tipo for 'lista')
  IF p_type = 'lista' THEN
    SELECT * INTO v_event FROM public.events WHERE event_date = p_date;
    
    IF FOUND THEN
      IF v_event.list_limit_capacity > 0 THEN
        SELECT COUNT(*) INTO v_active_list_count
        FROM public.reservations
        WHERE reservation_date = p_date
          AND type = 'lista'
          AND status ILIKE 'cancelled' = false;
          
        IF v_active_list_count >= v_event.list_limit_capacity THEN
          RETURN jsonb_build_object(
            'success', false,
            'error', 'LIST_FULL',
            'message', 'A lista de convidados para este evento atingiu a capacidade máxima.'
          );
        END IF;
      END IF;
    END IF;
  END IF;

  -- 7. Definir Valores de Pagamento
  v_payment_status := CASE WHEN p_type = 'mesa' OR p_type = 'camarote' THEN 'pending' ELSE 'not_required' END;
  v_payment_amount := CASE WHEN p_type = 'mesa' THEN 100 WHEN p_type = 'camarote' THEN 1000 ELSE 0 END;

  -- 8. Inserir a Reserva
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
    p_email,
    p_whatsapp,
    v_cpf_digits,
    p_birth_date,
    p_date,
    p_time,
    p_guests,
    p_type,
    p_location_id,
    p_notes,
    'pending',
    v_payment_status,
    v_payment_amount,
    p_expires_at
  );

  -- 9. Se for camarote, criar na tabela camarotes (para permitir gerenciar ocupação)
  IF p_type = 'camarote' THEN
    INSERT INTO public.camarotes (name, event_date, owner_customer_id, capacity)
    VALUES (p_location_id, p_date, v_customer_id, 12)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Reserva realizada com sucesso!'
  );
END;
$$;


-- 4. register_camarote_guest_entry
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
  v_cpf_digits TEXT;
  v_customer_id UUID;
  v_blacklist_entry RECORD;
  v_camarote RECORD;
  v_current_count INT;
  v_event_date DATE;
  v_age INT;
BEGIN
  -- Obter camarote com lock
  SELECT * INTO v_camarote FROM public.camarotes WHERE id = p_camarote_id FOR UPDATE;
  IF v_camarote IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'NOT_FOUND', 'message', 'Camarote não encontrado.');
  END IF;

  v_event_date := v_camarote.event_date;

  -- CHECK IF CLOSED
  PERFORM 1 FROM public.box_office_reports WHERE event_date = v_event_date;
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

  -- Duplicidade no camarote e no evento em geral
  PERFORM 1 FROM public.camarote_entries WHERE camarote_id = p_camarote_id AND customer_id = v_customer_id;
  IF FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'DUPLICATE', 'message', 'Este cliente já está registrado neste camarote.');
  END IF;

  -- Contar ocupação normal (não-extra)
  SELECT COUNT(*) INTO v_current_count FROM public.camarote_entries WHERE camarote_id = p_camarote_id AND is_extra = false;
  
  IF v_current_count >= v_camarote.capacity THEN
    RETURN jsonb_build_object('success', false, 'error', 'FULL', 'message', 'Camarote lotado. Solicite a liberação de entrada extra para um Administrador.');
  END IF;

  -- Registrar entrada
  INSERT INTO public.camarote_entries (camarote_id, customer_id, entered_at, is_extra)
  VALUES (p_camarote_id, v_customer_id, NOW(), false);

  -- Criar registro de reservation para relatório geral
  INSERT INTO public.reservations (
    customer_id, name, whatsapp, cpf, birth_date,
    reservation_date, reservation_time, num_guests,
    type, location_id, status, check_in_status, entered_at,
    payment_status, payment_amount
  ) VALUES (
    v_customer_id, p_name, p_whatsapp, v_cpf_digits, p_birth_date,
    v_event_date, to_char(NOW() AT TIME ZONE 'America/Porto_Velho', 'HH24:MI'), 1,
    'camarote', v_camarote.name, 'confirmed', 'entered', NOW() AT TIME ZONE 'America/Porto_Velho',
    'paid', 0
  );

  RETURN jsonb_build_object('success', true, 'message', 'Entrada registrada com sucesso no camarote!');
END;
$$;


-- 5. authorize_camarote_extra_entry
CREATE OR REPLACE FUNCTION public.authorize_camarote_extra_entry(
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
  v_authorized_by UUID;
  v_is_admin BOOLEAN;
  v_cpf_digits TEXT;
  v_customer_id UUID;
  v_blacklist_entry RECORD;
  v_camarote RECORD;
  v_event_date DATE;
BEGIN
  v_authorized_by := auth.uid();
  IF v_authorized_by IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED', 'message', 'Usuário não autenticado.');
  END IF;

  SELECT public.is_admin_or_manager() INTO v_is_admin;
  IF NOT v_is_admin THEN
    RETURN jsonb_build_object('success', false, 'error', 'FORBIDDEN', 'message', 'Apenas administradores podem liberar entrada extra.');
  END IF;

  -- Obter camarote com lock
  SELECT * INTO v_camarote FROM public.camarotes WHERE id = p_camarote_id FOR UPDATE;
  IF v_camarote IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'NOT_FOUND', 'message', 'Camarote não encontrado.');
  END IF;
  
  v_event_date := v_camarote.event_date;

  -- CHECK IF CLOSED
  PERFORM 1 FROM public.box_office_reports WHERE event_date = v_event_date;
  IF FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'BOX_OFFICE_CLOSED', 'message', 'A bilheteria já foi encerrada.');
  END IF;

  -- Normalizar CPF
  v_cpf_digits := regexp_replace(p_cpf, '\D', '', 'g');
  IF length(v_cpf_digits) != 11 THEN
    RETURN jsonb_build_object('success', false, 'error', 'CPF_INVALID', 'message', 'O CPF informado é inválido.');
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

  -- Duplicidade no camarote
  PERFORM 1 FROM public.camarote_entries WHERE camarote_id = p_camarote_id AND customer_id = v_customer_id;
  IF FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'DUPLICATE', 'message', 'Este cliente já está registrado neste camarote.');
  END IF;

  -- Registrar entrada extra
  INSERT INTO public.camarote_entries (camarote_id, customer_id, entered_at, is_extra, authorized_by)
  VALUES (p_camarote_id, v_customer_id, NOW(), true, v_authorized_by);

  -- Criar registro de reservation para relatório geral
  INSERT INTO public.reservations (
    customer_id, name, whatsapp, cpf, birth_date,
    reservation_date, reservation_time, num_guests,
    type, location_id, status, check_in_status, entered_at,
    payment_status, payment_amount
  ) VALUES (
    v_customer_id, p_name, p_whatsapp, v_cpf_digits, p_birth_date,
    v_event_date, to_char(NOW() AT TIME ZONE 'America/Porto_Velho', 'HH24:MI'), 1,
    'camarote', v_camarote.name, 'confirmed', 'entered', NOW() AT TIME ZONE 'America/Porto_Velho',
    'paid', 0
  );

  RETURN jsonb_build_object('success', true, 'message', 'Entrada EXTRA registrada com sucesso!');
END;
$$;


-- 6. update_check_in_status_with_photo (from previous implementation, just add check)
CREATE OR REPLACE FUNCTION public.update_check_in_status_with_photo(
  p_reservation_id UUID,
  p_new_status TEXT,
  p_photo TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reservation RECORD;
BEGIN
  -- 1. Obter e travar a reserva para atualização (evita concorrência)
  SELECT * INTO v_reservation
  FROM public.reservations
  WHERE id = p_reservation_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'RESERVATION_NOT_FOUND',
      'message', 'A reserva especificada não foi encontrada.'
    );
  END IF;

  -- CHECK IF CLOSED
  PERFORM 1 FROM public.box_office_reports WHERE event_date = v_reservation.reservation_date;
  IF FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'BOX_OFFICE_CLOSED', 'message', 'A bilheteria já foi encerrada para o dia desta reserva.');
  END IF;

  -- 2. Atualizar a reserva
  UPDATE public.reservations
  SET 
    check_in_status = p_new_status,
    entered_at = CASE WHEN p_new_status = 'entered' THEN (NOW() AT TIME ZONE 'America/Porto_Velho') ELSE NULL END,
    status = CASE WHEN p_new_status = 'entered' THEN 'confirmed' ELSE status END
  WHERE id = p_reservation_id;

  -- 3. Atualizar a foto do cliente (se fornecida)
  IF p_photo IS NOT NULL AND v_reservation.customer_id IS NOT NULL THEN
    UPDATE public.customers
    SET photo = p_photo
    WHERE id = v_reservation.customer_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Status atualizado com sucesso!'
  );
END;
$$;
