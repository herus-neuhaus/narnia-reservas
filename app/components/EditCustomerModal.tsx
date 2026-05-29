'use client';

import React, { useState, useEffect } from 'react';
import { XCircle, Loader2 } from 'lucide-react';
import { updateCustomerDetails } from '@/src/services/customers';

interface EditCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerData: {
    id: string;
    cpf: string;
    name: string;
    whatsapp: string;
    birth_date: string | null;
  } | null;
  onSuccess: (updatedData: { id: string; cpf: string; name: string; whatsapp: string; birth_date: string }) => void;
}

export default function EditCustomerModal({ isOpen, onClose, customerData, onSuccess }: EditCustomerModalProps) {
  const [formData, setFormData] = useState({ name: '', whatsapp: '', birth_date: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (customerData && isOpen) {
      setFormData({
        name: customerData.name || '',
        whatsapp: customerData.whatsapp || '',
        birth_date: customerData.birth_date ? customerData.birth_date.split('T')[0] : ''
      });
      setError(null);
    }
  }, [customerData, isOpen]);

  if (!isOpen || !customerData) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    
    try {
      await updateCustomerDetails(customerData.id, formData);
      onSuccess({ ...formData, id: customerData.id, cpf: customerData.cpf });
      onClose();
    } catch (err: any) {
      console.error('Error updating customer:', err);
      setError(err.message || 'Erro ao atualizar dados do cliente.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md animate-in fade-in duration-300">
      <div className="w-full max-w-md bg-[#0A0A0A] rounded-[32px] border border-[#D4AF37]/20 p-8 shadow-[0_0_50px_rgba(212,175,55,0.1)] flex flex-col relative">
        <button onClick={onClose} className="absolute top-6 right-6 p-2 hover:bg-white/5 rounded-xl transition-all">
          <XCircle size={24} className="text-white/20" />
        </button>
        
        <h2 className="text-xl font-black uppercase tracking-widest text-[#D4AF37] mb-6">Editar Cliente</h2>
        
        {error && (
          <div className="mb-6 bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold p-4 rounded-2xl uppercase tracking-widest text-center">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-white/30 ml-4 mb-1 block">Nome Completo</label>
            <input 
              type="text" 
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-5 py-3.5 bg-black border border-white/10 rounded-2xl focus:border-[#D4AF37]/50 outline-none text-white font-medium"
              required
            />
          </div>
          
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-white/30 ml-4 mb-1 block">WhatsApp / Celular</label>
            <input 
              type="text" 
              value={formData.whatsapp}
              onChange={e => setFormData({ ...formData, whatsapp: e.target.value })}
              className="w-full px-5 py-3.5 bg-black border border-white/10 rounded-2xl focus:border-[#D4AF37]/50 outline-none text-white font-medium"
            />
          </div>
          
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-white/30 ml-4 mb-1 block">Data de Nascimento (Opcional)</label>
            <input 
              type="date" 
              value={formData.birth_date}
              onChange={e => setFormData({ ...formData, birth_date: e.target.value })}
              className="w-full px-5 py-3.5 bg-black border border-white/10 rounded-2xl focus:border-[#D4AF37]/50 outline-none text-white font-medium [color-scheme:dark]"
            />
          </div>

          <button 
            type="submit"
            disabled={isSaving}
            className="w-full py-4 mt-4 bg-[#D4AF37] text-black rounded-3xl font-black uppercase tracking-widest shadow-xl hover:bg-[#b8962f] transition-all flex items-center justify-center gap-2"
          >
            {isSaving ? <Loader2 className="animate-spin" /> : 'SALVAR ALTERAÇÕES'}
          </button>
        </form>
      </div>
    </div>
  );
}
