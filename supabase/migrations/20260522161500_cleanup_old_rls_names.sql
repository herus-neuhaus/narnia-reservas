-- Drop the lingering old policies that had slightly different names

DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.complimentary_tickets;
DROP POLICY IF EXISTS "Enable update for admins" ON public.complimentary_tickets;
DROP POLICY IF EXISTS "Enable delete for admins" ON public.complimentary_tickets;

DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.camarote_entries;
DROP POLICY IF EXISTS "Enable update for admins" ON public.camarote_entries;
DROP POLICY IF EXISTS "Enable delete for admins" ON public.camarote_entries;
