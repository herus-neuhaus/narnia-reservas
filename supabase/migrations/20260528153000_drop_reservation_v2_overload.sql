-- Remove a versão sobrecarregada com 13 parâmetros que causa ambiguidade (p_event_id)
DROP FUNCTION IF EXISTS public.create_reservation_v2(
  TEXT, TEXT, TEXT, TEXT, DATE, DATE, TEXT, INTEGER, TEXT, TEXT, TEXT, TIMESTAMP WITH TIME ZONE, UUID
);
