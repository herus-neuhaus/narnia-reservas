import { createClient } from '@/lib/supabase/client';
import { Database } from '@/lib/supabase/database.types';

export type CustomerRow = Database['public']['Tables']['customers']['Row'];
export type ReservationRow = Database['public']['Tables']['reservations']['Row'];

export type ReservationWithCustomer = ReservationRow & {
  customers: CustomerRow | null;
};

export type FormattedReservation = ReservationRow & {
  customers: CustomerRow | null;
  name: string;
  cpf: string | null;
  whatsapp: string;
  photo: string | null;
};

const supabase = createClient();

export async function fetchReservationsByDateRange(startDate: string, endDate: string): Promise<FormattedReservation[]> {
  const { data, error } = await supabase
    .from('reservations')
    .select('*, customers(*)')
    .gte('reservation_date', startDate)
    .lte('reservation_date', endDate)
    .order('reservation_date', { ascending: true })
    .order('reservation_time', { ascending: true });

  if (error) throw error;
  
  // Cast data since PostgREST joins type mapping might not perfectly match our custom type
  const reservations = (data as unknown) as ReservationWithCustomer[];
  
  return reservations.map(res => ({
    ...res,
    name: res.customers?.name || res.name,
    cpf: res.customers?.cpf || res.cpf,
    whatsapp: res.customers?.whatsapp || res.whatsapp,
    photo: res.customers?.photo || res.photo
  }));
}

export async function fetchTodaysReservations(today: string): Promise<FormattedReservation[]> {
  const { data, error } = await supabase
    .from('reservations')
    .select('*, customers(*)')
    .eq('reservation_date', today);

  if (error) throw error;

  const reservations = (data as unknown) as ReservationWithCustomer[];

  return reservations.map(res => ({
    ...res,
    name: res.customers?.name || res.name,
    cpf: res.customers?.cpf || res.cpf,
    whatsapp: res.customers?.whatsapp || res.whatsapp,
    photo: res.customers?.photo || res.photo
  })).sort((a, b) => {
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

export async function updateReservationStatus(id: string, status: string): Promise<void> {
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

export async function fetchFullyBookedDates(): Promise<string[]> {
  const { data, error } = await supabase
    .rpc('get_fully_booked_dates');
  if (error) throw error;
  return (data || []).map((d: any) => d.reservation_date);
}

export async function fetchReservedLocations(date: string): Promise<string[]> {
  // @ts-ignore - Supabase RPC overload typings issue
  const { data, error } = await supabase
    .rpc('get_reserved_locations', { p_date: date });
  if (error) throw error;
  
  // Since the rpc return type might be overloaded or wrong in the generic, we cast
  return ((data as unknown) as Array<{ location_id: string }> || []).map((r) => r.location_id);
}

export async function updateCheckInStatusWithPhoto(id: string, newStatus: string, enteredAt: string | null, photoData: string | null, customerId: string | null) {
  let finalPhotoUrl = null;

  if (photoData) {
    finalPhotoUrl = photoData;
    // Check if it's a base64 image
    if (photoData.startsWith('data:image')) {
      const { uploadCustomerPhoto } = await import('./storage');
      const identifier = customerId || id;
      finalPhotoUrl = await uploadCustomerPhoto(photoData, identifier);
    }
  }

  // Call the new RPC which handles the update AND validation (like list time limits)
  const { data, error } = await supabase.rpc('update_check_in_status_with_photo', {
    p_reservation_id: id,
    p_new_status: newStatus,
    p_photo: finalPhotoUrl
  });

  if (error) {
    // Standard Supabase RPC error
    throw error;
  }

  // Handle custom exceptions raised by the RPC (Postgres RAISE EXCEPTION returns standard error,
  // but if the RPC returned jsonb with { success: false, error: ... } we catch it here)
  if (data && typeof data === 'object' && !data.success) {
    const errorMsg = data.message || data.error || 'Erro ao atualizar check-in.';
    throw new Error(errorMsg);
  }

  return { check_in_status: newStatus, entered_at: enteredAt, photo: finalPhotoUrl };
}

export async function fetchCustomerPhoto(customerId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('customers')
    .select('photo')
    .eq('id', customerId)
    .maybeSingle();

  if (error) throw error;
  return data?.photo || null;
}

export async function registerBraceletEntry(params: {
  cpf: string;
  name: string;
  whatsapp: string;
  birthDate: string;
  photo: string | null;
  eventDate: string;
}) {
  let finalPhotoUrl = params.photo || '';
  
  if (params.photo && params.photo.startsWith('data:image')) {
    const { uploadCustomerPhoto } = await import('./storage');
    // Using CPF as identifier for the photo
    finalPhotoUrl = await uploadCustomerPhoto(params.photo, params.cpf);
  }

  const { data, error } = await supabase.rpc('create_bracelet_entry_v2', {
    p_cpf: params.cpf,
    p_name: params.name,
    p_whatsapp: params.whatsapp,
    p_birth_date: params.birthDate,
    p_photo: finalPhotoUrl,
    p_event_date: params.eventDate
  });

  if (error) throw error;
  return typeof data === 'string' ? JSON.parse(data) : data;
}
