import { createClient } from '@/lib/supabase/client';

export async function updateCustomerDetails(id: string, data: { name: string; whatsapp: string; birth_date: string }) {
  const supabase = createClient();

  if (!id) throw new Error('ID do cliente não fornecido.');

  // 1. Update customers table
  const { error: updateError } = await supabase
    .from('customers')
    .update({
      name: data.name,
      whatsapp: data.whatsapp,
      birth_date: data.birth_date
    })
    .eq('id', id);

  if (updateError) throw updateError;

  // 2. Update reservations table (current and future)
  const today = new Date().toISOString().split('T')[0];
  const { error: resvError } = await supabase
    .from('reservations')
    .update({
      name: data.name,
      whatsapp: data.whatsapp,
      birth_date: data.birth_date
    })
    .eq('customer_id', id)
    .gte('reservation_date', today);

  if (resvError) throw resvError;

  return true;
}
