import { useState, useEffect } from 'react';
import { cpf as cpfValidator } from 'cpf-cnpj-validator';
import { 
  fetchFullyBookedDates as fetchFullDatesService, 
  fetchReservedLocations as fetchReservedLocationsService, 
  getReservationsByCpfRpc 
} from '@/src/services/reservations';
import { fetchUpcomingEvents } from '@/src/services/events';
import { formatCPF } from '@/lib/utils';
import { PortalMode } from './useReservationForm';

export function useReservationQueries(date: string, portalMode: PortalMode, showAlert: any) {
  const [fullyBookedDates, setFullyBookedDates] = useState<string[]>([]);
  const [reservedLocations, setReservedLocations] = useState<string[]>([]);
  const [userReservations, setUserReservations] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [events, setEvents] = useState<any[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);

  const fetchFullDates = async () => {
    try {
      const dates = await fetchFullDatesService();
      setFullyBookedDates(dates);
    } catch (err) {
      console.error('Error fetching fully booked dates:', err);
    }
  };

  const fetchEvents = async () => {
    setLoadingEvents(true);
    try {
      const data = await fetchUpcomingEvents();
      const now = new Date();
      const visibleEvents = data.filter((e: any) => {
        if (!e.visible_from) return true;
        return new Date(e.visible_from) <= now;
      });
      setEvents(visibleEvents);
    } catch (err) {
      console.error('Error fetching upcoming events:', err);
    } finally {
      setLoadingEvents(false);
    }
  };

  useEffect(() => {
    fetchFullDates();
    fetchEvents();
  }, []);

  useEffect(() => {
    if (!date || (portalMode !== 'mesa' && portalMode !== 'camarote')) return;
    
    const fetchReservedLocations = async () => {
      try {
        const locations = await fetchReservedLocationsService(date);
        setReservedLocations(locations);
      } catch (err) {
        console.error('Error fetching reserved locations:', err);
      }
    };

    fetchReservedLocations();
  }, [date, portalMode]);

  const handleSearch = async (searchCpf: string) => {
    const formattedCpf = formatCPF(searchCpf);
    const cleanCpf = formattedCpf.replace(/\D/g, '');
    if (cleanCpf.length < 11) return;
 
    if (!cpfValidator.isValid(cleanCpf)) {
      showAlert('CPF Inválido', 'Por favor, informe um CPF válido e tente novamente.', 'warning');
      return;
    }
    
    setIsSearching(true);
    setHasSearched(true);
    
    try {
      const data = await getReservationsByCpfRpc(cleanCpf);
      setUserReservations(data);
    } catch (err) {
      console.error('Error fetching reservations:', err);
      showAlert('Erro', 'Erro ao carregar reservas.', 'error');
    } finally {
      setIsSearching(false);
    }
  };

  return {
    fullyBookedDates,
    reservedLocations, setReservedLocations,
    userReservations,
    isSearching,
    hasSearched,
    events,
    loadingEvents,
    handleSearch
  };
}
