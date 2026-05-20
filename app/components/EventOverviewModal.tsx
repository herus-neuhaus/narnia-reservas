'use client';

import React, { useState, useEffect } from 'react';
import { X, Users, LayoutGrid, Gem, ClipboardList, TrendingUp, Loader2, Calendar } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface EventOverviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: any | null;
}

export default function EventOverviewModal({ isOpen, onClose, event }: EventOverviewModalProps) {
  const [loading, setLoading] = useState(true);
  const [reservations, setReservations] = useState<any[]>([]);
  const [stats, setStats] = useState({
    lista: 0,
    mesa: 0,
    camarote: 0,
    totalGuests: 0,
    entered: 0
  });

  const supabase = createClient();

  useEffect(() => {
    if (!isOpen || !event) return;

    const fetchOverview = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('reservations')
          .select('type, status, num_guests, name, location_id, customers(name)')
          .eq('reservation_date', event.event_date)
          .neq('status', 'cancelled');

        if (error) throw error;

        const newStats = {
          lista: 0,
          mesa: 0,
          camarote: 0,
          totalGuests: 0,
          entered: 0
        };

        if (data) {
          data.forEach(res => {
            if (res.type === 'lista') newStats.lista++;
            if (res.type === 'mesa') newStats.mesa++;
            if (res.type === 'camarote') newStats.camarote++;
            
            newStats.totalGuests += (res.num_guests || 1);
            
            if (res.status === 'completed') {
              newStats.entered += (res.num_guests || 1);
            }
          });
          setReservations(data);
        }

        setStats(newStats);
      } catch (err) {
        console.error('Erro ao buscar visão geral:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchOverview();
  }, [isOpen, event]);

  if (!isOpen || !event) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-sm">
      <div 
        className="absolute inset-0 z-0" 
        onClick={onClose}
      />
      
      <div className="relative z-10 w-full max-w-2xl bg-[#0A0A0A] border border-white/10 rounded-[32px] overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-300">
        
        {/* Header with Event Image Background */}
        <div className="relative h-48 sm:h-56 w-full shrink-0">
          <div className="absolute inset-0 bg-black/60 z-10"></div>
          {event.banner_url || event.image_url ? (
            <img 
              src={event.banner_url || event.image_url} 
              alt={event.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-zinc-900" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] to-transparent z-10"></div>
          
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 z-20 p-2 bg-black/40 hover:bg-white/10 text-white rounded-full transition-colors backdrop-blur-md"
          >
            <X size={20} />
          </button>

          <div className="absolute bottom-0 left-0 w-full p-6 sm:p-8 z-20">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-1 bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30 text-[10px] font-black uppercase tracking-widest rounded-md">
                Visão Geral
              </span>
              <span className="flex items-center gap-1.5 px-2 py-1 bg-white/10 text-white/60 border border-white/5 text-[10px] font-black uppercase tracking-widest rounded-md backdrop-blur-sm">
                <Calendar size={12} />
                {format(parseISO(event.event_date), "dd 'de' MMMM", { locale: ptBR })}
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white drop-shadow-lg leading-none">
              {event.name}
            </h2>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 sm:p-8 space-y-8 bg-[#0A0A0A] flex-1 overflow-y-auto custom-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-[#D4AF37] animate-spin mb-4" />
              <p className="text-xs font-bold uppercase tracking-widest text-white/40">Carregando dados...</p>
            </div>
          ) : (
            <>
              {/* Highlight Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#111111] border border-white/5 p-5 sm:p-6 rounded-3xl relative overflow-hidden group">
                  <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 group-hover:opacity-10 transition-all duration-500">
                    <Users size={120} />
                  </div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-2">Total de Pessoas</p>
                  <p className="text-4xl sm:text-5xl font-black text-white tracking-tight">{stats.totalGuests}</p>
                  <p className="text-[10px] text-white/30 mt-2">Esperadas no evento</p>
                </div>

                <div className="bg-[#D4AF37]/10 border border-[#D4AF37]/20 p-5 sm:p-6 rounded-3xl relative overflow-hidden group">
                  <div className="absolute -right-4 -bottom-4 text-[#D4AF37] opacity-10 group-hover:scale-110 group-hover:opacity-20 transition-all duration-500">
                    <TrendingUp size={120} />
                  </div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#D4AF37]/60 mb-2">Já Entraram</p>
                  <p className="text-4xl sm:text-5xl font-black text-[#D4AF37] tracking-tight">{stats.entered}</p>
                  <p className="text-[10px] text-[#D4AF37]/40 mt-2">Pessoas na casa</p>
                </div>
              </div>

              {/* Detailed Stats */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-widest text-white/40 mb-4 ml-2">Distribuição de Reservas</h3>
                <div className="grid grid-cols-3 gap-3">
                  <div className="flex flex-col items-center justify-center p-4 bg-white/5 border border-white/5 rounded-2xl text-center">
                    <div className="w-8 h-8 mb-2 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
                      <ClipboardList size={16} />
                    </div>
                    <p className="font-bold text-xs text-white">Lista</p>
                    <p className="text-[9px] text-white/40 uppercase tracking-wider mb-2">Confirmados</p>
                    <span className="text-2xl font-black text-white">{stats.lista}</span>
                  </div>

                  <div className="flex flex-col items-center justify-center p-4 bg-white/5 border border-white/5 rounded-2xl text-center">
                    <div className="w-8 h-8 mb-2 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center">
                      <LayoutGrid size={16} />
                    </div>
                    <p className="font-bold text-xs text-white">Mesas</p>
                    <p className="text-[9px] text-white/40 uppercase tracking-wider mb-2">Reservadas</p>
                    <span className="text-2xl font-black text-white">{stats.mesa}</span>
                  </div>

                  <div className="flex flex-col items-center justify-center p-4 bg-white/5 border border-white/5 rounded-2xl text-center">
                    <div className="w-8 h-8 mb-2 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
                      <Gem size={16} />
                    </div>
                    <p className="font-bold text-xs text-white">Camarotes</p>
                    <p className="text-[9px] text-white/40 uppercase tracking-wider mb-2">Reservados</p>
                    <span className="text-2xl font-black text-white">{stats.camarote}</span>
                  </div>
                </div>
              </div>

              {/* Reservations List */}
              <div className="pt-4">
                <h3 className="text-xs font-bold uppercase tracking-widest text-white/40 mb-4 ml-2">Relação de Nomes e Reservas</h3>
                <div className="bg-[#111111] border border-white/5 rounded-3xl overflow-hidden">
                  <div className="max-h-[300px] overflow-y-auto custom-scrollbar p-2 space-y-2">
                    {reservations.length > 0 ? (
                      reservations.map((res: any, idx) => (
                        <div key={idx} className="flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 transition-colors rounded-2xl border border-white/5">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                              res.type === 'lista' ? 'bg-blue-500/10 text-blue-500' :
                              res.type === 'mesa' ? 'bg-orange-500/10 text-orange-500' :
                              'bg-purple-500/10 text-purple-500'
                            }`}>
                              {res.type === 'lista' && <ClipboardList size={18} />}
                              {res.type === 'mesa' && <LayoutGrid size={18} />}
                              {res.type === 'camarote' && <Gem size={18} />}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-white capitalize">
                                {res.customers?.name || res.name || 'Cliente'}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className={`text-[9px] font-black uppercase tracking-widest ${
                                  res.type === 'lista' ? 'text-blue-500' :
                                  res.type === 'mesa' ? 'text-orange-500' :
                                  'text-purple-500'
                                }`}>
                                  {res.type}
                                </span>
                                {res.location_id && (
                                  <>
                                    <span className="w-1 h-1 rounded-full bg-white/20"></span>
                                    <span className="text-[9px] font-bold text-white/40">{res.location_id}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="text-right flex flex-col items-end gap-1">
                            {res.status === 'completed' ? (
                              <span className="px-2 py-1 bg-green-500/10 text-green-500 border border-green-500/20 text-[9px] font-black uppercase rounded-md tracking-widest">Entrou</span>
                            ) : (
                              <span className="px-2 py-1 bg-white/5 text-white/40 border border-white/10 text-[9px] font-black uppercase rounded-md tracking-widest">Aguardando</span>
                            )}
                            <div className="flex items-center gap-1 text-white/40">
                              <Users size={12} />
                              <span className="text-[10px] font-bold">{res.num_guests || 1}</span>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="py-8 text-center text-white/30 text-xs font-medium">
                        Nenhuma reserva cadastrada para este evento.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
