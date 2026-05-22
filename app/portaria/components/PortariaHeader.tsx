'use client';

import React from 'react';
import { QrCode, LayoutGrid, LogOut } from 'lucide-react';
import { format, startOfToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface PortariaHeaderProps {
  isAdmin: boolean;
  onAdminClick: () => void;
  onLogout: () => void;
  selectedDate?: string;
  setSelectedDate?: (date: string) => void;
}

export default function PortariaHeader({ isAdmin, onAdminClick, onLogout, selectedDate, setSelectedDate }: PortariaHeaderProps) {
  return (
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
          {selectedDate && setSelectedDate && (
            <div className="flex flex-col items-end mr-1 sm:mr-2">
              <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-white/40 leading-none mb-1">Data</p>
              <input 
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent border-none text-[10px] sm:text-xs font-bold text-[#D4AF37] sm:text-white focus:outline-none cursor-pointer [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert p-0 w-[95px] sm:w-auto"
              />
            </div>
          )}
          {isAdmin && (
            <button 
              onClick={onAdminClick}
              className="p-2.5 bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 rounded-xl transition-colors border border-[#D4AF37]/20 text-[#D4AF37] flex items-center gap-2"
              title="Painel Admin"
            >
              <LayoutGrid size={18} />
              <span className="hidden sm:inline text-[10px] font-black uppercase tracking-widest">Admin</span>
            </button>
          )}
          <button 
            onClick={onLogout}
            className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl transition-colors border border-white/10"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </header>
  );
}
