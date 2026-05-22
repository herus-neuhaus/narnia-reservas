-- 1. Modify Ticket Batches Schema
ALTER TABLE public.ticket_batches DROP CONSTRAINT IF EXISTS ticket_batches_status_check;
ALTER TABLE public.ticket_batches ADD CONSTRAINT ticket_batches_status_check CHECK (status IN ('draft', 'active', 'exhausted', 'closed'));

ALTER TABLE public.ticket_batches ADD COLUMN IF NOT EXISTS batch_order INT NOT NULL DEFAULT 1;

-- Ensure at most 1 active batch per event_date
DROP INDEX IF EXISTS idx_one_active_batch_per_date;
CREATE UNIQUE INDEX idx_one_active_batch_per_date ON public.ticket_batches (event_date) WHERE status = 'active';

-- 2. Update consume_bracelet RPC to return JSONB and auto-rotate
DROP FUNCTION IF EXISTS consume_bracelet(DATE);
CREATE OR REPLACE FUNCTION consume_bracelet(p_event_date DATE)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_active_batch RECORD;
    v_next_batch RECORD;
    v_new_active_id UUID := NULL;
    v_status VARCHAR := 'active';
BEGIN
    -- Find and lock the currently active batch
    SELECT * INTO v_active_batch
    FROM public.ticket_batches
    WHERE event_date = p_event_date AND status = 'active'
    FOR UPDATE;

    IF v_active_batch IS NULL THEN
        RAISE EXCEPTION 'Nenhum lote ativo disponível para esta data.';
    END IF;

    IF v_active_batch.consumed_quantity >= v_active_batch.total_quantity THEN
        RAISE EXCEPTION 'Lote atual já está esgotado.';
    END IF;

    -- Consume 1 ticket
    UPDATE public.ticket_batches
    SET consumed_quantity = consumed_quantity + 1
    WHERE id = v_active_batch.id;

    v_active_batch.consumed_quantity := v_active_batch.consumed_quantity + 1;
    v_new_active_id := v_active_batch.id;

    -- If the batch just got exhausted, rotate to the next one
    IF v_active_batch.consumed_quantity >= v_active_batch.total_quantity THEN
        UPDATE public.ticket_batches
        SET status = 'exhausted'
        WHERE id = v_active_batch.id;
        v_status := 'exhausted';

        -- Find the next available batch
        SELECT * INTO v_next_batch
        FROM public.ticket_batches
        WHERE event_date = p_event_date AND status = 'draft' AND batch_order > v_active_batch.batch_order
        ORDER BY batch_order ASC
        LIMIT 1
        FOR UPDATE;

        IF v_next_batch IS NOT NULL THEN
            UPDATE public.ticket_batches
            SET status = 'active'
            WHERE id = v_next_batch.id;
            v_new_active_id := v_next_batch.id;
        ELSE
            -- No next batch available
            v_new_active_id := NULL;
        END IF;
    END IF;

    RETURN jsonb_build_object(
        'consumed_batch_id', v_active_batch.id,
        'consumed_batch_name', v_active_batch.name,
        'price', v_active_batch.price,
        'current_active_batch_id', v_new_active_id,
        'previous_batch_status', v_status
    );
END;
$$;

-- 3. Create activate_ticket_batch RPC
CREATE OR REPLACE FUNCTION activate_ticket_batch(p_batch_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_target_batch RECORD;
    v_active_batch RECORD;
BEGIN
    IF NOT public.is_admin_or_manager() THEN
        RAISE EXCEPTION 'Acesso negado: Apenas administradores ou gerentes podem ativar lotes manualmente.';
    END IF;

    SELECT * INTO v_target_batch
    FROM public.ticket_batches
    WHERE id = p_batch_id
    FOR UPDATE;

    IF v_target_batch IS NULL THEN
        RAISE EXCEPTION 'Lote não encontrado.';
    END IF;

    IF v_target_batch.status = 'closed' THEN
        RAISE EXCEPTION 'Não é possível ativar um lote de uma bilheteria já encerrada.';
    END IF;

    -- Find currently active batch for the same date
    SELECT * INTO v_active_batch
    FROM public.ticket_batches
    WHERE event_date = v_target_batch.event_date AND status = 'active' AND id != p_batch_id
    FOR UPDATE;

    IF v_active_batch IS NOT NULL THEN
        -- Decide whether to put it as exhausted or draft
        IF v_active_batch.consumed_quantity >= v_active_batch.total_quantity THEN
            UPDATE public.ticket_batches SET status = 'exhausted' WHERE id = v_active_batch.id;
        ELSE
            UPDATE public.ticket_batches SET status = 'draft' WHERE id = v_active_batch.id;
        END IF;
    END IF;

    -- Activate the target batch
    UPDATE public.ticket_batches
    SET status = 'active'
    WHERE id = p_batch_id;
END;
$$;
