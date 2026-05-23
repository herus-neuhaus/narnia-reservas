'use client';

import React, { useState } from 'react';
import { GlassWater, Users, PlusCircle, UserPlus, AlertTriangle } from 'lucide-react';
import CustomAlertDialog from '@/app/components/CustomAlertDialog';
import { useCustomAlert } from '@/hooks/use-custom-alert';

interface CamaroteWidgetProps {
  camarotes: any[];
  isAdmin: boolean;
  onRegisterEntry: (params: { camaroteId: string, cpf: string, name: string, whatsapp?: string, birthDate?: string }) => Promise<void>;
  onRegisterExtra: (params: { camaroteId: string, cpf: string, name: string, whatsapp?: string, birthDate?: string }) => Promise<void>;
}

export default function CamaroteWidget({ camarotes, isAdmin, onRegisterEntry, onRegisterExtra }: CamaroteWidgetProps) {
  const { showAlert, alertProps } = useCustomAlert();
  const [selectedCamarote, setSelectedCamarote] = useState<string | null>(null);
  const [cpf, setCpf] = useState('');
  const [name, setName] = useState('');

  const handleEntry = async (isExtra: boolean) => {
    if (!selectedCamarote || !cpf || !name) {
      showAlert('Atenção', 'Selecione o camarote e preencha CPF e Nome do cliente', 'warning');
      return;
    }
    try {
      if (isExtra) {
        if (!isAdmin) {
          showAlert('Acesso Negado', 'Apenas gerentes podem liberar entrada extra.', 'error');
          return;
        }
        await onRegisterExtra({ camaroteId: selectedCamarote, cpf, name });
      } else {
        await onRegisterEntry({ camaroteId: selectedCamarote, cpf, name });
      }
      showAlert('Sucesso', 'Entrada registrada com sucesso!', 'success');
      setCpf('');
      setName('');
    } catch (err: any) {
      showAlert('Erro', err.message || 'Erro ao registrar entrada', 'error');
    }
  };

  return (
    <div className="bg-[#0A0A0A] rounded-[32px] p-6 border border-white/10 shadow-2xl flex flex-col">
      <div className="flex items-center gap-3 mb-6 shrink-0">
        <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-500">
          <GlassWater size={20} />
        </div>
        <div>
          <h3 className="font-bold text-lg text-purple-500 uppercase tracking-widest">Camarotes</h3>
          <p className="text-[10px] uppercase text-white/40 tracking-widest">Ocupação em Tempo Real</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-4 min-h-[200px]">
        {camarotes.length === 0 ? (
          <p className="text-center text-xs text-white/30 uppercase mt-4">Nenhum camarote hoje</p>
        ) : (
          camarotes.map(cam => {
            const normalEntries = cam.entries?.filter((e: any) => !e.is_extra)?.length || 0;
            const extraEntries = cam.entries?.filter((e: any) => e.is_extra)?.length || 0;
            const isFull = normalEntries >= cam.capacity;

            return (
              <div 
                key={cam.id} 
                className={`p-4 rounded-2xl border transition-all ${
                  selectedCamarote === cam.id 
                    ? 'bg-purple-500/10 border-purple-500/50' 
                    : 'bg-white/5 border-white/5 hover:border-white/20'
                } cursor-pointer`}
                onClick={() => setSelectedCamarote(cam.id)}
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="text-xl font-black text-white">{cam.name}</h4>
                    <p className="text-[10px] text-white/40 uppercase tracking-widest mt-1">
                      Resp: {cam.owner?.name || 'Não definido'}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-purple-400">
                      <Users size={14} />
                      <span className="font-bold">{normalEntries}/{cam.capacity}</span>
                    </div>
                    {extraEntries > 0 && (
                      <p className="text-[10px] text-yellow-500 font-bold uppercase mt-1">+{extraEntries} Extras</p>
                    )}
                  </div>
                </div>

                <div className="w-full bg-black/50 rounded-full h-1.5 overflow-hidden">
                  <div 
                    className={`h-1.5 rounded-full transition-all ${isFull ? 'bg-red-500' : 'bg-purple-500'}`}
                    style={{ width: `${Math.min((normalEntries / cam.capacity) * 100, 100)}%` }}
                  />
                </div>

                {selectedCamarote === cam.id && (
                  <div className="mt-4 pt-4 border-t border-white/10 space-y-3" onClick={(e) => e.stopPropagation()}>
                    <input 
                      type="text" 
                      placeholder="CPF" 
                      value={cpf}
                      onChange={e => setCpf(e.target.value)}
                      className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500/50"
                    />
                    <input 
                      type="text" 
                      placeholder="Nome Completo" 
                      value={name}
                      onChange={e => setName(e.target.value)}
                      className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500/50"
                    />
                    <div className="flex gap-2">
                      {!isFull && (
                        <button 
                          onClick={() => handleEntry(false)}
                          disabled={!cpf || !name}
                          className="flex-1 bg-purple-600 text-white font-bold uppercase tracking-widest text-[10px] py-2 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
                        >
                          <UserPlus size={12} /> Entrada Normal
                        </button>
                      )}
                      {(isFull || isAdmin) && (
                        <button 
                          onClick={() => handleEntry(true)}
                          disabled={!isAdmin || !cpf || !name}
                          className="flex-1 bg-yellow-600 text-white font-bold uppercase tracking-widest text-[10px] py-2 rounded-lg hover:bg-yellow-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
                          title={!isAdmin ? 'Apenas gerentes podem liberar extra' : ''}
                        >
                          <AlertTriangle size={12} /> Liberar Extra
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
      <CustomAlertDialog {...alertProps} />
    </div>
  );
}
