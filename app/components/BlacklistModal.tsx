'use client';

import React, { useState, useEffect } from 'react';
import { X, Loader2, Search, User } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { cpf } from 'cpf-cnpj-validator';

interface BlacklistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (cpf: string, name: string, reason: string, duration: string) => void;
  initialData?: { cpf: string; name: string } | null;
}

export default function BlacklistModal({ isOpen, onClose, onSuccess, initialData }: BlacklistModalProps) {
  const [blacklistFormData, setBlacklistFormData] = useState({ name: '', cpf: '', reason: '', duration: '6' });
  const [loading, setLoading] = useState(false);
  const [isCpfLoading, setIsCpfLoading] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [allCustomers, setAllCustomers] = useState<any[]>([]);
  
  const supabase = createClient();

  const [step, setStep] = useState<'list' | 'form'>('list');

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setBlacklistFormData({ name: initialData.name, cpf: initialData.cpf, reason: '', duration: '6' });
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setStep('form');
      } else {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setBlacklistFormData({ name: '', cpf: '', reason: '', duration: '6' });
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setStep('list');
      }
      setSearchQuery('');
      setSearchResults([]);
      
      const fetchCustomers = async () => {
        const { data } = await supabase.from('customers').select('*').order('name');
        if (data) {
          const unique = Array.from(new Map(data.filter(c => c.cpf).map(item => [item.cpf, item])).values());
          setAllCustomers(unique);
          setSearchResults(unique);
        }
      };
      fetchCustomers();
    }
  }, [isOpen, initialData, supabase]);

  useEffect(() => {
    if (searchQuery.length === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSearchResults(allCustomers);
      return;
    }
    
    const normalize = (str: string) =>
      str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

    const cleanSearch = searchQuery.replace(/\D/g, '');
    const normTerm = normalize(searchQuery);
    
    const filtered = allCustomers.filter(c => 
      normalize(c.name || '').includes(normTerm) || 
      (cleanSearch && c.cpf && c.cpf.replace(/\D/g, '').includes(cleanSearch)) ||
      (c.whatsapp && c.whatsapp.includes(searchQuery))
    );
    
    setSearchResults(filtered);
  }, [searchQuery, allCustomers]);

  const selectClient = (client: any) => {
    setBlacklistFormData(prev => ({
      ...prev,
      name: client.name,
      cpf: client.cpf
    }));
    setStep('form');
  };

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
    setStep('list');
    setSearchQuery('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
      <div className={`w-full bg-[#0A0A0A] rounded-[40px] border border-white/10 p-6 md:p-8 shadow-2xl animate-in zoom-in-95 duration-300 ${step === 'list' ? 'max-w-3xl' : 'max-w-md'}`}>
        
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            {step === 'form' && !initialData && (
              <button 
                onClick={() => setStep('list')}
                className="w-10 h-10 bg-white/5 hover:bg-white/10 rounded-xl flex items-center justify-center transition-colors border border-white/10"
              >
                <X size={20} className="rotate-45" /> {/* Basic back indicator */}
              </button>
            )}
            <div>
              <h3 className="text-xl font-bold uppercase tracking-widest text-red-500">
                {step === 'list' ? 'Selecionar Cliente' : 'Bloquear Cliente'}
              </h3>
              {step === 'form' && <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold mt-1">Detalhes da Restrição</p>}
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl">
            <X size={24} className="text-white/20" />
          </button>
        </div>

        {step === 'list' ? (
          <div className="space-y-6 flex flex-col max-h-[70vh]">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="relative w-full">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" size={18} />
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-6 py-4 bg-white/5 border border-white/10 rounded-2xl focus:border-red-500/50 outline-none text-white font-medium"
                  placeholder="Pesquisar por Nome, CPF ou WhatsApp..."
                />
              </div>
              <button 
                onClick={() => {
                  setBlacklistFormData({ name: '', cpf: '', reason: '', duration: '6' });
                  setStep('form');
                }}
                className="w-full md:w-auto px-6 py-4 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-2xl font-black uppercase tracking-widest text-xs transition-all whitespace-nowrap"
              >
                + Adicionar Manualmente
              </button>
            </div>

            <div className="overflow-y-auto custom-scrollbar flex-1 -mx-2 px-2 pb-2">
              <div className="flex flex-col gap-3">
                {searchResults.map((client, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => selectClient(client)}
                    className="w-full p-4 text-left bg-black/40 hover:bg-white/5 border border-white/5 hover:border-red-500/30 rounded-[20px] flex items-center gap-6 transition-all group"
                  >
                    <div className="w-30 h-30 rounded-2xl overflow-hidden bg-white/5 flex items-center justify-center shrink-0 border border-white/10 shadow-inner group-hover:border-red-500/30">
                      {client.photo ? (
                        <img src={client.photo} alt={client.name} className="w-full h-full object-cover" />
                      ) : (
                        <User size={48} className="text-white/40" />
                      )}
                    </div>
                    <div className="flex-1 overflow-hidden py-2">
                      <p className="text-lg md:text-xl font-bold text-white truncate leading-none mb-3">{client.name}</p>
                      <div className="flex flex-col gap-2">
                        <p className="text-xs text-white/50 uppercase tracking-widest font-bold">CPF: {client.cpf || 'Não informado'}</p>
                        {client.whatsapp && (
                          <p className="text-xs text-[#D4AF37] uppercase tracking-widest font-bold">WPP: {client.whatsapp}</p>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
                {searchResults.length === 0 && (
                  <div className="py-12 text-center">
                    <p className="text-white/40 text-sm font-bold uppercase tracking-widest">Nenhum cliente encontrado.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="relative">
              <label className="text-[10px] font-bold uppercase tracking-widest text-white/30 ml-4 mb-1 block">CPF (Obrigatório)</label>
              <input 
                type="text" 
                value={blacklistFormData.cpf}
                onChange={(e) => {
                  const cpfValue = formatCPF(e.target.value);
                  setBlacklistFormData({...blacklistFormData, cpf: cpfValue});
                  const cleanCpf = cpfValue.replace(/\D/g, '');
                  if (cleanCpf.length === 11) {
                    if (!cpf.isValid(cleanCpf)) {
                      return;
                    }

                    setIsCpfLoading(true);
                    supabase
                      .rpc('get_customer_by_cpf', { p_cpf: cleanCpf })
                      .then(({ data, error }) => {
                        setIsCpfLoading(false);
                        if (!error && data && data.length > 0) {
                          const customer = data[0];
                          setBlacklistFormData(prev => ({
                            ...prev,
                            name: customer.name || prev.name
                          }));
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
                className="w-full px-6 py-4 bg-black border border-white/10 rounded-2xl focus:border-red-500 outline-none text-white min-h-[100px] resize-none"
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
                    className={`py-3 rounded-xl text-[9px] font-black uppercase transition-all border ${blacklistFormData.duration === d.val ? 'bg-red-500 border-red-500 text-white shadow-lg' : 'bg-black border-white/10 text-white/40 hover:bg-white/5'}`}
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
              className="w-full py-5 bg-red-500 text-white rounded-3xl font-black uppercase tracking-widest mt-4 shadow-xl shadow-red-500/20 hover:bg-red-600 transition-all flex items-center justify-center gap-2 active:scale-95"
            >
              {loading ? <Loader2 className="animate-spin" size={16} /> : 'CONFIRMAR BLOQUEIO'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
