-- Redefinir a função para listar locais reservados considerando o lock de 10 minutos para pagamentos pendentes
CREATE OR REPLACE FUNCTION public.get_reserved_locations(p_date DATE)
RETURNS TABLE (location_id TEXT)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT DISTINCT r.location_id
  FROM public.reservations r
  WHERE r.reservation_date = p_date
    AND r.status ILIKE 'cancelled' = false
    AND r.location_id IS NOT NULL
    AND (
      r.payment_status != 'pending'
      OR r.created_at >= (NOW() AT TIME ZONE 'America/Porto_Velho') - INTERVAL '10 minutes'
    );
$$;

-- Criar a função RPC atômica para criar reservas com validações no banco de dados
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

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Reserva realizada com sucesso!'
  );
END;
$$;
