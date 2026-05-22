'use client';

import React, { useState, useEffect } from 'react';
import { XCircle, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { format, parseISO, differenceInYears, parse } from 'date-fns';
import { cpf } from 'cpf-cnpj-validator';
import CameraCapture from './CameraCapture';
import { registerBraceletEntry } from '@/src/services/reservations';

interface QuickAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newReservation: any) => void;
  onBlocked: (blockedInfo: any) => void;
  onDuplicate: (duplicateInfo: any) => void;
  blacklist: any[];
  reservations: any[];
  camarotes?: any[];
  selectedDate: string;
}

export default function QuickAddModal({
  isOpen,
  onClose,
  onSuccess,
  onBlocked,
  onDuplicate,
  blacklist,
  reservations,
  camarotes = [],
  selectedDate
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

  useEffect(() => {
    if (isOpen) {
      const t = setTimeout(() => {
        setQuickFormData({ 
          name: '', 
          cpf: '', 
          birth_date: '',
          whatsapp: '', 
          type: 'pulseira', 
          location_id: '',
          photo: null
        });
        setIsAdding(false);
        setIsCpfLoading(false);
      }, 10);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

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

  const formatBirthDate = (value: string) => {
    const v = value.replace(/\D/g, '').slice(0, 8);
    if (v.length >= 5) {
      return `${v.slice(0, 2)}/${v.slice(2, 4)}/${v.slice(4)}`;
    } else if (v.length >= 3) {
      return `${v.slice(0, 2)}/${v.slice(2)}`;
    }
    return v;
  };

  const toIsoDate = (brDate: string) => {
    if (!brDate || brDate.length !== 10) return brDate;
    const [d, m, y] = brDate.split('/');
    return `${y}-${m}-${d}`;
  };

  const toBrDate = (isoDate: string) => {
    if (!isoDate || !isoDate.includes('-')) return isoDate;
    const [y, m, d] = isoDate.split('-');
    return `${d}/${m}/${y}`;
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

    if (!quickFormData.birth_date || quickFormData.birth_date.length !== 10) {
      alert('Data de nascimento inválida (use o formato DD/MM/AAAA).');
      return;
    }

    const age = differenceInYears(new Date(), parse(quickFormData.birth_date, 'dd/MM/yyyy', new Date()));
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
    const today = selectedDate;

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

    // 1. Upsert do cliente na tabela customers
    let customerId: string | null = null;
    try {
      const { data: customer } = await supabase
        .from('customers')
        .select('id, photo')
        .eq('cpf', quickFormData.cpf)
        .maybeSingle();

      if (customer) {
        customerId = customer.id;
        await supabase
          .from('customers')
          .update({
            name: quickFormData.name,
            whatsapp: quickFormData.whatsapp,
            birth_date: toIsoDate(quickFormData.birth_date),
            photo: quickFormData.photo || customer.photo
          })
          .eq('id', customerId);
      } else {
        const { data: newCustomer, error: customerErr } = await supabase
          .from('customers')
          .insert([{
            cpf: quickFormData.cpf,
            name: quickFormData.name,
            whatsapp: quickFormData.whatsapp,
            birth_date: toIsoDate(quickFormData.birth_date),
            email: `portaria_${quickFormData.cpf.replace(/\D/g, '')}@narnia.com`,
            photo: quickFormData.photo
          }])
          .select('id')
          .single();

        if (customerErr) throw customerErr;
        customerId = newCustomer.id;
      }
    } catch (e: any) {
      console.error('Error handling customer in QuickAddModal:', e);
      alert('Erro ao cadastrar cliente: ' + (e.message || e));
      setIsAdding(false);
      return;
    }

    if (quickFormData.type === 'pulseira') {
      try {
        const braceletRes = await registerBraceletEntry({
          cpf: quickFormData.cpf,
          name: quickFormData.name,
          whatsapp: quickFormData.whatsapp,
          birthDate: toIsoDate(quickFormData.birth_date),
          photo: quickFormData.photo,
          eventDate: selectedDate
        });
        
        if (braceletRes?.success) {
          onSuccess({
            name: quickFormData.name,
            cpf: quickFormData.cpf,
            whatsapp: quickFormData.whatsapp,
            type: 'pulseira',
            check_in_status: 'entered',
            entered_at: getPortoVelhoTime(),
            reservation_date: selectedDate,
            reservation_time: format(new Date(), 'HH:mm'),
            photo: quickFormData.photo
          });
          setQuickFormData({ name: '', cpf: '', birth_date: '', whatsapp: '', type: 'pulseira', location_id: '', photo: null });
          onClose();
        } else {
          alert('Erro ao registrar pulseira: ' + (braceletRes?.message || 'Desconhecido'));
        }
      } catch (err: any) {
        alert('Erro ao registrar pulseira: ' + err.message);
      }
      setIsAdding(false);
      return;
    }

    if (quickFormData.type === 'camarote') {
      const selectedCamarote = camarotes.find(c => c.name === quickFormData.location_id);
      if (!selectedCamarote) {
        alert('Selecione um camarote válido.');
        setIsAdding(false);
        return;
      }

      const { data, error } = await supabase.rpc('register_camarote_guest_entry', {
        p_camarote_id: selectedCamarote.id,
        p_cpf: quickFormData.cpf.replace(/\D/g, ''),
        p_name: quickFormData.name,
        p_whatsapp: quickFormData.whatsapp,
        p_birth_date: toIsoDate(quickFormData.birth_date)
      });

      if (error) {
        const isDuplicate = error.code === '23505' || error.message?.includes('já registrado') || error.message?.includes('duplicate');
        if (isDuplicate) {
          onDuplicate({
            name: quickFormData.name,
            cpf: quickFormData.cpf,
            type: 'camarote',
            reservation_date: today,
            reservation_time: format(new Date(), 'HH:mm'),
            check_in_status: 'entered'
          });
        } else if (error.message?.includes('FULL') || error.message?.includes('lotado')) {
          alert('Camarote lotado! Apenas o admin/gerente pode autorizar a entrada como EXTRA.');
        } else {
          alert('Erro ao registrar entrada no camarote: ' + error.message);
        }
      } else if (data && data.success) {
        onSuccess({
          name: quickFormData.name,
          cpf: quickFormData.cpf,
          whatsapp: quickFormData.whatsapp,
          type: 'camarote',
          location_id: selectedCamarote.name,
          check_in_status: 'entered',
          entered_at: getPortoVelhoTime(),
          reservation_date: selectedDate,
          reservation_time: format(new Date(), 'HH:mm'),
          photo: quickFormData.photo
        });
        setQuickFormData({ name: '', cpf: '', birth_date: '', whatsapp: '', type: 'pulseira', location_id: '', photo: null });
        onClose();
      } else {
        alert('Erro ao registrar entrada no camarote: ' + (data?.message || 'Erro desconhecido.'));
      }
      setIsAdding(false);
      return;
    }

    // 2. Inserção da reserva vinculada para outros tipos (Legacy)
    const { data, error } = await supabase
      .from('reservations')
      .insert([{
        customer_id: customerId,
        // Legacy fallback columns
        name: quickFormData.name,
        email: `portaria_${quickFormData.cpf.replace(/\D/g, '')}@narnia.com`,
        cpf: quickFormData.cpf,
        birth_date: toIsoDate(quickFormData.birth_date),
        whatsapp: quickFormData.whatsapp,
        reservation_date: today,
        reservation_time: format(new Date(), 'HH:mm'),
        type: quickFormData.type,
        location_id: quickFormData.type === 'mesa' ? quickFormData.location_id : null,
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
      const isDuplicate = error?.code === '23505' || error?.message?.includes('duplicate key') || error?.message?.includes('unique_reservation_date_cpf') || error?.message?.includes('unique_reservation_date_customer');
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="w-full max-w-md bg-[#0A0A0A] rounded-[32px] sm:rounded-[40px] border border-white/10 p-5 sm:p-8 shadow-2xl animate-in zoom-in-95 duration-300 max-h-[95vh] sm:max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center mb-4 sm:mb-6 shrink-0">
          <h3 className="text-lg sm:text-xl font-bold uppercase tracking-widest text-[#D4AF37]">Cadastro Rápido</h3>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl transition-all">
            <XCircle size={24} className="text-white/20" />
          </button>
        </div>
        
        <div className="space-y-3 sm:space-y-4 overflow-y-auto pr-1 sm:pr-2 custom-scrollbar grow flex-1">
          <div className="flex flex-col items-center justify-center pb-3 border-b border-white/5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-1.5">Foto do Cliente (Opcional)</label>
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
                    .from('customers')
                    .select('*')
                    .eq('cpf_digits', cleanCpf)
                    .maybeSingle()
                    .then(({ data, error }) => {
                      if (!error && data) {
                        setIsCpfLoading(false);
                        if (data.birth_date) {
                          const age = differenceInYears(new Date(), parseISO(data.birth_date));
                          if (age < 18) {
                            alert('Acesso Restrito: O Nárnia Club permite a entrada apenas para pessoas com 18 anos ou mais.');
                          }
                        }

                        setQuickFormData(prev => ({
                          ...prev,
                          name: data.name || prev.name,
                          whatsapp: data.whatsapp || prev.whatsapp,
                          birth_date: data.birth_date ? toBrDate(data.birth_date) : prev.birth_date || '',
                          photo: data.photo || prev.photo
                        }));
                      } else {
                        // Fallback to legacy reservations check if not in customers yet
                        supabase
                          .rpc('get_reservations_by_cpf', { p_cpf: cleanCpf })
                          .then(({ data: pastData, error: pastError }) => {
                            setIsCpfLoading(false);
                            if (!pastError && pastData && pastData.length > 0) {
                              const latest = pastData[0];
                              const reservationWithPhoto = pastData.find((r: any) => r.photo);
                              const photoUrlOrBase64 = reservationWithPhoto ? reservationWithPhoto.photo : null;
                              
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
                                birth_date: latest.birth_date ? toBrDate(latest.birth_date) : prev.birth_date || '',
                                photo: photoUrlOrBase64 || prev.photo
                              }));
                            }
                          });
                      }
                    });
                }
              }}
              placeholder="000.000.000-00"
              className="w-full px-5 py-3 sm:px-6 sm:py-4 bg-black border border-white/10 rounded-2xl focus:border-[#D4AF37] outline-none text-white font-bold"
            />
            {isCpfLoading && (
              <div className="absolute right-4 bottom-3 sm:bottom-4 flex items-center gap-2 text-xs text-[#D4AF37]">
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
              className={`w-full px-5 py-3 sm:px-6 sm:py-4 bg-black border border-white/10 rounded-2xl focus:border-[#D4AF37] outline-none text-white font-medium ${isCpfLoading ? 'opacity-50 animate-pulse border-[#D4AF37]/50 pointer-events-none' : ''}`}
              placeholder={isCpfLoading ? "Verificando CPF..." : "Nome Completo"}
            />
          </div>
          <div className="relative">
            <label className="text-[10px] font-bold uppercase tracking-widest text-white/30 ml-4 mb-1 block">Data de Nascimento</label>
            <input 
              type="tel" 
              value={isCpfLoading ? "" : quickFormData.birth_date}
              disabled={isCpfLoading}
              onChange={(e) => setQuickFormData({...quickFormData, birth_date: formatBirthDate(e.target.value)})}
              className={`w-full px-5 py-3 sm:px-6 sm:py-4 bg-black border border-white/10 rounded-2xl focus:border-[#D4AF37] outline-none text-white font-medium ${isCpfLoading ? 'opacity-50 animate-pulse border-[#D4AF37]/50 pointer-events-none' : ''}`}
              placeholder={isCpfLoading ? "Aguarde..." : "DD/MM/AAAA"}
            />
          </div>
          <div className="relative">
            <label className="text-[10px] font-bold uppercase tracking-widest text-white/30 ml-4 mb-1 block">WhatsApp</label>
            <input 
              type="tel" 
              value={isCpfLoading ? "" : quickFormData.whatsapp}
              disabled={isCpfLoading}
              onChange={(e) => setQuickFormData({...quickFormData, whatsapp: formatPhone(e.target.value)})}
              className={`w-full px-5 py-3 sm:px-6 sm:py-4 bg-black border border-white/10 rounded-2xl focus:border-[#D4AF37] outline-none text-white font-medium ${isCpfLoading ? 'opacity-50 animate-pulse border-[#D4AF37]/50 pointer-events-none' : ''}`}
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
                  className={`py-3 sm:py-4 rounded-xl text-xs font-bold uppercase border transition-all ${quickFormData.type === t.id ? 'bg-[#D4AF37] border-[#D4AF37] text-black shadow-lg shadow-[#D4AF37]/10' : 'bg-black border-white/10 text-white/40 hover:text-white/60'}`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {(quickFormData.type === 'mesa' || quickFormData.type === 'camarote') && (
            <div className="animate-in fade-in slide-in-from-top-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-white/30 ml-4 mb-1 block">
                {quickFormData.type === 'mesa' ? 'Selecionar Mesa Livre' : 'Selecionar Camarote Existente'}
              </label>
              <div className="grid grid-cols-4 gap-2">
                {quickFormData.type === 'camarote' ? (
                  camarotes.length === 0 ? (
                    <div className="col-span-4 text-center py-2 text-white/30 text-xs">Nenhum camarote reservado hoje.</div>
                  ) : (
                    camarotes.map((camarote) => {
                      const isFull = (camarote.camarote_entries?.find((e: any) => e.is_extra === false)?.count || 0) >= camarote.capacity;
                      return (
                        <button
                          key={camarote.id}
                          type="button"
                          disabled={isFull}
                          onClick={() => setQuickFormData({ ...quickFormData, location_id: camarote.name })}
                          className={`py-2 rounded-lg text-xs font-bold transition-all border ${
                            isFull ? 'bg-red-500/20 border-red-500/20 text-red-500/40 cursor-not-allowed' :
                            quickFormData.location_id === camarote.name ? 'bg-[#D4AF37] border-[#D4AF37] text-black shadow-lg' : 
                            'bg-white/5 border-white/10 text-white/60 hover:border-[#D4AF37]/40'
                          }`}
                        >
                          {camarote.name}
                        </button>
                      );
                    })
                  )
                ) : (
                  Array.from({ length: 12 }, (_, i) => `M${i + 1}`).map((loc) => {
                    const isOccupied = reservations.some(r => r.location_id === loc);
                    return (
                      <button
                        key={loc}
                        type="button"
                        disabled={isOccupied}
                        onClick={() => setQuickFormData({ ...quickFormData, location_id: loc })}
                        className={`py-2 rounded-lg text-xs font-bold transition-all border ${
                          isOccupied ? 'bg-red-500/20 border-red-500/20 text-red-500/40 cursor-not-allowed' :
                          quickFormData.location_id === loc ? 'bg-[#D4AF37] border-[#D4AF37] text-black shadow-lg' : 
                          'bg-white/5 border-white/10 text-white/60 hover:border-[#D4AF37]/40'
                        }`}
                      >
                        {loc}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}
          
          <button 
            type="button"
            onClick={handleQuickAdd}
            disabled={isAdding}
            className="w-full py-4 sm:py-5 bg-[#D4AF37] text-black rounded-3xl font-black uppercase tracking-widest mt-2 sm:mt-4 shadow-xl hover:bg-[#b8962f] transition-all flex items-center justify-center gap-2 shrink-0"
          >
            {isAdding ? <Loader2 className="animate-spin" /> : 'CONCLUIR E ENTRAR'}
          </button>
        </div>
      </div>
    </div>
  );
}
