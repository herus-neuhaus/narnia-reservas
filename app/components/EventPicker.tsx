'use client';

import React from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarDays, AlertCircle } from 'lucide-react';
import { Database } from '@/lib/supabase/database.types';

type EventRow = Database['public']['Tables']['events']['Row'];

interface EventPickerProps {
  selectedDate: string;
  onDateSelect: (date: string) => void;
  events: EventRow[];
  loading?: boolean;
}

export default function EventPicker({ selectedDate, onDateSelect, events, loading = false }: EventPickerProps) {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-white/40 animate-pulse">
        <CalendarDays size={40} className="mb-4 opacity-50" />
        <p className="text-[10px] font-bold uppercase tracking-widest">Carregando eventos...</p>
      </div>
    );
  }

  if (!events || events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-white/40 border-2 border-dashed border-white/10 rounded-3xl m-4">
        <AlertCircle size={40} className="mb-4 opacity-50 text-[#D4AF37]" />
        <p className="text-[10px] font-bold uppercase tracking-widest text-center">Nenhum evento agendado<br/>para os próximos dias.</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 max-h-[60vh] overflow-y-auto custom-scrollbar">
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
    </div>
  );
}
