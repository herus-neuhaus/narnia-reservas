'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Database } from '@/lib/supabase/database.types';
import { format, parseISO } from 'date-fns';
import { Loader2, Plus, Trash2, Image as ImageIcon, Clock, Check, X, Edit2, Users, FileText, LayoutDashboard } from 'lucide-react';
import EventOverviewModal from '../components/EventOverviewModal';

type EventRow = Database['public']['Tables']['events']['Row'] & {
  description?: string | null;
  start_time?: string | null;
  banner_url?: string | null;
  visible_from?: string | null;
};

export default function EventsManager() {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [overviewEvent, setOverviewEvent] = useState<EventRow | null>(null);

  // States for inline editing of list limit time
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTime, setEditingTime] = useState<string>('23:30');
  const [isUpdatingTime, setIsUpdatingTime] = useState<boolean>(false);

  // States for inline editing of list limit capacity
  const [editingCapacityId, setEditingCapacityId] = useState<string | null>(null);
  const [editingCapacity, setEditingCapacity] = useState<string>('');
  const [isUpdatingCapacity, setIsUpdatingCapacity] = useState<boolean>(false);

  // States for inline editing of visible from
  const [editingVisibleFromId, setEditingVisibleFromId] = useState<string | null>(null);
  const [editingVisibleFrom, setEditingVisibleFrom] = useState<string>('');
  const [isUpdatingVisibleFrom, setIsUpdatingVisibleFrom] = useState<boolean>(false);

  const [formData, setFormData] = useState({
    name: '',
    event_date: '',
    description: '',
    start_time: '22:00',
    list_limit_time: '23:30',
    list_limit_capacity: '',
    visible_from: '',
    banner_url: '',
    image_file: null as File | null
  });

  const supabase = createClient();

  const fetchEvents = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('events')
      .select('*')
      .order('event_date', { ascending: true });
    
    if (data) setEvents(data as EventRow[]);
    setLoading(false);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleImageUpload = async (file: File) => {
    const fileExt = file.name.split('.').pop();
    // eslint-disable-next-line react-hooks/purity
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `covers/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('flyers')
      .upload(filePath, file);

    if (uploadError) {
      throw uploadError;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('flyers')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.event_date) {
      alert('Nome e Data do evento são campos obrigatórios.');
      return;
    }
    if (!formData.banner_url) {
      alert('Por favor, selecione e envie o Flyer/Capa do evento antes de salvar.');
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch('/api/events/create', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          title: formData.name,
          date: formData.event_date,
          description: formData.description,
          start_time: formData.start_time || '22:00',
          list_limit_capacity: formData.list_limit_capacity || '0',
          list_limit_time: formData.list_limit_time || '23:30',
          banner_url: formData.banner_url,
          visible_from: formData.visible_from ? new Date(formData.visible_from).toISOString() : null
        })
      });

      const resData = await response.json();
      if (!response.ok || !resData.success) {
        throw new Error(resData.error || 'Erro ao processar criação de evento.');
      }

      setShowAddForm(false);
      setFormData({ 
        name: '', 
        event_date: '', 
        description: '', 
        start_time: '22:00', 
        list_limit_time: '23:30', 
        list_limit_capacity: '', 
        visible_from: '',
        banner_url: '', 
        image_file: null 
      });
      fetchEvents();
    } catch (error: any) {
      alert('Erro ao criar evento: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveTime = async (id: string) => {
    setIsUpdatingTime(true);
    try {
      const formattedTime = editingTime.includes(':') ? editingTime : '23:30';
      const { error } = await supabase
        .from('events')
        .update({ list_limit_time: formattedTime })
        .eq('id', id);

      if (error) throw error;
      setEditingId(null);
      fetchEvents();
    } catch (error: any) {
      alert('Erro ao atualizar horário limite: ' + error.message);
    } finally {
      setIsUpdatingTime(false);
    }
  };

  const handleSaveCapacity = async (id: string) => {
    setIsUpdatingCapacity(true);
    try {
      const capVal = editingCapacity === '' ? null : parseInt(editingCapacity, 10);
      if (capVal !== null && (isNaN(capVal) || capVal < 0)) {
        throw new Error('Capacidade deve ser um número maior ou igual a zero.');
      }
      const { error } = await supabase
        .from('events')
        .update({ list_limit_capacity: capVal })
        .eq('id', id);

      if (error) throw error;
      setEditingCapacityId(null);
      fetchEvents();
    } catch (error: any) {
      alert('Erro ao atualizar limite de lista: ' + error.message);
    } finally {
      setIsUpdatingCapacity(false);
    }
  };

  const handleSaveVisibleFrom = async (id: string) => {
    setIsUpdatingVisibleFrom(true);
    try {
      const val = editingVisibleFrom ? new Date(editingVisibleFrom).toISOString() : null;
      const { error } = await supabase
        .from('events')
        .update({ visible_from: val })
        .eq('id', id);

      if (error) throw error;
      setEditingVisibleFromId(null);
      fetchEvents();
    } catch (error: any) {
      alert('Erro ao atualizar data de liberação: ' + error.message);
    } finally {
      setIsUpdatingVisibleFrom(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir este evento?')) return;
    
    const { error } = await supabase.from('events').delete().eq('id', id);
    if (!error) {
      fetchEvents();
    } else {
      alert('Erro ao excluir: ' + error.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-20">
        <Loader2 className="animate-spin text-[#D4AF37]" size={40} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold uppercase tracking-widest text-[#D4AF37]">Eventos Cadastrados</h3>
        <button 
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 bg-[#D4AF37] text-black px-4 py-2 rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-[#b8962f] transition-all"
        >
          {showAddForm ? 'Cancelar' : <><Plus size={16} /> Novo Evento</>}
        </button>
      </div>

      {showAddForm && (
        <form onSubmit={handleSubmit} className="bg-[#0A0A0A] border border-white/10 p-6 rounded-3xl space-y-4 animate-in fade-in slide-in-from-top-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 ml-4 mb-1 block">Nome do Evento</label>
              <input 
                type="text" 
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                placeholder="Ex: Baile do Nárnia"
                className="w-full px-6 py-4 bg-[#0d0d0d] border border-zinc-800 rounded-2xl outline-none focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] transition-all text-white font-medium"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 ml-4 mb-1 block">Data do Evento</label>
              <input 
                type="date" 
                value={formData.event_date}
                onChange={e => setFormData({...formData, event_date: e.target.value})}
                className="w-full px-6 py-4 bg-[#0d0d0d] border border-zinc-800 rounded-2xl outline-none focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] transition-all text-white font-medium"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 ml-4 mb-1 block">Horário de Início</label>
              <input 
                type="time" 
                value={formData.start_time}
                onChange={e => setFormData({...formData, start_time: e.target.value})}
                className="w-full px-6 py-4 bg-[#0d0d0d] border border-zinc-800 rounded-2xl outline-none focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] transition-all text-white font-medium"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 ml-4 mb-1 block">Limite da Lista</label>
              <input 
                type="time" 
                value={formData.list_limit_time}
                onChange={e => setFormData({...formData, list_limit_time: e.target.value})}
                className="w-full px-6 py-4 bg-[#0d0d0d] border border-zinc-800 rounded-2xl outline-none focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] transition-all text-white font-medium"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 ml-4 mb-1 block">Capacidade da Lista</label>
              <input 
                type="number" 
                value={formData.list_limit_capacity}
                onChange={e => setFormData({...formData, list_limit_capacity: e.target.value})}
                placeholder="Ex: 200"
                className="w-full px-6 py-4 bg-[#0d0d0d] border border-zinc-800 rounded-2xl outline-none focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] transition-all text-white font-bold"
              />
            </div>
            <div className="lg:col-span-5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 ml-4 mb-1 block">Início da Lista e Reservas (Data e Hora que aparece no site)</label>
              <input 
                type="datetime-local" 
                value={formData.visible_from}
                onChange={e => setFormData({...formData, visible_from: e.target.value})}
                className="w-full px-6 py-4 bg-[#0d0d0d] border border-zinc-800 rounded-2xl outline-none focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] transition-all text-white font-medium"
              />
            </div>
          </div>
          
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 ml-4 mb-1 block">Descrição / Atrações</label>
            <textarea 
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
              placeholder="Insira as atrações, line-up ou informações adicionais da festa..."
              rows={4}
              className="w-full px-6 py-4 bg-[#0d0d0d] border border-zinc-800 rounded-2xl outline-none focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] transition-all text-white resize-none font-medium"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 ml-4 mb-1 block">Flyer do Evento</label>
            <label className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-zinc-800 rounded-2xl cursor-pointer hover:border-[#D4AF37]/50 transition-all bg-black/50">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                {isUploadingImage ? (
                  <>
                    <Loader2 className="animate-spin text-[#D4AF37] mb-2" size={24} />
                    <p className="text-xs text-[#D4AF37] font-medium">Fazendo upload do Flyer...</p>
                  </>
                ) : (
                  <>
                    <ImageIcon className="text-white/20 mb-2" size={24} />
                    <p className="text-xs text-white/60 font-medium">
                      {formData.image_file ? formData.image_file.name : "Clique para selecionar a imagem"}
                    </p>
                    {formData.banner_url && (
                      <span className="text-[9px] font-black text-green-500 uppercase tracking-widest mt-1">Flyer enviado com sucesso</span>
                    )}
                  </>
                )}
              </div>
              <input 
                type="file" 
                accept="image/*"
                className="hidden" 
                disabled={isUploadingImage || isSubmitting}
                onChange={async (e) => {
                  const file = e.target.files?.[0] || null;
                  if (file) {
                    setIsUploadingImage(true);
                    try {
                      const url = await handleImageUpload(file);
                      setFormData(prev => ({ ...prev, image_file: file, banner_url: url }));
                    } catch (error: any) {
                      alert('Erro ao fazer upload do flyer: ' + error.message);
                    } finally {
                      setIsUploadingImage(false);
                    }
                  }
                }}
              />
            </label>
          </div>

          <div className="pt-4 flex justify-end">
            <button 
              type="submit" 
              disabled={isSubmitting || isUploadingImage}
              className="px-8 py-4 bg-[#D4AF37] text-black rounded-2xl font-black uppercase tracking-widest text-xs flex items-center gap-2 hover:bg-[#b8962f] disabled:opacity-40 transition-all"
            >
              {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : 'Salvar Evento'}
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {events.length === 0 ? (
          <div className="col-span-full py-12 text-center text-white/20 border border-white/5 rounded-3xl">
            <p className="text-sm font-bold uppercase tracking-widest">Nenhum evento agendado</p>
          </div>
        ) : (
          events.map(event => (
            <div key={event.id} className="bg-[#0A0A0A] border border-white/5 rounded-3xl overflow-hidden group flex flex-col justify-between">
              <div>
                <div className="h-48 bg-black relative">
                  <img src={event.banner_url || event.image_url || '/placeholder.png'} alt={event.name} className="w-full h-full object-cover opacity-80" />
                  <div className="absolute top-2 right-2 bg-black/80 backdrop-blur-md px-3 py-1 rounded-lg border border-white/10">
                    <span className="text-xs font-black uppercase tracking-widest text-[#D4AF37]">
                      {format(parseISO(event.event_date), 'dd/MM/yyyy')}
                    </span>
                  </div>
                </div>
                
                <div className="p-5 space-y-4">
                  <div className="flex justify-between items-start">
                    <h4 className="font-bold text-lg leading-tight uppercase tracking-tight text-white">{event.name}</h4>
                    <button 
                      onClick={() => handleDelete(event.id)}
                      className="p-3 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  {event.description && (
                    <div className="border-t border-white/5 pt-3">
                      <p className="text-xs text-white/60 font-medium leading-relaxed line-clamp-3">
                        {event.description}
                      </p>
                    </div>
                  )}

                  {/* Start Time Section */}
                  <div className="flex items-center justify-between border-t border-white/5 pt-4">
                    <div className="flex items-center gap-2">
                      <Clock size={14} className="text-[#D4AF37]" />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">Início do Evento</span>
                    </div>
                    <span className="text-sm font-black text-white">
                      {event.start_time ? event.start_time.substring(0, 5) : '22:00'}
                    </span>
                  </div>

                  {/* Visible From Section */}
                  <div className="flex items-center justify-between border-t border-white/5 pt-4">
                    <div className="flex items-center gap-2">
                      <Clock size={14} className="text-green-500" />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">Início Lista/Reservas</span>
                    </div>
                    {editingVisibleFromId === event.id ? (
                      <div className="flex items-center gap-1.5 animate-in fade-in duration-200">
                        <input 
                          type="datetime-local" 
                          value={editingVisibleFrom}
                          onChange={e => setEditingVisibleFrom(e.target.value)}
                          className="px-2 py-1 bg-black border border-white/20 rounded-xl text-[10px] font-bold text-white outline-none focus:border-[#D4AF37] w-32"
                        />
                        <button 
                          onClick={() => handleSaveVisibleFrom(event.id)}
                          disabled={isUpdatingVisibleFrom}
                          className="p-1.5 bg-[#D4AF37] text-black rounded-lg hover:bg-[#b8962f] active:scale-95 transition-all"
                          title="Salvar"
                        >
                          {isUpdatingVisibleFrom ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check size={12} />}
                        </button>
                        <button 
                          onClick={() => setEditingVisibleFromId(null)}
                          className="p-1.5 bg-white/5 hover:bg-white/10 text-white rounded-lg active:scale-95 transition-all border border-white/10"
                          title="Cancelar"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-black text-green-500 text-right leading-tight">
                          {event.visible_from ? format(parseISO(event.visible_from), 'dd/MM HH:mm') : 'Imediato'}
                        </span>
                        <button 
                          onClick={() => {
                            setEditingVisibleFromId(event.id);
                            setEditingVisibleFrom(event.visible_from ? event.visible_from.slice(0, 16) : '');
                          }}
                          className="p-1.5 bg-white/5 hover:bg-[#D4AF37] hover:text-black text-white/60 rounded-lg transition-all border border-white/10"
                          title="Editar"
                        >
                          <Edit2 size={10} />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* List Limit Time Section with inline editing */}
                  <div className="flex items-center justify-between border-t border-white/5 pt-4">
                    <div className="flex items-center gap-2">
                      <Clock size={14} className="text-[#D4AF37]" />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">Limite da Lista</span>
                    </div>
                    {editingId === event.id ? (
                      <div className="flex items-center gap-1.5 animate-in fade-in duration-200">
                        <input 
                          type="time" 
                          value={editingTime}
                          onChange={e => setEditingTime(e.target.value)}
                          className="px-3 py-1.5 bg-black border border-white/20 rounded-xl text-xs font-bold text-white outline-none focus:border-[#D4AF37] w-24"
                        />
                        <button 
                          onClick={() => handleSaveTime(event.id)}
                          disabled={isUpdatingTime}
                          className="p-2 bg-[#D4AF37] text-black rounded-xl hover:bg-[#b8962f] active:scale-95 transition-all"
                          title="Salvar"
                        >
                          {isUpdatingTime ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check size={12} />}
                        </button>
                        <button 
                          onClick={() => setEditingId(null)}
                          className="p-2 bg-white/5 hover:bg-white/10 text-white rounded-xl active:scale-95 transition-all border border-white/10"
                          title="Cancelar"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-white">
                          {event.list_limit_time ? event.list_limit_time.substring(0, 5) : '23:30'}
                        </span>
                        <button 
                          onClick={() => {
                            setEditingId(event.id);
                            setEditingTime(event.list_limit_time ? event.list_limit_time.substring(0, 5) : '23:30');
                          }}
                          className="p-1.5 bg-white/5 hover:bg-[#D4AF37] hover:text-black text-white/60 rounded-lg transition-all border border-white/10"
                          title="Editar Horário"
                        >
                          <Edit2 size={10} />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* List Limit Capacity Section with inline editing */}
                  <div className="flex items-center justify-between border-t border-white/5 pt-4">
                    <div className="flex items-center gap-2">
                      <Users size={14} className="text-[#D4AF37]" />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">Limite de Nomes</span>
                    </div>
                    {editingCapacityId === event.id ? (
                      <div className="flex items-center gap-1.5 animate-in fade-in duration-200">
                        <input 
                          type="number" 
                          value={editingCapacity}
                          onChange={e => setEditingCapacity(e.target.value)}
                          placeholder="Ilimitado"
                          className="px-3 py-1.5 bg-black border border-white/20 rounded-xl text-xs font-bold text-white outline-none focus:border-[#D4AF37] w-24"
                        />
                        <button 
                          onClick={() => handleSaveCapacity(event.id)}
                          disabled={isUpdatingCapacity}
                          className="p-2 bg-[#D4AF37] text-black rounded-xl hover:bg-[#b8962f] active:scale-95 transition-all"
                          title="Salvar"
                        >
                          {isUpdatingCapacity ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check size={12} />}
                        </button>
                        <button 
                          onClick={() => setEditingCapacityId(null)}
                          className="p-2 bg-white/5 hover:bg-white/10 text-white rounded-xl active:scale-95 transition-all border border-white/10"
                          title="Cancelar"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-white">
                          {event.list_limit_capacity !== null && event.list_limit_capacity !== 0 ? event.list_limit_capacity : 'Ilimitado'}
                        </span>
                        <button 
                          onClick={() => {
                            setEditingCapacityId(event.id);
                            setEditingCapacity(event.list_limit_capacity !== null && event.list_limit_capacity !== 0 ? String(event.list_limit_capacity) : '');
                          }}
                          className="p-1.5 bg-white/5 hover:bg-[#D4AF37] hover:text-black text-white/60 rounded-lg transition-all border border-white/10"
                          title="Editar Limite"
                        >
                          <Edit2 size={10} />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Overview Button */}
                  <div className="pt-4 mt-2 border-t border-white/5">
                    <button 
                      onClick={() => setOverviewEvent(event)}
                      className="w-full py-3 bg-white/5 hover:bg-[#D4AF37] hover:text-black text-white/60 rounded-xl transition-all border border-white/10 flex items-center justify-center gap-2 font-black uppercase text-[10px] tracking-widest"
                    >
                      <LayoutDashboard size={14} />
                      Visão Geral do Evento
                    </button>
                  </div>

                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Overview Modal */}
      <EventOverviewModal 
        isOpen={!!overviewEvent}
        onClose={() => setOverviewEvent(null)}
        event={overviewEvent}
      />
    </div>
  );
}
