CREATE OR REPLACE FUNCTION public.validate_complimentary_entry(
  p_customer_id UUID,
  p_event_date DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reservation_id UUID;
  v_pv_time TIMESTAMP;
BEGIN
  v_pv_time := timezone('America/Porto_Velho', now());

  UPDATE public.reservations
  SET check_in_status = 'entered',
      entered_at = v_pv_time,
      updated_at = NOW()
  WHERE customer_id = p_customer_id
    AND reservation_date = p_event_date
    AND type = 'cortesia'
    AND COALESCE(check_in_status, 'pending') <> 'entered'
  RETURNING id INTO v_reservation_id;

  IF NOT FOUND THEN
    -- Check if it was already entered
    PERFORM 1 FROM public.reservations 
    WHERE customer_id = p_customer_id 
      AND reservation_date = p_event_date 
      AND type = 'cortesia' 
      AND check_in_status = 'entered';
      
    IF FOUND THEN
      RETURN jsonb_build_object('success', false, 'message', 'O cliente já realizou a entrada.');
    END IF;

    RETURN jsonb_build_object('success', false, 'message', 'Reserva de cortesia não encontrada para este cliente na data especificada.');
  END IF;

  RETURN jsonb_build_object('success', true, 'message', 'Entrada validada com sucesso!', 'reservation_id', v_reservation_id);
END;
$$;
