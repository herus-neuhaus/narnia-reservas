'use client';

import React from 'react';
import { LayoutGrid, Gem, ClipboardList, Search, ArrowRight } from 'lucide-react';
import { PortalMode } from '@/hooks/useReservation';

interface ReservationLandingProps {
  onModeChange: (mode: PortalMode) => void;
}

export default function ReservationLanding({ onModeChange }: ReservationLandingProps) {
  return (
    <div className="p-6 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center mb-8">
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#D4AF37] mb-2">Bem-vindo ao Portal</p>
        <h2 className="text-3xl font-serif font-bold text-white tracking-tight">O que deseja fazer?</h2>
      </div>

      <button 
        onClick={() => onModeChange('mesa')} 
        className="w-full group bg-[#0A0A0A] border border-white/5 p-6 rounded-[32px] flex items-center justify-between hover:border-[#D4AF37]/50 transition-all active:scale-[0.98]"
      >
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 bg-[#D4AF37]/10 rounded-2xl flex items-center justify-center text-[#D4AF37] group-hover:scale-110 transition-transform">
            <LayoutGrid size={28} />
          </div>
          <div className="text-left">
            <h3 className="font-bold text-lg text-white">Reservar Mesa</h3>
            <p className="text-xs text-white/40 font-medium">Mapa interativo • R$ 100 taxa</p>
          </div>
        </div>
        <ArrowRight className="text-white/20 group-hover:text-[#D4AF37] transition-colors" />
      </button>

      <button 
        onClick={() => onModeChange('camarote')} 
        className="w-full group bg-[#0A0A0A] border border-white/5 p-6 rounded-[32px] flex items-center justify-between hover:border-[#D4AF37]/50 transition-all active:scale-[0.98]"
      >
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 bg-[#D4AF37]/10 rounded-2xl flex items-center justify-center text-[#D4AF37] group-hover:scale-110 transition-transform">
            <Gem size={28} />
          </div>
          <div className="text-left">
            <h3 className="font-bold text-lg text-white">Camarotes</h3>
            <p className="text-xs text-white/40 font-medium">Espaço VIP • Atendimento exclusivo</p>
          </div>
        </div>
        <ArrowRight className="text-white/20 group-hover:text-[#D4AF37] transition-colors" />
      </button>

      <button 
        onClick={() => onModeChange('lista')} 
        className="w-full group bg-[#0A0A0A] border border-white/5 p-6 rounded-[32px] flex items-center justify-between hover:border-[#D4AF37]/50 transition-all active:scale-[0.98]"
      >
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 bg-[#D4AF37]/10 rounded-2xl flex items-center justify-center text-[#D4AF37] group-hover:scale-110 transition-transform">
            <ClipboardList size={28} />
          </div>
          <div className="text-left">
            <h3 className="font-bold text-lg text-white">Nome na Lista</h3>
            <p className="text-xs text-white/40 font-medium">Entrada facilitada • Individual</p>
          </div>
        </div>
        <ArrowRight className="text-white/20 group-hover:text-[#D4AF37] transition-colors" />
      </button>

      <div className="pt-6 border-t border-white/5">
        <button 
          onClick={() => onModeChange('check')} 
          className="w-full py-4 bg-white/5 hover:bg-white/10 rounded-2xl text-[10px] font-bold uppercase tracking-[0.2em] text-white/40 flex items-center justify-center gap-2 transition-all"
        >
          <Search size={14} /> Minhas Reservas
        </button>
      </div>
    </div>
  );
}
