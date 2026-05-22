import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { format, startOfToday, parseISO, differenceInDays } from 'date-fns';
import { createClient } from '@/lib/supabase/client';
import { 
  fetchTodaysReservations, 
  updateCheckInStatusWithPhoto, 
  fetchCustomerPhoto, 
  getReservationsByCpfRpc 
} from '@/src/services/reservations';
import { fetchBlacklistEntries } from '@/src/services/blacklist';
import { fetchTicketBatches } from '@/src/services/ticketing';
import { requestComplimentaryTicket, fetchComplimentaryTickets, updateComplimentaryStatus } from '@/src/services/complimentary';
import { fetchCamarotesWithOccupation, registerCamaroteEntry, registerExtraCamaroteEntry } from '@/src/services/camarotes';
import { useCustomAlert } from './use-custom-alert';

export type Reservation = any;
export type Blacklist = any;

/** Strips accents and lowercases – enables accent-insensitive search */
const normalize = (str: string) =>
  str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export function usePortariaCheckIn() {
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [blacklist, setBlacklist] = useState<Blacklist[]>([]);
  const [searchResult, setSearchResult] = useState<Reservation | null>(null);
  const [isBlacklisted, setIsBlacklisted] = useState<Blacklist | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [startTime, setStartTime] = useState<string>('');
  const [endTime, setEndTime] = useState<string>('');

  const [ticketBatches, setTicketBatches] = useState<any[]>([]);
  const [complimentaryTickets, setComplimentaryTickets] = useState<any[]>([]);
  const [camarotes, setCamarotes] = useState<any[]>([]);
  const [event, setEvent] = useState<any>(null);
  
  // Modal & Alert states
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [blacklistAlert, setBlacklistAlert] = useState<Blacklist | null>(null);
  const [duplicateAlert, setDuplicateAlert] = useState<any | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isReceptionist, setIsReceptionist] = useState(false);
  const [photoCaptureModalData, setPhotoCaptureModalData] = useState<{ reservationId: string; currentStatus: string | null } | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);

  const supabase = createClient();
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState<string>(format(startOfToday(), 'yyyy-MM-dd'));
  const todayBrl = selectedDate.split('-').reverse().join('/');

  const { showAlert, alertProps } = useCustomAlert();

  const fetchTodaysData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const role = user.app_metadata?.role || user.user_metadata?.role || 'customer';
      const email = user.email || '';

      setIsAdmin(['dono', 'gerente', 'admin'].includes(role) || email === 'narnia@admin.com');
      setIsReceptionist(role === 'receptionist');

      const mappedResData = await fetchTodaysReservations(selectedDate);
      const blData = await fetchBlacklistEntries();

      setReservations(mappedResData);
      setBlacklist(blData);

      // Advanced Ticketing Data
      const batches = await fetchTicketBatches(selectedDate);
      setTicketBatches(batches);
      const compl = await fetchComplimentaryTickets(selectedDate);
      setComplimentaryTickets(compl);
      const cams = await fetchCamarotesWithOccupation(selectedDate);
      setCamarotes(cams);

      // Fetch event
      const { data: evData } = await supabase.from('events').select('*').eq('event_date', selectedDate).maybeSingle();
      if (evData) {
        setEvent(evData);
      } else {
        setEvent(null);
      }
    } catch (err: any) {
      console.error('Error fetching today\'s portaria data:', err);
      showAlert('Erro de Conexão', 'Não foi possível sincronizar os dados da portaria.', 'error');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    const channel = supabase.channel('portaria-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reservations' }, () => fetchTodaysData(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'complimentary_tickets' }, () => fetchTodaysData(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'camarote_entries' }, () => fetchTodaysData(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ticket_batches' }, () => fetchTodaysData(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'box_office_reports' }, () => fetchTodaysData(true))
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchTodaysData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    if (term.length < 3) {
      setSearchResult(null);
      setIsBlacklisted(null);
      return;
    }

    const normTerm = normalize(term);

    const barred = blacklist.find(b =>
      b.cpf === term ||
      normalize(b.name).includes(normTerm)
    );
    if (barred) {
      setIsBlacklisted(barred);
    } else {
      setIsBlacklisted(null);
    }

    const found = reservations.find(r =>
      (r.customers?.cpf || r.cpf) === term ||
      (r.customers?.whatsapp || r.whatsapp)?.includes(term) ||
      normalize(r.customers?.name || r.name || '').includes(normTerm)
    );
    setSearchResult(found || null);
  };

  const getPortoVelhoTime = () => {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Porto_Velho',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    
    const parts = formatter.formatToParts(now);
    const getValue = (type: string) => parts.find(p => p.type === type)?.value || '';
    return `${getValue('year')}-${getValue('month')}-${getValue('day')} ${getValue('hour')}:${getValue('minute')}:${getValue('second')}`;
  };

  const toggleCheckInWithPhoto = async (id: string, currentStatus: string | null, photoBase64: string | null = null) => {
    const newStatus = currentStatus === 'entered' ? 'pending' : 'entered';
    const enteredAt = newStatus === 'entered' ? getPortoVelhoTime() : null;
    
    try {
      const res = reservations.find(r => r.id === id);
      const updateData = await updateCheckInStatusWithPhoto(id, newStatus, enteredAt, photoBase64, res?.customer_id || null);

      setReservations(prev => prev.map(r => {
        if (r.id === id) {
          const updated = { ...r, ...updateData };
          if (photoBase64) {
            updated.photo = photoBase64;
            if (updated.customers) {
              updated.customers.photo = photoBase64;
            }
          }
          return updated;
        }
        return r;
      }));

      if (searchResult?.id === id) {
        const updatedResult = { ...searchResult, ...updateData };
        if (photoBase64) {
          updatedResult.photo = photoBase64;
          if (updatedResult.customers) {
            updatedResult.customers.photo = photoBase64;
          }
        }
        setSearchResult(updatedResult);
      }
    } catch (err: any) {
      console.error('Error performing check-in status update:', err);
      showAlert('Falha no Check-in', 'Erro ao atualizar o status no banco de dados.', 'error');
    }
  };

  const handleCheckInClick = async (id: string, currentStatus: string | null) => {
    const res = reservations.find(r => r.id === id);
    if (!res) return;

    if (currentStatus === 'entered' && isReceptionist) {
      showAlert('Acesso Negado', 'Você não tem permissão para cancelar uma entrada. Procure a gerência.', 'warning');
      return;
    }

    const hasPhoto = res.customers?.photo || res.photo;

    if (currentStatus !== 'entered' && !hasPhoto) {
      if (res.customer_id) {
        setLoading(true);
        try {
          const customerPhoto = await fetchCustomerPhoto(res.customer_id);
          if (customerPhoto) {
            await toggleCheckInWithPhoto(id, currentStatus, customerPhoto);
            setLoading(false);
            return;
          }
        } catch (err) {
          console.error('Error fetching customer photo:', err);
        } finally {
          setLoading(false);
        }
      }

      if (res.cpf) {
        setLoading(true);
        try {
          const pastData = await getReservationsByCpfRpc(res.cpf);
          const pastResWithPhoto = pastData.find((r: any) => r.photo);
          if (pastResWithPhoto && pastResWithPhoto.photo) {
            await toggleCheckInWithPhoto(id, currentStatus, pastResWithPhoto.photo);
            setLoading(false);
            return;
          }
        } catch (err) {
          console.error('Error fetching past photo:', err);
        } finally {
          setLoading(false);
        }
      }

      // Replaced native alert with a structured warning alert
      showAlert(
        'Aviso de Cadastro',
        '⚠️ AVISO IMPORTANTE: Este cliente não possui foto cadastrada!\nPor favor, capture a foto do cliente para prosseguir com a entrada segura.',
        'warning'
      );
      setCapturedPhoto(null);
      setPhotoCaptureModalData({ reservationId: id, currentStatus });
    } else {
      toggleCheckInWithPhoto(id, currentStatus);
    }
  };

  const onQuickAddSuccess = (newRes: Reservation) => {
    const mappedRes = {
      ...newRes,
      id: newRes.id || `temp_${Date.now()}_${Math.random()}`,
      name: newRes.name,
      cpf: newRes.cpf,
      whatsapp: newRes.whatsapp,
      photo: newRes.photo,
      customers: {
        id: newRes.customer_id || '',
        cpf: newRes.cpf,
        name: newRes.name || '',
        whatsapp: newRes.whatsapp || '',
        birth_date: newRes.birth_date,
        photo: newRes.photo
      }
    };
    setReservations(prev => [mappedRes, ...prev]);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const checkTimeRange = (enteredAt: string | null) => {
    if (!enteredAt) return false;
    const d = new Date(enteredAt);
    const timeStr = d.toLocaleTimeString('pt-BR', { timeZone: 'America/Porto_Velho', hour: '2-digit', minute: '2-digit' });
    if (startTime && timeStr < startTime) return false;
    if (endTime && timeStr > endTime) return false;
    return true;
  };

  const filteredReservations = reservations.filter(r => {
    if (typeFilter !== 'all' && r.type !== typeFilter) return false;
    
    if (startTime || endTime) {
      if (r.check_in_status !== 'entered') return false;
      if (!checkTimeRange(r.entered_at)) return false;
    }

    if (!searchTerm) return true;
    const normTerm = normalize(searchTerm);
    return (
      normalize(r.name || '').includes(normTerm) ||
      r.cpf?.replace(/\D/g, '').includes(searchTerm.replace(/\D/g, '')) ||
      r.whatsapp?.includes(searchTerm)
    );
  });

  const getFilteredStats = () => {
    const baseType = reservations.filter(r => typeFilter === 'all' || r.type === typeFilter);
    const total = baseType.length;
    const entered = baseType.filter(r => r.check_in_status === 'entered');
    const enteredCount = entered.length;
    const enteredInTimeRange = (startTime || endTime) ? entered.filter(r => checkTimeRange(r.entered_at)).length : enteredCount;
    return { total, enteredCount, enteredInTimeRange, hasTimeFilter: !!(startTime || endTime) };
  };

  const updateCustomerPhotoLocally = (customerId: string, photoBase64: string) => {
    setReservations(prev => prev.map(r => {
      if (r.customer_id === customerId) {
        return {
          ...r,
          photo: photoBase64,
          customers: r.customers ? { ...r.customers, photo: photoBase64 } : r.customers
        };
      }
      return r;
    }));

    if (searchResult?.customer_id === customerId) {
      setSearchResult((prev: any) => {
        if (!prev) return prev;
        return {
          ...prev,
          photo: photoBase64,
          customers: prev.customers ? { ...prev.customers, photo: photoBase64 } : prev.customers
        };
      });
    }
  };

  return {
    loading,
    searchTerm,
    reservations,
    blacklist,
    searchResult,
    isBlacklisted,
    showQuickAdd,
    setShowQuickAdd,
    blacklistAlert,
    setBlacklistAlert,
    duplicateAlert,
    setDuplicateAlert,
    isAdmin,
    isReceptionist,
    photoCaptureModalData,
    setPhotoCaptureModalData,
    capturedPhoto,
    setCapturedPhoto,
    todayBrl,
    filteredReservations,
    getFilteredStats,
    ticketBatches,
    complimentaryTickets,
    camarotes,
    startTime,
    setStartTime,
    endTime,
    setEndTime,
    handleSearch,
    handleCheckInClick,
    toggleCheckInWithPhoto,
    onQuickAddSuccess,
    handleLogout,
    showAlert,
    alertProps,
    fetchTodaysData,
    updateCustomerPhotoLocally,
    selectedDate,
    setSelectedDate,
    typeFilter,
    setTypeFilter,
    requestComplimentaryTicket: async (params: any) => { const res = await requestComplimentaryTicket(params); fetchTodaysData(true); return res; },
    updateComplimentaryStatus: async (id: string, status: 'approved' | 'rejected') => { const res = await updateComplimentaryStatus(id, status); fetchTodaysData(true); return res; },
    registerCamaroteEntry: async (params: any) => { const res = await registerCamaroteEntry(params); fetchTodaysData(true); return res; },
    registerExtraCamaroteEntry: async (params: any) => { const res = await registerExtraCamaroteEntry(params); fetchTodaysData(true); return res; },
    event
  };
}
