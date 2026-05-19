'use client';

import React, { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { cpf } from 'cpf-cnpj-validator';

interface BlacklistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (cpf: string, name: string, reason: string, duration: string) => void;
}

export default function BlacklistModal({ isOpen, onClose, onSuccess }: BlacklistModalProps) {
  const [blacklistFormData, setBlacklistFormData] = useState({ name: '', cpf: '', reason: '', duration: '6' });
  const [loading, setLoading] = useState(false);
  const [isCpfLoading, setIsCpfLoading] = useState(false);
  const supabase = createClient();

  const formatCPF = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1');
  };

  const handleBlock = async () => {
    if (!blacklistFormData.cpf || !blacklistFormData.name) {
      alert('CPF e Nome Completo são obrigatórios.');
      return;
    }
    if (!cpf.isValid(blacklistFormData.cpf)) {
      alert('CPF inválido. Por favor, verifique o número informado.');
      return;
    }
    setLoading(true);
    await onSuccess(blacklistFormData.cpf, blacklistFormData.name, blacklistFormData.reason, blacklistFormData.duration);
    setLoading(false);
    setBlacklistFormData({ name: '', cpf: '', reason: '', duration: '6' });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
      <div className="w-full max-w-md bg-[#0A0A0A] rounded-[40px] border border-white/10 p-8 shadow-2xl animate-in zoom-in-95 duration-300">
        <div className="flex justify-between items-center mb-8">
          <h3 className="text-xl font-bold uppercase tracking-widest text-red-500">Bloquear Cliente</h3>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl">
            <X size={24} className="text-white/20" />
          </button>
        </div>
        
        <div className="space-y-4">
          <div className="relative">
            <label className="text-[10px] font-bold uppercase tracking-widest text-white/30 ml-4 mb-1 block">CPF (Obrigatório)</label>
            <input 
              type="text" 
              value={blacklistFormData.cpf}
              onChange={(e) => {
                const cpfValue = formatCPF(e.target.value);
                setBlacklistFormData({...blacklistFormData, cpf: cpfValue});
                
                // Auto-fill name if CPF is found in past reservations, otherwise fallback to CPFHub.io
                const cleanCpf = cpfValue.replace(/\D/g, '');
                if (cleanCpf.length === 11) {
                  setIsCpfLoading(true);
                  supabase
                    .rpc('get_reservations_by_cpf', { p_cpf: cpfValue })
                    .then(({ data, error }) => {
                      if (!error && data && data.length > 0) {
                        const latest = data[0];
                        setIsCpfLoading(false);
                        setBlacklistFormData(prev => ({
                          ...prev,
                          name: latest.name || prev.name
                        }));
                      } else {
                        // Fall back to CPFHub.io lookup API
                        fetch(`/api/cpf/${cleanCpf}`)
                          .then(res => res.json())
                          .then(resData => {
                            setIsCpfLoading(false);
                            // Do not prefill name anymore as requested by the user
                          })
                          .catch(err => {
                            console.error('Error fetching from CPFHub:', err);
                            setIsCpfLoading(false);
                          });
                      }
                    });
                }
              }}
              className="w-full px-6 py-4 bg-black border border-white/10 rounded-2xl focus:border-red-500 outline-none text-white font-bold"
              placeholder="000.000.000-00"
            />
            {isCpfLoading && (
              <div className="absolute right-4 bottom-4 flex items-center gap-2 text-xs text-red-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Verificando...</span>
              </div>
            )}
          </div>
          <div className="relative">
            <label className="text-[10px] font-bold uppercase tracking-widest text-white/30 ml-4 mb-1 block">Nome Completo</label>
            <input 
              type="text" 
              value={isCpfLoading ? "" : blacklistFormData.name}
              disabled={isCpfLoading}
              onChange={(e) => setBlacklistFormData({...blacklistFormData, name: e.target.value})}
              className={`w-full px-6 py-4 bg-black border border-white/10 rounded-2xl focus:border-red-500 outline-none text-white font-medium ${isCpfLoading ? 'opacity-50 animate-pulse border-red-500/50 pointer-events-none' : ''}`}
              placeholder={isCpfLoading ? "Verificando CPF..." : "Nome Completo"}
            />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-white/30 ml-4 mb-1 block">Motivo do Bloqueio</label>
            <textarea 
              value={blacklistFormData.reason}
              onChange={(e) => setBlacklistFormData({...blacklistFormData, reason: e.target.value})}
              className="w-full px-6 py-4 bg-black border border-white/10 rounded-2xl focus:border-red-500 outline-none text-white min-h-[80px] resize-none"
              placeholder="Ex: Brigas, Danos ao local, Inadimplência..."
            />
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-white/30 ml-4 mb-1 block">Duração do Bloqueio</label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: '3 Meses', val: '3' },
                { label: '6 Meses', val: '6' },
                { label: '12 Meses', val: '12' },
                { label: 'Permanente', val: '0' },
              ].map((d) => (
                <button
                  key={d.val}
                  type="button"
                  onClick={() => setBlacklistFormData({ ...blacklistFormData, duration: d.val })}
                  className={`py-3 rounded-xl text-[9px] font-black uppercase transition-all border ${blacklistFormData.duration === d.val ? 'bg-red-500 border-red-500 text-white shadow-lg' : 'bg-black border-white/10 text-white/40'}`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          <button 
            type="button"
            onClick={handleBlock}
            disabled={loading}
            className="w-full py-5 bg-red-500 text-white rounded-3xl font-black uppercase tracking-widest mt-4 shadow-xl hover:bg-red-600 transition-all flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="animate-spin" size={16} /> : 'CONFIRMAR BLOQUEIO'}
          </button>
        </div>
      </div>
    </div>
  );
}
