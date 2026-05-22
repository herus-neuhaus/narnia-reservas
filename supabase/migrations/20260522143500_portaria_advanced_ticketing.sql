-- 1. Create Tables
CREATE TABLE IF NOT EXISTS public.ticket_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_date DATE NOT NULL,
    event_id UUID REFERENCES public.events(id),
    name VARCHAR(255) NOT NULL,
    price DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
    total_quantity INT NOT NULL CHECK (total_quantity > 0),
    consumed_quantity INT NOT NULL DEFAULT 0 CHECK (consumed_quantity >= 0 AND consumed_quantity <= total_quantity),
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'exhausted', 'closed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.complimentary_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES public.customers(id),
    event_date DATE NOT NULL,
    event_id UUID REFERENCES public.events(id),
    requested_by UUID REFERENCES public.team_members(id),
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    approved_by UUID REFERENCES public.team_members(id),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.camarotes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_date DATE NOT NULL,
    name VARCHAR(50) NOT NULL,
    capacity INT NOT NULL DEFAULT 12 CHECK (capacity > 0),
    owner_customer_id UUID REFERENCES public.customers(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (event_date, name)
);

CREATE TABLE IF NOT EXISTS public.camarote_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    camarote_id UUID NOT NULL REFERENCES public.camarotes(id),
    customer_id UUID NOT NULL REFERENCES public.customers(id),
    is_extra BOOLEAN NOT NULL DEFAULT FALSE,
    authorized_by UUID REFERENCES public.team_members(id),
    entered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (camarote_id, customer_id)
);

CREATE TABLE IF NOT EXISTS public.box_office_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_date DATE NOT NULL UNIQUE,
    closed_by UUID NOT NULL REFERENCES public.team_members(id),
    total_bracelets_sold INT NOT NULL CHECK (total_bracelets_sold >= 0),
    total_revenue DECIMAL(10, 2) NOT NULL CHECK (total_revenue >= 0),
    total_complimentary INT NOT NULL CHECK (total_complimentary >= 0),
    snapshot_data JSONB NOT NULL,
    closed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Create Indexes
CREATE INDEX IF NOT EXISTS idx_ticket_batches_event_date ON public.ticket_batches(event_date);
CREATE INDEX IF NOT EXISTS idx_ticket_batches_status ON public.ticket_batches(status);
CREATE INDEX IF NOT EXISTS idx_complimentary_tickets_event_date ON public.complimentary_tickets(event_date);
CREATE INDEX IF NOT EXISTS idx_complimentary_tickets_status ON public.complimentary_tickets(status);
CREATE INDEX IF NOT EXISTS idx_camarotes_event_date ON public.camarotes(event_date);
CREATE INDEX IF NOT EXISTS idx_camarote_entries_camarote_id ON public.camarote_entries(camarote_id);

-- 3. Prepare RLS / Policies
ALTER TABLE public.ticket_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complimentary_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.camarotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.camarote_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.box_office_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read for authenticated users" ON public.ticket_batches FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable all for authenticated users" ON public.ticket_batches FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Enable read for authenticated users" ON public.complimentary_tickets FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable all for authenticated users" ON public.complimentary_tickets FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Enable read for authenticated users" ON public.camarotes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable all for authenticated users" ON public.camarotes FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Enable read for authenticated users" ON public.camarote_entries FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable all for authenticated users" ON public.camarote_entries FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Enable read for authenticated users" ON public.box_office_reports FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable all for authenticated users" ON public.box_office_reports FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 4. RPCs

-- Consume 1 bracelet from active batch
CREATE OR REPLACE FUNCTION consume_bracelet(p_event_date DATE)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Approve / Reject Complimentary
CREATE OR REPLACE FUNCTION approve_complimentary_ticket(
    p_ticket_id UUID,
    p_status VARCHAR,
    p_approved_by UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
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

-- Register Camarote Entry (respect limit of 12)
CREATE OR REPLACE FUNCTION register_camarote_entry(
    p_camarote_id UUID,
    p_customer_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Register Extra Camarote Entry
CREATE OR REPLACE FUNCTION register_extra_camarote_entry(
    p_camarote_id UUID,
    p_customer_id UUID,
    p_authorized_by UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.camarote_entries (camarote_id, customer_id, is_extra, authorized_by)
    VALUES (p_camarote_id, p_customer_id, TRUE, p_authorized_by);
END;
$$;

-- Close Box Office (Snapshot)
CREATE OR REPLACE FUNCTION close_box_office(
    p_event_date DATE,
    p_closed_by UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total_bracelets INT := 0;
    v_total_revenue DECIMAL(10, 2) := 0;
    v_total_complimentary INT := 0;
    v_report_id UUID;
    v_snapshot JSONB;
BEGIN
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
