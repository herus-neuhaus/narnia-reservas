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
import { useCustomAlert } from './use-custom-alert';

export type Reservation = any;
export type Blacklist = any;

export function usePortariaCheckIn() {
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [blacklist, setBlacklist] = useState<Blacklist[]>([]);
  const [searchResult, setSearchResult] = useState<Reservation | null>(null);
  const [isBlacklisted, setIsBlacklisted] = useState<Blacklist | null>(null);
  
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
  const today = format(startOfToday(), 'yyyy-MM-dd');
  const todayBrl = format(startOfToday(), 'dd/MM/yyyy');

  const { showAlert, alertProps } = useCustomAlert();

  const fetchTodaysData = async () => {
    setLoading(true);
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

      const mappedResData = await fetchTodaysReservations(today);
      const blData = await fetchBlacklistEntries();

      setReservations(mappedResData);
      setBlacklist(blData);
    } catch (err: any) {
      console.error('Error fetching today\'s portaria data:', err);
      showAlert('Erro de Conexão', 'Não foi possível sincronizar os dados da portaria.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchTodaysData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    if (term.length < 3) {
      setSearchResult(null);
      setIsBlacklisted(null);
      return;
    }

    const barred = blacklist.find(b => b.cpf === term || b.name.toLowerCase().includes(term.toLowerCase()));
    if (barred) {
      setIsBlacklisted(barred);
    } else {
      setIsBlacklisted(null);
    }

    const found = reservations.find(r => 
      (r.customers?.cpf || r.cpf) === term || 
      (r.customers?.whatsapp || r.whatsapp)?.includes(term) || 
      (r.customers?.name || r.name).toLowerCase().includes(term.toLowerCase())
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

  const filteredReservations = reservations.filter(r => 
    !searchTerm || 
    r.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    r.cpf?.replace(/\D/g, '').includes(searchTerm.replace(/\D/g, '')) ||
    r.whatsapp?.includes(searchTerm)
  );

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
    handleSearch,
    handleCheckInClick,
    toggleCheckInWithPhoto,
    onQuickAddSuccess,
    handleLogout,
    showAlert,
    alertProps
  };
}
