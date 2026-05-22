-- Enable Supabase Realtime for operational tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.complimentary_tickets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ticket_batches;
ALTER PUBLICATION supabase_realtime ADD TABLE public.camarote_entries;
ALTER PUBLICATION supabase_realtime ADD TABLE public.box_office_reports;
ALTER PUBLICATION supabase_realtime ADD TABLE public.reservations;
