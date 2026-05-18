'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Database } from '@/lib/supabase/database.types';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Loader2, Plus, Trash2, Image as ImageIcon } from 'lucide-react';

type EventRow = Database['public']['Tables']['events']['Row'];

export default function EventsManager() {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    event_date: '',
    image_file: null as File | null
  });

  const supabase = createClient();

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('events')
      .select('*')
      .order('event_date', { ascending: true });
    
    if (data) setEvents(data);
    setLoading(false);
  };

  const handleImageUpload = async (file: File) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `covers/${fileName}`;

    const { error: uploadError, data } = await supabase.storage
      .from('event_covers')
      .upload(filePath, file);

    if (uploadError) {
      throw uploadError;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('event_covers')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.event_date || !formData.image_file) {
      alert('Preencha todos os campos e selecione uma imagem.');
      return;
    }

    setIsSubmitting(true);
    try {
      const imageUrl = await handleImageUpload(formData.image_file);

      const { error } = await supabase
        .from('events')
        .insert([{
          name: formData.name,
          event_date: formData.event_date,
          image_url: imageUrl
        }]);

      if (error) throw error;

      setShowAddForm(false);
      setFormData({ name: '', event_date: '', image_file: null });
      fetchEvents();
    } catch (error: any) {
      alert('Erro ao criar evento: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir este evento?')) return;
    
    // Deleta o registro (o ideal seria deletar a imagem do bucket também, mas pro momento foca no DB)
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 ml-4 mb-1 block">Nome do Evento</label>
              <input 
                type="text" 
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                placeholder="Ex: Baile do Nárnia"
                className="w-full px-6 py-4 bg-black border border-white/10 rounded-2xl outline-none focus:border-[#D4AF37] transition-all text-white"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 ml-4 mb-1 block">Data do Evento</label>
              <input 
                type="date" 
                value={formData.event_date}
                onChange={e => setFormData({...formData, event_date: e.target.value})}
                className="w-full px-6 py-4 bg-black border border-white/10 rounded-2xl outline-none focus:border-[#D4AF37] transition-all text-white"
              />
            </div>
          </div>
          
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 ml-4 mb-1 block">Capa / Flyer do Evento</label>
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-white/10 rounded-2xl cursor-pointer hover:border-[#D4AF37]/50 transition-all bg-black/50">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <ImageIcon className="text-white/20 mb-2" size={24} />
                <p className="text-xs text-white/60 font-medium">
                  {formData.image_file ? formData.image_file.name : "Clique para selecionar a imagem"}
                </p>
              </div>
              <input 
                type="file" 
                accept="image/*"
                className="hidden" 
                onChange={e => setFormData({...formData, image_file: e.target.files?.[0] || null})}
              />
            </label>
          </div>

          <div className="pt-4 flex justify-end">
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="px-8 py-4 bg-[#D4AF37] text-black rounded-2xl font-black uppercase tracking-widest text-xs flex items-center gap-2 hover:bg-[#b8962f] disabled:opacity-50 transition-all"
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
            <div key={event.id} className="bg-[#0A0A0A] border border-white/5 rounded-3xl overflow-hidden group">
              <div className="h-48 bg-black relative">
                <img src={event.image_url} alt={event.name} className="w-full h-full object-cover opacity-80" />
                <div className="absolute top-2 right-2 bg-black/80 backdrop-blur-md px-3 py-1 rounded-lg border border-white/10">
                  <span className="text-xs font-black uppercase tracking-widest text-[#D4AF37]">
                    {format(parseISO(event.event_date), 'dd/MM/yyyy')}
                  </span>
                </div>
              </div>
              <div className="p-5 flex justify-between items-center">
                <h4 className="font-bold text-lg leading-tight uppercase tracking-tight">{event.name}</h4>
                <button 
                  onClick={() => handleDelete(event.id)}
                  className="p-3 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
