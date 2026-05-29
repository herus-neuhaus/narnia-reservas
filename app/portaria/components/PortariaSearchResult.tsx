'use client';

import React from 'react';
import { ShieldAlert, UserCheck, Clock, Pencil } from 'lucide-react';
import { differenceInDays, parseISO } from 'date-fns';
import { formatToBrlDateTime } from '@/lib/utils';

interface PortariaSearchResultProps {
  searchResult: any | null;
  isBlacklisted: any | null;
  isReceptionist: boolean;
  onCheckInClick: (id: string, currentStatus: string | null) => void;
  onPhotoClick: (reservation: any) => void;
  isAdmin?: boolean;
  onEditClick?: (customer: any) => void;
}

export default function PortariaSearchResult({
  searchResult,
  isBlacklisted,
  isReceptionist,
  onCheckInClick,
  onPhotoClick,
  isAdmin,
  onEditClick
}: PortariaSearchResultProps) {
  if (!searchResult && !isBlacklisted) return null;

  return (
    <div className="animate-in fade-in zoom-in-95 duration-300">
      {isBlacklisted ? (
        <div className="bg-red-500/10 border-2 border-red-500/50 rounded-[32px] p-8 flex flex-col items-center text-center gap-4 shadow-[0_0_30px_rgba(239,68,68,0.1)]">
          <div className="w-20 h-20 bg-red-500 rounded-full flex items-center justify-center text-white shadow-lg animate-pulse">
            <ShieldAlert size={40} />
          </div>
          <div>
            <h2 className="text-2xl font-bold uppercase tracking-tight text-red-500">CLIENTE BLOQUEADO (BLACKLIST)</h2>
            <p className="text-lg font-bold mt-1">{isBlacklisted.name}</p>
            <div className="mt-4 flex flex-col items-center gap-2">
              <div className="px-4 py-2 bg-red-500/20 rounded-xl text-sm font-bold text-red-500 border border-red-500/20">
                Motivo: {isBlacklisted.reason}
              </div>
              <div className="text-xl font-black text-red-400 mt-2">
                FALTAM {differenceInDays(parseISO(isBlacklisted.end_date), new Date())} DIAS DE PUNIÇÃO
              </div>
            </div>
          </div>
        </div>
      ) : searchResult && (
        <div className="bg-[#D4AF37] text-black rounded-[32px] p-8 shadow-2xl animate-in slide-in-from-top-4">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-6">
              <button 
                onClick={() => onPhotoClick(searchResult)}
                className="w-20 h-20 bg-black/10 rounded-[28px] flex items-center justify-center overflow-hidden border border-black/10 shadow-inner hover:scale-105 transition-all hover:border-black/30"
                title="Atualizar Foto"
              >
                {searchResult.photo ? (
                  <img src={searchResult.photo} alt={searchResult.name} className="w-full h-full object-cover" />
                ) : (
                  <UserCheck size={40} />
                )}
              </button>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">Reserva Encontrada</p>
                <div className="flex items-center gap-3">
                  <h2 className="text-3xl font-bold tracking-tight">{searchResult.name}</h2>
                  {isAdmin && onEditClick && (
                    <button 
                      onClick={() => onEditClick(searchResult)}
                      className="p-2 bg-black/10 text-black/40 hover:text-black hover:bg-black/20 rounded-xl transition-all"
                      title="Editar Cliente"
                    >
                      <Pencil size={18} />
                    </button>
                  )}
                </div>
                <div className="flex gap-4 mt-2">
                  <span className="text-xs font-bold uppercase tracking-tighter bg-black/10 px-2 py-0.5 rounded">{searchResult.type} {searchResult.location_id}</span>
                  <span className="text-xs font-bold uppercase tracking-tighter bg-black/10 px-2 py-0.5 rounded">{searchResult.num_guests} Pessoas</span>
                  {searchResult.check_in_status === 'entered' && searchResult.entered_at && (
                    <span className="text-xs font-bold uppercase tracking-tighter bg-black/10 px-2 py-0.5 rounded flex items-center gap-1">
                      <Clock size={12} /> Entrou às {formatToBrlDateTime(searchResult.entered_at)}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button 
              onClick={() => onCheckInClick(searchResult.id, searchResult.check_in_status)}
              disabled={searchResult.check_in_status === 'entered' && isReceptionist}
              className={`w-full sm:w-auto px-10 py-5 rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl transition-all active:scale-95 ${
                searchResult.check_in_status === 'entered' 
                  ? (isReceptionist ? 'bg-white/10 text-white/40 cursor-not-allowed' : 'bg-red-500 text-white hover:bg-red-600') 
                  : 'bg-black text-white hover:bg-black/80'
              }`}
            >
              {searchResult.check_in_status === 'entered' ? 'Cancelar Entrada' : 'CONFIRMAR ENTRADA'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
