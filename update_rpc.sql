CREATE OR REPLACE FUNCTION public.update_check_in_status_with_photo(
  p_reservation_id uuid,
  p_new_status text,
  p_photo text DEFAULT NULL::text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE
  v_reservation RECORD;
  v_current_time TIME;
  v_list_limit TIME;
BEGIN
  -- 1. Obter e travar a reserva para atualização
  SELECT * INTO v_reservation
  FROM public.reservations
  WHERE id = p_reservation_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'RESERVATION_NOT_FOUND', 'message', 'A reserva especificada não foi encontrada.');
  END IF;

  -- 2. CHECK IF CLOSED
  PERFORM 1 FROM public.box_office_reports WHERE event_date = v_reservation.reservation_date;
  IF FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'BOX_OFFICE_CLOSED', 'message', 'A bilheteria já foi encerrada para o dia desta reserva.');
  END IF;

  -- 3. Validação do horário limite da lista (se for check-in de lista)
  IF p_new_status = 'entered' AND v_reservation.type = 'lista' THEN
    -- Extrai apenas a hora atual em Porto Velho
    v_current_time := (NOW() AT TIME ZONE 'America/Porto_Velho')::time;
    
    -- Busca o limite do evento correspondente à data da reserva
    SELECT list_limit_time::time INTO v_list_limit FROM events WHERE event_date = v_reservation.reservation_date;
    
    -- Se for nulo, assume 23:30
    IF v_list_limit IS NULL THEN
       v_list_limit := '23:30'::time;
    END IF;

    -- Se passou da hora, bloqueia!
    IF v_current_time > v_list_limit THEN
       RAISE EXCEPTION 'Horário limite da lista expirado (%). O cliente deve pagar a entrada (Pulseira).', to_char(v_list_limit, 'HH24:MI');
    END IF;
  END IF;

  -- 4. Atualizar a reserva
  UPDATE public.reservations
  SET 
    check_in_status = p_new_status,
    entered_at = CASE WHEN p_new_status = 'entered' THEN (NOW() AT TIME ZONE 'America/Porto_Velho') ELSE NULL END,
    status = CASE WHEN p_new_status = 'entered' THEN 'confirmed' ELSE status END
  WHERE id = p_reservation_id;

  -- 5. Atualizar a foto do cliente (se fornecida)
  IF p_photo IS NOT NULL AND v_reservation.customer_id IS NOT NULL THEN
    UPDATE public.customers
    SET photo = p_photo
    WHERE id = v_reservation.customer_id;
  END IF;

  RETURN jsonb_build_object('success', true, 'message', 'Status atualizado com sucesso!');
END;
$function$;
