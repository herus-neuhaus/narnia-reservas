'use client';

import React from 'react';

interface PortariaCountersProps {
  totalList: number;
  totalTablesCamarotes: number;
  enteredCount: number;
  totalGuests: number;
}

export default function PortariaCounters({
  totalList,
  totalTablesCamarotes,
  enteredCount,
  totalGuests
}: PortariaCountersProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      <div className="bg-[#0A0A0A] p-6 rounded-3xl border border-white/5">
        <p className="text-[9px] font-bold uppercase tracking-widest text-white/30 mb-2">Total na Lista</p>
        <p className="text-3xl font-bold">{totalList}</p>
      </div>
      <div className="bg-[#0A0A0A] p-6 rounded-3xl border border-white/5">
        <p className="text-[9px] font-bold uppercase tracking-widest text-white/30 mb-2">Mesas/Camarotes</p>
        <p className="text-3xl font-bold">{totalTablesCamarotes}</p>
      </div>
      <div className="bg-[#0A0A0A] p-6 rounded-3xl border border-white/5 border-l-4 border-l-green-500/50">
        <p className="text-[9px] font-bold uppercase tracking-widest text-green-500/60 mb-2">Entraram</p>
        <p className="text-3xl font-bold text-green-500">{enteredCount}</p>
      </div>
      <div className="bg-[#0A0A0A] p-6 rounded-3xl border border-white/5">
        <p className="text-[9px] font-bold uppercase tracking-widest text-white/30 mb-2">Pessoas Totais</p>
        <p className="text-3xl font-bold text-[#D4AF37]">{totalGuests}</p>
      </div>
    </div>
  );
}
