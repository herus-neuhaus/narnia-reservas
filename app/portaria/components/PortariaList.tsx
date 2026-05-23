'use client';

import React from 'react';
import { UserPlus, Ticket, CalendarDays, Clock, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { formatToBrlDateTime } from '@/lib/utils';

interface PortariaListProps {
  todayBrl: string;
  loading: boolean;
  filteredReservations: any[];
  isReceptionist: boolean;
  onQuickAddClick: () => void;
  onCheckInClick: (id: string, currentStatus: string | null) => void;
  onPhotoClick: (reservation: any) => void;
}

export default function PortariaList({
  todayBrl,
  loading,
  filteredReservations,
  isReceptionist,
  onQuickAddClick,
  onCheckInClick,
  onPhotoClick
}: PortariaListProps) {
  return (
    <div className="bg-[#0A0A0A] rounded-[40px] border border-white/10 overflow-hidden shadow-2xl">
      <div className="p-6 bg-white/5 border-b border-white/10 flex justify-between items-center">
        <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-[#D4AF37]">Lista Consolidada - {todayBrl}</h3>
        <button 
          onClick={onQuickAddClick}
          className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest bg-[#D4AF37] text-black px-4 py-2 rounded-xl hover:bg-[#b8962f] transition-all"
        >
          <UserPlus size={14} /> Cadastro Rápido
        </button>
      </div>
      
      <div className="divide-y divide-white/5 max-h-[500px] overflow-y-auto custom-scrollbar">
        {loading ? (
          <div className="p-20 flex flex-col items-center opacity-20">
            <Loader2 className="animate-spin mb-4" size={40} />
            <p className="text-xs font-bold uppercase tracking-widest">Sincronizando banco de dados...</p>
          </div>
        ) : filteredReservations.length === 0 ? (
          <div className="p-20 text-center opacity-20">
            <AlertCircle className="mx-auto mb-4" size={40} />
            <p className="text-sm font-bold">Nenhum resultado encontrado.</p>
          </div>
        ) : (
          filteredReservations.map((res) => (
            <div key={res.id} className="p-5 flex items-center justify-between hover:bg-white/[0.02] transition-all group">
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => onPhotoClick(res)}
                  className="w-12 h-12 rounded-2xl overflow-hidden flex items-center justify-center border border-white/10 text-white/40 shadow-inner hover:scale-105 transition-all hover:border-[#D4AF37]/50"
                  title="Atualizar Foto"
                >
                  {res.photo ? (
                    <img src={res.photo} alt={res.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className={`w-full h-full flex items-center justify-center transition-all ${res.check_in_status === 'entered' ? 'bg-green-500/20 text-green-500' : 'bg-white/5'}`}>
                      {res.type === 'lista' ? <UserPlus size={20} /> : res.type === 'pulseira' ? <Ticket size={20} /> : <CalendarDays size={20} />}
                    </div>
                  )}
                </button>
                <div>
                  <h4 className="font-bold text-sm leading-tight">{res.name}</h4>
                  <div className="flex gap-3 mt-1 items-center">
                    <span className="text-[10px] font-bold uppercase tracking-tighter text-white/30">{res.cpf || 'Sem CPF'}</span>
                    <span className="text-[10px] font-bold uppercase tracking-tighter text-[#D4AF37]/60">
                      {res.type === 'camarote' ? 'VIP' : res.type === 'pulseira' ? 'Pulseira' : res.type === 'mesa' ? 'Mesa' : res.type === 'cortesia' ? 'Cortesia' : 'Lista'} {res.location_id}
                    </span>
                    {res.check_in_status === 'entered' && res.entered_at && (
                      <span className="text-[10px] font-bold uppercase tracking-tighter text-green-500/80 flex items-center gap-0.5">
                        • <Clock size={10} /> Entrou às {formatToBrlDateTime(res.entered_at)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => onCheckInClick(res.id, res.check_in_status)}
                  disabled={res.check_in_status === 'entered' && isReceptionist}
                  className={`p-3 rounded-2xl transition-all active:scale-90 ${
                    res.check_in_status === 'entered' 
                      ? (isReceptionist ? 'bg-green-500/20 text-green-500/50 cursor-not-allowed shadow-none' : 'bg-green-500 text-black shadow-[0_0_15px_rgba(34,197,94,0.4)]') 
                      : 'bg-white/5 text-white/20 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <CheckCircle2 size={24} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
