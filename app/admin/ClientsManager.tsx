'use client';

import React, { useState, useEffect } from 'react';
import { 
  Search, 
  User, 
  Calendar, 
  Clock, 
  ShieldAlert, 
  ChevronDown, 
  ChevronUp, 
  History, 
  Smartphone, 
  AlertTriangle,
  Award,
  CheckCircle,
  XCircle,
  Loader2
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { format, parseISO, differenceInYears } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ClientRecord {
  cpf: string;
  name: string;
  whatsapp: string;
  birth_date: string | null;
  reservations: any[];
  isBlacklisted: boolean;
  blacklistInfo: any | null;
}

export default function ClientsManager() {
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'blacklisted' | 'frequent'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'reservations' | 'last_entry'>('reservations');
  const [expandedCpf, setExpandedCpf] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    const fetchClientsData = async () => {
      setLoading(true);
      try {
        // Fetch all reservations
        const { data: resData, error: resError } = await supabase
          .from('reservations')
          .select('*')
          .order('reservation_date', { ascending: false })
          .order('reservation_time', { ascending: false });

        if (resError) throw resError;

        // Fetch blacklist
        const { data: blackData, error: blackError } = await supabase
          .from('blacklist')
          .select('*');

        if (blackError) throw blackError;

        const blacklistMap = new Map<string, any>();
        if (blackData) {
          blackData.forEach(b => {
            if (b.cpf) {
              const cleanCpf = b.cpf.replace(/\D/g, '');
              blacklistMap.set(cleanCpf, b);
            }
          });
        }

        // Group reservations by CPF
        const clientGroups = new Map<string, any[]>();
        if (resData) {
          resData.forEach(r => {
            if (r.cpf) {
              const cleanCpf = r.cpf.replace(/\D/g, '');
              if (cleanCpf.length === 11) { // Standard CPF length
                if (!clientGroups.has(cleanCpf)) {
                  clientGroups.set(cleanCpf, []);
                }
                clientGroups.get(cleanCpf)!.push(r);
              }
            }
          });
        }

        // Construct client records
        const clientRecords: ClientRecord[] = [];
        clientGroups.forEach((resList, cleanCpf) => {
          // Latest reservation provides default info
          const latestRes = resList[0];
          
          // Re-format CPF nicely
          const formattedCpf = latestRes.cpf || cleanCpf;
          
          const isBlacklisted = blacklistMap.has(cleanCpf);
          const blacklistInfo = blacklistMap.get(cleanCpf) || null;

          clientRecords.push({
            cpf: formattedCpf,
            name: latestRes.name,
            whatsapp: latestRes.whatsapp,
            birth_date: latestRes.birth_date || null,
            reservations: resList,
            isBlacklisted,
            blacklistInfo
          });
        });

        setClients(clientRecords);
      } catch (err) {
        console.error('Error fetching clients:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchClientsData();
  }, [supabase]);

  // Filter & Search & Sort
  const cleanSearch = searchTerm.replace(/\D/g, '');
  const filteredClients = clients.filter(c => {
    // Search
    const matchesName = c.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCpf = cleanSearch ? c.cpf.replace(/\D/g, '').includes(cleanSearch) : false;
    const matchesWhatsapp = cleanSearch ? c.whatsapp.replace(/\D/g, '').includes(cleanSearch) : false;

    const matchesSearch = matchesName || matchesCpf || matchesWhatsapp;

    if (!matchesSearch) return false;

    // Filter type
    if (filterType === 'blacklisted') return c.isBlacklisted;
    if (filterType === 'frequent') {
      const entryCount = c.reservations.filter(r => r.check_in_status === 'entered').length;
      return entryCount >= 2;
    }

    return true;
  }).sort((a, b) => {
    if (sortBy === 'name') {
      return a.name.localeCompare(b.name);
    }
    if (sortBy === 'reservations') {
      return b.reservations.length - a.reservations.length;
    }
    if (sortBy === 'last_entry') {
      const lastA = a.reservations.find(r => r.check_in_status === 'entered')?.reservation_date || '1970-01-01';
      const lastB = b.reservations.find(r => r.check_in_status === 'entered')?.reservation_date || '1970-01-01';
      return lastB.localeCompare(lastA);
    }
    return 0;
  });

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

  const getAge = (birthDateStr: string | null) => {
    if (!birthDateStr) return 'Não informado';
    try {
      const age = differenceInYears(new Date(), parseISO(birthDateStr));
      return `${age} anos (${format(parseISO(birthDateStr), 'dd/MM/yyyy')})`;
    } catch {
      return 'Inválido';
    }
  };

  const getEntryStats = (resList: any[]) => {
    const total = resList.length;
    const entered = resList.filter(r => r.check_in_status === 'entered').length;
    const percentage = total > 0 ? Math.round((entered / total) * 100) : 0;
    return { total, entered, percentage };
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 opacity-40">
        <Loader2 className="animate-spin text-[#D4AF37] mb-4" size={40} />
        <p className="text-xs font-bold uppercase tracking-widest text-[#D4AF37]">Carregando base de clientes...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search and Filters Header */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-[#0A0A0A] p-6 rounded-3xl border border-white/5 shadow-xl">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
          <input 
            type="text" 
            placeholder="Buscar por nome, CPF ou WhatsApp..." 
            value={searchTerm} 
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-6 py-3.5 bg-black border border-white/5 rounded-2xl text-xs focus:border-[#D4AF37]/50 outline-none text-white font-medium"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Quick Filters */}
          <div className="bg-black p-1 rounded-2xl border border-white/5 flex gap-1">
            {[
              { id: 'all', label: 'Todos' },
              { id: 'frequent', label: 'Frequentes' },
              { id: 'blacklisted', label: 'Restrição' }
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setFilterType(t.id as any)}
                className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filterType === t.id ? 'bg-[#D4AF37] text-black shadow-md' : 'text-white/40 hover:text-white'}`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Sort Toggles */}
          <div className="bg-black p-1 rounded-2xl border border-white/5 flex gap-1">
            {[
              { id: 'reservations', label: 'Mais Reservas' },
              { id: 'last_entry', label: 'Última Entrada' },
              { id: 'name', label: 'Nome' }
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setSortBy(t.id as any)}
                className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${sortBy === t.id ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white'}`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Customers List */}
      <div className="space-y-4">
        {filteredClients.length === 0 ? (
          <div className="bg-[#0A0A0A] p-20 text-center rounded-[32px] border border-white/5 opacity-20">
            <User className="mx-auto mb-4" size={48} />
            <p className="text-sm font-bold uppercase tracking-widest">Nenhum cliente encontrado.</p>
          </div>
        ) : (
          filteredClients.map((client) => {
            const isExpanded = expandedCpf === client.cpf;
            const stats = getEntryStats(client.reservations);
            const lastEntry = client.reservations.find(r => r.check_in_status === 'entered');
            const ageInfo = getAge(client.birth_date);

            return (
              <div 
                key={client.cpf}
                className={`bg-[#0A0A0A] border rounded-[32px] transition-all overflow-hidden ${
                  client.isBlacklisted ? 'border-red-500/20 hover:border-red-500/40 shadow-[0_0_30px_rgba(239,68,68,0.02)]' : 
                  isExpanded ? 'border-[#D4AF37]/30 shadow-lg shadow-black' : 'border-white/5 hover:border-white/10'
                }`}
              >
                {/* Main Client Row Info */}
                <div 
                  onClick={() => setExpandedCpf(isExpanded ? null : client.cpf)}
                  className="p-6 sm:p-8 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 cursor-pointer select-none"
                >
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 w-full lg:w-auto">
                    {/* Avatar Badge */}
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border shrink-0 transition-transform ${
                      client.isBlacklisted ? 'bg-red-500/10 border-red-500/30 text-red-500' :
                      stats.entered >= 2 ? 'bg-[#D4AF37]/10 border-[#D4AF37]/20 text-[#D4AF37]' :
                      'bg-white/5 border-white/10 text-white/30'
                    }`}>
                      {client.isBlacklisted ? (
                        <ShieldAlert size={28} />
                      ) : stats.entered >= 2 ? (
                        <Award size={28} className="animate-pulse" />
                      ) : (
                        <User size={28} />
                      )}
                    </div>

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-bold tracking-tight">{client.name}</h3>
                        {client.isBlacklisted && (
                          <span className="px-2 py-0.5 bg-red-500/10 text-red-500 border border-red-500/20 text-[9px] font-black uppercase rounded-md tracking-widest">
                            BLACKLIST
                          </span>
                        )}
                        {stats.entered >= 2 && !client.isBlacklisted && (
                          <span className="px-2 py-0.5 bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/20 text-[9px] font-black uppercase rounded-md tracking-widest">
                            FREQUENTE
                          </span>
                        )}
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-white/40 font-medium">
                        <span>CPF: {client.cpf}</span>
                        <span className="flex items-center gap-1"><Smartphone size={12} /> {client.whatsapp}</span>
                        <span>Idade: {ageInfo.split(' ')[0]} anos</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 sm:gap-8 w-full lg:w-auto justify-between lg:justify-end border-t lg:border-t-0 pt-4 lg:pt-0 border-white/5">
                    {/* Entry stats summary */}
                    <div className="text-left sm:text-right">
                      <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest mb-1">Presença na Casa</p>
                      <div className="flex items-baseline gap-1">
                        <span className="text-xl font-bold">{stats.entered}</span>
                        <span className="text-xs text-white/30">/ {stats.total} idas</span>
                        <span className="text-[10px] font-bold text-green-500/80 ml-2">({stats.percentage}%)</span>
                      </div>
                    </div>

                    {/* Last Entry info */}
                    <div className="text-left sm:text-right">
                      <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest mb-1">Última Visita</p>
                      {lastEntry ? (
                        <div className="flex items-center gap-1.5 text-xs font-bold text-[#D4AF37]">
                          <Calendar size={12} />
                          <span>{format(parseISO(lastEntry.reservation_date), 'dd/MM/yyyy')}</span>
                          {lastEntry.entered_at && (
                            <span className="text-white/40 font-medium">
                              • {formatToBrlDateTime(lastEntry.entered_at).split(' ')[1] || ''}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-white/30 font-medium">Nenhuma entrada</span>
                      )}
                    </div>

                    {/* Action Arrow */}
                    <div className="p-2 bg-white/5 rounded-xl hover:bg-white/10 transition-colors text-white/40">
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                  </div>
                </div>

                {/* Expanded details section */}
                {isExpanded && (
                  <div className="border-t border-white/5 bg-black/40 p-6 sm:p-8 space-y-6 animate-in slide-in-from-top-4 duration-300">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      
                      {/* Left: General Client Information Card */}
                      <div className="bg-black/60 p-6 rounded-2xl border border-white/5 space-y-4">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-[#D4AF37] border-b border-white/5 pb-2">Informações Cadastrais</h4>
                        <div className="space-y-3 text-xs">
                          <div>
                            <span className="text-white/30 block mb-0.5">Nome Completo</span>
                            <span className="font-bold text-sm">{client.name}</span>
                          </div>
                          <div>
                            <span className="text-white/30 block mb-0.5">CPF</span>
                            <span className="font-bold">{client.cpf}</span>
                          </div>
                          <div>
                            <span className="text-white/30 block mb-0.5">WhatsApp / Celular</span>
                            <span className="font-bold text-[#D4AF37] flex items-center gap-1.5">
                              <Smartphone size={14} /> {client.whatsapp}
                            </span>
                          </div>
                          <div>
                            <span className="text-white/30 block mb-0.5">Data de Nascimento</span>
                            <span className="font-bold">{ageInfo}</span>
                          </div>
                        </div>
                      </div>

                      {/* Middle: Restriction or Blacklist Card */}
                      <div className="bg-black/60 p-6 rounded-2xl border border-white/5 space-y-4">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-red-500 border-b border-white/5 pb-2">Segurança & Restrições</h4>
                        {client.isBlacklisted && client.blacklistInfo ? (
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 text-red-500">
                              <AlertTriangle size={18} />
                              <span className="text-xs font-black uppercase tracking-wider">Restrição Ativa</span>
                            </div>
                            <div className="bg-red-500/5 p-4 rounded-xl border border-red-500/10 text-xs space-y-2">
                              <div>
                                <span className="text-white/30 block">Motivo</span>
                                <span className="font-bold text-white/80">"{client.blacklistInfo.reason || 'Sem motivo informado'}"</span>
                              </div>
                              <div>
                                <span className="text-white/30 block">Vigência</span>
                                <span className="font-bold text-red-400">Até {format(parseISO(client.blacklistInfo.end_date), 'dd/MM/yyyy')}</span>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-3 text-xs">
                            <div className="flex items-center gap-2 text-green-500">
                              <CheckCircle size={18} />
                              <span className="text-xs font-black uppercase tracking-wider">Acesso Liberado</span>
                            </div>
                            <p className="text-white/40 leading-relaxed">
                              O cliente não possui pendências ou restrições de entrada registradas no Nárnia Club. Acesso autorizado pela portaria.
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Right: Summary of Reservations & Entry Behaviour */}
                      <div className="bg-black/60 p-6 rounded-2xl border border-white/5 space-y-4">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-500 border-b border-white/5 pb-2">Hábito de Consumo</h4>
                        <div className="space-y-3 text-xs">
                          <div className="flex justify-between items-center bg-white/5 p-3 rounded-xl">
                            <span className="text-white/50">Reservas na Lista</span>
                            <span className="font-bold">{client.reservations.filter(r => r.type === 'lista').length}</span>
                          </div>
                          <div className="flex justify-between items-center bg-white/5 p-3 rounded-xl">
                            <span className="text-white/50">Reservas de Mesa</span>
                            <span className="font-bold text-[#D4AF37]">{client.reservations.filter(r => r.type === 'mesa').length}</span>
                          </div>
                          <div className="flex justify-between items-center bg-white/5 p-3 rounded-xl">
                            <span className="text-white/50">Camarotes / VIPs</span>
                            <span className="font-bold text-purple-400">{client.reservations.filter(r => r.type === 'camarote').length}</span>
                          </div>
                        </div>
                      </div>

                    </div>

                    {/* Timeline of past visits */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                        <History size={16} className="text-[#D4AF37]" />
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-white/60">Histórico de Visitas</h4>
                      </div>
                      
                      <div className="max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                        <div className="flex flex-col gap-4">
                          {client.reservations.map((res) => (
                            <div 
                              key={res.id}
                              className="bg-black/40 p-4 rounded-2xl border border-white/5 flex items-center justify-between gap-4 hover:border-white/10 transition-colors"
                            >
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-black uppercase tracking-tighter bg-white/5 px-2 py-0.5 rounded text-white/60">
                                    {res.type === 'camarote' ? 'VIP' : res.type === 'mesa' ? 'Mesa' : res.type === 'pulseira' ? 'Pulseira' : 'Lista'} {res.location_id}
                                  </span>
                                  <span className="text-xs font-bold">{format(parseISO(res.reservation_date), 'dd/MM/yyyy')}</span>
                                </div>
                                <p className="text-[10px] text-white/30">Horário da reserva: {res.reservation_time.substring(0, 5)}</p>
                              </div>

                              <div className="flex items-center gap-2">
                                {/* Check-In Status indicator */}
                                {res.check_in_status === 'entered' ? (
                                  <div className="text-right">
                                    <span className="px-2.5 py-1 bg-green-500/10 border border-green-500/20 text-green-500 text-[9px] font-black uppercase rounded-lg tracking-widest block">
                                      Entrou
                                    </span>
                                    {res.entered_at && (
                                      <span className="text-[9px] font-bold text-white/30 block mt-0.5">
                                        {formatToBrlDateTime(res.entered_at)}
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="px-2.5 py-1 bg-white/5 border border-white/10 text-white/30 text-[9px] font-black uppercase rounded-lg tracking-widest block">
                                    Não Entrou
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
