-- 1. Create Helper Function for Role Validation
CREATE OR REPLACE FUNCTION public.is_admin_or_manager()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role') IN ('dono', 'gerente', 'admin'),
    false
  );
$$;

-- 2. Drop Broad Insecure Policies
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.ticket_batches;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.complimentary_tickets;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.camarotes;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.camarote_entries;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.box_office_reports;

-- 3. Apply Strict RLS Policies
-- ticket_batches
CREATE POLICY "Enable insert for admins" ON public.ticket_batches FOR INSERT TO authenticated WITH CHECK (public.is_admin_or_manager());
CREATE POLICY "Enable update for admins" ON public.ticket_batches FOR UPDATE TO authenticated USING (public.is_admin_or_manager()) WITH CHECK (public.is_admin_or_manager());
CREATE POLICY "Enable delete for admins" ON public.ticket_batches FOR DELETE TO authenticated USING (public.is_admin_or_manager());

-- complimentary_tickets
CREATE POLICY "Enable insert for authenticated users" ON public.complimentary_tickets FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Enable update for admins" ON public.complimentary_tickets FOR UPDATE TO authenticated USING (public.is_admin_or_manager()) WITH CHECK (public.is_admin_or_manager());
CREATE POLICY "Enable delete for admins" ON public.complimentary_tickets FOR DELETE TO authenticated USING (public.is_admin_or_manager());

-- camarotes
CREATE POLICY "Enable insert for admins" ON public.camarotes FOR INSERT TO authenticated WITH CHECK (public.is_admin_or_manager());
CREATE POLICY "Enable update for admins" ON public.camarotes FOR UPDATE TO authenticated USING (public.is_admin_or_manager()) WITH CHECK (public.is_admin_or_manager());
CREATE POLICY "Enable delete for admins" ON public.camarotes FOR DELETE TO authenticated USING (public.is_admin_or_manager());

-- camarote_entries
CREATE POLICY "Enable insert for authenticated users" ON public.camarote_entries FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Enable update for admins" ON public.camarote_entries FOR UPDATE TO authenticated USING (public.is_admin_or_manager()) WITH CHECK (public.is_admin_or_manager());
CREATE POLICY "Enable delete for admins" ON public.camarote_entries FOR DELETE TO authenticated USING (public.is_admin_or_manager());

-- box_office_reports
CREATE POLICY "Enable insert for admins" ON public.box_office_reports FOR INSERT TO authenticated WITH CHECK (public.is_admin_or_manager());
CREATE POLICY "Enable update for admins" ON public.box_office_reports FOR UPDATE TO authenticated USING (public.is_admin_or_manager()) WITH CHECK (public.is_admin_or_manager());
CREATE POLICY "Enable delete for admins" ON public.box_office_reports FOR DELETE TO authenticated USING (public.is_admin_or_manager());

-- 4. Secure RPC Functions with search_path and Role Validation

-- consume_bracelet (Anyone authenticated can consume)
CREATE OR REPLACE FUNCTION consume_bracelet(p_event_date DATE)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_batch_id UUID;
    v_updated_batch_id UUID;
BEGIN
    SELECT id INTO v_batch_id
    FROM public.ticket_batches
    WHERE event_date = p_event_date AND status = 'active'
    ORDER BY created_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED;

    IF v_batch_id IS NULL THEN
        RAISE EXCEPTION 'No active ticket batches available for the specified date.';
    END IF;

    UPDATE public.ticket_batches
    SET consumed_quantity = consumed_quantity + 1
    WHERE id = v_batch_id
    RETURNING id INTO v_updated_batch_id;

    UPDATE public.ticket_batches
    SET status = 'exhausted'
    WHERE id = v_updated_batch_id AND consumed_quantity = total_quantity;

    RETURN v_updated_batch_id;
END;
$$;

