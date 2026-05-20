import { createClient } from '@/lib/supabase/client';
import { ClientRecord } from '../types/clients.types';

export const clientsService = {
  async fetchAllClients(): Promise<ClientRecord[]> {
    const supabase = createClient();
    
    // Fetch all customers with their reservations
    const { data: custData, error: custError } = await supabase
      .from('customers')
      .select('*, reservations(*)')
      .order('name');

    if (custError) throw custError;

    // Fetch blacklist
    const { data: blackData, error: blackError } = await supabase
      .from('blacklist')
      .select('*');

    if (blackError) throw blackError;

    const blacklistMap = new Map<string, any>();
    if (blackData) {
      blackData.forEach(b => {
        if (b.cpf) {
          const cleanCpf = b.cpf.replace(/\D/g, '');
          blacklistMap.set(cleanCpf, b);
        }
      });
    }

    // Construct client records from customers
    const clientRecords: ClientRecord[] = (custData || []).map(c => {
      const cleanCpf = c.cpf ? c.cpf.replace(/\D/g, '') : '';
      const isBlacklisted = blacklistMap.has(cleanCpf);
      const blacklistInfo = blacklistMap.get(cleanCpf) || null;

      // Sort reservations newest first
      const sortedReservations = (c.reservations || []).sort((a: any, b: any) => {
        const dateA = `${a.reservation_date} ${a.reservation_time || '00:00'}`;
        const dateB = `${b.reservation_date} ${b.reservation_time || '00:00'}`;
        return dateB.localeCompare(dateA);
      });

      return {
        cpf: c.cpf || '',
        name: c.name,
        whatsapp: c.whatsapp,
        birth_date: c.birth_date || null,
        reservations: sortedReservations,
        isBlacklisted,
        blacklistInfo,
        photo: c.photo || null
      };
    });

    return clientRecords;
  }
};
