'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Users, 
  Clock, 
  MessageSquare, 
  User, 
  CheckCircle2, 
  ChevronDown, 
  AlertCircle, 
  Loader2, 
  MapPin, 
  Instagram, 
  MessageCircle, 
  AlertTriangle, 
  Utensils, 
  Search, 
  History, 
  CalendarCheck, 
  XCircle,
  LayoutGrid,
  Gem,
  ClipboardList,
  TicketPercent,
  ChevronLeft,
  ArrowRight,
  Info,
  ShieldAlert
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import EventPicker from './components/EventPicker';
import SVGMap from './components/SVGMap';
import { format, parse, isAfter, addHours, differenceInHours, differenceInDays, getDay, startOfWeek, endOfWeek, differenceInYears, parseISO, startOfToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cpf as cpfValidator } from 'cpf-cnpj-validator';

type PortalMode = 'landing' | 'mesa' | 'camarote' | 'lista' | 'promocoes' | 'check';

export default function NarniaClubPortal() {
  // Navigation State
  const [portalMode, setPortalMode] = useState<PortalMode>('landing');
  const [activeStep, setActiveStep] = useState(1);
  
  // Form State
  const [date, setDate] = useState('');
  const [guests, setGuests] = useState<number | null>(null);
  const [time, setTime] = useState('');
  const [notes, setNotes] = useState('');
  const [locationId, setLocationId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ 
    name: '', 
    email: '', 
    whatsapp: '', 
    cpf: '', 
    birth_date: '' 
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  
  // Status State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [fullyBookedDates, setFullyBookedDates] = useState<string[]>([]);
  const [reservedLocations, setReservedLocations] = useState<string[]>([]);
  const [searchCpf, setSearchCpf] = useState('');
  const [userReservations, setUserReservations] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [blacklistAlert, setBlacklistAlert] = useState<any | null>(null);
  const [policyAccepted, setPolicyAccepted] = useState(false);
  const [events, setEvents] = useState<any[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  
  const supabase = createClient();
  const WHATSAPP_NUMBER = "5569999798553";

  const handleSearch = async () => {
    const formattedCpf = formatCPF(searchCpf);
    if (formattedCpf.length < 14) return;
    setIsSearching(true);
    setHasSearched(true);
    
    const { data, error } = await supabase
      .from('reservations')
      .select('*')
      .eq('cpf', formattedCpf)
      .order('reservation_date', { ascending: false });

    if (!error) {
      setUserReservations(data || []);
    }
    setIsSearching(false);
  };

  // Isolation: Clear state when switching modes
  const handleModeChange = (mode: PortalMode) => {
    resetAll();
    setPortalMode(mode);
  };

  const fetchFullDates = async () => {
    const { data } = await supabase
      .from('reservations')
      .select('reservation_date, num_guests, status');
    
    if (data) {
      const dateTotals: Record<string, number> = {};
      data.forEach(res => {
        if ((res.status || 'pending').toLowerCase() !== 'cancelled') {
          dateTotals[res.reservation_date] = (dateTotals[res.reservation_date] || 0) + (res.num_guests || 0);
        }
      });
      const fullDates = Object.keys(dateTotals).filter(date => dateTotals[date] >= 80);
      setFullyBookedDates(fullDates);
    }
  };

  const fetchEvents = async () => {
    setLoadingEvents(true);
    const { data } = await supabase
      .from('events')
      .select('*')
      .gte('event_date', format(startOfToday(), 'yyyy-MM-dd'))
      .order('event_date', { ascending: true });
    
    if (data) setEvents(data);
    setLoadingEvents(false);
  };

  useEffect(() => {
    fetchFullDates();
    fetchEvents();
  }, []);

  useEffect(() => {
    if (!date || (portalMode !== 'mesa' && portalMode !== 'camarote')) return;
    
    const fetchReservedLocations = async () => {
      const { data } = await supabase
        .from('reservations')
        .select('location_id, status')
        .eq('reservation_date', date)
        .in('type', ['mesa', 'camarote']);
      
      if (data) {
        const taken = data
          .filter(r => (r.status || 'pending').toLowerCase() !== 'cancelled' && r.location_id)
          .map(r => r.location_id);
        setReservedLocations(taken);
      }
    };

    fetchReservedLocations();
  }, [date, portalMode]);

  // Validation Helpers
  const formatCPF = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1');
  };

  const formatPhone = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/^(\d{2})(\d)/g, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .slice(0, 15);
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.name.trim()) errors.name = 'Nome é obrigatório';
    
    // CPF Validation
    if (!formData.cpf.trim()) {
      errors.cpf = 'CPF é obrigatório';
    } else if (!cpfValidator.isValid(formData.cpf)) {
      errors.cpf = 'CPF inválido';
    }

    // Age Verification
    if (!formData.birth_date) {
      errors.birth_date = 'Data de nascimento é obrigatória';
    } else {
      const age = differenceInYears(new Date(), parseISO(formData.birth_date));
      if (age < 18) {
        errors.birth_date = 'Apenas maiores de 18 anos podem reservar';
      }
    }

    if (!formData.whatsapp.trim()) {
      errors.whatsapp = 'WhatsApp é obrigatório';
    } else if (formData.whatsapp.length < 14) {
      errors.whatsapp = 'Telefone inválido';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const checkWeeklyListLimit = async (cpf: string) => {
    const start = format(startOfWeek(new Date()), 'yyyy-MM-dd');
    const end = format(endOfWeek(new Date()), 'yyyy-MM-dd');

    const { data } = await supabase
      .from('reservations')
      .select('id')
      .eq('cpf', cpf)
      .eq('type', 'lista')
      .gte('reservation_date', start)
      .lte('reservation_date', end)
      .not('status', 'ilike', 'cancelled');

    return (data || []).length > 0;
  };

  const checkBlacklist = async (cpf: string) => {
    const { data } = await supabase
      .from('blacklist')
      .select('*')
      .eq('cpf', cpf.replace(/\D/g, ''))
      .maybeSingle();
    
    return data;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    setIsSubmitting(true);
    
    // Check Blacklist
    const blacklistData = await checkBlacklist(formData.cpf);
    if (blacklistData) {
      setBlacklistAlert(blacklistData);
      setIsSubmitting(false);
      return;
    }

    if ((portalMode === 'mesa' || portalMode === 'camarote') && !policyAccepted) {
      alert('Você precisa aceitar a política de reserva para continuar.');
      setIsSubmitting(false);
      return;
    }

    if (portalMode === 'lista') {
      const alreadyOnList = await checkWeeklyListLimit(formData.cpf);
      if (alreadyOnList) {
        alert('Este CPF já foi adicionado à lista nesta semana.');
        setIsSubmitting(false);
        return;
      }
    }

    const { error } = await supabase
      .from('reservations')
      .insert([{
        name: formData.name,
        email: formData.email || '',
        whatsapp: formData.whatsapp,
        cpf: formData.cpf,
        birth_date: formData.birth_date,
        reservation_date: date || format(new Date(), 'yyyy-MM-dd'),
        reservation_time: time || '22:00',
        num_guests: guests || 1,
        type: portalMode,
        location_id: locationId,
        notes: notes,
        status: 'pending',
        payment_status: (portalMode === 'mesa' || portalMode === 'camarote') ? 'pending' : 'not_required',
        payment_amount: (portalMode === 'mesa' || portalMode === 'camarote') ? 100 : 0,
        expires_at: portalMode === 'mesa' ? `${date} 23:30:00` : null
      }]);

    if (!error) {
      setIsSuccess(true);
    } else {
      console.error('Submit Error:', error);
      alert('Erro ao processar: ' + error.message);
    }
    setIsSubmitting(false);
  };

  const resetAll = () => {
    setActiveStep(1);
    setIsSuccess(false);
    setDate('');
    setGuests(null);
    setTime('');
    setLocationId(null);
    setNotes('');
    setPolicyAccepted(false);
    setReservedLocations([]);
    setFormData({ name: '', email: '', whatsapp: '', cpf: '', birth_date: '' });
    setFormErrors({});
  };

  // Rendering Helpers
  const renderLanding = () => (
    <div className="p-6 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center mb-8">
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#D4AF37] mb-2">Bem-vindo ao Portal</p>
        <h2 className="text-3xl font-serif font-bold text-white tracking-tight">O que deseja fazer?</h2>
      </div>

      <button onClick={() => handleModeChange('mesa')} className="w-full group bg-[#0A0A0A] border border-white/5 p-6 rounded-[32px] flex items-center justify-between hover:border-[#D4AF37]/50 transition-all active:scale-[0.98]">
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 bg-[#D4AF37]/10 rounded-2xl flex items-center justify-center text-[#D4AF37] group-hover:scale-110 transition-transform">
            <LayoutGrid size={28} />
          </div>
          <div className="text-left">
            <h3 className="font-bold text-lg text-white">Reservar Mesa</h3>
            <p className="text-xs text-white/40 font-medium">Mapa interativo • R$ 100 taxa</p>
          </div>
        </div>
        <ArrowRight className="text-white/20 group-hover:text-[#D4AF37] transition-colors" />
      </button>

      <button onClick={() => handleModeChange('camarote')} className="w-full group bg-[#0A0A0A] border border-white/5 p-6 rounded-[32px] flex items-center justify-between hover:border-[#D4AF37]/50 transition-all active:scale-[0.98]">
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 bg-[#D4AF37]/10 rounded-2xl flex items-center justify-center text-[#D4AF37] group-hover:scale-110 transition-transform">
            <Gem size={28} />
          </div>
          <div className="text-left">
            <h3 className="font-bold text-lg text-white">Camarotes</h3>
            <p className="text-xs text-white/40 font-medium">Espaço VIP • Atendimento exclusivo</p>
          </div>
        </div>
        <ArrowRight className="text-white/20 group-hover:text-[#D4AF37] transition-colors" />
      </button>

      <button onClick={() => handleModeChange('lista')} className="w-full group bg-[#0A0A0A] border border-white/5 p-6 rounded-[32px] flex items-center justify-between hover:border-[#D4AF37]/50 transition-all active:scale-[0.98]">
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 bg-[#D4AF37]/10 rounded-2xl flex items-center justify-center text-[#D4AF37] group-hover:scale-110 transition-transform">
            <ClipboardList size={28} />
          </div>
          <div className="text-left">
            <h3 className="font-bold text-lg text-white">Nome na Lista</h3>
            <p className="text-xs text-white/40 font-medium">Entrada facilitada • Individual</p>
          </div>
        </div>
        <ArrowRight className="text-white/20 group-hover:text-[#D4AF37] transition-colors" />
      </button>

      <div className="pt-6 border-t border-white/5">
        <button onClick={() => handleModeChange('check')} className="w-full py-4 bg-white/5 hover:bg-white/10 rounded-2xl text-[10px] font-bold uppercase tracking-[0.2em] text-white/40 flex items-center justify-center gap-2 transition-all">
          <Search size={14} /> Minhas Reservas
        </button>
      </div>
    </div>
  );

  const renderCheck = () => (
    <div className="p-6 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center mb-4">
        <h2 className="text-2xl font-serif font-bold text-white tracking-tight">Minhas Reservas</h2>
        <p className="text-xs text-white/40 mt-1">Consulte o status das suas solicitações</p>
      </div>

      <div className="space-y-4">
        <div className="relative">
          <User className="absolute left-4 top-1/2 -translate-y-1/2 text-[#D4AF37]/40" size={18} />
          <input 
            type="text" placeholder="Seu CPF: 000.000.000-00" 
            value={searchCpf} onChange={e => setSearchCpf(formatCPF(e.target.value))}
            className="w-full pl-12 pr-4 py-4 bg-black border border-white/10 rounded-2xl outline-none text-white focus:border-[#D4AF37] transition-all"
          />
        </div>
        <button 
          onClick={handleSearch}
          disabled={isSearching}
          className="w-full py-4 bg-[#D4AF37] text-black rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2"
        >
          {isSearching ? <Loader2 className="animate-spin" size={18} /> : <Search size={18} />}
          Buscar Reservas
        </button>
      </div>

      <div className="space-y-4 pt-4 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
        {userReservations.length > 0 ? (
          userReservations.map((res: any) => (
            <div key={res.id} className="bg-white/5 border border-white/5 p-5 rounded-[24px] space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/20 mb-1">{res.type}</p>
                  <p className="font-bold text-[#D4AF37]">{format(parseISO(res.reservation_date), 'dd/MM/yyyy')}</p>
                </div>
                <StatusBadge status={res.status} />
              </div>
              <div className="flex items-center gap-2 text-[10px] font-bold text-white/40 uppercase">
                <Users size={12} /> {res.num_guests} convidados {res.location_id ? `• ${res.location_id}` : ''}
              </div>
            </div>
          ))
        ) : hasSearched && !isSearching ? (
          <div className="text-center py-10 opacity-40">
            <AlertCircle size={32} className="mx-auto mb-2" />
            <p className="text-xs font-bold uppercase tracking-widest">Nenhuma reserva encontrada</p>
          </div>
        ) : null}
      </div>
    </div>
  );

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
              onDateSelect={(d) => { setDate(d); setActiveStep(portalMode === 'lista' ? 5 : 2); }} 
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
                onSelect={(id) => { setLocationId(id); setActiveStep(3); }}
                selectedId={locationId || undefined}
              />
            </div>
          )}
        </div>
      )}

      {/* Step 3: Guests (Hidden for Lista) */}
      {portalMode !== 'lista' && (
        <div className="bg-[#0A0A0A]">
          {renderStepHeader(3, Users, "Convidados", guests ? `${guests} pessoas` : '')}
          {activeStep === 3 && (
            <div className="p-6 space-y-4 animate-in fade-in zoom-in-95 duration-300">
              <div className="grid grid-cols-5 gap-2">
                {[2, 4, 6, 8, 10].map(n => (
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
            <div className="space-y-1">
              <input 
                type="text" placeholder="CPF" 
                value={formData.cpf} 
                onChange={e => {
                  const cpf = formatCPF(e.target.value);
                  setFormData({...formData, cpf});
                  
                  // Auto-fill if CPF is found in previous reservations
                  if (cpf.replace(/\D/g, '').length === 11) {
                    supabase
                      .from('reservations')
                      .select('name, whatsapp, birth_date')
                      .eq('cpf', cpf)
                      .order('created_at', { ascending: false })
                      .limit(1)
                      .maybeSingle()
                      .then(({ data }) => {
                        if (data) {
                          setFormData(prev => ({
                            ...prev,
                            name: data.name || prev.name,
                            whatsapp: data.whatsapp || prev.whatsapp,
                            birth_date: data.birth_date || prev.birth_date
                          }));
                        }
                      });
                  }
                }}
                className={`w-full px-6 py-4 bg-black border rounded-2xl outline-none text-base text-white transition-all ${formErrors.cpf ? 'border-red-500' : 'border-white/10 focus:border-[#D4AF37]'}`}
              />
              {formErrors.cpf && <p className="text-xs text-red-500 ml-4">{formErrors.cpf}</p>}
            </div>

            <div className="space-y-1">
              <input 
                type="text" placeholder="Nome Completo" 
                value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                className={`w-full px-6 py-4 bg-black border rounded-2xl outline-none text-base text-white transition-all ${formErrors.name ? 'border-red-500' : 'border-white/10 focus:border-[#D4AF37]'}`}
              />
              {formErrors.name && <p className="text-xs text-red-500 ml-4">{formErrors.name}</p>}
            </div>

            <div className="space-y-1">
              <p className="text-xs font-bold uppercase tracking-widest text-[#D4AF37] ml-4 mb-1">Data de Nascimento</p>
              <input 
                type="date" 
                value={formData.birth_date} onChange={e => setFormData({...formData, birth_date: e.target.value})}
                className={`w-full px-6 py-4 bg-black border rounded-2xl outline-none text-base text-white transition-all ${formErrors.birth_date ? 'border-red-500' : 'border-white/10 focus:border-[#D4AF37]'}`}
              />
              {formErrors.birth_date && <p className="text-xs text-red-500 ml-4">{formErrors.birth_date}</p>}
            </div>

            <div className="space-y-1">
              <input 
                type="tel" placeholder="WhatsApp: (69) 99999-9999" 
                value={formData.whatsapp} onChange={e => setFormData({...formData, whatsapp: formatPhone(e.target.value)})}
                className={`w-full px-6 py-4 bg-black border rounded-2xl outline-none text-base text-white transition-all ${formErrors.whatsapp ? 'border-red-500' : 'border-white/10 focus:border-[#D4AF37]'}`}
              />
              {formErrors.whatsapp && <p className="text-xs text-red-500 ml-4">{formErrors.whatsapp}</p>}
            </div>

            <button 
              onClick={() => validateForm() && setActiveStep(6)}
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
                <span className="text-[10px] font-bold uppercase tracking-widest text-white/30">Taxa de Reserva</span>
                <span className="font-bold text-[#D4AF37]">R$ { (portalMode === 'mesa' || portalMode === 'camarote') ? '100,00' : '0,00'}</span>
              </div>
              
              {(portalMode === 'mesa' || portalMode === 'camarote') && (
                <div className="space-y-4">
                  <div className="bg-red-500/10 p-5 rounded-[24px] border border-red-500/20">
                    <p className="text-[10px] font-black text-red-500 uppercase tracking-widest flex items-center gap-2 mb-3">
                      <Info size={14} /> Política de Reserva
                    </p>
                    <ul className="text-[11px] text-red-400 font-medium space-y-2 list-disc pl-4">
                      <li>Taxa de R$ 100,00 obrigatória (100% revertida em consumação).</li>
                      <li>A reserva é válida rigorosamente até às <span className="font-black underline">23:30</span>.</li>
                      <li>Em caso de no-show (não comparecimento) após o horário limite, a reserva será cancelada automaticamente e o valor da taxa <span className="font-black underline">não será reembolsado</span>.</li>
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
                      Li e concordo com a política de reserva, horário limite de 23:30 e a regra de não reembolso em caso de atraso.
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

  const cabinElements = [
    { id: 'C1', type: 'camarote' as const, label: 'C1', available: !reservedLocations.includes('C1') },
    { id: 'C2', type: 'camarote' as const, label: 'C2', available: !reservedLocations.includes('C2') },
    { id: 'C3', type: 'camarote' as const, label: 'C3', available: !reservedLocations.includes('C3') },
  ];

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6 text-white text-center">
        <div className="max-w-sm w-full space-y-8 animate-in zoom-in duration-500">
          <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mx-auto shadow-[0_0_50px_rgba(34,197,94,0.3)]">
            <CheckCircle2 size={48} className="text-black" />
          </div>
          <div>
            <h2 className="text-3xl font-serif font-bold mb-3 uppercase tracking-widest">Sucesso!</h2>
            <p className="text-white/60 font-medium">Sua solicitação foi processada. Siga as instruções no WhatsApp para finalizar.</p>
          </div>
          <div className="space-y-3">
            <button onClick={() => window.open(`https://wa.me/${WHATSAPP_NUMBER}`)} className="w-full py-5 bg-[#25D366] rounded-3xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2">
              <MessageCircle size={20} /> Confirmar no WhatsApp
            </button>
            <button onClick={resetAll} className="w-full py-5 bg-white/5 rounded-3xl font-black uppercase tracking-widest text-xs text-white/40 hover:text-white">
              Voltar ao Início
            </button>
          </div>
        </div>
      </div>
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
          {portalMode === 'landing' ? renderLanding() : 
           portalMode === 'check' ? renderCheck() : 
           renderReservationFlow()}
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
                <p className="text-sm font-medium text-white italic">"{blacklistAlert.reason || 'Restrição administrativa'}"</p>
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
    </div>
  );
}
function StatusBadge({ status }: { status: string | null }) {
  const s = (status || 'pending').toLowerCase();
  const config: any = {
    pending: { bg: 'bg-amber-500/10', text: 'text-amber-500', label: 'Pendente' },
    confirmed: { bg: 'bg-green-500/10', text: 'text-green-500', label: 'Confirmado' },
    cancelled: { bg: 'bg-red-500/10', text: 'text-red-500', label: 'Cancelado' },
    completed: { bg: 'bg-blue-500/10', text: 'text-blue-500', label: 'Concluído' },
  };
  const c = config[s] || config.pending;
  return (
    <span className={`px-3 py-1.5 rounded-xl ${c.bg} ${c.text} text-[10px] font-black uppercase tracking-widest border border-current/20`}>
      {c.label}
    </span>
  );
}
