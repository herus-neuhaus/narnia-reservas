'use client';

import React, { useState } from 'react';
import { Gift, Loader2, CheckCircle, XCircle, Clock } from 'lucide-react';
import { formatToBrlDateTime } from '@/lib/utils';

interface ComplimentaryWidgetProps {
  complimentaryTickets: any[];
  onRequest: (cpf: string, name: string, notes: string) => Promise<any>;
  onUpdateStatus: (id: string, status: 'approved' | 'rejected') => Promise<void>;
  isAdmin: boolean;
}

export default function ComplimentaryWidget({ complimentaryTickets, onRequest, onUpdateStatus, isAdmin }: ComplimentaryWidgetProps) {
  const [loading, setLoading] = useState(false);
  const [cpf, setCpf] = useState('');
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cpf || !name) {
      alert('CPF e Nome são obrigatórios.');
      return;
    }
    setLoading(true);
    try {
      await onRequest(cpf, name, notes);
      alert('Cortesia solicitada! Aguardando aprovação.');
      setCpf('');
      setName('');
      setNotes('');
    } catch (err: any) {
      alert(err.message || 'Erro ao solicitar cortesia');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id: string, status: 'approved' | 'rejected') => {
    try {
      await onUpdateStatus(id, status);
    } catch (err: any) {
      alert(err.message || 'Erro ao atualizar status');
    }
  };

  return (
    <div className="bg-[#0A0A0A] rounded-[32px] p-6 border border-white/10 shadow-2xl flex flex-col">
      <div className="flex items-center gap-3 mb-6 shrink-0">
        <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
          <Gift size={20} />
        </div>
        <div>
          <h3 className="font-bold text-lg text-blue-500 uppercase tracking-widest">Cortesias</h3>
          <p className="text-[10px] uppercase text-white/40 tracking-widest">Solicitações</p>
        </div>
      </div>

      <form onSubmit={handleRequest} className="space-y-3 mb-6 shrink-0">
        <input 
          type="text"
          placeholder="CPF"
          value={cpf}
          onChange={e => setCpf(e.target.value)}
          className="w-full bg-black border border-white/5 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50"
        />
        <input 
          type="text"
          placeholder="Nome Completo"
          value={name}
          onChange={e => setName(e.target.value)}
          className="w-full bg-black border border-white/5 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50"
        />
        <input 
          type="text"
          placeholder="Observação (Opcional)"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          className="w-full bg-black border border-white/5 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50"
        />
        <button 
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white font-black uppercase tracking-widest text-xs px-4 py-3 rounded-xl hover:bg-blue-700 transition-all flex justify-center items-center gap-2 disabled:opacity-50"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : 'Solicitar Cortesia'}
        </button>
      </form>

      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-3 min-h-[200px]">
        {complimentaryTickets.length === 0 ? (
          <p className="text-center text-xs text-white/30 uppercase mt-4">Nenhuma cortesia solicitada</p>
        ) : (
          complimentaryTickets.map(ticket => (
            <div key={ticket.id} className="bg-white/5 p-3 rounded-xl border border-white/5">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-bold">{ticket.customers?.name}</p>
                  <p className="text-[10px] text-white/40 uppercase tracking-widest">{ticket.customers?.cpf}</p>
                  {ticket.notes && <p className="text-[10px] text-white/30 italic mt-1">&quot;{ticket.notes}&quot;</p>}
                </div>
                <div className="flex flex-col items-end">
                  <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-lg flex items-center gap-1 ${
                    ticket.status === 'pending' ? 'bg-yellow-500/10 text-yellow-500' :
                    ticket.status === 'approved' ? 'bg-green-500/10 text-green-500' :
                    'bg-red-500/10 text-red-500'
                  }`}>
                    {ticket.status === 'pending' && <Clock size={10} />}
                    {ticket.status === 'approved' && <CheckCircle size={10} />}
                    {ticket.status === 'rejected' && <XCircle size={10} />}
                    {ticket.status === 'pending' ? 'Pendente' : ticket.status === 'approved' ? 'Aprovada' : 'Reprovada'}
                  </span>
                </div>
              </div>
              
              {ticket.status === 'pending' && isAdmin && (
                <div className="flex gap-2 mt-3 pt-3 border-t border-white/5">
                  <button 
                    onClick={() => handleStatusChange(ticket.id, 'approved')}
                    className="flex-1 bg-green-500/20 text-green-500 hover:bg-green-500 hover:text-black transition-colors rounded-lg py-1.5 text-[10px] font-bold uppercase tracking-widest"
                  >
                    Aprovar
                  </button>
                  <button 
                    onClick={() => handleStatusChange(ticket.id, 'rejected')}
                    className="flex-1 bg-red-500/20 text-red-500 hover:bg-red-500 hover:text-white transition-colors rounded-lg py-1.5 text-[10px] font-bold uppercase tracking-widest"
                  >
                    Reprovar
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
