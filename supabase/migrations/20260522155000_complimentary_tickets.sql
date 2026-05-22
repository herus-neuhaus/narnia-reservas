-- Add missing columns to complimentary_tickets if needed or use existing ones.
-- The existing table `complimentary_tickets` has `customer_id`, `event_date`, `status`, `requested_by`, `approved_by`, `notes`.

-- 1. Create or Replace `request_complimentary_ticket`
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
  v_cpf_digits TEXT;
  v_customer_id UUID;
  v_blacklist_entry RECORD;
  v_requested_by UUID;
BEGIN
  v_requested_by := auth.uid();
  IF v_requested_by IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED', 'message', 'Usuário não autenticado.');
  END IF;

  -- Normalizar CPF
  v_cpf_digits := regexp_replace(p_cpf, '\D', '', 'g');
  IF length(v_cpf_digits) != 11 THEN
    RETURN jsonb_build_object('success', false, 'error', 'CPF_INVALID', 'message', 'CPF inválido.');
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

  -- Verificar duplicidade no pedido
  PERFORM 1 FROM public.complimentary_tickets 
  WHERE customer_id = v_customer_id AND event_date = p_event_date;
  IF FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'DUPLICATE_REQUEST', 'message', 'Este cliente já tem uma solicitação de cortesia para hoje.');
  END IF;

  -- Criar pedido
  INSERT INTO public.complimentary_tickets (customer_id, event_date, status, requested_by, notes)
  VALUES (v_customer_id, p_event_date, 'pending', v_requested_by, p_notes);

  RETURN jsonb_build_object('success', true, 'message', 'Cortesia solicitada com sucesso!');
END;
$$;


-- 2. Create or Replace `approve_complimentary_ticket`
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
  v_ticket RECORD;
  v_customer RECORD;
  v_is_admin BOOLEAN;
BEGIN
  v_approved_by := auth.uid();
  IF v_approved_by IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED', 'message', 'Usuário não autenticado.');
  END IF;

  -- Check admin/manager role
  SELECT public.is_admin_or_manager() INTO v_is_admin;
  IF NOT v_is_admin THEN
    RETURN jsonb_build_object('success', false, 'error', 'FORBIDDEN', 'message', 'Apenas administradores podem aprovar cortesias.');
  END IF;

  SELECT * INTO v_ticket FROM public.complimentary_tickets WHERE id = p_ticket_id FOR UPDATE;
  IF v_ticket IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'NOT_FOUND', 'message', 'Solicitação não encontrada.');
  END IF;

  IF v_ticket.status != 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'ALREADY_PROCESSED', 'message', 'A solicitação já foi ' || v_ticket.status);
  END IF;

  UPDATE public.complimentary_tickets
  SET status = p_status, approved_by = v_approved_by, updated_at = NOW()
  WHERE id = p_ticket_id;

  IF p_status = 'approved' THEN
    -- Obter cliente
    SELECT * INTO v_customer FROM public.customers WHERE id = v_ticket.customer_id;
    
    -- Criar reserva (Entrada liberada, mas não entrou fisicamente)
    INSERT INTO public.reservations (
      customer_id, name, email, whatsapp, cpf, birth_date,
      reservation_date, reservation_time, num_guests,
      type, status, check_in_status, payment_status, payment_amount
    ) VALUES (
      v_customer.id, v_customer.name, '', v_customer.whatsapp, v_customer.cpf_digits, v_customer.birth_date,
      v_ticket.event_date, to_char(NOW() AT TIME ZONE 'America/Porto_Velho', 'HH24:MI'), 1,
      'cortesia', 'confirmed', 'pending', 'not_required', 0
    );
  END IF;

  RETURN jsonb_build_object('success', true, 'message', 'Cortesia processada com sucesso!');
END;
$$;
