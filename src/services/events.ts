import { createClient } from '@/lib/supabase/client';
import { format, startOfToday } from 'date-fns';

const supabase = createClient();

export async function fetchAllEvents() {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .order('event_date', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function fetchUpcomingEvents() {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .gte('event_date', format(startOfToday(), 'yyyy-MM-dd'))
    .order('event_date', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function deleteEventById(id: string) {
  const { error } = await supabase
    .from('events')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function updateEventListLimitTime(id: string, listLimitTime: string) {
  const { error } = await supabase
    .from('events')
    .update({ list_limit_time: listLimitTime })
    .eq('id', id);

  if (error) throw error;
}

export async function updateEventListLimitCapacity(id: string, capacity: number | null) {
  const { error } = await supabase
    .from('events')
    .update({ list_limit_capacity: capacity })
    .eq('id', id);

  if (error) throw error;
}

export async function updateEventVisibleFrom(id: string, visibleFrom: string | null) {
  const { error } = await supabase
    .from('events')
    .update({ visible_from: visibleFrom })
    .eq('id', id);

  if (error) throw error;
}

export async function uploadEventFlyer(file: File) {
  const fileExt = file.name.split('.').pop();
  const fileName = `${Math.random()}.${fileExt}`;
  const filePath = `covers/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('flyers')
    .upload(filePath, file);

  if (uploadError) throw uploadError;

  const { data: { publicUrl } } = supabase.storage
    .from('flyers')
    .getPublicUrl(filePath);

  return publicUrl;
}
