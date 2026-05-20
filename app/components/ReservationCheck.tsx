'use client';

import React from 'react';
import { User, Loader2, Search, AlertCircle, Users } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface ReservationCheckProps {
  searchCpf: string;
  setSearchCpf: (cpf: string) => void;
  onSearch: () => void;
  isSearching: boolean;
  hasSearched: boolean;
  userReservations: any[];
  formatCPF: (cpf: string) => string;
}

export default function ReservationCheck({
  searchCpf,
  setSearchCpf,
  onSearch,
  isSearching,
  hasSearched,
  userReservations,
  formatCPF
}: ReservationCheckProps) {
  return (
    <div className="p-6 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center mb-4">
        <h2 className="text-2xl font-serif font-bold text-white tracking-tight">Minhas Reservas</h2>
        <p className="text-xs text-white/40 mt-1">Consulte o status das suas solicitações</p>
      </div>

      <div className="space-y-4">
        <div className="relative">
          <User className="absolute left-4 top-1/2 -translate-y-1/2 text-[#D4AF37]/40" size={18} />
          <input 
            type="text" 
            placeholder="Seu CPF: 000.000.000-00" 
            value={searchCpf} 
            onChange={e => setSearchCpf(formatCPF(e.target.value))}
            className="w-full pl-12 pr-4 py-4 bg-black border border-white/10 rounded-2xl outline-none text-white focus:border-[#D4AF37] transition-all"
          />
        </div>
        <button 
          onClick={onSearch}
          disabled={isSearching}
          className="w-full py-4 bg-[#D4AF37] text-black rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2"
        >
          {isSearching ? <Loader2 className="animate-spin" size={18} /> : <Search size={18} />}
          Buscar Reservas
        </button>
      </div>

      <div className="space-y-4 pt-4 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
        {userReservations.length > 0 ? (
          userReservations.map((res: any) => (
            <div key={res.id} className="bg-white/5 border border-white/5 p-5 rounded-[24px] space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/20 mb-1">{res.type}</p>
                  <p className="font-bold text-[#D4AF37]">{format(parseISO(res.reservation_date), 'dd/MM/yyyy')}</p>
                </div>
                <StatusBadge status={res.status} />
              </div>
              <div className="flex items-center gap-2 text-[10px] font-bold text-white/40 uppercase">
                <Users size={12} /> {res.num_guests} convidados {res.location_id ? `• ${res.location_id}` : ''}
              </div>
            </div>
          ))
        ) : hasSearched && !isSearching ? (
          <div className="text-center py-10 opacity-40">
            <AlertCircle size={32} className="mx-auto mb-2" />
            <p className="text-xs font-bold uppercase tracking-widest">Nenhuma reserva encontrada</p>
          </div>
        ) : null}
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
