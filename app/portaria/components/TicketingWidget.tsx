'use client';

import React, { useState } from 'react';
import { Ticket, Loader2 } from 'lucide-react';
import { formatToBrlDateTime } from '@/lib/utils';

interface TicketingWidgetProps {
  batches: any[];
  onOpenQuickAdd: () => void;
}

export default function TicketingWidget({ batches, onOpenQuickAdd }: TicketingWidgetProps) {
  const activeBatch = batches.find(b => b.status === 'active');
  const exhaustedBatches = batches.filter(b => b.status === 'exhausted');

  return (
    <div className="bg-[#0A0A0A] rounded-[32px] p-6 border border-white/10 shadow-2xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full bg-[#D4AF37]/10 flex items-center justify-center text-[#D4AF37]">
          <Ticket size={20} />
        </div>
        <div>
          <h3 className="font-bold text-lg text-[#D4AF37] uppercase tracking-widest">Pulseiras</h3>
          <p className="text-[10px] uppercase text-white/40 tracking-widest">Venda na Portaria</p>
        </div>
      </div>

      {!activeBatch ? (
        <div className="bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl p-4 text-center">
          <p className="text-xs font-bold uppercase">Nenhum lote ativo</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-white/5 p-4 rounded-2xl border border-white/10">
            <div>
              <p className="text-[10px] uppercase text-white/40 font-bold mb-1">Lote Atual</p>
              <p className="text-xl font-black">{activeBatch.name}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase text-white/40 font-bold mb-1">Valor Unitário</p>
              <p className="text-xl font-black text-green-500">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(activeBatch.price)}
              </p>
            </div>
          </div>

          <div className="flex justify-between items-end">
            <div>
              <p className="text-[10px] uppercase text-white/40 font-bold mb-1">Disponíveis</p>
              <p className="text-2xl font-black text-[#D4AF37]">
                {activeBatch.total_quantity - activeBatch.consumed_quantity} <span className="text-xs text-white/30">de {activeBatch.total_quantity}</span>
              </p>
            </div>
            <button
              onClick={onOpenQuickAdd}
              className="bg-[#D4AF37] text-black font-black uppercase tracking-widest text-xs px-6 py-3 rounded-xl hover:bg-[#b8962f] transition-all flex items-center gap-2 shadow-[0_0_15px_rgba(212,175,55,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Vender Pulseira
            </button>
          </div>

          <div className="w-full bg-white/5 rounded-full h-1.5 mt-2">
            <div 
              className="bg-[#D4AF37] h-1.5 rounded-full transition-all"
              style={{ width: `${(activeBatch.consumed_quantity / activeBatch.total_quantity) * 100}%` }}
            />
          </div>
        </div>
      )}

      {exhaustedBatches.length > 0 && (
        <div className="mt-6 pt-6 border-t border-white/10">
          <p className="text-[10px] uppercase text-white/30 font-bold mb-3">Lotes Esgotados</p>
          <div className="space-y-2">
            {exhaustedBatches.map(b => (
              <div key={b.id} className="flex justify-between text-xs text-white/50 bg-white/5 px-3 py-2 rounded-lg">
                <span>{b.name}</span>
                <span>{b.total_quantity} pulseiras a {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(b.price)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
