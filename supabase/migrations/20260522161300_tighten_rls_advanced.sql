-- Tighten RLS for advanced portaria tables

-- Drop the overly permissive policies
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.ticket_batches;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.complimentary_tickets;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.camarotes;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.camarote_entries;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.box_office_reports;

-- TICKET BATCHES
CREATE POLICY "Enable all for admins on ticket_batches" 
ON public.ticket_batches FOR ALL TO authenticated 
USING (public.is_admin_or_manager()) 
WITH CHECK (public.is_admin_or_manager());

-- COMPLIMENTARY TICKETS
CREATE POLICY "Enable insert for receptionists" 
ON public.complimentary_tickets FOR INSERT TO authenticated 
WITH CHECK (true);

CREATE POLICY "Enable update for admins on complimentary_tickets" 
ON public.complimentary_tickets FOR UPDATE TO authenticated 
USING (public.is_admin_or_manager()) 
WITH CHECK (public.is_admin_or_manager());

CREATE POLICY "Enable delete for admins on complimentary_tickets" 
ON public.complimentary_tickets FOR DELETE TO authenticated 
USING (public.is_admin_or_manager());

-- CAMAROTES
CREATE POLICY "Enable all for admins on camarotes" 
ON public.camarotes FOR ALL TO authenticated 
USING (public.is_admin_or_manager()) 
WITH CHECK (public.is_admin_or_manager());

-- CAMAROTE ENTRIES
-- We allow insert since normal entry is done by receptionist
CREATE POLICY "Enable insert for all authenticated on camarote_entries" 
ON public.camarote_entries FOR INSERT TO authenticated 
WITH CHECK (true);

CREATE POLICY "Enable all for admins on camarote_entries" 
ON public.camarote_entries FOR ALL TO authenticated 
USING (public.is_admin_or_manager()) 
WITH CHECK (public.is_admin_or_manager());

-- BOX OFFICE REPORTS
CREATE POLICY "Enable all for admins on box_office_reports" 
ON public.box_office_reports FOR ALL TO authenticated 
USING (public.is_admin_or_manager()) 
WITH CHECK (public.is_admin_or_manager());
