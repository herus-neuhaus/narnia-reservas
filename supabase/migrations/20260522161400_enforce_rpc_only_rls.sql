-- Revoke direct table mutations to force usage of SECURITY DEFINER RPCs

-- 1. COMPLIMENTARY TICKETS
DROP POLICY IF EXISTS "Enable insert for receptionists" ON public.complimentary_tickets;
DROP POLICY IF EXISTS "Enable update for admins on complimentary_tickets" ON public.complimentary_tickets;
DROP POLICY IF EXISTS "Enable delete for admins on complimentary_tickets" ON public.complimentary_tickets;

-- 2. CAMAROTE ENTRIES
DROP POLICY IF EXISTS "Enable insert for all authenticated on camarote_entries" ON public.camarote_entries;
-- Keep "Enable all for admins on camarote_entries" if admins need manual bypass, but ideally drop it too to force RPCs
DROP POLICY IF EXISTS "Enable all for admins on camarote_entries" ON public.camarote_entries;

-- 3. TICKET BATCHES
-- We leave "Enable all for admins" since admins manage batches manually in the UI (create, edit price).
-- But no one else can insert/update batches directly.
-- The RPC "consume_bracelet" will bypass this because it is SECURITY DEFINER.

-- (Re)Create SELECT-only policies to ensure visibility
DROP POLICY IF EXISTS "Enable read for authenticated users" ON public.complimentary_tickets;
CREATE POLICY "Enable read for authenticated users" ON public.complimentary_tickets FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Enable read for authenticated users" ON public.camarote_entries;
CREATE POLICY "Enable read for authenticated users" ON public.camarote_entries FOR SELECT TO authenticated USING (true);


-- 4. Check/update RPCs to ensure they are SECURITY DEFINER and use auth.uid() securely

-- request_complimentary_ticket
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
  v_cpf_digits TEXT;
  v_customer_id UUID;
  v_blacklist_entry RECORD;
BEGIN
  v_requested_by := auth.uid();
  IF v_requested_by IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED', 'message', 'Usuário não autenticado.');
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

  -- Insert Cortesia
  INSERT INTO public.complimentary_tickets (
    customer_id, event_date, notes, requested_by, status
  ) VALUES (
    v_customer_id, p_event_date, p_notes, v_requested_by, 'pending'
  );

  RETURN jsonb_build_object('success', true, 'message', 'Cortesia solicitada com sucesso!');
END;
$$;

-- approve_complimentary_ticket
CREATE OR REPLACE FUNCTION public.approve_complimentary_ticket(
  p_ticket_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_approved_by UUID;
  v_is_admin BOOLEAN;
  v_ticket RECORD;
  v_customer RECORD;
BEGIN
  v_approved_by := auth.uid();
  IF v_approved_by IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED', 'message', 'Usuário não autenticado.');
  END IF;

  SELECT public.is_admin_or_manager() INTO v_is_admin;
  IF NOT v_is_admin THEN
    RETURN jsonb_build_object('success', false, 'error', 'FORBIDDEN', 'message', 'Apenas administradores podem aprovar cortesias.');
  END IF;

  SELECT * INTO v_ticket FROM public.complimentary_tickets WHERE id = p_ticket_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'NOT_FOUND', 'message', 'Cortesia não encontrada.');
  END IF;

  -- CHECK IF CLOSED
  PERFORM 1 FROM public.box_office_reports WHERE event_date = v_ticket.event_date;
  IF FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'BOX_OFFICE_CLOSED', 'message', 'A bilheteria já foi encerrada.');
  END IF;

  UPDATE public.complimentary_tickets
  SET status = 'approved', approved_by = v_approved_by
  WHERE id = p_ticket_id;

  -- Fetch customer
  SELECT * INTO v_customer FROM public.customers WHERE id = v_ticket.customer_id;

  -- Insert reservation entry pending check-in
  INSERT INTO public.reservations (
    customer_id, name, whatsapp, cpf, birth_date,
    reservation_date, reservation_time, num_guests,
    type, status, check_in_status,
    payment_status, payment_amount
  ) VALUES (
    v_customer.id, v_customer.name, v_customer.whatsapp, v_customer.cpf_digits, v_customer.birth_date,
    v_ticket.event_date, to_char(NOW() AT TIME ZONE 'America/Porto_Velho', 'HH24:MI'), 1,
    'cortesia', 'confirmed', 'pending',
    'not_required', 0
  );

  RETURN jsonb_build_object('success', true, 'message', 'Cortesia aprovada com sucesso!');
END;
$$;

-- reject_complimentary_ticket
CREATE OR REPLACE FUNCTION public.reject_complimentary_ticket(
  p_ticket_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_approved_by UUID;
  v_is_admin BOOLEAN;
  v_ticket RECORD;
BEGIN
  v_approved_by := auth.uid();
  IF v_approved_by IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED', 'message', 'Usuário não autenticado.');
  END IF;

  SELECT public.is_admin_or_manager() INTO v_is_admin;
  IF NOT v_is_admin THEN
    RETURN jsonb_build_object('success', false, 'error', 'FORBIDDEN', 'message', 'Apenas administradores podem rejeitar cortesias.');
  END IF;

  SELECT * INTO v_ticket FROM public.complimentary_tickets WHERE id = p_ticket_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'NOT_FOUND', 'message', 'Cortesia não encontrada.');
  END IF;

  UPDATE public.complimentary_tickets
  SET status = 'rejected', approved_by = v_approved_by
  WHERE id = p_ticket_id;

  RETURN jsonb_build_object('success', true, 'message', 'Cortesia rejeitada.');
END;
$$;
