'use client';

import React, { useState } from 'react';
import { XCircle, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { format, parseISO, differenceInYears } from 'date-fns';
import { cpf } from 'cpf-cnpj-validator';
import CameraCapture from './CameraCapture';

interface QuickAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newReservation: any) => void;
  onBlocked: (blockedInfo: any) => void;
  onDuplicate: (duplicateInfo: any) => void;
  blacklist: any[];
  reservations: any[];
}

export default function QuickAddModal({
  isOpen,
  onClose,
  onSuccess,
  onBlocked,
  onDuplicate,
  blacklist,
  reservations
}: QuickAddModalProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [isCpfLoading, setIsCpfLoading] = useState(false);
  const [quickFormData, setQuickFormData] = useState({ 
    name: '', 
    cpf: '', 
    birth_date: '',
    whatsapp: '', 
    type: 'pulseira' as 'lista' | 'mesa' | 'camarote' | 'pulseira', 
    location_id: '',
    photo: null as string | null
  });

  const supabase = createClient();

  const formatCPF = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1');
  };

  const formatPhone = (value: string) => {
    const raw = value.replace(/\D/g, '');
    if (raw.length <= 2) return raw;
    if (raw.length <= 7) return `(${raw.substring(0, 2)}) ${raw.substring(2)}`;
    return `(${raw.substring(0, 2)}) ${raw.substring(2, 7)}-${raw.substring(7, 11)}`;
  };

  const handleQuickAdd = async () => {
    if (!quickFormData.name || !quickFormData.cpf) {
      alert('Nome e CPF são obrigatórios.');
      return;
    }

    if (!cpf.isValid(quickFormData.cpf)) {
      alert('CPF inválido. Por favor, verifique o número informado.');
      return;
    }

    if (!quickFormData.birth_date) {
      alert('Data de nascimento é obrigatória.');
      return;
    }

    const age = differenceInYears(new Date(), parseISO(quickFormData.birth_date));
    if (age < 18) {
      alert('Entrada/Reserva bloqueada: O Nárnia Club permite o acesso apenas para maiores de 18 anos.');
      return;
    }

    // Check Blacklist
    const isBlocked = blacklist.find(b => b.cpf.replace(/\D/g, '') === quickFormData.cpf.replace(/\D/g, ''));
    if (isBlocked) {
      onBlocked(isBlocked);
      return;
    }

    // Prevent duplicate entries for the same CPF today
    const cleanCpfInput = quickFormData.cpf.replace(/\D/g, '');
    const alreadyHasReservation = reservations.find(r => r.cpf && r.cpf.replace(/\D/g, '') === cleanCpfInput);
    if (alreadyHasReservation) {
      onDuplicate(alreadyHasReservation);
      return;
    }

    setIsAdding(true);
    const today = format(new Date(), 'yyyy-MM-dd');

    const getPortoVelhoTime = () => {
      const now = new Date();
      const formatter = new Intl.DateTimeFormat('pt-BR', {
        timeZone: 'America/Porto_Velho',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
      
      const parts = formatter.formatToParts(now);
      const getValue = (type: string) => parts.find(p => p.type === type)?.value || '';
      return `${getValue('year')}-${getValue('month')}-${getValue('day')} ${getValue('hour')}:${getValue('minute')}:${getValue('second')}`;
    };

    const { data, error } = await supabase
      .from('reservations')
      .insert([{
        name: quickFormData.name,
        email: `portaria_${quickFormData.cpf.replace(/\D/g, '')}@narnia.com`,
        cpf: quickFormData.cpf,
        birth_date: quickFormData.birth_date,
        whatsapp: quickFormData.whatsapp,
        reservation_date: today,
        reservation_time: format(new Date(), 'HH:mm'),
        type: quickFormData.type,
        location_id: (quickFormData.type === 'mesa' || quickFormData.type === 'camarote') ? quickFormData.location_id : null,
        check_in_status: 'entered',
        entered_at: getPortoVelhoTime(),
        num_guests: 1,
        photo: quickFormData.photo
      }])
      .select()
      .single();

    if (!error && data) {
      onSuccess(data);
      setQuickFormData({ name: '', cpf: '', birth_date: '', whatsapp: '', type: 'pulseira', location_id: '', photo: null });
      onClose();
    } else {
      const isDuplicate = error?.code === '23505' || error?.message?.includes('duplicate key') || error?.message?.includes('unique_reservation_date_cpf');
      if (isDuplicate) {
        onDuplicate({
          name: quickFormData.name,
          cpf: quickFormData.cpf,
          type: quickFormData.type,
          reservation_date: today,
          reservation_time: format(new Date(), 'HH:mm'),
          check_in_status: 'entered'
        });
      } else {
        alert('Erro ao cadastrar: ' + (error?.message || 'Desconhecido'));
      }
    }
    setIsAdding(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="w-full max-w-lg bg-[#0A0A0A] rounded-[40px] border border-white/10 p-8 shadow-2xl animate-in zoom-in-95 duration-300">
        <div className="flex justify-between items-center mb-8">
          <h3 className="text-xl font-bold uppercase tracking-widest text-[#D4AF37]">Cadastro Rápido</h3>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl transition-all">
            <XCircle size={24} className="text-white/20" />
          </button>
        </div>
        
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
          <div className="flex flex-col items-center justify-center pb-4 border-b border-white/5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-2">Foto do Cliente (Opcional)</label>
            <CameraCapture
              onPhotoCaptured={(photoBase64) => setQuickFormData(prev => ({ ...prev, photo: photoBase64 }))}
              initialPhoto={quickFormData.photo}
            />
          </div>

          <div className="relative">
            <label className="text-[10px] font-bold uppercase tracking-widest text-white/30 ml-4 mb-1 block">CPF (Obrigatório)</label>
            <input 
              type="text" 
              value={quickFormData.cpf}
              onChange={(e) => {
                const cpfValue = formatCPF(e.target.value);
                const cleanCpf = cpfValue.replace(/\D/g, '');
                
                // Clear pre-filled fields on change to prevent showing stale data from the previous CPF lookup
                setQuickFormData(prev => ({
                  ...prev,
                  cpf: cpfValue,
                  name: '',
                  birth_date: '',
                  whatsapp: '',
                  photo: null
                }));
                
                if (cleanCpf.length === 11) {
                  if (!cpf.isValid(cleanCpf)) {
                    return;
                  }

                  setIsCpfLoading(true);
                  supabase
                    .rpc('get_reservations_by_cpf', { p_cpf: cpfValue })
                    .then(({ data, error }) => {
                      setIsCpfLoading(false);
                      if (!error && data && data.length > 0) {
                        const latest = data[0];
                        
                        // Validate age
                        if (latest.birth_date) {
                          const age = differenceInYears(new Date(), parseISO(latest.birth_date));
                          if (age < 18) {
                            alert('Acesso Restrito: O Nárnia Club permite a entrada apenas para pessoas com 18 anos ou mais.');
                          }
                        }

                        setQuickFormData(prev => ({
                          ...prev,
                          name: latest.name || prev.name,
                          whatsapp: latest.whatsapp || prev.whatsapp,
                          birth_date: latest.birth_date || prev.birth_date || '',
                          photo: latest.photo || prev.photo
                        }));
                      }
                    });
                }
              }}
              placeholder="000.000.000-00"
              className="w-full px-6 py-4 bg-black border border-white/10 rounded-2xl focus:border-[#D4AF37] outline-none text-white font-bold"
            />
            {isCpfLoading && (
              <div className="absolute right-4 bottom-4 flex items-center gap-2 text-xs text-[#D4AF37]">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Verificando...</span>
              </div>
            )}
          </div>
          <div className="relative">
            <label className="text-[10px] font-bold uppercase tracking-widest text-white/30 ml-4 mb-1 block">Nome Completo</label>
            <input 
              type="text" 
              value={isCpfLoading ? "" : quickFormData.name}
              disabled={isCpfLoading}
              onChange={(e) => setQuickFormData({...quickFormData, name: e.target.value})}
              className={`w-full px-6 py-4 bg-black border border-white/10 rounded-2xl focus:border-[#D4AF37] outline-none text-white font-medium ${isCpfLoading ? 'opacity-50 animate-pulse border-[#D4AF37]/50 pointer-events-none' : ''}`}
              placeholder={isCpfLoading ? "Verificando CPF..." : "Nome Completo"}
            />
          </div>
          <div className="relative">
            <label className="text-[10px] font-bold uppercase tracking-widest text-white/30 ml-4 mb-1 block">Data de Nascimento</label>
            <input 
              type="date" 
              value={isCpfLoading ? "" : quickFormData.birth_date}
              disabled={isCpfLoading}
              onChange={(e) => setQuickFormData({...quickFormData, birth_date: e.target.value})}
              className={`w-full px-6 py-4 bg-black border border-white/10 rounded-2xl focus:border-[#D4AF37] outline-none text-white font-medium ${isCpfLoading ? 'opacity-50 animate-pulse border-[#D4AF37]/50 pointer-events-none' : ''}`}
            />
          </div>
          <div className="relative">
            <label className="text-[10px] font-bold uppercase tracking-widest text-white/30 ml-4 mb-1 block">WhatsApp</label>
            <input 
              type="tel" 
              value={isCpfLoading ? "" : quickFormData.whatsapp}
              disabled={isCpfLoading}
              onChange={(e) => setQuickFormData({...quickFormData, whatsapp: formatPhone(e.target.value)})}
              className={`w-full px-6 py-4 bg-black border border-white/10 rounded-2xl focus:border-[#D4AF37] outline-none text-white font-medium ${isCpfLoading ? 'opacity-50 animate-pulse border-[#D4AF37]/50 pointer-events-none' : ''}`}
              placeholder={isCpfLoading ? "Aguarde..." : "(69) 99999-9999"}
            />
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-white/30 ml-4 mb-1 block">Tipo de Acesso</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'camarote', label: 'VIP' },
                { id: 'pulseira', label: 'Pulseira' }
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setQuickFormData({ ...quickFormData, type: t.id as any, location_id: '' })}
                  className={`py-4 rounded-xl text-xs font-bold uppercase border transition-all ${quickFormData.type === t.id ? 'bg-[#D4AF37] border-[#D4AF37] text-black shadow-lg shadow-[#D4AF37]/10' : 'bg-black border-white/10 text-white/40 hover:text-white/60'}`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {(quickFormData.type === 'mesa' || quickFormData.type === 'camarote') && (
            <div className="animate-in fade-in slide-in-from-top-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-white/30 ml-4 mb-1 block">
                {quickFormData.type === 'mesa' ? 'Selecionar Mesa Livre' : 'Selecionar Camarote Livre'}
              </label>
              <div className="grid grid-cols-4 gap-2">
                {(quickFormData.type === 'mesa' 
                  ? Array.from({ length: 12 }, (_, i) => `M${i + 1}`) 
                  : ['C1', 'C2', 'C3']
                ).map((loc) => {
                  const isOccupied = reservations.some(r => r.location_id === loc);
                  return (
                    <button
                      key={loc}
                      type="button"
                      disabled={isOccupied}
                      onClick={() => setQuickFormData({ ...quickFormData, location_id: loc })}
                      className={`py-2 rounded-lg text-xs font-bold transition-all border ${
                        isOccupied ? 'bg-red-500/20 border-red-500/20 text-red-500/40 cursor-not-allowed' :
                        quickFormData.location_id === loc ? 'bg-[#D4AF37] border-[#D4AF37] text-black scale-105' : 
                        'bg-white/5 border-white/10 text-white/60 hover:border-[#D4AF37]/40'
                      }`}
                    >
                      {loc}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          
          <button 
            type="button"
            onClick={handleQuickAdd}
            disabled={isAdding}
            className="w-full py-5 bg-[#D4AF37] text-black rounded-3xl font-black uppercase tracking-widest mt-4 shadow-xl hover:bg-[#b8962f] transition-all flex items-center justify-center gap-2"
          >
            {isAdding ? <Loader2 className="animate-spin" /> : 'CONCLUIR E ENTRAR'}
          </button>
        </div>
      </div>
    </div>
  );
}
