-- Fix photo saving to reservations in update_check_in_status_with_photo
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
    status = CASE WHEN p_new_status = 'entered' THEN 'confirmed' ELSE status END,
    photo = COALESCE(p_photo, photo)
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
