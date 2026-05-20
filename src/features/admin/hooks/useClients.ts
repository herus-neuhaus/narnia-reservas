import { useState, useEffect, useMemo } from 'react';
import { clientsService } from '../services/clients.service';
import { ClientRecord } from '../types/clients.types';

/** Strips accents and lowercases – enables accent-insensitive search */
const normalize = (str: string) =>
  str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export function useClients() {
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  // States for filtering & sorting
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'blacklisted' | 'frequent'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'reservations' | 'last_entry'>('reservations');

  const fetchClientsData = async () => {
    setLoading(true);
    setError(null);
    try {
      const clientRecords = await clientsService.fetchAllClients();
      setClients(clientRecords);
    } catch (err: any) {
      console.error('Error fetching clients:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchClientsData();
  }, []);

  const filteredAndSortedClients = useMemo(() => {
    const cleanSearch = searchTerm.replace(/\D/g, '');
    
    return clients.filter(c => {
      // Search
      const matchesName = normalize(c.name).includes(normalize(searchTerm));
      const matchesCpf = cleanSearch ? c.cpf.replace(/\D/g, '').includes(cleanSearch) : false;
      const matchesWhatsapp = cleanSearch ? c.whatsapp.replace(/\D/g, '').includes(cleanSearch) : false;

      const matchesSearch = matchesName || matchesCpf || matchesWhatsapp;

      if (!matchesSearch) return false;

      // Filter type
      if (filterType === 'blacklisted') return c.isBlacklisted;
      if (filterType === 'frequent') {
        const entryCount = c.reservations.filter(r => r.check_in_status === 'entered').length;
        return entryCount >= 2;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      }
      if (sortBy === 'reservations') {
        return b.reservations.length - a.reservations.length;
      }
      if (sortBy === 'last_entry') {
        const lastA = a.reservations.find(r => r.check_in_status === 'entered')?.reservation_date || '1970-01-01';
        const lastB = b.reservations.find(r => r.check_in_status === 'entered')?.reservation_date || '1970-01-01';
        return lastB.localeCompare(lastA);
      }
      return 0;
    });
  }, [clients, searchTerm, filterType, sortBy]);

  return {
    clients,
    filteredClients: filteredAndSortedClients,
    loading,
    error,
    searchTerm,
    setSearchTerm,
    filterType,
    setFilterType,
    sortBy,
    setSortBy,
    refetch: fetchClientsData
  };
}
