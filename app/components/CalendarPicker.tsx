'use client';

import React, { useState } from 'react';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  isSameMonth, 
  isSameDay, 
  addDays, 
  isBefore, 
  startOfToday,
  isAfter,
  addDays as addDaysFns
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CalendarPickerProps {
  selectedDate: string;
  onDateSelect: (date: string) => void;
  disabledDates?: string[];
}

export default function CalendarPicker({ selectedDate, onDateSelect, disabledDates = [] }: CalendarPickerProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const today = startOfToday();
  const maxDate = addDaysFns(today, 90); // Permitir agendar até 90 dias no futuro (cerca de 3 meses)

  const renderHeader = () => {
    return (
      <div className="flex items-center justify-between px-2 mb-4">
        <button
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          disabled={isSameMonth(currentMonth, today)}
          className="p-2 hover:bg-white/5 rounded-full transition-colors disabled:opacity-20 text-white"
        >
          <ChevronLeft size={20} />
        </button>
        <h2 className="text-sm font-bold uppercase tracking-widest text-[#D4AF37]">
          {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
        </h2>
        <button
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          disabled={isSameMonth(currentMonth, maxDate)}
          className="p-2 hover:bg-white/5 rounded-full transition-colors disabled:opacity-20 text-white"
        >
          <ChevronRight size={20} />
        </button>
      </div>
    );
  };

  const renderDays = () => {
    const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    return (
      <div className="grid grid-cols-7 mb-2">
        {days.map((day) => (
          <div key={day} className="text-center text-[10px] font-bold uppercase text-white/30 py-2">
            {day}
          </div>
        ))}
      </div>
    );
  };

  const renderCells = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const rows = [];
    let days = [];
    let day = startDate;
    let formattedDate = "";

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        formattedDate = format(day, 'yyyy-MM-dd');
        const cloneDay = day;
        const isFull = disabledDates.includes(formattedDate);
        
        // Nárnia funciona apenas quinta (4), sexta (5) e sábado (6)
        const dayOfWeek = day.getDay();
        const isOperatingDay = dayOfWeek === 4 || dayOfWeek === 5 || dayOfWeek === 6;
        
        const isDisabled = isBefore(day, today) || isAfter(day, maxDate) || isFull || !isOperatingDay;
        const isSelected = selectedDate === formattedDate;
        const isCurrentMonth = isSameMonth(day, monthStart);

        days.push(
          <button
            key={formattedDate}
            disabled={isDisabled}
            onClick={() => onDateSelect(format(cloneDay, 'yyyy-MM-dd'))}
            className={`
              relative h-10 flex items-center justify-center text-xs font-medium rounded-xl transition-all
              ${isDisabled ? 'text-white/5 cursor-not-allowed opacity-20' : 'hover:bg-white/5 text-white'}
              ${isSelected ? 'bg-[#D4AF37] text-black hover:bg-[#D4AF37]' : ''}
              ${!isCurrentMonth && !isSelected ? 'text-white/10' : ''}
            `}
          >
            <span>{format(day, 'd')}</span>
            {isFull && !isSelected && isCurrentMonth && (
              <span className="absolute top-1 right-1 text-[7px] font-bold text-red-500 uppercase">Lotado</span>
            )}
            {isSameDay(day, today) && !isSelected && (
              <div className="absolute bottom-1.5 w-1 h-1 bg-[#D4AF37] rounded-full"></div>
            )}
          </button>
        );
        day = addDays(day, 1);
      }
      rows.push(
        <div className="grid grid-cols-7 gap-1" key={day.toString()}>
          {days}
        </div>
      );
      days = [];
    }
    return <div className="space-y-1">{rows}</div>;
  };

  return (
    <div className="p-2 animate-in fade-in slide-in-from-top-2 duration-300">
      {renderHeader()}
      {renderDays()}
      {renderCells()}
    </div>
  );
}
