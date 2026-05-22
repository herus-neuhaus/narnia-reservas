import { useState, useEffect } from 'react';
import { format, startOfToday, parseISO, differenceInYears, parse } from 'date-fns';
import { cpf as cpfValidator } from 'cpf-cnpj-validator';
import { 
  createReservationAtomic, 
  fetchFullyBookedDates as fetchFullDatesService, 
  fetchReservedLocations as fetchReservedLocationsService, 
  getReservationsByCpfRpc 
} from '@/src/services/reservations';
import { fetchUpcomingEvents } from '@/src/services/events';
import { useCustomAlert } from './use-custom-alert';

export type PortalMode = 'landing' | 'mesa' | 'camarote' | 'lista' | 'promocoes' | 'check';

export function useReservation() {
  // Navigation State
  const [portalMode, setPortalMode] = useState<PortalMode>('landing');
  const [activeStep, setActiveStep] = useState(1);
  
  // Form State
  const [date, setDate] = useState('');
  const [guests, setGuests] = useState<number | null>(null);
  const [time, setTime] = useState('');
  const [notes, setNotes] = useState('');
  const [locationId, setLocationId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ 
    name: '', 
    email: '', 
    whatsapp: '', 
    cpf: '', 
    birth_date: '' 
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  
  // Status State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [fullyBookedDates, setFullyBookedDates] = useState<string[]>([]);
  const [reservedLocations, setReservedLocations] = useState<string[]>([]);
  const [searchCpf, setSearchCpf] = useState('');
  const [userReservations, setUserReservations] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [blacklistAlert, setBlacklistAlert] = useState<any | null>(null);
  const [policyAccepted, setPolicyAccepted] = useState(false);
  const [events, setEvents] = useState<any[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [isCpfLoading, setIsCpfLoading] = useState(false);

  const { showAlert, alertProps } = useCustomAlert();

  const handleSearch = async () => {
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

  const handleModeChange = (mode: PortalMode) => {
    resetAll();
    setPortalMode(mode);
  };

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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchFullDates();
    fetchEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, portalMode]);

  const formatCPF = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1');
  };

  const formatPhone = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/^(\d{2})(\d)/g, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .slice(0, 15);
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.name.trim()) errors.name = 'Nome é obrigatório';
    
    if (!formData.cpf.trim()) {
      errors.cpf = 'CPF é obrigatório';
    } else if (!cpfValidator.isValid(formData.cpf)) {
      errors.cpf = 'CPF inválido';
    }

    if (!formData.birth_date || formData.birth_date.length !== 10) {
      errors.birth_date = 'Data de nascimento inválida';
    } else {
      const age = differenceInYears(new Date(), parse(formData.birth_date, 'dd/MM/yyyy', new Date()));
      if (age < 18) {
        errors.birth_date = 'Apenas maiores de 18 anos podem reservar';
        showAlert('Acesso Restrito', 'O Nárnia Club permite a entrada apenas para pessoas com 18 anos ou mais.', 'error');
      }
    }

    if (!formData.whatsapp.trim()) {
      errors.whatsapp = 'WhatsApp é obrigatório';
    } else if (formData.whatsapp.length < 14) {
      errors.whatsapp = 'Telefone inválido';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    setIsSubmitting(true);
    
    if ((portalMode === 'mesa' || portalMode === 'camarote') && !policyAccepted) {
      showAlert('Termo de Aceite', 'Você precisa aceitar os termos e a política de reserva para continuar.', 'info');
      setIsSubmitting(false);
      return;
    }

    let expiresAt: string | null = null;
    if (portalMode === 'mesa') {
      expiresAt = `${date} 23:30:00`;
    } else if (portalMode === 'camarote') {
      try {
        const d = new Date(date + 'T00:00:00');
        d.setDate(d.getDate() + 1);
        expiresAt = `${format(d, 'yyyy-MM-dd')} 02:00:00`;
      } catch (e) {
        expiresAt = `${date} 02:00:00`;
      }
    }

    try {
      const toIsoDate = (brDate: string) => {
        if (!brDate || brDate.length !== 10) return brDate;
        const [d, m, y] = brDate.split('/');
        return `${y}-${m}-${d}`;
      };

      const res = await createReservationAtomic({
        cpf: formData.cpf.replace(/\D/g, ''),
        name: formData.name,
        email: formData.email,
        whatsapp: formData.whatsapp,
        birthDate: toIsoDate(formData.birth_date),
        date: date || format(new Date(), 'yyyy-MM-dd'),
        time: time || '22:00',
        guests: guests || 1,
        type: portalMode,
        locationId: locationId || '',
        notes,
        expiresAt
      });

      if (res && res.success) {
        setIsSuccess(true);
      } else {
        const errType = res?.error;
        const errMsg = res?.message || 'Erro desconhecido ao processar reserva.';
        
        if (errType === 'BLACKLISTED') {
          setBlacklistAlert({
            id: '',
            name: formData.name,
            cpf: formData.cpf.replace(/\D/g, ''),
            cpf_digits: formData.cpf.replace(/\D/g, ''),
            reason: res.reason || 'Consta na blacklist',
            end_date: res.end_date || '',
            created_at: null,
            start_date: null,
            blocked_by: null
          });
        } else if (errType === 'CPF_DUPLICATE') {
          showAlert('Cadastro Duplicado', errMsg, 'warning');
        } else if (errType === 'LOCATION_OCCUPIED') {
          showAlert('Mesa/Camarote Ocupado', errMsg, 'warning');
        } else if (errType === 'LIST_FULL') {
          showAlert('Lista de Evento Esgotada', errMsg, 'warning');
        } else {
          showAlert('Falha na Reserva', errMsg, 'error');
        }
      }
    } catch (e: any) {
      console.error('Erro ao enviar reserva:', e);
      showAlert('Erro de Processamento', 'Ocorreu uma falha na transação de reserva: ' + (e.message || e), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetAll = () => {
    setActiveStep(1);
    setIsSuccess(false);
    setDate('');
    setGuests(null);
    setTime('');
    setLocationId(null);
    setNotes('');
    setPolicyAccepted(false);
    setReservedLocations([]);
    setFormData({ name: '', email: '', whatsapp: '', cpf: '', birth_date: '' });
    setFormErrors({});
    setPortalMode('landing');
  };

  return {
    portalMode,
    setPortalMode,
    activeStep,
    setActiveStep,
    date,
    setDate,
    guests,
    setGuests,
    time,
    setTime,
    notes,
    setNotes,
    locationId,
    setLocationId,
    formData,
    setFormData,
    formErrors,
    setFormErrors,
    isCpfLoading,
    setIsCpfLoading,
    isSubmitting,
    isSuccess,
    fullyBookedDates,
    reservedLocations,
    searchCpf,
    setSearchCpf,
    userReservations,
    isSearching,
    hasSearched,
    blacklistAlert,
    setBlacklistAlert,
    policyAccepted,
    setPolicyAccepted,
    events,
    loadingEvents,
    handleSearch,
    handleModeChange,
    handleSubmit,
    resetAll,
    formatCPF,
    formatPhone,
    alertProps,
    showAlert
  };
}
