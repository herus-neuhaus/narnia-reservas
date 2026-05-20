import { createClient } from '@/lib/supabase/client';
import { Database } from '@/lib/supabase/database.types';

export type ReservationRow = Database['public']['Tables']['reservations']['Row'] & { customers?: any };

const supabase = createClient();

export async function fetchReservationsByDateRange(startDate: string, endDate: string) {
  const { data, error } = await supabase
    .from('reservations')
    .select('*, customers(*)')
    .gte('reservation_date', startDate)
    .lte('reservation_date', endDate)
    .order('reservation_date', { ascending: true })
    .order('reservation_time', { ascending: true });

  if (error) throw error;
  return (data || []).map((res: any) => ({
    ...res,
    name: res.customers?.name || res.name,
    cpf: res.customers?.cpf || res.cpf,
    whatsapp: res.customers?.whatsapp || res.whatsapp,
    photo: res.customers?.photo || res.photo
  }));
}

export async function fetchTodaysReservations(today: string) {
  const { data, error } = await supabase
    .from('reservations')
    .select('*, customers(*)')
    .eq('reservation_date', today);

  if (error) throw error;

  return (data || []).map((res: any) => ({
    ...res,
    name: res.customers?.name || res.name,
    cpf: res.customers?.cpf || res.cpf,
    whatsapp: res.customers?.whatsapp || res.whatsapp,
    photo: res.customers?.photo || res.photo
  })).sort((a: any, b: any) => {
    const nameA = a.name || '';
    const nameB = b.name || '';
    return nameA.localeCompare(nameB);
  });
}

export async function getReservationsByCpfRpc(cpf: string) {
  const cleanCpf = cpf.replace(/\D/g, '');
  const { data, error } = await supabase
    .rpc('get_reservations_by_cpf', { p_cpf: cleanCpf });
  if (error) throw error;
  return data || [];
}

/** Fetches name, whatsapp, birth_date and email for form auto-fill.
 *  Uses the SECURITY DEFINER RPC `get_customer_by_cpf` so it works
 *  for anonymous (unauthenticated) users without RLS issues. */
export async function getCustomerByCpf(cpf: string): Promise<{
  name: string;
  whatsapp: string;
  birth_date: string | null;
  email: string;
  photo: string | null;
} | null> {
  const cleanCpf = cpf.replace(/\D/g, '');
  if (cleanCpf.length !== 11) return null;

  const { data, error } = await supabase
    .rpc('get_customer_by_cpf', { p_cpf: cleanCpf });

  if (error) {
    console.error('[getCustomerByCpf] RPC error:', error);
    return null;
  }
  return data && data.length > 0 ? data[0] : null;
}

export async function updateReservationStatus(id: string, status: string) {
  const { error } = await supabase
    .from('reservations')
    .update({ status })
    .eq('id', id);
  if (error) throw error;
}

export async function createReservationAtomic(params: {
  cpf: string;
  name: string;
  email: string;
  whatsapp: string;
  birthDate: string;
  date: string;
  time: string;
  guests: number;
  type: string;
  locationId: string;
  notes: string;
  expiresAt: string | null;
}) {
  const { data, error } = await supabase.rpc('create_reservation_v2', {
    p_cpf: params.cpf,
    p_name: params.name,
    p_email: params.email || '',
    p_whatsapp: params.whatsapp,
    p_birth_date: params.birthDate,
    p_date: params.date,
    p_time: params.time || '22:00',
    p_guests: params.guests,
    p_type: params.type,
    p_location_id: params.locationId || '',
    p_notes: params.notes,
    p_expires_at: params.expiresAt
  });

  if (error) throw error;
  return typeof data === 'string' ? JSON.parse(data) : data;
}

export async function fetchFullyBookedDates() {
  const { data, error } = await supabase
    .rpc('get_fully_booked_dates');
  if (error) throw error;
  return (data || []).map((d: any) => d.reservation_date);
}

export async function fetchReservedLocations(date: string) {
  const { data, error } = await supabase
    .rpc('get_reserved_locations', { p_date: date });
  if (error) throw error;
  return (data || []).map((r: any) => r.location_id);
}

export async function updateCheckInStatusWithPhoto(id: string, newStatus: string, enteredAt: string | null, photoBase64: string | null, customerId: string | null) {
  const updateData: any = { 
    check_in_status: newStatus,
    entered_at: enteredAt
  };

  if (photoBase64) {
    updateData.photo = photoBase64;
    if (customerId) {
      await supabase
        .from('customers')
        .update({ photo: photoBase64 })
        .eq('id', customerId);
    }
  }

  const { error } = await supabase
    .from('reservations')
    .update(updateData)
    .eq('id', id);

  if (error) throw error;
  return updateData;
}

export async function fetchCustomerPhoto(customerId: string) {
  const { data, error } = await supabase
    .from('customers')
    .select('photo')
    .eq('id', customerId)
    .maybeSingle();

  if (error) throw error;
  return data?.photo || null;
}
