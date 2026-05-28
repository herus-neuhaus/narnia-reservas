import { createClient } from '@/lib/supabase/client';
import { Database } from '@/lib/supabase/database.types';

type TicketBatchInsert = Database['public']['Tables']['ticket_batches']['Insert'];
type TicketBatchUpdate = Database['public']['Tables']['ticket_batches']['Update'];

const supabase = createClient();

/**
 * Busca todos os lotes de ingressos (pulseiras) para um dia/evento específico.
 */
export async function fetchTicketBatches(eventFilter: { eventDate?: string, eventId?: string } | string) {
  let query = supabase.from('ticket_batches').select('*, events(name)');
  
  if (typeof eventFilter === 'string') {
    query = query.eq('event_date', eventFilter);
  } else {
    if (eventFilter.eventId) {
      query = query.eq('event_id', eventFilter.eventId);
    } else if (eventFilter.eventDate) {
      query = query.eq('event_date', eventFilter.eventDate);
    }
  }

  const { data, error } = await query
    .order('batch_order', { ascending: true })
    .order('created_at', { ascending: true });
    
  if (error) throw new Error(`Erro ao buscar lotes de pulseiras: ${error.message}`);
  return data || [];
}

/**
 * Cria um novo lote de ingressos.
 */
export async function createTicketBatch(batch: Omit<TicketBatchInsert, 'id' | 'created_at' | 'consumed_quantity'>) {
  const { data, error } = await supabase
    .from('ticket_batches')
    .insert([batch])
    .select()
    .single();

  if (error) throw new Error(`Erro ao criar lote de pulseiras: ${error.message}`);
  return data;
}

/**
 * Atualiza um lote de ingressos (por exemplo, altera nome, preço, quantidade total ou desativa).
 */
export async function updateTicketBatch(id: string, updates: TicketBatchUpdate) {
  const { data, error } = await supabase
    .from('ticket_batches')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(`Erro ao atualizar lote: ${error.message}`);
  return data;
}

export async function deleteTicketBatch(id: string) {
  const { error } = await supabase
    .from('ticket_batches')
    .delete()
    .eq('id', id);

  if (error) throw new Error(`Erro ao excluir lote: ${error.message}`);
}



/**
 * Ativa um lote de ingressos manualmente e desativa o anterior.
 */
export async function activateTicketBatch(batchId: string) {
  const { error } = await supabase
    .rpc('activate_ticket_batch', { p_batch_id: batchId });

  if (error) throw new Error(`Erro ao ativar lote: ${error.message}`);
}

/**
 * Encerra a bilheteria gerando um snapshot dos lotes e cortesias,
 * e calculando receitas totais de forma segura e transacional no BD.
 */
export async function closeBoxOffice(eventId: string) {
  const { data, error } = await supabase
    .rpc('close_box_office', { p_event_id: eventId });

  if (error) throw new Error(`Erro ao encerrar bilheteria: ${error.message}`);
  
  const parsed = typeof data === 'string' ? JSON.parse(data) : data;
  if (parsed && parsed.success === false) {
    throw new Error(parsed.message || 'Erro desconhecido ao encerrar bilheteria.');
  }
  
  return parsed;
}

/**
 * Busca o relatório de fechamento de bilheteria de uma data, se existir.
 */
export async function fetchBoxOfficeReport(eventId: string) {
  const { data, error } = await supabase
    .from('box_office_reports')
    .select(`
      *,
      closed_by_user:team_members!box_office_reports_closed_by_fkey (id, name)
    `)
    .eq('event_id', eventId)
    .maybeSingle();

  if (error) throw new Error(`Erro ao buscar relatório da bilheteria: ${error.message}`);
  return data;
}
