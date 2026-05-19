'use client';

import React, { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarDays, AlertCircle } from 'lucide-react';
import { Database } from '@/lib/supabase/database.types';
import CalendarPicker from './CalendarPicker';

type EventRow = Database['public']['Tables']['events']['Row'];

interface EventPickerProps {
  selectedDate: string;
  onDateSelect: (date: string) => void;
  events: EventRow[];
  loading?: boolean;
  disabledDates?: string[];
}

export default function EventPicker({ 
  selectedDate, 
  onDateSelect, 
  events, 
  loading = false,
  disabledDates = []
}: EventPickerProps) {
  const [showCalendar, setShowCalendar] = useState(false);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-white/40 animate-pulse">
        <CalendarDays size={40} className="mb-4 opacity-50" />
        <p className="text-[10px] font-bold uppercase tracking-widest">Carregando eventos...</p>
      </div>
    );
  }

  // Se não houver eventos cadastrados, exibe o calendário diretamente (sem botão de voltar)
  if (!events || events.length === 0) {
    return (
      <div className="space-y-6 p-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
        <div className="flex flex-col items-center justify-center p-12 text-white/40 border-2 border-dashed border-white/10 rounded-3xl">
          <AlertCircle size={40} className="mb-4 opacity-50 text-[#D4AF37]" />
          <p className="text-[10px] font-bold uppercase tracking-widest text-center">Nenhum evento agendado<br/>para os próximos dias.</p>
        </div>

        <div className="bg-[#0A0A0A] border border-white/10 p-6 rounded-3xl space-y-4">
          <div className="flex items-center justify-center gap-3">
            <CalendarDays size={20} className="text-[#D4AF37]" />
            <h4 className="text-xs font-black uppercase tracking-widest text-[#D4AF37]">
              Escolher Data de Funcionamento
            </h4>
          </div>
          <p className="text-[11px] text-white/60 text-center leading-tight">
            Você pode fazer a sua reserva para quintas, sextas ou sábados mesmo sem um evento publicado ainda.
          </p>
          <div className="border border-white/5 p-4 rounded-2xl bg-black/40">
            <CalendarPicker 
              selectedDate={selectedDate}
              onDateSelect={onDateSelect}
              disabledDates={disabledDates}
            />
          </div>
        </div>
      </div>
    );
  }

  // Se o usuário clicou para ver o calendário personalizado
  if (showCalendar) {
    return (
      <div className="space-y-4 p-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
        <button 
          onClick={() => setShowCalendar(false)}
          className="w-full py-4 bg-white/5 hover:bg-white/10 text-[#D4AF37] rounded-2xl font-bold border border-white/5 transition-all text-[11px] uppercase tracking-widest text-center flex items-center justify-center gap-2"
        >
          ← Voltar para Eventos
        </button>

        <div className="bg-[#0A0A0A] border border-white/10 p-6 rounded-3xl space-y-4">
          <div className="flex items-center justify-center gap-3">
            <CalendarDays size={20} className="text-[#D4AF37]" />
            <h4 className="text-xs font-black uppercase tracking-widest text-[#D4AF37]">
              Escolher Data de Funcionamento
            </h4>
          </div>
          <p className="text-[11px] text-white/60 text-center leading-tight">
            Selecione um dia de funcionamento no calendário abaixo (Quinta, Sexta e Sábado):
          </p>
          <div className="border border-white/5 p-4 rounded-2xl bg-black/40">
            <CalendarPicker 
              selectedDate={selectedDate}
              onDateSelect={onDateSelect}
              disabledDates={disabledDates}
            />
          </div>
        </div>
      </div>
    );
  }

  // Lista normal de eventos
  return (
    <div className="p-4 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 max-h-[65vh] overflow-y-auto custom-scrollbar">
      {events.map((event) => {
        const dateObj = parseISO(event.event_date);
        const isSelected = selectedDate === event.event_date;
        
        return (
          <button
            key={event.id}
            onClick={() => onDateSelect(event.event_date)}
            className={`w-full relative overflow-hidden rounded-3xl text-left transition-all duration-300 group ${
              isSelected 
                ? 'ring-4 ring-[#D4AF37] ring-offset-4 ring-offset-black scale-[0.98]' 
                : 'hover:scale-[1.02] hover:ring-2 hover:ring-white/20 hover:shadow-2xl'
            }`}
          >
            {/* Imagem de Fundo (Capa) */}
            <div className="absolute inset-0 z-0">
              <img 
                src={event.image_url} 
                alt={event.name} 
                className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent"></div>
            </div>

            {/* Conteúdo */}
            <div className="relative z-10 p-6 pt-24 sm:pt-32 flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
              <div>
                <p className="text-[#D4AF37] text-[10px] font-black uppercase tracking-[0.2em] mb-2">
                  {format(dateObj, "EEEE", { locale: ptBR })}
                </p>
                <h3 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white drop-shadow-md leading-none">
                  {event.name}
                </h3>
              </div>
              
              <div className="bg-black/60 backdrop-blur-md border border-white/10 px-5 py-3 rounded-2xl shrink-0 flex flex-col items-center justify-center">
                <span className="text-[10px] font-bold uppercase tracking-widest text-white/50 mb-1">Data</span>
                <span className="text-xl sm:text-2xl font-black text-white leading-none">
                  {format(dateObj, "dd/MM")}
                </span>
              </div>
            </div>

            {isSelected && (
              <div className="absolute top-4 right-4 z-20 bg-[#D4AF37] text-black text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full shadow-lg flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-black rounded-full animate-pulse"></div>
                Selecionado
              </div>
            )}
          </button>
        );
      })}

      {/* Botão para Trocar para a Visualização de Calendário */}
      <button 
        onClick={() => setShowCalendar(true)}
        className="w-full py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-bold border border-white/5 hover:border-[#D4AF37]/30 transition-all text-[11px] uppercase tracking-widest text-center mt-6 flex items-center justify-center gap-2"
      >
        <CalendarDays size={16} className="text-[#D4AF37]" />
        Reservar Outra Data
      </button>
    </div>
  );
}
