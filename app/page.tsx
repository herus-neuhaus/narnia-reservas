'use client';

export const dynamic = 'force-dynamic';

import React from 'react';
import { 
  Calendar, 
  Users, 
  User, 
  CheckCircle2, 
  ChevronLeft, 
  Instagram, 
  MessageCircle, 
  MapPin, 
  LayoutGrid,
  Info,
  Loader2,
  ShieldAlert
} from 'lucide-react';
import { differenceInDays, parseISO, differenceInYears, parse } from 'date-fns';
import { formatToBrlDateTime } from '@/lib/utils';
import EventPicker from './components/EventPicker';
import SVGMap from './components/SVGMap';
import ReservationLanding from './components/ReservationLanding';
import ReservationCheck from './components/ReservationCheck';
import ReservationSuccess from './components/ReservationSuccess';
import CustomAlertDialog from '@/app/components/CustomAlertDialog';
import { useReservation } from '@/hooks/useReservation';
import { getCustomerByCpf } from '@/src/services/reservations';
import { cpf as cpfValidator } from 'cpf-cnpj-validator';

export default function NarniaClubPortal() {
  const {
    portalMode,
    setPortalMode,
    activeStep,
    setActiveStep,
    date,
    setDate,
    guests,
    setGuests,
    time,
    setTime,
    notes,
    setNotes,
    locationId,
    setLocationId,
    formData,
    setFormData,
    formErrors,
    setFormErrors,
    isCpfLoading,
    setIsCpfLoading,
    isSubmitting,
    isSuccess,
    fullyBookedDates,
    reservedLocations,
    searchCpf,
    setSearchCpf,
    userReservations,
    isSearching,
    hasSearched,
    blacklistAlert,
    setBlacklistAlert,
    policyAccepted,
    setPolicyAccepted,
    events,
    loadingEvents,
    handleSearch,
    handleModeChange,
    handleSubmit,
    resetAll,
    formatCPF,
    formatPhone,
    alertProps,
    showAlert
  } = useReservation();

  const WHATSAPP_NUMBER = "5569999798553";

  const selectedEvent = events.find(e => e.event_date === date);
  const listLimitTime = selectedEvent?.list_limit_time 
    ? selectedEvent.list_limit_time.substring(0, 5) 
    : '23:30';

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

  const renderStepHeader = (num: number, Icon: any, title: string, val: any) => {
    const isPast = activeStep > num;
    const isNow = activeStep === num;
    return (
      <div 
        onClick={() => activeStep > num && setActiveStep(num)}
        className={`p-5 flex items-center justify-between cursor-pointer transition-all ${isNow ? 'bg-white/[0.03]' : 'opacity-60 hover:opacity-100'}`}
      >
        <div className="flex items-center gap-4">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${isNow ? 'bg-[#D4AF37] text-black shadow-[0_0_15px_rgba(212,175,55,0.3)]' : 'bg-white/5 text-white/20'}`}>
            <Icon size={20} />
          </div>
          <div>
            <h4 className="text-[10px] font-black uppercase tracking-widest text-white/20">{title}</h4>
            <p className={`font-bold text-sm ${isNow ? 'text-[#D4AF37]' : 'text-white'}`}>{val || (isNow ? 'Selecionar...' : '---')}</p>
          </div>
        </div>
        {isPast && <CheckCircle2 size={18} className="text-green-500" />}
      </div>
    );
  };

  const tableElements = Array.from({ length: 18 }, (_, i) => ({
    id: `M${i + 1}`,
    type: 'mesa' as const,
    label: `${i + 1}`,
    available: !reservedLocations.includes(`M${i + 1}`)
  }));

  const allowedCamarotes = selectedEvent?.available_camarotes || ['C1', 'C2', 'C3'];

  const cabinElements = [
    { id: 'C1', type: 'camarote' as const, label: 'C1', available: allowedCamarotes.includes('C1') && !reservedLocations.includes('C1') },
    { id: 'C2', type: 'camarote' as const, label: 'C2', available: allowedCamarotes.includes('C2') && !reservedLocations.includes('C2') },
    { id: 'C3', type: 'camarote' as const, label: 'C3', available: allowedCamarotes.includes('C3') && !reservedLocations.includes('C3') },
  ];

  const renderReservationFlow = () => (
    <div className="divide-y divide-white/5">
      {/* Step 1: Date */}
      <div className="bg-[#0A0A0A]">
        {renderStepHeader(1, Calendar, "Data do Evento", date)}
        {activeStep === 1 && (
          <div className="p-4 animate-in fade-in zoom-in-95 duration-300">
            <EventPicker 
              selectedDate={date} 
              events={events}
              loading={loadingEvents}
              onDateSelect={async (d) => {
                if (portalMode === 'lista') {
                  try {
                    const cpfParam = formData.cpf ? `&cpf=${encodeURIComponent(formData.cpf)}` : '';
                    const res = await fetch(`/api/events/validate?date=${d}${cpfParam}`);
                    const resData = await res.json();
                    if (res.status === 400 && resData.error === 'CPF_DUPLICATE') {
                      showAlert(
                        'CPF Já Cadastrado',
                        resData.message || 'Este CPF já foi adicionado à lista para este evento neste dia.',
                        'warning'
                      );
                      return;
                    }
                    if (resData && resData.allowed === false) {
                      showAlert(
                        'Lista Encerrada',
                        resData.reason || 'Infelizmente o limite de nomes para a lista deste evento já foi atingido.',
                        'warning'
                      );
                      return;
                    }
                  } catch (err) {
                    console.error('Erro ao validar lista:', err);
                  }
                }
                setDate(d); 
                setActiveStep(portalMode === 'lista' ? 5 : 2); 
              }} 
            />
          </div>
        )}
      </div>

      {/* Step 2: Map/Location (Hidden for Lista) */}
      {(portalMode === 'mesa' || portalMode === 'camarote') && (
        <div className="bg-[#0A0A0A]">
          {renderStepHeader(2, LayoutGrid, portalMode === 'mesa' ? "Mesa" : "Camarote", locationId)}
          {activeStep === 2 && (
            <div className="p-4 animate-in fade-in zoom-in-95 duration-300">
              <SVGMap 
                elements={portalMode === 'mesa' ? tableElements : cabinElements} 
                onSelect={(id) => { setLocationId(id); setActiveStep(portalMode === 'mesa' ? 5 : 3); }}
                selectedId={locationId || undefined}
              />
            </div>
          )}
        </div>
      )}

      {/* Step 3: Guests (Hidden for Lista and Mesa) */}
      {portalMode === 'camarote' && (
        <div className="bg-[#0A0A0A]">
          {renderStepHeader(3, Users, "Convidados", guests ? `${guests} pessoas` : '')}
          {activeStep === 3 && (
            <div className="p-6 space-y-4 animate-in fade-in zoom-in-95 duration-300">
              <div className="grid grid-cols-4 gap-2">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(n => (
                  <button 
                    key={n}
                    onClick={() => { setGuests(n); setActiveStep(5); }}
                    className={`py-4 rounded-2xl font-bold border transition-all ${guests === n ? 'bg-[#D4AF37] text-black border-[#D4AF37]' : 'bg-white/5 border-white/5 text-white/60 hover:bg-white/10'}`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 5: Personal Data */}
      <div className="bg-[#0A0A0A]">
        {renderStepHeader(5, User, "Dados Obrigatórios", formData.name)}
        {activeStep === 5 && (
          <div className="p-6 space-y-4 animate-in fade-in zoom-in-95 duration-300">
            <div className="space-y-1 relative">
              <input 
                type="text" placeholder="CPF" 
                value={formData.cpf} 
                onChange={e => {
                  const cpf = formatCPF(e.target.value);
                  setFormData({...formData, cpf});
                  
                  const cleanCpf = cpf.replace(/\D/g, '');
                  if (cleanCpf.length === 11) {
                    if (!cpfValidator.isValid(cleanCpf)) {
                      setFormErrors(prev => ({
                        ...prev,
                        cpf: 'CPF inválido'
                      }));
                      return;
                    }

                    setFormErrors(prev => {
                      const newErr = { ...prev };
                      delete newErr.cpf;
                      return newErr;
                    });

                    // Auto-fill: query our local customers table via SECURITY DEFINER RPC.
                    // No external API (CPFHUB) is used.
                    getCustomerByCpf(cleanCpf).then(customer => {
                      if (!customer) return;

                      if (customer.birth_date) {
                        const age = differenceInYears(new Date(), parseISO(customer.birth_date));
                        if (age < 18) {
                          setFormErrors(prev => ({
                            ...prev,
                            cpf: 'Apenas maiores de 18 anos podem reservar'
                          }));
                          showAlert('Acesso Restrito', 'O Nárnia Club permite a entrada apenas para pessoas com 18 anos ou mais.', 'error');
                          return;
                        }
                        setFormErrors(prev => {
                          const newErr = { ...prev };
                          delete newErr.cpf;
                          delete newErr.birth_date;
                          return newErr;
                        });
                      }

                      setFormData(prev => ({
                        ...prev,
                        name: customer.name || prev.name,
                        whatsapp: customer.whatsapp || prev.whatsapp,
                        birth_date: customer.birth_date ? toBrDate(customer.birth_date) : prev.birth_date,
                        email: customer.email || prev.email
                      }));
                    });
                  }
                }}
                className={`w-full px-6 py-4 bg-black border rounded-2xl outline-none text-base text-white transition-all ${formErrors.cpf ? 'border-red-500' : 'border-white/10 focus:border-[#D4AF37]'}`}
              />
              {formErrors.cpf && <p className="text-xs text-red-500 ml-4">{formErrors.cpf}</p>}
            </div>

            <div className="space-y-1 relative">
              <input 
                type="text" 
                placeholder="Nome Completo" 
                value={formData.name} 
                onChange={e => setFormData({...formData, name: e.target.value})}
                className={`w-full px-6 py-4 bg-black border rounded-2xl outline-none text-base text-white transition-all ${formErrors.name ? 'border-red-500' : 'border-white/10 focus:border-[#D4AF37]'}`}
              />
              {formErrors.name && <p className="text-xs text-red-500 ml-4">{formErrors.name}</p>}
            </div>

            <div className="space-y-1 relative">
              <p className="text-xs font-bold uppercase tracking-widest text-[#D4AF37] ml-4 mb-1">Data de Nascimento</p>
              <input 
                type="tel" 
                value={formData.birth_date} 
                onChange={e => setFormData({...formData, birth_date: formatBirthDate(e.target.value)})}
                placeholder="DD/MM/AAAA"
                className={`w-full px-6 py-4 bg-black border rounded-2xl outline-none text-base text-white transition-all ${formErrors.birth_date ? 'border-red-500' : 'border-white/10 focus:border-[#D4AF37]'}`}
              />
              {formErrors.birth_date && <p className="text-xs text-red-500 ml-4">{formErrors.birth_date}</p>}
            </div>

            <div className="space-y-1 relative">
              <input 
                type="tel" 
                placeholder="Seu WhatsApp: (69) 99999-9999" 
                value={formData.whatsapp} 
                onChange={e => setFormData({...formData, whatsapp: formatPhone(e.target.value)})}
                className={`w-full px-6 py-4 bg-black border rounded-2xl outline-none text-base text-white transition-all ${formErrors.whatsapp ? 'border-red-500' : 'border-white/10 focus:border-[#D4AF37]'}`}
              />
              {formErrors.whatsapp && <p className="text-xs text-red-500 ml-4">{formErrors.whatsapp}</p>}
            </div>

            <button 
              onClick={() => {
                const errors: Record<string, string> = {};
                if (!formData.name.trim()) errors.name = 'Nome é obrigatório';
                if (!formData.cpf.trim()) {
                  errors.cpf = 'CPF é obrigatório';
                } else if (!cpfValidator.isValid(formData.cpf)) {
                  errors.cpf = 'CPF inválido';
                }
                if (!formData.birth_date || formData.birth_date.length !== 10) {
                  errors.birth_date = 'Data de nascimento inválida';
                } else {
                  const age = differenceInYears(new Date(), parse(formData.birth_date, 'dd/MM/yyyy', new Date()));
                  if (age < 18) {
                    errors.birth_date = 'Apenas maiores de 18 anos podem reservar';
                  }
                }
                if (!formData.whatsapp.trim()) {
                  errors.whatsapp = 'WhatsApp é obrigatório';
                } else if (formData.whatsapp.length < 14) {
                  errors.whatsapp = 'Telefone inválido';
                }

                if (Object.keys(errors).length === 0) {
                  setActiveStep(6);
                } else {
                  setFormErrors(errors);
                }
              }}
              className="w-full py-4 bg-[#D4AF37] text-black rounded-2xl font-black uppercase tracking-widest shadow-xl hover:bg-[#b8962f] active:scale-95 transition-all mt-4"
            >
              Ver Resumo
            </button>
          </div>
        )}
      </div>

      {/* Step 6: Confirmation */}
      <div className="bg-[#0A0A0A]">
        {renderStepHeader(6, CheckCircle2, "Resumo e Pagamento", "")}
        {activeStep === 6 && (
          <div className="p-6 animate-in fade-in zoom-in-95 duration-300">
            <div className="bg-white/5 rounded-3xl p-6 border border-white/10 space-y-4 mb-8 text-sm">
              <div className="flex justify-between border-b border-white/5 pb-3">
                <span className="text-[10px] font-bold uppercase tracking-widest text-white/30">Data</span>
                <span className="font-bold text-[#D4AF37]">{date}</span>
              </div>
              {locationId && (
                <div className="flex justify-between border-b border-white/5 pb-3">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-white/30">Local</span>
                  <span className="font-bold text-[#D4AF37]">{locationId}</span>
                </div>
              )}
              <div className="flex justify-between border-b border-white/5 pb-3">
                <span className="text-[10px] font-bold uppercase tracking-widest text-white/30">Taxa / Valor</span>
                <span className="font-bold text-[#D4AF37]">
                  {portalMode === 'mesa' ? 'R$ 100,00' : portalMode === 'camarote' ? 'R$ 1.000,00' : 'R$ 0,00'}
                </span>
              </div>
              
              {(portalMode === 'mesa' || portalMode === 'camarote') && (
                <div className="space-y-4">
                  <div className="bg-red-500/10 p-5 rounded-[24px] border border-red-500/20">
                    <p className="text-[10px] font-black text-red-500 uppercase tracking-widest flex items-center gap-2 mb-3">
                      <Info size={14} /> Política de Reserva
                    </p>
                    <ul className="text-[11px] text-red-400 font-medium space-y-2 list-disc pl-4">
                      {portalMode === 'mesa' ? (
                        <>
                          <li>Taxa de R$ 100,00 obrigatória (100% revertida em consumação).</li>
                          <li>A reserva é válida rigorosamente até às <span className="font-black underline">23:30</span>.</li>
                          <li>Em caso de no-show (não comparecimento) após o horário limite, a reserva será cancelada automaticamente e o valor da taxa <span className="font-black underline">não será reembolsado</span>.</li>
                        </>
                      ) : (
                        <>
                          <li>Valor do Camarote: R$ 1.000,00 (R$ 300,00 revertidos em consumação).</li>
                          <li>A reserva é válida rigorosamente até às <span className="font-black underline">02:00</span> da manhã.</li>
                          <li>Em caso de no-show (não comparecimento), o cliente perde o valor total pago (<span className="font-black underline">não haverá reembolso</span>).</li>
                        </>
                      )}
                    </ul>
                  </div>
                  
                  <label className="flex items-start gap-3 p-5 bg-white/5 rounded-[24px] border border-white/10 cursor-pointer group active:scale-[0.98] transition-all">
                    <div className="relative flex items-center">
                      <input 
                        type="checkbox" 
                        checked={policyAccepted}
                        onChange={e => setPolicyAccepted(e.target.checked)}
                        className="peer h-5 w-5 cursor-pointer appearance-none rounded-lg border border-white/20 bg-black transition-all checked:bg-[#D4AF37]"
                      />
                      <CheckCircle2 className="absolute h-5 w-5 text-black scale-0 peer-checked:scale-75 transition-transform" />
                    </div>
                    <span className="text-[11px] font-bold text-white/60 leading-tight group-hover:text-white transition-colors">
                      {portalMode === 'mesa' 
                        ? "Li e concordo com a política de reserva, horário limite de 23:30 e a regra de não reembolso em caso de atraso."
                        : "Li e concordo com a política do camarote, horário limite de 02:00 e perda total do valor em caso de no-show."
                      }
                    </span>
                  </label>
                </div>
              )}
            </div>
            
            <button 
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full py-5 bg-[#D4AF37] text-black rounded-[24px] font-black uppercase tracking-[0.2em] shadow-2xl hover:bg-[#b8962f] active:scale-95 transition-all flex items-center justify-center gap-3"
            >
              {isSubmitting ? <Loader2 className="animate-spin" /> : (portalMode === 'lista' ? 'ENTRAR NA LISTA' : 'PAGAR E RESERVAR')}
            </button>
          </div>
        )}
      </div>
    </div>
  );

  if (isSuccess) {
    return (
      <ReservationSuccess
        portalMode={portalMode}
        listLimitTime={listLimitTime}
        onReset={resetAll}
      />
    );
  }

  return (
    <div className="min-h-screen bg-black text-white font-sans flex flex-col items-center py-8 px-4 overflow-x-hidden">
      <div className="text-center mb-10 animate-in fade-in slide-in-from-top-4 duration-700">
        <h1 className="text-4xl sm:text-5xl font-serif font-black tracking-[0.3em] uppercase text-[#D4AF37] mb-2 drop-shadow-[0_0_15px_rgba(212,175,55,0.2)]">Nárnia</h1>
        <p className="text-[10px] font-black tracking-[0.5em] uppercase text-white/20">Festa • Bar • Club</p>
      </div>

      <div className="w-full max-w-[440px] bg-[#0A0A0A] rounded-[48px] border border-white/5 shadow-[0_40px_100px_rgba(0,0,0,1)] overflow-hidden flex flex-col min-h-[600px]">
        {portalMode !== 'landing' && (
          <div className="p-6 bg-black border-b border-white/5 flex items-center justify-between">
            <button onClick={() => setPortalMode('landing')} className="p-3 bg-white/5 rounded-2xl hover:bg-white/10 transition-all">
              <ChevronLeft size={20} />
            </button>
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-[#D4AF37]">
              {portalMode === 'mesa' ? 'Reserva de Mesa' : 
               portalMode === 'camarote' ? 'Reserva VIP' : 
               portalMode === 'lista' ? 'Nome na Lista' : 
               portalMode === 'promocoes' ? 'Promoções' : 'Consulta'}
            </h3>
            <div className="w-10" />
          </div>
        )}

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {portalMode === 'landing' ? (
            <ReservationLanding onModeChange={handleModeChange} />
          ) : portalMode === 'check' ? (
            <ReservationCheck
              searchCpf={searchCpf}
              setSearchCpf={setSearchCpf}
              onSearch={handleSearch}
              isSearching={isSearching}
              hasSearched={hasSearched}
              userReservations={userReservations}
              formatCPF={formatCPF}
            />
          ) : (
            renderReservationFlow()
          )}
        </div>

        <footer className="p-8 text-center space-y-4 bg-black/40 border-t border-white/5">
          <div className="flex justify-center gap-6 opacity-40">
            <a href="https://www.instagram.com/narniaclubpvh/" target="_blank" rel="noopener noreferrer" className="hover:text-[#D4AF37] transition-colors">
              <Instagram size={20} />
            </a>
            <a href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent('Olá vim pelo site de reservas, gostaria de saber mais!')}`} target="_blank" rel="noopener noreferrer" className="hover:text-[#D4AF37] transition-colors">
              <MessageCircle size={20} />
            </a>
            <a href="https://maps.app.goo.gl/fHVMSJb5jiDu36u27" target="_blank" rel="noopener noreferrer" className="hover:text-[#D4AF37] transition-colors">
              <MapPin size={20} />
            </a>
          </div>
          <p className="text-[8px] font-bold uppercase tracking-[0.3em] text-white/20">Porto Velho • RO</p>
        </footer>
      </div>

      {/* Blacklist Alert Modal */}
      {blacklistAlert && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="w-full max-w-md bg-[#0A0A0A] rounded-[40px] border-2 border-red-500/50 p-10 shadow-[0_0_50px_rgba(239,68,68,0.2)] text-center animate-in zoom-in-95 duration-300">
            <div className="w-24 h-24 bg-red-500 rounded-full flex items-center justify-center text-white mx-auto mb-6 shadow-[0_0_30px_rgba(239,68,68,0.5)] animate-pulse">
              <ShieldAlert size={48} />
            </div>
            <h2 className="text-3xl font-black uppercase tracking-tighter text-red-500 mb-2">ACESSO RESTRITO</h2>
            <p className="text-white/40 text-[10px] font-bold uppercase tracking-[0.2em] mb-8">Esta conta possui restrições ativas</p>
            
            <div className="bg-white/5 rounded-3xl p-6 border border-white/10 mb-8 text-left">
              <div className="mb-4">
                <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest mb-1">Status da Solicitação</p>
                <p className="text-lg font-bold text-red-500">CPF Bloqueado</p>
              </div>
              <div className="mb-4">
                <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest mb-1">Motivo do Bloqueio</p>
                <p className="text-sm font-medium text-white italic">&quot;{blacklistAlert.reason || 'Restrição administrativa'}&quot;</p>
              </div>
              <div className="pt-4 border-t border-white/5 text-center">
                <p className="text-[8px] font-black text-white/40 uppercase tracking-widest mb-1">Tempo Restante</p>
                <div className="text-2xl font-black text-red-500 tracking-tighter">
                  {Math.max(0, differenceInDays(parseISO(blacklistAlert.end_date), new Date()))} DIAS
                </div>
              </div>
            </div>

            <button 
              onClick={() => {
                setBlacklistAlert(null);
                resetAll();
                setPortalMode('landing');
              }}
              className="w-full py-5 bg-red-500 text-white rounded-[24px] font-black uppercase tracking-widest hover:bg-red-600 transition-all active:scale-95 shadow-xl shadow-red-500/20"
            >
              ENTENDIDO
            </button>
            <p className="mt-6 text-[10px] font-bold text-white/20 uppercase tracking-widest">Dúvidas? Entre em contato via WhatsApp</p>
          </div>
        </div>
      )}

      <CustomAlertDialog {...alertProps} />
    </div>
  );
}
