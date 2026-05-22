'use client';

import React from 'react';

interface PortariaCountersProps {
  total: number;
  enteredCount: number;
  enteredInTimeRange: number;
  hasTimeFilter: boolean;
  typeFilter: string;
}

export default function PortariaCounters({
  total,
  enteredCount,
  enteredInTimeRange,
  hasTimeFilter,
  typeFilter
}: PortariaCountersProps) {
  const typeLabel = typeFilter === 'all' ? 'Todos' : typeFilter;
  
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
      <div className="bg-[#0A0A0A] p-6 rounded-3xl border border-white/5">
        <p className="text-[9px] font-bold uppercase tracking-widest text-white/30 mb-2">Total ({typeLabel})</p>
        <p className="text-3xl font-bold">{total}</p>
      </div>
      <div className="bg-[#0A0A0A] p-6 rounded-3xl border border-white/5 border-l-4 border-l-green-500/50">
        <p className="text-[9px] font-bold uppercase tracking-widest text-green-500/60 mb-2">Entraram</p>
        <p className="text-3xl font-bold text-green-500">{enteredCount}</p>
      </div>
      <div className={`bg-[#0A0A0A] p-6 rounded-3xl border border-white/5 ${hasTimeFilter ? 'border-l-4 border-l-[#D4AF37]/50' : ''}`}>
        <p className="text-[9px] font-bold uppercase tracking-widest text-white/30 mb-2">Entraram no Filtro</p>
        <p className={`text-3xl font-bold ${hasTimeFilter ? 'text-[#D4AF37]' : 'text-white/20'}`}>
          {hasTimeFilter ? enteredInTimeRange : '-'}
        </p>
      </div>
    </div>
  );
}
