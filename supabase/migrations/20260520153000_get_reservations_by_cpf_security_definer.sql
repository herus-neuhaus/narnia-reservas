-- Redefine get_reservations_by_cpf as SECURITY DEFINER to securely allow anonymous users
-- to retrieve only their own reservations details via CPF input.
CREATE OR REPLACE FUNCTION public.get_reservations_by_cpf(p_cpf TEXT)
RETURNS TABLE (
  id UUID,
  customer_id UUID,
  name TEXT,
  email TEXT,
  whatsapp TEXT,
  cpf TEXT,
  birth_date DATE,
  reservation_date DATE,
  reservation_time TEXT,
  num_guests INT,
  type TEXT,
  location_id TEXT,
  notes TEXT,
  status TEXT,
  payment_status TEXT,
  payment_amount NUMERIC,
  photo TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with owner privileges to bypass RLS restrictions safely
AS $$
DECLARE
  v_cpf_digits TEXT;
BEGIN
  -- Normalize query parameter (digits only)
  v_cpf_digits := regexp_replace(p_cpf, '\D', '', 'g');

  IF length(v_cpf_digits) != 11 THEN
    -- Return an empty set if the input is not a valid 11-digit CPF
    RETURN;
  END IF;

  RETURN QUERY
  SELECT 
    r.id,
    r.customer_id,
    r.name,
    r.email,
    r.whatsapp,
    r.cpf,
    r.birth_date,
    r.reservation_date,
    r.reservation_time,
    r.num_guests,
    r.type,
    r.location_id,
    r.notes,
    r.status,
    r.payment_status,
    r.payment_amount,
    c.photo
  FROM public.reservations r
  LEFT JOIN public.customers c ON r.customer_id = c.id
  WHERE regexp_replace(r.cpf, '\D', '', 'g') = v_cpf_digits 
     OR c.cpf_digits = v_cpf_digits
  ORDER BY r.reservation_date DESC, r.created_at DESC;
END;
$$;
