import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { format, startOfToday, parseISO, differenceInDays, subDays } from 'date-fns';
import { createClient } from '@/lib/supabase/client';
import { 
  fetchEventReservations, 
  updateCheckInStatusWithPhoto, 
  fetchCustomerPhoto, 
  getReservationsByCpfRpc 
} from '@/src/services/reservations';
import { fetchBlacklistEntries } from '@/src/services/blacklist';
import { fetchTicketBatches } from '@/src/services/ticketing';
import { requestComplimentaryTicket, fetchComplimentaryTickets, updateComplimentaryStatus, validateComplimentaryEntry } from '@/src/services/complimentary';
import { fetchCamarotesWithOccupation, registerCamaroteEntry, registerExtraCamaroteEntry } from '@/src/services/camarotes';
import { useCustomAlert } from './use-custom-alert';
import { getPortoVelhoTime } from '@/lib/date-utils';

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
  const [quickAddInitialData, setQuickAddInitialData] = useState<any>(null);
  const [blacklistAlert, setBlacklistAlert] = useState<Blacklist | null>(null);
  const [duplicateAlert, setDuplicateAlert] = useState<any | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isReceptionist, setIsReceptionist] = useState(false);
  const [photoCaptureModalData, setPhotoCaptureModalData] = useState<{ reservationId: string; currentStatus: string | null } | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);

  const supabase = createClient();
  const router = useRouter();
  
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [showEventSelector, setShowEventSelector] = useState(false);
  const [availableEvents, setAvailableEvents] = useState<any[]>([]);

  const selectedDate = selectedEvent?.event_date || format(startOfToday(), 'yyyy-MM-dd');
  const todayBrl = selectedDate.split('-').reverse().join('/');

  const { showAlert, alertProps } = useCustomAlert();

  useEffect(() => {
    const initEvent = () => {
      const storedEvent = localStorage.getItem('portaria_selected_event');
      if (storedEvent) {
        try {
          const parsed = JSON.parse(storedEvent);
          if (parsed && parsed.event_date) {
            setSelectedEvent(parsed);
          } else {
            setShowEventSelector(true);
          }
        } catch {
          setShowEventSelector(true);
        }
      } else {
        setShowEventSelector(true);
      }
    };
    initEvent();

    const todayString = getPortoVelhoTime().split(' ')[0];
    const yesterdayString = format(subDays(parseISO(todayString), 1), 'yyyy-MM-dd');
    supabase
      .from('events')
      .select('*')
      .gte('event_date', yesterdayString)
      .order('event_date', { ascending: true })
      .limit(10)
      .then(({data}) => {
        if (data) setAvailableEvents(data);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelectEvent = (ev: any) => {
    setSelectedEvent(ev);
    setEvent(ev);
    localStorage.setItem('portaria_selected_event', JSON.stringify(ev));
    setShowEventSelector(false);
  };

  const handleChangeEvent = () => {
    setShowEventSelector(true);
  };

  const fetchTodaysData = async (silent = false) => {
    if (!selectedEvent) return;
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

      const mappedResData = await fetchEventReservations(selectedDate);
      const blData = await fetchBlacklistEntries();

      setReservations(mappedResData);
      setBlacklist(blData);

      // Advanced Ticketing Data
      const batches = await fetchTicketBatches({ eventId: selectedEvent.id });
      setTicketBatches(batches);
      const compl = await fetchComplimentaryTickets(selectedEvent.id);
      setComplimentaryTickets(compl);
      const cams = await fetchCamarotesWithOccupation(selectedEvent.id);
      setCamarotes(cams);

      // Fetch event just to be safe if it updated
      const { data: evData } = await supabase.from('events').select('*').eq('event_date', selectedDate).maybeSingle();
      if (evData) {
        setEvent(evData);
        // Do not override selectedEvent so we don't cause loops, but keep event fresh
      } else {
        setEvent(selectedEvent);
      }
    } catch (err: any) {
      console.error('Error fetching portaria data:', err);
      showAlert('Erro de Conexão', 'Não foi possível sincronizar os dados da portaria.', 'error');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    if (!selectedEvent) return;
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
  }, [selectedEvent]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (selectedEvent) fetchTodaysData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEvent]);

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    const cleanedTerm = term.trim();
    if (cleanedTerm.length < 3) {
      setSearchResult(null);
      setIsBlacklisted(null);
      return;
    }

    const normTerm = normalize(cleanedTerm);

    const barred = blacklist.find(b =>
      b.cpf === cleanedTerm ||
      normalize(b.name).includes(normTerm)
    );
    if (barred) {
      setIsBlacklisted(barred);
    } else {
      setIsBlacklisted(null);
    }

    const cleanTermNumbers = cleanedTerm.replace(/\D/g, '');
    const found = reservations.find(r =>
      (cleanTermNumbers && (r.customers?.cpf || r.cpf)?.replace(/\D/g, '') === cleanTermNumbers) ||
      (r.customers?.whatsapp || r.whatsapp)?.includes(cleanedTerm) ||
      normalize(r.customers?.name || r.name || '').includes(normTerm)
    );
    setSearchResult(found || null);
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
      const errMsg = err.message || 'Erro ao atualizar o status no banco de dados.';
      
      if (errMsg.toLowerCase().includes('expirado') || errMsg.toLowerCase().includes('limite da lista')) {
        const res = reservations.find(r => r.id === id);
        if (res) {
          setQuickAddInitialData({
            cpf: res.cpf || res.customers?.cpf || '',
            name: res.name || res.customers?.name || '',
            whatsapp: res.whatsapp || res.customers?.whatsapp || '',
            birth_date: res.birth_date || res.customers?.birth_date || '',
            photo: res.photo || res.customers?.photo || null
          });
        }
        
        // Show an informative warning and automatically open the Quick Add Modal for selling a bracelet
        showAlert('Horário Expirado', `${errMsg} Redirecionando para venda de pulseira...`, 'warning');
        setTimeout(() => {
          setShowQuickAdd(true);
        }, 1500); // Small delay to read the alert before opening modal
      } else {
        showAlert('Falha no Check-in', errMsg, 'error');
      }
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

    if (!searchTerm.trim()) return true;
    const cleanedSearchTerm = searchTerm.trim();
    const normTerm = normalize(cleanedSearchTerm);
    return (
      normalize(r.name || '').includes(normTerm) ||
      r.cpf?.replace(/\D/g, '').includes(cleanedSearchTerm.replace(/\D/g, '')) ||
      r.whatsapp?.includes(cleanedSearchTerm)
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
    quickAddInitialData,
    setQuickAddInitialData,
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
    typeFilter,
    setTypeFilter,
    requestComplimentaryTicket: async (params: any) => { const res = await requestComplimentaryTicket({...params, eventId: selectedEvent?.id}); fetchTodaysData(true); return res; },
    updateComplimentaryStatus: async (id: string, status: 'approved' | 'rejected') => { const res = await updateComplimentaryStatus(id, status); fetchTodaysData(true); return res; },
    validateComplimentaryEntry: async (customerId: string, eventId: string) => { const res = await validateComplimentaryEntry(customerId, eventId); fetchTodaysData(true); return res; },
    registerCamaroteEntry: async (params: any) => { const res = await registerCamaroteEntry({...params, eventId: selectedEvent?.id}); fetchTodaysData(true); return res; },
    registerExtraCamaroteEntry: async (params: any) => { const res = await registerExtraCamaroteEntry({...params, eventId: selectedEvent?.id}); fetchTodaysData(true); return res; },
    event,
    selectedEvent,
    showEventSelector,
    availableEvents,
    handleSelectEvent,
    handleChangeEvent
  };
}
