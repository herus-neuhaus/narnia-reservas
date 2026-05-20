import { createClient } from '@/lib/supabase/client';
import { addMonths, format } from 'date-fns';

const supabase = createClient();

export async function fetchBlacklistEntries() {
  const { data, error } = await supabase
    .from('blacklist')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function addEntryToBlacklist(params: {
  cpf: string;
  name: string;
  reason: string;
  duration: string;
}) {
  const months = parseInt(params.duration);
  const end = months === 0 
    ? format(addMonths(new Date(), 1200), 'yyyy-MM-dd') // 100 years = Permanent
    : format(addMonths(new Date(), months), 'yyyy-MM-dd');

  const cleanCpf = params.cpf.replace(/\D/g, '');

  const { error } = await supabase
    .from('blacklist')
    .insert([{
      cpf: cleanCpf,
      name: params.name,
      reason: params.reason,
      end_date: end
    }]);

  if (error) throw error;
}

export async function removeEntryFromBlacklist(id: string) {
  const { error } = await supabase
    .from('blacklist')
    .delete()
    .eq('id', id);

  if (error) throw error;
}
