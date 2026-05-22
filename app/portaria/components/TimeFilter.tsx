'use client';

import React from 'react';
import { Clock } from 'lucide-react';

interface TimeFilterProps {
  startTime: string;
  setStartTime: (time: string) => void;
  endTime: string;
  setEndTime: (time: string) => void;
}

export default function TimeFilter({
  startTime,
  setStartTime,
  endTime,
  setEndTime
}: TimeFilterProps) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-[#0A0A0A] border border-white/10 rounded-[24px] p-4 shadow-xl">
      <div className="flex items-center gap-2 text-[#D4AF37]">
        <Clock size={20} />
        <span className="text-xs font-bold uppercase tracking-widest text-white/50">Filtro de Horário</span>
      </div>
      
      <div className="flex items-center gap-2 w-full sm:w-auto">
        <input 
          type="time" 
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)}
          className="bg-black border border-white/5 rounded-xl px-4 py-2 text-sm font-bold text-white focus:outline-none focus:border-[#D4AF37]/50 focus:ring-1 focus:ring-[#D4AF37]/50 transition-all flex-1 sm:w-32"
          placeholder="Início"
        />
        <span className="text-white/30 font-bold">até</span>
        <input 
          type="time" 
          value={endTime}
          onChange={(e) => setEndTime(e.target.value)}
          className="bg-black border border-white/5 rounded-xl px-4 py-2 text-sm font-bold text-white focus:outline-none focus:border-[#D4AF37]/50 focus:ring-1 focus:ring-[#D4AF37]/50 transition-all flex-1 sm:w-32"
          placeholder="Fim"
        />
        
        {(startTime || endTime) && (
          <button 
            onClick={() => { setStartTime(''); setEndTime(''); }}
            className="text-[10px] font-bold text-red-500 hover:text-red-400 uppercase ml-2 px-2 py-1 bg-red-500/10 rounded-lg transition-colors"
          >
            Limpar
          </button>
        )}
      </div>
    </div>
  );
}
