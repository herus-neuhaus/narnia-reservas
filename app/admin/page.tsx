'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Calendar as CalendarIcon, 
  Users, 
  DollarSign, 
  Search, 
  MessageCircle, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertCircle, 
  LogOut, 
  Loader2, 
  ChevronDown,
  Filter,
  CalendarDays,
  ArrowRight,
  ShieldAlert,
  UserX,
  LayoutGrid,
  Gem,
  ClipboardList,
  UserPlus,
  X
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Database } from '@/lib/supabase/database.types';
import { 
  format, 
  startOfToday, 
  startOfTomorrow, 
  startOfWeek, 
  endOfWeek, 
  startOfMonth, 
  endOfMonth, 
  parseISO,
  isWithinInterval,
  isSameDay
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

import WhatsAppModal from '@/app/components/WhatsAppModal';
import BlacklistModal from '@/app/components/BlacklistModal';
import EventsManager from './EventsManager';
import ClientsManager from './ClientsManager';

type Reservation = Database['public']['Tables']['reservations']['Row'];
type Blacklist = Database['public']['Tables']['blacklist']['Row'];
type ReservationStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed';

export default function AdminDashboard() {
  const [view, setView] = useState<'reservations' | 'blacklist' | 'events' | 'clientes'>('reservations');
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [blacklist, setBlacklist] = useState<Blacklist[]>([]);
  const [isBlacklistModalOpen, setIsBlacklistModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const formatCPF = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1');
  };
  
  // WhatsApp Modal State
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  
  // Date states
  const [startDate, setStartDate] = useState(format(startOfToday(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(startOfToday(), 'yyyy-MM-dd'));
  const [quickFilter, setQuickFilter] = useState('Hoje');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  
  const supabase = createClient();
  const router = useRouter();
  const datePickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }

      // Check role dynamically from profiles table
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();
        
      const role = profile?.role || 'customer';
      const isAuthAdmin = ['dono', 'gerente', 'admin'].includes(role) || session.user.email === 'narnia@admin.com';

      if (!isAuthAdmin) {
        console.warn('User not authorized for Admin panel');
        if (role === 'portaria') {
          router.push('/portaria');
        } else {
          router.push('/login');
        }
      } else {
        setIsAuthorized(true);
      }
    };
    checkAuth();
  }, [supabase, router]);

  const fetchReservations = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('reservations')
      .select('*')
      .gte('reservation_date', startDate)
      .lte('reservation_date', endDate)
      .order('reservation_date', { ascending: true })
      .order('reservation_time', { ascending: true });

    if (!error) {
      setReservations(data || []);
    }
    setLoading(false);
  }, [supabase, startDate, endDate]);

  const fetchBlacklist = useCallback(async () => {
    const { data } = await supabase.from('blacklist').select('*').order('created_at', { ascending: false });
    setBlacklist(data || []);
  }, [supabase]);

  useEffect(() => {
    if (view === 'reservations') fetchReservations();
    else fetchBlacklist();
  }, [view, fetchReservations, fetchBlacklist]);

  const updateStatus = async (id: string, newStatus: ReservationStatus) => {
    const { error } = await supabase
      .from('reservations')
      .update({ status: newStatus })
      .eq('id', id);

    if (!error) {
      setReservations(prev => prev.map(res => res.id === id ? { ...res, status: newStatus } : res));
    } else {
      alert('Erro ao atualizar status: ' + error.message);
    }
  };

  const addToBlacklist = async (cpf: string, name: string, reason: string, duration: string) => {
    const months = parseInt(duration);
    const endDate = months === 0 
      ? format(addMonths(new Date(), 1200), 'yyyy-MM-dd') // 100 years = Permanent
      : format(addMonths(new Date(), months), 'yyyy-MM-dd');

    const { error } = await supabase
      .from('blacklist')
      .insert([{
        cpf,
        name,
        reason,
        end_date: endDate
      }]);
    
    if (!error) {
      fetchBlacklist();
      setIsBlacklistModalOpen(false);
    }
  };

  const removeFromBlacklist = async (id: string) => {
    const { error } = await supabase
      .from('blacklist')
      .delete()
      .eq('id', id);
    
    if (!error) fetchBlacklist();
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const filteredReservations = reservations.filter(res => 
    res.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    res.whatsapp.includes(searchTerm) ||
    res.cpf?.includes(searchTerm)
  );

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-[#D4AF37] animate-spin" />
          <p className="text-xs uppercase tracking-[0.2em] text-[#D4AF37] font-serif font-black">Autenticando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black font-sans text-white flex flex-col lg:flex-row overflow-hidden">
      
      {/* Sidebar */}
      <aside className="w-full lg:w-72 bg-black border-r border-white/5 flex flex-col shrink-0 overflow-y-auto">
        <div className="p-8">
          <h1 className="text-2xl font-serif font-black tracking-widest text-[#D4AF37] uppercase">Nárnia</h1>
          <p className="text-[10px] font-black tracking-[0.4em] text-white/20 uppercase mt-1">Management Panel</p>
        </div>

        <nav className="flex-1 px-4 space-y-2">
          <button 
            onClick={() => setView('reservations')}
            className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-bold uppercase tracking-widest text-xs transition-all ${view === 'reservations' ? 'bg-[#D4AF37] text-black shadow-[0_0_20px_rgba(212,175,55,0.2)]' : 'text-white/40 hover:bg-white/5'}`}
          >
            <CalendarIcon size={18} /> Reservas & Listas
          </button>
          <button 
            onClick={() => setView('clientes')}
            className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-bold uppercase tracking-widest text-xs transition-all ${view === 'clientes' ? 'bg-[#D4AF37] text-black shadow-[0_0_20px_rgba(212,175,55,0.2)]' : 'text-white/40 hover:bg-white/5'}`}
          >
            <Users size={18} /> Clientes
          </button>
          <button 
            onClick={() => setView('blacklist')}
            className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-bold uppercase tracking-widest text-xs transition-all ${view === 'blacklist' ? 'bg-red-500 text-white shadow-[0_0_20px_rgba(239,68,68,0.2)]' : 'text-white/40 hover:bg-white/5'}`}
          >
            <ShieldAlert size={18} /> Blacklist
          </button>
          <button 
            onClick={() => setView('events')}
            className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-bold uppercase tracking-widest text-xs transition-all ${view === 'events' ? 'bg-[#D4AF37] text-black shadow-[0_0_20px_rgba(212,175,55,0.2)]' : 'text-white/40 hover:bg-white/5'}`}
          >
            <CalendarDays size={18} /> Eventos
          </button>
          <button 
            onClick={() => router.push('/portaria')}
            className="w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-bold uppercase tracking-widest text-xs text-white/40 hover:bg-white/5 transition-all"
          >
            <UserPlus size={18} /> Tela da Portaria
          </button>
        </nav>

        <div className="p-6 border-t border-white/5">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-bold uppercase tracking-widest text-xs text-red-500/60 hover:text-red-500 hover:bg-red-500/5 transition-all"
          >
            <LogOut size={18} /> Sair do Painel
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-screen overflow-hidden">
        
        {/* Header */}
        <header className="p-6 lg:p-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 bg-black/40 backdrop-blur-md border-b border-white/5">
          <div>
            <h2 className="text-3xl font-serif font-black uppercase tracking-tight">
              {view === 'reservations' ? 'Monitor de Reservas' : view === 'blacklist' ? 'Gestão de Blacklist' : view === 'events' ? 'Gestão de Eventos' : 'Base de Clientes'}
            </h2>
            <p className="text-xs font-bold uppercase tracking-widest text-white/30 mt-1">
              {view === 'reservations' ? `Visualizando ${quickFilter}` : view === 'blacklist' ? 'Controle de Acesso de Clientes Indesejados' : view === 'events' ? 'Gerenciador de Panfletos e Atrações' : 'Histórico de Frequência e Restrições por CPF'}
            </p>
          </div>

          {(view === 'reservations' || view === 'blacklist') && (
            <div className="flex items-center gap-4 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-80">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
                <input 
                  type="text" placeholder="Pesquisar..." 
                  value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-6 py-4 bg-[#0A0A0A] border border-white/5 rounded-2xl text-sm focus:border-[#D4AF37]/50 focus:ring-1 focus:ring-[#D4AF37]/50 outline-none transition-all"
                />
              </div>
              {view === 'reservations' && (
                <div className="relative">
                  <button 
                    onClick={() => setShowDatePicker(!showDatePicker)}
                    className="p-4 bg-[#0A0A0A] border border-white/5 rounded-2xl hover:border-[#D4AF37]/50 transition-all text-[#D4AF37] flex items-center gap-2"
                  >
                    <Filter size={20} />
                    <span className="text-xs font-bold uppercase hidden sm:inline">Personalizado</span>
                  </button>

                  <div className="hidden lg:flex items-center gap-1 bg-[#0A0A0A] p-1 rounded-2xl border border-white/5">
                    {[
                      { label: 'Hoje', start: startOfToday(), end: startOfToday() },
                      { label: 'Amanhã', start: startOfTomorrow(), end: startOfTomorrow() },
                      { label: 'Semana', start: startOfWeek(new Date(), { weekStartsOn: 0 }), end: endOfWeek(new Date(), { weekStartsOn: 0 }) },
                    ].map((f) => (
                      <button
                        key={f.label}
                        onClick={() => {
                          setStartDate(format(f.start, 'yyyy-MM-dd'));
                          setEndDate(format(f.end, 'yyyy-MM-dd'));
                          setQuickFilter(f.label);
                        }}
                        className={`px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${quickFilter === f.label ? 'bg-[#D4AF37] text-black' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                  
                  {showDatePicker && (
                    <div ref={datePickerRef} className="absolute right-0 mt-4 p-6 bg-[#0A0A0A] border border-white/10 rounded-[32px] shadow-2xl z-50 w-72 space-y-4 animate-in fade-in slide-in-from-top-2">
                      <p className="text-[10px] font-black uppercase tracking-widest text-white/30">Período</p>
                      <div className="space-y-4">
                        <div>
                          <label className="text-[9px] font-bold uppercase text-white/20 ml-1">De</label>
                          <input 
                            type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                            className="w-full mt-1 bg-black border border-white/5 rounded-xl px-4 py-2 text-sm text-white"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold uppercase text-white/20 ml-1">Até</label>
                          <input 
                            type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                            className="w-full mt-1 bg-black border border-white/5 rounded-xl px-4 py-2 text-sm text-white"
                          />
                        </div>
                      </div>
                      <button 
                        onClick={() => {
                          setQuickFilter(`${format(parseISO(startDate), 'dd/MM')} - ${format(parseISO(endDate), 'dd/MM')}`);
                          setShowDatePicker(false);
                        }}
                        className="w-full py-3 bg-[#D4AF37] text-black rounded-xl text-[10px] font-black uppercase tracking-widest"
                      >
                        Aplicar Filtro
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </header>

        {/* Content Area */}
        <div className="flex-1 p-6 lg:p-10 overflow-y-auto custom-scrollbar">
          {view === 'reservations' ? (
            <div className="space-y-8">
              {/* KPIs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard icon={CalendarIcon} label="Total Geral" value={reservations.length} color="#D4AF37" />
                <StatCard icon={LayoutGrid} label="Mesas" value={reservations.filter(r => r.type === 'mesa').length} color="#D4AF37" />
                <StatCard icon={Gem} label="Camarotes" value={reservations.filter(r => r.type === 'camarote').length} color="#D4AF37" />
                <StatCard icon={ClipboardList} label="Nome na Lista" value={reservations.filter(r => r.type === 'lista').length} color="#D4AF37" />
              </div>

              {/* Table */}
              <div className="bg-[#0A0A0A] rounded-[32px] border border-white/5 shadow-2xl overflow-x-auto custom-scrollbar">
                <table className="w-full min-w-[800px] text-left border-collapse">
                  <thead>
                    <tr className="bg-white/5 border-b border-white/5">
                      <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-white/30">Cliente</th>
                      <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-white/30">Tipo</th>
                      <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-white/30">Data/Hora</th>
                      <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-white/30">Status</th>
                      <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-white/30 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredReservations.map((res) => (
                      <tr key={res.id} className="hover:bg-white/[0.02] transition-colors group">
                        <td className="px-6 py-5">
                          <div className="flex flex-col">
                            <span className="font-bold text-sm">{res.name}</span>
                            <span className="text-[10px] text-white/40 font-medium">{res.whatsapp} • {res.cpf || 'Sem CPF'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-2">
                            {res.type === 'mesa' ? <LayoutGrid size={14} className="text-[#D4AF37]" /> : res.type === 'camarote' ? <Gem size={14} className="text-purple-500" /> : <ClipboardList size={14} className="text-blue-500" />}
                            <span className="text-xs font-bold uppercase tracking-tighter opacity-80">{res.type} {res.location_id}</span>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex flex-col">
                            <span className="text-xs font-bold">{format(parseISO(res.reservation_date), 'dd/MM/yyyy')}</span>
                            <span className="text-[10px] font-bold text-[#D4AF37]">{res.reservation_time}</span>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <StatusBadge status={res.status} />
                        </td>
                        <td className="px-6 py-5 text-right">
                          <div className="flex items-center justify-end gap-2 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => {
                                setSelectedReservation(res);
                                setIsWhatsAppModalOpen(true);
                              }}
                              className="p-2 bg-white/5 rounded-xl hover:bg-[#D4AF37] hover:text-black transition-all"
                              title="Enviar WhatsApp"
                            >
                              <MessageCircle size={16} />
                            </button>
                            <button 
                              onClick={() => updateStatus(res.id, 'confirmed')}
                              className="p-2 bg-white/5 rounded-xl hover:bg-green-500 transition-all"
                              title="Confirmar"
                            >
                              <CheckCircle size={16} />
                            </button>
                            <button 
                              onClick={() => updateStatus(res.id, 'cancelled')}
                              className="p-2 bg-white/5 rounded-xl hover:bg-red-500 transition-all"
                              title="Cancelar"
                            >
                              <XCircle size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : view === 'clientes' ? (
            <div className="max-w-7xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4">
              <ClientsManager />
            </div>
          ) : view === 'events' ? (
            <div className="max-w-7xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4">
              <EventsManager />
            </div>
          ) : (
            /* Blacklist View */
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
               <div className="bg-[#0A0A0A] rounded-[32px] p-8 border border-red-500/20 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-[0_0_50px_rgba(239,68,68,0.05)]">
                 <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center text-red-500">
                      <ShieldAlert size={32} />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold">Bloquear Novo Cliente</h3>
                      <p className="text-sm text-white/40">Impedir a entrada de CPFs específicos em todas as noites.</p>
                    </div>
                 </div>
                  <button 
                    onClick={() => setIsBlacklistModalOpen(true)}
                    className="px-8 py-4 bg-red-500 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-red-600 transition-all active:scale-95 shadow-xl shadow-red-500/20"
                  >
                    Adicionar à Blacklist
                  </button>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 {blacklist.filter(b => 
                   !searchTerm ||
                   b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                   b.cpf?.replace(/\D/g, '').includes(searchTerm.replace(/\D/g, ''))
                 ).map(b => (
                   <div key={b.id} className="bg-[#0A0A0A] rounded-[32px] border border-white/5 p-6 hover:border-red-500/40 transition-all">
                      <div className="flex justify-between items-start mb-4">
                        <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center text-red-500">
                          <UserX size={24} />
                        </div>
                        <span className="px-3 py-1 bg-red-500/10 text-red-500 text-[10px] font-black rounded-full border border-red-500/20 uppercase">Bloqueado</span>
                      </div>
                      <h4 className="text-lg font-bold truncate">{b.name}</h4>
                      <p className="text-xs font-bold text-white/30 uppercase tracking-widest mb-4">CPF: {b.cpf}</p>
                      <div className="bg-black/40 rounded-2xl p-4 border border-white/5 mb-6">
                        <p className="text-[10px] font-bold text-white/20 uppercase mb-1">Motivo do Bloqueio</p>
                        <p className="text-sm font-medium leading-relaxed italic">"{b.reason || 'Não informado'}"</p>
                      </div>
                       <button 
                         onClick={() => removeFromBlacklist(b.id)}
                         className="w-full py-3 bg-white/5 hover:bg-red-500/10 hover:text-red-500 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all"
                       >
                         Remover da Lista
                       </button>
                   </div>
                 ))}
               </div>
            </div>
          )}
        </div>
      </main>

      <BlacklistModal 
        isOpen={isBlacklistModalOpen} 
        onClose={() => setIsBlacklistModalOpen(false)} 
        onSuccess={addToBlacklist} 
      />

      {selectedReservation && (
        <WhatsAppModal 
          isOpen={isWhatsAppModalOpen} 
          onClose={() => setIsWhatsAppModalOpen(false)} 
          reservation={selectedReservation} 
        />
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: any) {
  return (
    <div className="bg-[#0A0A0A] p-8 rounded-[32px] border border-white/5 flex flex-col gap-4 group hover:border-[#D4AF37]/30 transition-all">
      <div className="flex items-center justify-between">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-white/5 group-hover:scale-110 transition-transform" style={{ color }}>
          <Icon size={24} />
        </div>
        <div className="w-2 h-2 rounded-full bg-[#D4AF37]/20" />
      </div>
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20 mb-1">{label}</p>
        <p className="text-4xl font-serif font-black">{value}</p>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string | null }) {
  const s = (status || 'pending').toLowerCase();
  const config: any = {
    pending: { bg: 'bg-amber-500/10', text: 'text-amber-500', label: 'Pendente' },
    confirmed: { bg: 'bg-green-500/10', text: 'text-green-500', label: 'Confirmado' },
    cancelled: { bg: 'bg-red-500/10', text: 'text-red-500', label: 'Cancelado' },
    completed: { bg: 'bg-blue-500/10', text: 'text-blue-500', label: 'Concluído' },
  };
  const c = config[s] || config.pending;
  return (
    <span className={`px-3 py-1.5 rounded-xl ${c.bg} ${c.text} text-[10px] font-black uppercase tracking-widest border border-current/20`}>
      {c.label}
    </span>
  );
}

function addMonths(date: Date, months: number) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}
