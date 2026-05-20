'use client';

export const dynamic = 'force-dynamic';

import React, { Suspense, useRef } from 'react';
import { 
  Calendar as CalendarIcon, 
  Search, 
  MessageCircle, 
  CheckCircle, 
  XCircle, 
  Loader2, 
  Filter,
  LayoutGrid,
  Gem,
  ClipboardList,
  ShieldAlert,
  UserX
} from 'lucide-react';
import { format, startOfToday, startOfTomorrow, startOfWeek, endOfWeek, parseISO } from 'date-fns';
import { useAdminDashboard } from '@/hooks/useAdminDashboard';
import CustomAlertDialog from '@/app/components/CustomAlertDialog';
import WhatsAppModal from '@/app/components/WhatsAppModal';
import AdminLayoutShell from './AdminLayoutShell';
import TeamManager from './TeamManager';
import EventsManager from './EventsManager';
import ClientsManager from '@/src/features/admin/components/ClientsManager';
import BlacklistModal from '@/app/components/BlacklistModal';

function AdminDashboardContent() {
  const {
    currentView,
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
    alertProps
  } = useAdminDashboard();

  const datePickerRef = useRef<HTMLDivElement>(null);

  return (
    <AdminLayoutShell activeItem={currentView}>
      {/* Header */}
      <header className="p-6 lg:p-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 bg-black/40 backdrop-blur-md border-b border-white/5">
        <div>
          <h2 className="text-3xl font-serif font-black uppercase tracking-tight">
            {currentView === 'reservations' && 'Monitor de Reservas'}
            {currentView === 'blacklist' && 'Gestão de Blacklist'}
            {currentView === 'events' && 'Gestão de Eventos'}
            {currentView === 'clientes' && 'Base de Clientes'}
            {currentView === 'administradores' && 'Administradores'}
            {currentView === 'recepcionistas' && 'Recepcionistas'}
          </h2>
          <p className="text-xs font-bold uppercase tracking-widest text-white/30 mt-1">
            {currentView === 'reservations' && `Visualizando ${quickFilter}`}
            {currentView === 'blacklist' && 'Controle de Acesso de Clientes Indesejados'}
            {currentView === 'events' && 'Gerenciador de Panfletos e Atrações'}
            {currentView === 'clientes' && 'Histórico de Frequência e Restrições por CPF'}
            {currentView === 'administradores' && 'Gerenciamento de Administradores'}
            {currentView === 'recepcionistas' && 'Gerenciamento de Recepcionistas'}
          </p>
        </div>

        {(currentView === 'reservations' || currentView === 'blacklist') && (
          <div className="flex items-center gap-4 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-80">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
              <input 
                type="text" placeholder="Pesquisar..." 
                value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-6 py-4 bg-[#0A0A0A] border border-white/5 rounded-2xl text-sm focus:border-[#D4AF37]/50 focus:ring-1 focus:ring-[#D4AF37]/50 outline-none transition-all text-white"
              />
            </div>
            {currentView === 'reservations' && (
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
        {currentView === 'reservations' ? (
          <div className="space-y-8">
            {/* KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard icon={CalendarIcon} label="Total Geral" value={filteredReservations.length} color="#D4AF37" />
              <StatCard icon={LayoutGrid} label="Mesas" value={filteredReservations.filter(r => r.type === 'mesa').length} color="#D4AF37" />
              <StatCard icon={Gem} label="Camarotes" value={filteredReservations.filter(r => r.type === 'camarote').length} color="#D4AF37" />
              <StatCard icon={ClipboardList} label="Nome na Lista" value={filteredReservations.filter(r => r.type === 'lista').length} color="#D4AF37" />
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block bg-[#0A0A0A] rounded-[32px] border border-white/5 shadow-2xl overflow-x-auto custom-scrollbar">
              {loading ? (
                <div className="p-20 flex flex-col items-center justify-center opacity-30">
                  <Loader2 className="w-10 h-10 animate-spin mb-4" />
                  <p className="text-xs font-bold uppercase tracking-widest">Carregando Reservas...</p>
                </div>
              ) : filteredReservations.length === 0 ? (
                <div className="p-20 text-center opacity-30">
                  <p className="text-sm font-bold">Nenhuma reserva encontrada para este período.</p>
                </div>
              ) : (
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
                              className="p-2 bg-white/5 rounded-xl hover:bg-[#D4AF37] hover:text-black transition-all animate-none text-white"
                              title="Enviar WhatsApp"
                            >
                              <MessageCircle size={16} />
                            </button>
                            <button 
                              onClick={() => updateStatus(res.id, 'confirmed')}
                              className="p-2 bg-white/5 rounded-xl hover:bg-green-500 hover:text-black transition-all text-white"
                              title="Confirmar"
                            >
                              <CheckCircle size={16} />
                            </button>
                            <button 
                              onClick={() => updateStatus(res.id, 'cancelled')}
                              className="p-2 bg-white/5 rounded-xl hover:bg-red-500 hover:text-black transition-all text-white"
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
              )}
            </div>

            {/* Mobile Cards View */}
            <div className="block md:hidden space-y-4">
              {filteredReservations.map((res) => (
                <div 
                  key={res.id} 
                  className={`bg-[#0A0A0A] border rounded-[24px] p-5 space-y-4 transition-all ${
                    res.status === 'cancelled' ? 'border-red-500/10 opacity-70' :
                    res.status === 'confirmed' ? 'border-green-500/20' : 'border-white/5'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-sm text-white">{res.name}</h4>
                      <p className="text-[10px] text-white/40 font-medium mt-1">{res.whatsapp}</p>
                      <p className="text-[10px] text-white/40 font-medium">{res.cpf || 'Sem CPF'}</p>
                    </div>
                    <StatusBadge status={res.status} />
                  </div>

                  <div className="grid grid-cols-2 gap-4 border-y border-white/5 py-3 text-xs">
                    <div>
                      <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest">Tipo</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        {res.type === 'mesa' ? <LayoutGrid size={12} className="text-[#D4AF37]" /> : res.type === 'camarote' ? <Gem size={12} className="text-purple-500" /> : <ClipboardList size={12} className="text-blue-500" />}
                        <span className="font-bold uppercase tracking-tighter text-white/80">{res.type} {res.location_id}</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest">Data / Hora</p>
                      <p className="font-bold text-white mt-1">
                        {format(parseISO(res.reservation_date), 'dd/MM/yyyy')} <span className="text-[#D4AF37] ml-1">{res.reservation_time}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button 
                      onClick={() => {
                        setSelectedReservation(res);
                        setIsWhatsAppModalOpen(true);
                      }}
                      className="flex-1 py-3 bg-white/5 hover:bg-[#D4AF37] hover:text-black rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all text-white"
                    >
                      <MessageCircle size={14} /> WhatsApp
                    </button>
                    <button 
                      onClick={() => updateStatus(res.id, 'confirmed')}
                      className="p-3 bg-green-500/10 text-green-500 border border-green-500/20 hover:bg-green-500 hover:text-white rounded-xl transition-all"
                      title="Confirmar"
                    >
                      <CheckCircle size={14} />
                    </button>
                    <button 
                      onClick={() => updateStatus(res.id, 'cancelled')}
                      className="p-3 bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white rounded-xl transition-all"
                      title="Cancelar"
                    >
                      <XCircle size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : currentView === 'clientes' ? (
          <div className="max-w-7xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4">
            <ClientsManager onBlockRequest={(client) => {
              setBlacklistInitialData(client);
              setIsBlacklistModalOpen(true);
            }} />
          </div>
        ) : currentView === 'events' ? (
          <div className="max-w-7xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4">
            <EventsManager />
          </div>
        ) : currentView === 'administradores' ? (
          <div className="max-w-7xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4">
            <TeamManager role="admin" />
          </div>
        ) : currentView === 'recepcionistas' ? (
          <div className="max-w-7xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4">
            <TeamManager role="receptionist" />
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
                 b.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().includes(searchTerm.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()) ||
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
                      <p className="text-sm font-medium leading-relaxed italic">&quot;{b.reason || 'Não informado'}&quot;</p>
                    </div>
                     <button 
                       onClick={() => removeFromBlacklist(b.id)}
                       className="w-full py-3 bg-white/5 hover:bg-red-500/10 hover:text-red-500 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all text-white/80"
                     >
                       Remover da Lista
                     </button>
                 </div>
               ))}
             </div>
          </div>
        )}
      </div>

      <BlacklistModal 
        isOpen={isBlacklistModalOpen} 
        onClose={() => {
          setIsBlacklistModalOpen(false);
          setBlacklistInitialData(null);
        }} 
        onSuccess={addToBlacklist} 
        initialData={blacklistInitialData}
      />

      {selectedReservation && (
        <WhatsAppModal 
          isOpen={isWhatsAppModalOpen} 
          onClose={() => setIsWhatsAppModalOpen(false)} 
          reservation={selectedReservation} 
        />
      )}

      <CustomAlertDialog {...alertProps} />
    </AdminLayoutShell>
  );
}

export default function AdminDashboard() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-[#D4AF37] animate-spin" />
          <p className="text-xs uppercase tracking-[0.2em] text-[#D4AF37] font-serif font-black">Carregando painel...</p>
        </div>
      </div>
    }>
      <AdminDashboardContent />
    </Suspense>
  );
}

function StatCard({ icon: Icon, label, value, color }: any) {
  return (
    <div className="bg-[#0A0A0A] p-8 rounded-[32px] border border-white/5 flex flex-col gap-4 group hover:border-[#D4AF37]/30 transition-all">
      <div className="flex items-center justify-between">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-white/5 group-hover:scale-110 transition-transform animate-none" style={{ color }}>
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
