-- Fix time cast in approve_complimentary_ticket

CREATE OR REPLACE FUNCTION public.approve_complimentary_ticket(p_ticket_id uuid, p_status text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
      v_customer.id, v_customer.name, '', COALESCE(v_customer.whatsapp, ''), v_customer.cpf_digits, v_customer.birth_date,
      v_ticket.event_date, (to_char(NOW() AT TIME ZONE 'America/Porto_Velho', 'HH24:MI'))::time, 1,
      'cortesia', 'confirmed', 'pending', 'not_required', 0
    );
  END IF;

  RETURN jsonb_build_object('success', true, 'message', 'Cortesia processada com sucesso!');
END;
$function$;
