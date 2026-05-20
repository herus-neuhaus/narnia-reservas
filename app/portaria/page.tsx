'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from 'react';
import { 
  Search, 
  UserCheck, 
  UserX, 
  ShieldAlert, 
  Clock, 
  UserPlus, 
  LogOut, 
  Loader2, 
  AlertCircle,
  QrCode,
  Smartphone,
  CheckCircle2,
  XCircle,
  CalendarDays,
  LayoutGrid,
  Ticket
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Database } from '@/lib/supabase/database.types';
import { format, startOfToday, parseISO, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import QuickAddModal from '@/app/components/QuickAddModal';
import CameraCapture from '@/app/components/CameraCapture';

type Reservation = Database['public']['Tables']['reservations']['Row'] & { customers?: any };
type Blacklist = Database['public']['Tables']['blacklist']['Row'];

export default function PortariaDashboard() {
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [blacklist, setBlacklist] = useState<Blacklist[]>([]);
  const [searchResult, setSearchResult] = useState<Reservation | null>(null);
  const [isBlacklisted, setIsBlacklisted] = useState<Blacklist | null>(null);
  
  // Modal State
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

  const fetchTodaysData = async () => {
    setLoading(true);
    
    // Check session first
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push('/login');
      return;
    }

    // Fetch role from internal API to avoid RLS 406 errors
    let role = 'customer';
    try {
      const response = await fetch(`/api/team/list?email=${encodeURIComponent(session.user.email || '')}`);
      const result = await response.json();
      if (result.success && result.data && result.data.length > 0) {
        role = result.data[0].role;
      }
    } catch (err) {
      console.error('Error fetching role:', err);
    }

    const isAuthorized = ['dono', 'gerente', 'portaria', 'admin', 'receptionist'].includes(role) || session.user.email === 'narnia@admin.com';

    if (!isAuthorized) {
      console.warn('User not authorized for Portaria');
      router.push('/login');
      return;
    }

    // Show admin return button if user has admin privileges
    setIsAdmin(['dono', 'gerente', 'admin'].includes(role) || session.user.email === 'narnia@admin.com');
    setIsReceptionist(role === 'receptionist');

    const { data: resData } = await supabase
      .from('reservations')
      .select('*, customers(*)')
      .eq('reservation_date', today);

    // Map properties to base object for perfect backward compatibility
    const mappedResData = (resData || []).map((res: any) => ({
      ...res,
      name: res.customers?.name || res.name,
      cpf: res.customers?.cpf || res.cpf,
      whatsapp: res.customers?.whatsapp || res.whatsapp,
      photo: res.customers?.photo || res.photo
    })).sort((a: any, b: any) => {
      const nameA = a.name || '';
      const nameB = b.name || '';
      return nameA.localeCompare(nameB);
    });

    const { data: blData } = await supabase
      .from('blacklist')
      .select('*');

    setReservations(mappedResData);
    setBlacklist(blData || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchTodaysData();
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

  const formatToBrlDateTime = (dateStr: string | null) => {
    if (!dateStr) return '';
    try {
      const cleanStr = dateStr.replace('T', ' ');
      const parts = cleanStr.split(' ');
      if (parts.length >= 2) {
        const dateParts = parts[0].split('-');
        const timeParts = parts[1].split(':');
        if (dateParts.length === 3 && timeParts.length >= 2) {
          return `${dateParts[2]}/${dateParts[1]}/${dateParts[0]} ${timeParts[0]}:${timeParts[1]}`;
        }
      }
      const dateParts = dateStr.split('-');
      if (dateParts.length === 3) {
        return `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  const toggleCheckInWithPhoto = async (id: string, currentStatus: string | null, photoBase64: string | null = null) => {
    const newStatus = currentStatus === 'entered' ? 'pending' : 'entered';
    const enteredAt = newStatus === 'entered' ? getPortoVelhoTime() : null;
    
    const updateData: any = { 
      check_in_status: newStatus,
      entered_at: enteredAt
    };

    if (photoBase64) {
      updateData.photo = photoBase64;
      const res = reservations.find(r => r.id === id);
      if (res?.customer_id) {
        await supabase
          .from('customers')
          .update({ photo: photoBase64 })
          .eq('id', res.customer_id);
      }
    }
    
    const { error } = await supabase
      .from('reservations')
      .update(updateData)
      .eq('id', id);

    if (!error) {
      setReservations(reservations.map(r => {
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
    }
  };

  const handleCheckInClick = async (id: string, currentStatus: string | null) => {
    const res = reservations.find(r => r.id === id);
    if (!res) return;

    if (currentStatus === 'entered' && isReceptionist) {
      alert('Você não tem permissão para cancelar uma entrada. Procure a gerência.');
      return;
    }

    const hasPhoto = res.customers?.photo || res.photo;

    if (currentStatus !== 'entered' && !hasPhoto) {
      if (res.customer_id) {
        setLoading(true);
        try {
          const { data: customer } = await supabase
            .from('customers')
            .select('photo')
            .eq('id', res.customer_id)
            .maybeSingle();

          if (customer?.photo) {
            await toggleCheckInWithPhoto(id, currentStatus, customer.photo);
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
          const { data: pastData, error } = await supabase
            .rpc('get_reservations_by_cpf', { p_cpf: res.cpf });
          
          if (!error && pastData && pastData.length > 0) {
            const pastResWithPhoto = pastData.find((r: any) => r.photo);
            if (pastResWithPhoto && pastResWithPhoto.photo) {
              await toggleCheckInWithPhoto(id, currentStatus, pastResWithPhoto.photo);
              setLoading(false);
              return;
            }
          }
        } catch (err) {
          console.error('Error fetching past photo:', err);
        } finally {
          setLoading(false);
        }
      }

      // Trigger a direct warning alert to the receptionist
      alert('⚠️ AVISO IMPORTANTE: Este cliente não possui foto cadastrada!\nPor favor, capture a foto do cliente no tablet/computador antes de dar a entrada.');
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

  return (
    <div className="min-h-screen bg-black font-sans text-white">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-black/80 backdrop-blur-md p-4 lg:px-8 border-b border-[#D4AF37]/20 shadow-xl">
        <div className="flex justify-between items-center max-w-5xl mx-auto">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-[#D4AF37] rounded-xl flex items-center justify-center text-black shadow-[0_0_15px_rgba(212,175,55,0.3)]">
              <QrCode size={24} />
            </div>
            <div>
              <h1 className="text-base lg:text-lg font-serif font-bold tracking-widest uppercase text-[#D4AF37]">Nárnia Club</h1>
              <p className="text-[9px] font-medium tracking-[0.2em] uppercase opacity-60">Staff • Portaria</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:block text-right mr-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 leading-none mb-1">Data de Hoje</p>
              <p className="text-xs font-bold">{format(startOfToday(), "dd 'de' MMMM", { locale: ptBR })}</p>
            </div>
            {isAdmin && (
              <button 
                onClick={() => router.push('/admin')}
                className="p-2.5 bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 rounded-xl transition-colors border border-[#D4AF37]/20 text-[#D4AF37] flex items-center gap-2"
                title="Painel Admin"
              >
                <LayoutGrid size={18} />
                <span className="hidden sm:inline text-[10px] font-black uppercase tracking-widest">Admin</span>
              </button>
            )}
            <button 
              onClick={handleLogout}
              className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl transition-colors border border-white/10"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      <main className="p-4 lg:p-8 max-w-5xl mx-auto space-y-6 pb-24">
        
        {/* Main Search Bar */}
        <div className="relative group">
          <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
            <Search className="text-[#D4AF37]/40 group-focus-within:text-[#D4AF37] transition-colors" size={24} />
          </div>
          <input 
            type="text" 
            placeholder="Buscar por CPF, Nome ou WhatsApp..." 
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-14 pr-6 py-6 bg-[#0A0A0A] border-2 border-white/5 rounded-[32px] text-xl font-medium shadow-2xl focus:outline-none focus:border-[#D4AF37]/50 focus:ring-4 focus:ring-[#D4AF37]/5 placeholder:text-white/10 transition-all"
          />
        </div>

        {/* Search Result / Blacklist Alert */}
        {(searchResult || isBlacklisted) && (
          <div className="animate-in fade-in zoom-in-95 duration-300">
            {isBlacklisted ? (
              <div className="bg-red-500/10 border-2 border-red-500/50 rounded-[32px] p-8 flex flex-col items-center text-center gap-4 shadow-[0_0_30px_rgba(239,68,68,0.1)]">
                <div className="w-20 h-20 bg-red-500 rounded-full flex items-center justify-center text-white shadow-lg animate-pulse">
                  <ShieldAlert size={40} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold uppercase tracking-tight text-red-500">CLIENTE BLOQUEADO (BLACKLIST)</h2>
                  <p className="text-lg font-bold mt-1">{isBlacklisted.name}</p>
                  <div className="mt-4 flex flex-col items-center gap-2">
                    <div className="px-4 py-2 bg-red-500/20 rounded-xl text-sm font-bold text-red-500 border border-red-500/20">
                      Motivo: {isBlacklisted.reason}
                    </div>
                    <div className="text-xl font-black text-red-400 mt-2">
                      FALTAM {differenceInDays(parseISO(isBlacklisted.end_date), new Date())} DIAS DE PUNIÇÃO
                    </div>
                  </div>
                </div>
              </div>
            ) : searchResult && (
              <div className="bg-[#D4AF37] text-black rounded-[32px] p-8 shadow-2xl animate-in slide-in-from-top-4">
                <div className="flex flex-col sm:flex-row justify-between items-center gap-6">
                  <div className="flex items-center gap-6">
                    <div className="w-20 h-20 bg-black/10 rounded-[28px] flex items-center justify-center overflow-hidden border border-black/10 shadow-inner">
                      {searchResult.photo ? (
                        <img src={searchResult.photo} alt={searchResult.name} className="w-full h-full object-cover" />
                      ) : (
                        <UserCheck size={40} />
                      )}
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">Reserva Encontrada</p>
                      <h2 className="text-3xl font-bold tracking-tight">{searchResult.name}</h2>
                      <div className="flex gap-4 mt-2">
                        <span className="text-xs font-bold uppercase tracking-tighter bg-black/10 px-2 py-0.5 rounded">{searchResult.type} {searchResult.location_id}</span>
                        <span className="text-xs font-bold uppercase tracking-tighter bg-black/10 px-2 py-0.5 rounded">{searchResult.num_guests} Pessoas</span>
                        {searchResult.check_in_status === 'entered' && searchResult.entered_at && (
                          <span className="text-xs font-bold uppercase tracking-tighter bg-black/10 px-2 py-0.5 rounded flex items-center gap-1">
                            <Clock size={12} /> Entrou às {formatToBrlDateTime(searchResult.entered_at)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleCheckInClick(searchResult.id, searchResult.check_in_status)}
                    disabled={searchResult.check_in_status === 'entered' && isReceptionist}
                    className={`w-full sm:w-auto px-10 py-5 rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl transition-all active:scale-95 ${
                      searchResult.check_in_status === 'entered' 
                        ? (isReceptionist ? 'bg-white/10 text-white/40 cursor-not-allowed' : 'bg-red-500 text-white hover:bg-red-600') 
                        : 'bg-black text-white hover:bg-black/80'
                    }`}
                  >
                    {searchResult.check_in_status === 'entered' ? 'Cancelar Entrada' : 'CONFIRMAR ENTRADA'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-[#0A0A0A] p-6 rounded-3xl border border-white/5">
            <p className="text-[9px] font-bold uppercase tracking-widest text-white/30 mb-2">Total na Lista</p>
            <p className="text-3xl font-bold">{reservations.filter(r => r.type === 'lista').length}</p>
          </div>
          <div className="bg-[#0A0A0A] p-6 rounded-3xl border border-white/5">
            <p className="text-[9px] font-bold uppercase tracking-widest text-white/30 mb-2">Mesas/Camarotes</p>
            <p className="text-3xl font-bold">{reservations.filter(r => r.type !== 'lista').length}</p>
          </div>
          <div className="bg-[#0A0A0A] p-6 rounded-3xl border border-white/5 border-l-4 border-l-green-500/50">
            <p className="text-[9px] font-bold uppercase tracking-widest text-green-500/60 mb-2">Entraram</p>
            <p className="text-3xl font-bold text-green-500">{reservations.filter(r => r.check_in_status === 'entered').length}</p>
          </div>
          <div className="bg-[#0A0A0A] p-6 rounded-3xl border border-white/5">
            <p className="text-[9px] font-bold uppercase tracking-widest text-white/30 mb-2">Pessoas Totais</p>
            <p className="text-3xl font-bold text-[#D4AF37]">{reservations.reduce((acc, curr) => acc + (curr.num_guests || 1), 0)}</p>
          </div>
        </div>

        {/* Consolidated List */}
        <div className="bg-[#0A0A0A] rounded-[40px] border border-white/10 overflow-hidden shadow-2xl">
          <div className="p-6 bg-white/5 border-b border-white/10 flex justify-between items-center">
            <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-[#D4AF37]">Lista Consolidada - {todayBrl}</h3>
            <button 
              onClick={() => setShowQuickAdd(true)}
              className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest bg-[#D4AF37] text-black px-4 py-2 rounded-xl hover:bg-[#b8962f] transition-all"
            >
              <UserPlus size={14} /> Cadastro Rápido
            </button>
          </div>
          
          <div className="divide-y divide-white/5 max-h-[500px] overflow-y-auto custom-scrollbar">
            {loading ? (
              <div className="p-20 flex flex-col items-center opacity-20">
                <Loader2 className="animate-spin mb-4" size={40} />
                <p className="text-xs font-bold uppercase tracking-widest">Sincronizando banco de dados...</p>
              </div>
            ) : filteredReservations.length === 0 ? (
              <div className="p-20 text-center opacity-20">
                <AlertCircle className="mx-auto mb-4" size={40} />
                <p className="text-sm font-bold">Nenhum resultado encontrado.</p>
              </div>
            ) : (
              filteredReservations.map((res) => (
                <div key={res.id} className="p-5 flex items-center justify-between hover:bg-white/[0.02] transition-all group">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl overflow-hidden flex items-center justify-center border border-white/10 text-white/40 shadow-inner">
                      {res.photo ? (
                        <img src={res.photo} alt={res.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className={`w-full h-full flex items-center justify-center transition-all ${res.check_in_status === 'entered' ? 'bg-green-500/20 text-green-500' : 'bg-white/5'}`}>
                          {res.type === 'lista' ? <UserPlus size={20} /> : res.type === 'pulseira' ? <Ticket size={20} /> : <CalendarDays size={20} />}
                        </div>
                      )}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm leading-tight">{res.name}</h4>
                      <div className="flex gap-3 mt-1 items-center">
                        <span className="text-[10px] font-bold uppercase tracking-tighter text-white/30">{res.cpf || 'Sem CPF'}</span>
                        <span className="text-[10px] font-bold uppercase tracking-tighter text-[#D4AF37]/60">
                          {res.type === 'camarote' ? 'VIP' : res.type === 'pulseira' ? 'Pulseira' : res.type === 'mesa' ? 'Mesa' : 'Lista'} {res.location_id}
                        </span>
                        {res.check_in_status === 'entered' && res.entered_at && (
                          <span className="text-[10px] font-bold uppercase tracking-tighter text-green-500/80 flex items-center gap-0.5">
                            • <Clock size={10} /> Entrou às {formatToBrlDateTime(res.entered_at)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleCheckInClick(res.id, res.check_in_status)}
                      disabled={res.check_in_status === 'entered' && isReceptionist}
                      className={`p-3 rounded-2xl transition-all active:scale-90 ${
                        res.check_in_status === 'entered' 
                          ? (isReceptionist ? 'bg-green-500/20 text-green-500/50 cursor-not-allowed shadow-none' : 'bg-green-500 text-black shadow-[0_0_15px_rgba(34,197,94,0.4)]') 
                          : 'bg-white/5 text-white/20 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <CheckCircle2 size={24} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </main>

      <QuickAddModal 
        isOpen={showQuickAdd}
        onClose={() => setShowQuickAdd(false)}
        onSuccess={onQuickAddSuccess}
        onBlocked={setBlacklistAlert}
        onDuplicate={setDuplicateAlert}
        blacklist={blacklist}
        reservations={reservations}
      />

      {/* Photo Capture Modal for Check-in */}
      {photoCaptureModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="w-full max-w-md bg-[#0A0A0A] rounded-[40px] border border-white/10 p-8 shadow-2xl animate-in zoom-in-95 duration-300 text-center">
            <h3 className="text-xl font-bold uppercase tracking-widest text-[#D4AF37] mb-2">Capturar Foto</h3>
            <p className="text-white/40 text-xs font-bold uppercase tracking-widest mb-6">
              O cliente não possui foto cadastrada no Nárnia Club.
            </p>

            <div className="flex flex-col items-center justify-center py-4 border-y border-white/5 mb-6">
              <CameraCapture
                onPhotoCaptured={(photoBase64) => setCapturedPhoto(photoBase64)}
                initialPhoto={capturedPhoto}
              />
            </div>

            {/* Premium warning alert banner */}
            <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-2xl flex items-start gap-3 text-left">
              <ShieldAlert size={20} className="text-yellow-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-yellow-500 text-[10px] font-black uppercase tracking-wider">Aviso Importante</h4>
                <p className="text-white/70 text-xs mt-1 leading-normal">
                  Este cliente está sem foto no cadastro. Por favor, capture a foto dele com o tablet/câmera para concluir a entrada com maior segurança.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <button
                type="button"
                onClick={async () => {
                  if (!capturedPhoto) {
                    const confirmSkip = window.confirm("⚠️ ENTRADA SEM FOTO:\nDeseja realmente permitir a entrada do cliente SEM tirar a foto?\nA foto é recomendada para a segurança de todos no clube.");
                    if (!confirmSkip) return;
                  }
                  await toggleCheckInWithPhoto(photoCaptureModalData.reservationId, photoCaptureModalData.currentStatus, capturedPhoto);
                  setPhotoCaptureModalData(null);
                  setCapturedPhoto(null);
                }}
                className="w-full py-4 bg-[#D4AF37] text-black rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl hover:bg-[#b8962f] transition-all"
              >
                {capturedPhoto ? 'SALVAR FOTO E ENTRAR' : 'ENTRAR SEM FOTO'}
              </button>
              
              <button
                type="button"
                onClick={() => {
                  setPhotoCaptureModalData(null);
                  setCapturedPhoto(null);
                }}
                className="w-full py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-black uppercase tracking-widest text-xs transition-all border border-white/10"
              >
                CANCELAR ENTRADA
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Blacklist Alert Modal */}
      {blacklistAlert && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="w-full max-w-md bg-[#0A0A0A] rounded-[40px] border-2 border-red-500/50 p-10 shadow-[0_0_50px_rgba(239,68,68,0.2)] text-center animate-in zoom-in-95 duration-300">
            <div className="w-24 h-24 bg-red-500 rounded-full flex items-center justify-center text-white mx-auto mb-6 shadow-[0_0_30px_rgba(239,68,68,0.5)] animate-pulse">
              <ShieldAlert size={48} />
            </div>
            <h2 className="text-3xl font-black uppercase tracking-tighter text-red-500 mb-2">ENTRADA NEGADA</h2>
            <p className="text-white/40 text-xs font-bold uppercase tracking-widest mb-8">Este cliente está na Blacklist</p>
            
            <div className="bg-white/5 rounded-3xl p-6 border border-white/10 mb-8 text-left">
              <div className="mb-4">
                <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest mb-1">Nome do Cliente</p>
                <p className="text-lg font-bold text-white">{blacklistAlert.name}</p>
              </div>
              <div className="mb-4">
                <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest mb-1">Motivo do Bloqueio</p>
                <p className="text-sm font-medium text-red-400 italic">"{blacklistAlert.reason}"</p>
              </div>
              <div className="pt-4 border-t border-white/5 text-center">
                <p className="text-[9px] font-black text-white/40 uppercase tracking-widest mb-1">Tempo Restante de Banimento</p>
                <div className="text-2xl font-black text-red-500 tracking-tighter">
                  {Math.max(0, differenceInDays(parseISO(blacklistAlert.end_date), new Date()))} DIAS
                </div>
              </div>
            </div>

            <button 
              onClick={() => setBlacklistAlert(null)}
              className="w-full py-5 bg-red-500 text-white rounded-[24px] font-black uppercase tracking-widest hover:bg-red-600 transition-all active:scale-95 shadow-xl shadow-red-500/20"
            >
              ENTENDIDO
            </button>
          </div>
        </div>
      )}

      {/* Duplicate Alert Modal */}
      {duplicateAlert && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="w-full max-w-md bg-[#0A0A0A] rounded-[40px] border-2 border-[#D4AF37]/50 p-10 shadow-[0_0_50px_rgba(212,175,55,0.15)] text-center animate-in zoom-in-95 duration-300">
            <div className="w-24 h-24 bg-[#D4AF37]/10 border border-[#D4AF37]/30 rounded-full flex items-center justify-center text-[#D4AF37] mx-auto mb-6 shadow-[0_0_30px_rgba(212,175,55,0.2)] animate-pulse">
              <ShieldAlert size={48} />
            </div>
            <h2 className="text-3xl font-black uppercase tracking-tighter text-[#D4AF37] mb-2">ENTRADA DUPLICADA</h2>
            <p className="text-white/40 text-xs font-bold uppercase tracking-widest mb-8">Este cliente já está na lista ou já entrou hoje</p>
            
            <div className="bg-white/5 rounded-3xl p-6 border border-white/10 mb-8 text-left">
              <div className="mb-4">
                <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest mb-1">Nome do Cliente</p>
                <p className="text-lg font-bold text-white">{duplicateAlert.name}</p>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest mb-1">Tipo de Acesso</p>
                  <p className="text-xs font-bold text-[#D4AF37] uppercase">{duplicateAlert.type}</p>
                </div>
                {duplicateAlert.location_id && (
                  <div>
                    <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest mb-1">Mesa/Camarote</p>
                    <p className="text-xs font-bold text-white uppercase">{duplicateAlert.location_id}</p>
                  </div>
                )}
              </div>
              <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest mb-1">Status do Check-in</p>
                  <span className={`inline-block px-2.5 py-1 text-[9px] font-black uppercase rounded-lg tracking-widest ${duplicateAlert.check_in_status === 'entered' ? 'bg-green-500/10 border border-green-500/20 text-green-500' : 'bg-yellow-500/10 border border-yellow-500/20 text-yellow-500'}`}>
                    {duplicateAlert.check_in_status === 'entered' ? 'ENTROU' : 'AGUARDANDO'}
                  </span>
                </div>
                {duplicateAlert.entered_at && (
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest mb-1">Horário da Entrada</p>
                    <p className="text-xs font-bold text-white/80">{formatToBrlDateTime(duplicateAlert.entered_at)}</p>
                  </div>
                )}
              </div>
            </div>

            <button 
              onClick={() => setDuplicateAlert(null)}
              className="w-full py-5 bg-[#D4AF37] text-black rounded-[24px] font-black uppercase tracking-widest hover:bg-[#b8962f] transition-all active:scale-95 shadow-xl shadow-[#D4AF37]/20"
            >
              ENTENDIDO
            </button>
          </div>
        </div>
      )}

      {/* Floating Check-in Stats for Mobile */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-3rem)] max-w-lg bg-[#D4AF37] text-black p-4 rounded-[28px] shadow-[0_20px_50px_rgba(212,175,55,0.3)] flex items-center justify-between lg:hidden">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-black/10 rounded-full flex items-center justify-center">
            <Smartphone size={20} />
          </div>
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest opacity-60">Status de Entrada</p>
            <p className="text-sm font-black uppercase leading-none">{reservations.filter(r => r.check_in_status === 'entered').length} de {reservations.length} Confirmados</p>
          </div>
        </div>
        <div className="h-2 w-20 bg-black/20 rounded-full overflow-hidden">
          <div 
            className="h-full bg-black transition-all duration-500" 
            style={{ width: `${(reservations.filter(r => r.check_in_status === 'entered').length / (reservations.length || 1)) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
