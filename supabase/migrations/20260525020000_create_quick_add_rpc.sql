CREATE OR REPLACE FUNCTION public.quick_add_portaria_entry(
  p_cpf text,
  p_name text,
  p_whatsapp text,
  p_birth_date date,
  p_type text,
  p_location_id text,
  p_event_date date,
  p_photo text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_clean_cpf text;
  v_customer_id uuid;
  v_email text;
  v_pv_time timestamp;
  v_reservation_id uuid;
  v_exists boolean;
BEGIN
  v_clean_cpf := regexp_replace(p_cpf, '\D', '', 'g');
  
  -- Upsert customer
  SELECT id INTO v_customer_id FROM public.customers WHERE cpf = p_cpf OR cpf_digits = v_clean_cpf LIMIT 1;
  
  IF v_customer_id IS NOT NULL THEN
    UPDATE public.customers
    SET name = p_name,
        whatsapp = p_whatsapp,
        birth_date = p_birth_date,
        photo = COALESCE(p_photo, photo)
    WHERE id = v_customer_id;
  ELSE
    v_email := 'portaria_' || v_clean_cpf || '@narnia.com';
    INSERT INTO public.customers (cpf, cpf_digits, name, whatsapp, birth_date, email, photo)
    VALUES (p_cpf, v_clean_cpf, p_name, p_whatsapp, p_birth_date, v_email, p_photo)
    RETURNING id INTO v_customer_id;
  END IF;

  -- Check if already entered/reserved today
  SELECT EXISTS (
    SELECT 1 FROM public.reservations 
    WHERE customer_id = v_customer_id 
    AND reservation_date = p_event_date
    AND check_in_status = 'entered'
  ) INTO v_exists;

  IF v_exists THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'DUPLICATE_ENTRY',
      'message', 'O cliente já possui uma entrada registrada para hoje.'
    );
  END IF;
  
  v_pv_time := timezone('America/Porto_Velho', now());
  v_email := 'portaria_' || v_clean_cpf || '@narnia.com';

  INSERT INTO public.reservations (
    customer_id, name, email, cpf, birth_date, whatsapp,
    reservation_date, reservation_time, type, location_id,
    check_in_status, entered_at, num_guests, photo
  ) VALUES (
    v_customer_id, p_name, v_email, p_cpf, p_birth_date, p_whatsapp,
    p_event_date, to_char(v_pv_time, 'HH24:MI'), p_type,
    CASE WHEN p_type = 'mesa' THEN p_location_id ELSE NULL END,
    'entered', v_pv_time, 1, p_photo
  ) RETURNING id INTO v_reservation_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Entrada registrada com sucesso.',
    'reservation_id', v_reservation_id,
    'customer_id', v_customer_id,
    'data', jsonb_build_object(
      'id', v_reservation_id,
      'customer_id', v_customer_id,
      'name', p_name,
      'cpf', p_cpf,
      'type', p_type,
      'reservation_date', p_event_date,
      'reservation_time', to_char(v_pv_time, 'HH24:MI'),
      'check_in_status', 'entered',
      'entered_at', v_pv_time,
      'location_id', CASE WHEN p_type = 'mesa' THEN p_location_id ELSE NULL END,
      'whatsapp', p_whatsapp,
      'photo', p_photo
    )
  );
EXCEPTION WHEN unique_violation THEN
  RETURN jsonb_build_object(
    'success', false,
    'error_code', 'DUPLICATE_ENTRY',
    'message', 'O cliente já possui uma entrada/reserva para esta data.'
  );
WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error_code', 'UNKNOWN_ERROR',
    'message', SQLERRM
  );
END;
$$;
