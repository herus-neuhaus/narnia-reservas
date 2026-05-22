-- Trigger to sync camarote owner check-in with camarote_entries table

CREATE OR REPLACE FUNCTION public.sync_camarote_owner_entry()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_camarote_id uuid;
BEGIN
  -- Se o check-in for de camarote e passou para 'entered'
  IF NEW.type = 'camarote' AND NEW.check_in_status = 'entered' AND (OLD.check_in_status IS NULL OR OLD.check_in_status != 'entered') THEN
    
    -- Descobrir o camarote usando o location_id (que armazena o nome, ex: 'C1')
    SELECT id INTO v_camarote_id 
    FROM public.camarotes 
    WHERE name = NEW.location_id AND event_date = NEW.reservation_date
    LIMIT 1;
    
    IF v_camarote_id IS NOT NULL THEN
      -- Inserir em camarote_entries para contabilizar a entrada
      -- ON CONFLICT DO NOTHING garante que se já existir não duplique.
      INSERT INTO public.camarote_entries (camarote_id, customer_id, entered_at, is_extra)
      VALUES (v_camarote_id, NEW.customer_id, COALESCE(NEW.entered_at, NOW() AT TIME ZONE 'America/Porto_Velho'), false)
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_sync_camarote_owner_entry ON public.reservations;
CREATE TRIGGER trg_sync_camarote_owner_entry
  AFTER UPDATE OF check_in_status ON public.reservations
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_camarote_owner_entry();
