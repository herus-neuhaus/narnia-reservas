import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { format, startOfToday, startOfTomorrow, startOfWeek, endOfWeek } from 'date-fns';
import { 
  fetchReservationsByDateRange, 
  updateReservationStatus as updateStatusService 
} from '@/src/services/reservations';
import { 
  fetchBlacklistEntries, 
  addEntryToBlacklist, 
  removeEntryFromBlacklist 
} from '@/src/services/blacklist';
import { useCustomAlert } from './use-custom-alert';

export type Reservation = any;
export type Blacklist = any;
export type ReservationStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed';

export function useAdminDashboard() {
  const searchParams = useSearchParams();
  const viewParam = searchParams.get('view') || 'reservations';
  
  const currentView = ['reservations', 'blacklist', 'events', 'clientes', 'administradores', 'recepcionistas', 'bilheteria'].includes(viewParam)
    ? (viewParam as 'reservations' | 'blacklist' | 'events' | 'clientes' | 'administradores' | 'recepcionistas' | 'bilheteria')
    : 'reservations';

  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [blacklist, setBlacklist] = useState<Blacklist[]>([]);
  const [isBlacklistModalOpen, setIsBlacklistModalOpen] = useState(false);
  const [blacklistInitialData, setBlacklistInitialData] = useState<{cpf: string, name: string} | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // WhatsApp Modal State
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  
  // Date states
  const [startDate, setStartDate] = useState(format(startOfToday(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(startOfToday(), 'yyyy-MM-dd'));
  const [quickFilter, setQuickFilter] = useState('Hoje');
  const [showDatePicker, setShowDatePicker] = useState(false);

  const { showAlert, alertProps } = useCustomAlert();

  const fetchReservations = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchReservationsByDateRange(startDate, endDate);
      setReservations(data);
    } catch (err: any) {
      console.error('Error fetching reservations:', err);
      showAlert('Erro', 'Erro ao carregar reservas do banco de dados.', 'error');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate]);

  const fetchBlacklist = useCallback(async () => {
    try {
      const data = await fetchBlacklistEntries();
      setBlacklist(data);
    } catch (err) {
      console.error('Error fetching blacklist:', err);
    }
  }, []);

  useEffect(() => {
    if (currentView === 'reservations') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchReservations();
    } else if (currentView === 'blacklist') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchBlacklist();
    }
  }, [currentView, fetchReservations, fetchBlacklist]);

  const updateStatus = async (id: string, newStatus: ReservationStatus) => {
    try {
      await updateStatusService(id, newStatus);
      setReservations(prev => prev.map(res => res.id === id ? { ...res, status: newStatus } : res));
      showAlert('Sucesso', 'Status da reserva atualizado com sucesso.', 'success');
    } catch (err: any) {
      showAlert('Falha na Atualização', 'Erro ao atualizar status: ' + err.message, 'error');
    }
  };

  const addToBlacklist = async (cpf: string, name: string, reason: string, duration: string) => {
    try {
      await addEntryToBlacklist({ cpf, name, reason, duration });
      await fetchBlacklist();
      setIsBlacklistModalOpen(false);
      showAlert('Adicionado à Blacklist', `${name} foi adicionado à lista de bloqueados com sucesso.`, 'success');
    } catch (err: any) {
      showAlert('Falha ao Bloquear', 'Erro ao adicionar cliente na blacklist: ' + err.message, 'error');
    }
  };

  const removeFromBlacklist = async (id: string) => {
    showAlert(
      'Remover da Blacklist',
      'Tem certeza de que deseja liberar este cliente da blacklist?',
      'warning',
      true,
      async () => {
        try {
          await removeEntryFromBlacklist(id);
          await fetchBlacklist();
          showAlert('Sucesso', 'Cliente removido da blacklist com sucesso.', 'success');
        } catch (err: any) {
          showAlert('Erro', 'Erro ao remover cliente da blacklist: ' + err.message, 'error');
        }
      }
    );
  };

  const filteredReservations = reservations.filter(res => 
    (res.customers?.name || res.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    (res.customers?.whatsapp || res.whatsapp || '').includes(searchTerm) ||
    (res.customers?.cpf || res.cpf || '')?.includes(searchTerm)
  );

  return {
    currentView,
    reservations,
    blacklist,
    isBlacklistModalOpen,
    setIsBlacklistModalOpen,
    blacklistInitialData,
    setBlacklistInitialData,
    loading,
    searchTerm,
    setSearchTerm,
    isWhatsAppModalOpen,
    setIsWhatsAppModalOpen,
    selectedReservation,
    setSelectedReservation,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    quickFilter,
    setQuickFilter,
    showDatePicker,
    setShowDatePicker,
    updateStatus,
    addToBlacklist,
    removeFromBlacklist,
    filteredReservations,
    alertProps,
    showAlert
  };
}
