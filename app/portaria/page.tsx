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

type Reservation = Database['public']['Tables']['reservations']['Row'];
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
  const [isAdmin, setIsAdmin] = useState(false);

  const supabase = createClient();
  const router = useRouter();
  const today = format(startOfToday(), 'yyyy-MM-dd');

  const fetchTodaysData = async () => {
    setLoading(true);
    
    // Check session first
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push('/login');
      return;
    }

    // Get user role from profiles
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();

    const role = profile?.role || 'customer';
    const isAuthorized = ['dono', 'gerente', 'portaria', 'admin'].includes(role) || session.user.email === 'narnia@admin.com';

    if (!isAuthorized) {
      console.warn('User not authorized for Portaria');
      router.push('/login');
      return;
    }

    // Show admin return button if user has admin privileges
    setIsAdmin(['dono', 'gerente', 'admin'].includes(role) || session.user.email === 'narnia@admin.com');

    const { data: resData } = await supabase
      .from('reservations')
      .select('*')
      .eq('reservation_date', today)
      .order('name');

    const { data: blData } = await supabase
      .from('blacklist')
      .select('*');

    setReservations(resData || []);
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
      r.cpf === term || 
      r.whatsapp?.includes(term) || 
      r.name.toLowerCase().includes(term.toLowerCase())
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

  const toggleCheckIn = async (id: string, currentStatus: string | null) => {
    const newStatus = currentStatus === 'entered' ? 'pending' : 'entered';
    const enteredAt = newStatus === 'entered' ? getPortoVelhoTime() : null;
    
    const { error } = await supabase
      .from('reservations')
      .update({ 
        check_in_status: newStatus,
        entered_at: enteredAt
      })
      .eq('id', id);

    if (!error) {
      setReservations(reservations.map(r => r.id === id ? { ...r, check_in_status: newStatus, entered_at: enteredAt } : r));
      if (searchResult?.id === id) {
        setSearchResult({ ...searchResult, check_in_status: newStatus, entered_at: enteredAt });
      }
    }
  };

  const onQuickAddSuccess = (newRes: Reservation) => {
    setReservations(prev => [newRes, ...prev]);
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
                    <div className="w-20 h-20 bg-black/10 rounded-[28px] flex items-center justify-center">
                      <UserCheck size={40} />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">Reserva Encontrada</p>
                      <h2 className="text-3xl font-bold tracking-tight">{searchResult.name}</h2>
                      <div className="flex gap-4 mt-2">
                        <span className="text-xs font-bold uppercase tracking-tighter bg-black/10 px-2 py-0.5 rounded">{searchResult.type} {searchResult.location_id}</span>
                        <span className="text-xs font-bold uppercase tracking-tighter bg-black/10 px-2 py-0.5 rounded">{searchResult.num_guests} Pessoas</span>
                        {searchResult.check_in_status === 'entered' && searchResult.entered_at && (
                          <span className="text-xs font-bold uppercase tracking-tighter bg-black/10 px-2 py-0.5 rounded flex items-center gap-1">
                            <Clock size={12} /> Entrou às {searchResult.entered_at.split(' ')[1]?.substring(0, 5) || searchResult.entered_at}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={() => toggleCheckIn(searchResult.id, searchResult.check_in_status)}
                    className={`w-full sm:w-auto px-10 py-5 rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl transition-all active:scale-95 ${searchResult.check_in_status === 'entered' ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-black text-white hover:bg-black/80'}`}
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
            <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-[#D4AF37]">Lista Consolidada - {today}</h3>
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
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border transition-all ${res.check_in_status === 'entered' ? 'bg-green-500/20 border-green-500/40 text-green-500' : 'bg-white/5 border-white/10 text-white/40'}`}>
                      {res.type === 'lista' ? <UserPlus size={20} /> : res.type === 'pulseira' ? <Ticket size={20} /> : <CalendarDays size={20} />}
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
                            • <Clock size={10} /> Entrou às {res.entered_at.split(' ')[1]?.substring(0, 5) || res.entered_at}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => toggleCheckIn(res.id, res.check_in_status)}
                      className={`p-3 rounded-2xl transition-all active:scale-90 ${res.check_in_status === 'entered' ? 'bg-green-500 text-black shadow-[0_0_15px_rgba(34,197,94,0.4)]' : 'bg-white/5 text-white/20 hover:bg-white/10 hover:text-white'}`}
                    >
                      <CheckCircle2 size={24} />
                    </button>
                    <button className="p-3 bg-white/5 text-white/20 rounded-2xl hover:bg-red-500/20 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100">
                      <XCircle size={24} />
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
        blacklist={blacklist}
        reservations={reservations}
      />

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