-- approve_complimentary_ticket (Admin only)
CREATE OR REPLACE FUNCTION approve_complimentary_ticket(
    p_ticket_id UUID,
    p_status VARCHAR,
    p_approved_by UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT public.is_admin_or_manager() THEN
        RAISE EXCEPTION 'Acesso negado: Apenas administradores ou gerentes podem aprovar ou reprovar cortesias.';
    END IF;

    IF p_status NOT IN ('approved', 'rejected') THEN
        RAISE EXCEPTION 'Invalid status. Must be approved or rejected.';
    END IF;

    UPDATE public.complimentary_tickets
    SET status = p_status,
        approved_by = p_approved_by,
        updated_at = NOW()
    WHERE id = p_ticket_id AND status = 'pending';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Ticket not found or not in pending status.';
    END IF;
END;
$$;

-- register_camarote_entry (Anyone authenticated can register)
CREATE OR REPLACE FUNCTION register_camarote_entry(
    p_camarote_id UUID,
    p_customer_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_current_count INT;
    v_capacity INT;
BEGIN
    SELECT capacity INTO v_capacity
    FROM public.camarotes
    WHERE id = p_camarote_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Camarote not found.';
    END IF;

    SELECT COUNT(*) INTO v_current_count
    FROM public.camarote_entries
    WHERE camarote_id = p_camarote_id AND is_extra = FALSE;

    IF v_current_count >= v_capacity THEN
        RAISE EXCEPTION 'Camarote capacity reached. Extra entry requires admin authorization.';
    END IF;

    INSERT INTO public.camarote_entries (camarote_id, customer_id, is_extra)
    VALUES (p_camarote_id, p_customer_id, FALSE);
END;
$$;

-- register_extra_camarote_entry (Admin only)
CREATE OR REPLACE FUNCTION register_extra_camarote_entry(
    p_camarote_id UUID,
    p_customer_id UUID,
    p_authorized_by UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT public.is_admin_or_manager() THEN
        RAISE EXCEPTION 'Acesso negado: Apenas administradores ou gerentes podem autorizar entradas extras.';
    END IF;

    INSERT INTO public.camarote_entries (camarote_id, customer_id, is_extra, authorized_by)
    VALUES (p_camarote_id, p_customer_id, TRUE, p_authorized_by);
END;
$$;

-- close_box_office (Admin only)
CREATE OR REPLACE FUNCTION close_box_office(
    p_event_date DATE,
    p_closed_by UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_total_bracelets INT := 0;
    v_total_revenue DECIMAL(10, 2) := 0;
    v_total_complimentary INT := 0;
    v_report_id UUID;
    v_snapshot JSONB;
BEGIN
    IF NOT public.is_admin_or_manager() THEN
        RAISE EXCEPTION 'Acesso negado: Apenas administradores ou gerentes podem encerrar a bilheteria.';
    END IF;

    IF EXISTS (SELECT 1 FROM public.box_office_reports WHERE event_date = p_event_date) THEN
        RAISE EXCEPTION 'Box office already closed for this date.';
    END IF;

    SELECT COALESCE(SUM(consumed_quantity), 0),
           COALESCE(SUM(consumed_quantity * price), 0)
    INTO v_total_bracelets, v_total_revenue
    FROM public.ticket_batches
    WHERE event_date = p_event_date;

    SELECT COUNT(*)
    INTO v_total_complimentary
    FROM public.complimentary_tickets
    WHERE event_date = p_event_date AND status = 'approved';

    v_snapshot := jsonb_build_object(
        'ticket_batches', (SELECT jsonb_agg(row_to_json(tb)) FROM public.ticket_batches tb WHERE event_date = p_event_date),
        'total_bracelets', v_total_bracelets,
        'total_revenue', v_total_revenue,
        'total_complimentary', v_total_complimentary,
        'closed_by', p_closed_by,
        'closed_at', NOW()
    );

    UPDATE public.ticket_batches
    SET status = 'closed'
    WHERE event_date = p_event_date AND status IN ('active', 'exhausted');

    INSERT INTO public.box_office_reports (
        event_date,
        closed_by,
        total_bracelets_sold,
        total_revenue,
        total_complimentary,
        snapshot_data
    ) VALUES (
        p_event_date,
        p_closed_by,
        v_total_bracelets,
        v_total_revenue,
        v_total_complimentary,
        v_snapshot
    ) RETURNING id INTO v_report_id;

    RETURN v_report_id;
END;
$$;
