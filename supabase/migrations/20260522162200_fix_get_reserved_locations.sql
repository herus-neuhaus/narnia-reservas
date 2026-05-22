-- Fix reserved locations query to consider check in status and empty strings

CREATE OR REPLACE FUNCTION public.get_reserved_locations(p_date date)
 RETURNS TABLE(location_id text)
 LANGUAGE sql
 SECURITY DEFINER
AS $function$
  SELECT DISTINCT r.location_id
  FROM public.reservations r
  WHERE r.reservation_date = p_date
    AND r.status != 'cancelled'
    AND r.location_id IS NOT NULL
    AND r.location_id != ''
    AND (
      r.status = 'confirmed'
      OR r.check_in_status = 'entered'
      OR r.payment_status != 'pending'
      OR r.created_at >= (NOW() AT TIME ZONE 'America/Porto_Velho') - INTERVAL '10 minutes'
    );
$function$;
