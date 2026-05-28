import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

/**
 * Busca camarotes criados para o evento e detalha sua ocupação (entradas registradas).
 */
export async function fetchCamarotesWithOccupation(eventId: string) {
  const { data, error } = await supabase
    .from('camarotes')
    .select(`
      *,
      owner:customers!camarotes_owner_customer_id_fkey (id, name, photo),
      entries:camarote_entries (
        id, 
        is_extra, 
        entered_at,
        customer:customers!camarote_entries_customer_id_fkey (id, name, photo, cpf),
        authorized_by_user:team_members!camarote_entries_authorized_by_fkey (id, name)
      )
    `)
    .eq('event_id', eventId)
    .order('name', { ascending: true });

  if (error) throw new Error(`Erro ao buscar dados de camarote: ${error.message}`);
  return data || [];
}

export async function registerCamaroteEntry(params: {
  camaroteId: string;
  cpf: string;
  name: string;
  whatsapp?: string;
  birthDate?: string;
}) {
  const { data, error } = await supabase.rpc('register_camarote_guest_entry', {
    p_camarote_id: params.camaroteId,
    p_cpf: params.cpf,
    p_name: params.name,
    p_whatsapp: params.whatsapp || null,
    p_birth_date: params.birthDate || null
  });

  if (error) throw new Error(`Erro ao registrar entrada no camarote: ${error.message}`);
  
  const parsed = typeof data === 'string' ? JSON.parse(data) : data;
  if (parsed && parsed.success === false) {
    throw new Error(parsed.message || 'Erro desconhecido.');
  }
  return parsed;
}

export async function registerExtraCamaroteEntry(params: {
  camaroteId: string;
  cpf: string;
  name: string;
  whatsapp?: string;
  birthDate?: string;
}) {
  const { data, error } = await supabase.rpc('authorize_camarote_extra_entry', {
    p_camarote_id: params.camaroteId,
    p_cpf: params.cpf,
    p_name: params.name,
    p_whatsapp: params.whatsapp || null,
    p_birth_date: params.birthDate || null
  });

  if (error) throw new Error(`Erro ao liberar entrada extra no camarote: ${error.message}`);
  
  const parsed = typeof data === 'string' ? JSON.parse(data) : data;
  if (parsed && parsed.success === false) {
    throw new Error(parsed.message || 'Erro desconhecido.');
  }
  return parsed;
}
