import { createClient } from '@/lib/supabase/client';
import { Database } from '@/lib/supabase/database.types';

const supabase = createClient();

/**
 * Solicita a criação de uma cortesia para aprovação.
 */
export async function requestComplimentaryTicket(params: {
  cpf: string;
  name: string;
  whatsapp: string;
  birthDate: string;
  notes: string;
  eventDate: string;
}) {
  const { data, error } = await supabase.rpc('request_complimentary_ticket', {
    p_cpf: params.cpf,
    p_name: params.name,
    p_whatsapp: params.whatsapp,
    p_birth_date: params.birthDate || null,
    p_notes: params.notes,
    p_event_date: params.eventDate
  });

  if (error) throw new Error(`Erro ao solicitar cortesia: ${error.message}`);
  
  const parsed = typeof data === 'string' ? JSON.parse(data) : data;
  if (parsed && parsed.success === false) {
    throw new Error(parsed.message || 'Erro desconhecido ao solicitar cortesia');
  }
  
  return parsed;
}

/**
 * Lista todas as cortesias solicitadas para a data especificada.
 */
export async function fetchComplimentaryTickets(eventDate: string) {
  const { data, error } = await supabase
    .from('complimentary_tickets')
    .select(`
      *,
      customers (id, name, cpf, photo, whatsapp),
      requested_by_user:team_members!complimentary_tickets_requested_by_fkey (id, name),
      approved_by_user:team_members!complimentary_tickets_approved_by_fkey (id, name)
    `)
    .eq('event_date', eventDate)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Erro ao buscar histórico de cortesias: ${error.message}`);
  return data || [];
}

/**
 * Aprova ou reprova a solicitação de cortesia de forma atômica utilizando RPC.
 * Dispara erro do banco caso a cortesia não esteja mais em status 'pending'.
 */
export async function updateComplimentaryStatus(ticketId: string, status: 'approved' | 'rejected') {
  const { data, error } = await supabase
    .rpc('approve_complimentary_ticket', {
      p_ticket_id: ticketId,
      p_status: status
    });

  if (error) {
    const actionName = status === 'approved' ? 'aprovar' : 'reprovar';
    throw new Error(`Erro ao ${actionName} cortesia: ${error.message}`);
  }
  
  const parsed = typeof data === 'string' ? JSON.parse(data) : data;
  if (parsed && parsed.success === false) {
    const actionName = status === 'approved' ? 'aprovar' : 'reprovar';
    throw new Error(`Erro ao ${actionName} cortesia: ${parsed.message}`);
  }
}

export async function deleteComplimentaryTicket(ticketId: string) {
  const { error } = await supabase
    .from('complimentary_tickets')
    .delete()
    .eq('id', ticketId);

  if (error) throw new Error(`Erro ao excluir cortesia: ${error.message}`);
}

export async function updateComplimentaryNotes(ticketId: string, notes: string) {
  const { error } = await supabase
    .from('complimentary_tickets')
    .update({ notes })
    .eq('id', ticketId);

  if (error) throw new Error(`Erro ao atualizar cortesia: ${error.message}`);
}

export async function validateComplimentaryEntry(customerId: string, eventDate: string) {
  const { data, error } = await supabase.rpc('validate_complimentary_entry', {
    p_customer_id: customerId,
    p_event_date: eventDate
  });

  if (error) throw new Error(`Erro ao validar entrada: ${error.message}`);
  
  const parsed = typeof data === 'string' ? JSON.parse(data) : data;
  if (parsed && parsed.success === false) {
    throw new Error(parsed.message || 'Erro desconhecido ao validar entrada.');
  }

  return parsed;
}
