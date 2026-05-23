'use client';

import React, { useState } from 'react';
import { XCircle, Loader2, CheckCircle2 } from 'lucide-react';
import CameraCapture from './CameraCapture';
import { createClient } from '@/lib/supabase/client';

interface PhotoCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerId: string;
  customerName: string;
  initialPhoto?: string | null;
  onSuccess: (newPhotoUrl: string) => void;
}

export default function PhotoCaptureModal({
  isOpen,
  onClose,
  customerId,
  customerName,
  initialPhoto,
  onSuccess
}: PhotoCaptureModalProps) {
  const [photo, setPhoto] = useState<string | null>(initialPhoto || null);
  const [isUploading, setIsUploading] = useState(false);
  const supabase = createClient();

  const handleSave = async () => {
    if (!photo || photo === initialPhoto) return;
    
    setIsUploading(true);
    try {
      let finalPhotoUrl = photo;
      if (photo.startsWith('data:image')) {
        const { uploadCustomerPhoto } = await import('@/src/services/storage');
        finalPhotoUrl = await uploadCustomerPhoto(photo, customerId);
      }

      const { error } = await supabase
        .from('customers')
        .update({ photo: finalPhotoUrl })
        .eq('id', customerId);

      if (error) throw error;
      
      // Update the reservations table as well since it has a legacy photo column
      await supabase
        .from('reservations')
        .update({ photo: finalPhotoUrl })
        .eq('customer_id', customerId);
        
      onSuccess(finalPhotoUrl);
      onClose();
    } catch (error: any) {
      console.error(error);
      alert('Erro ao salvar foto: ' + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="w-full max-w-md bg-[#0A0A0A] rounded-[32px] sm:rounded-[40px] border border-white/10 p-5 sm:p-8 shadow-2xl flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg sm:text-xl font-bold uppercase tracking-widest text-[#D4AF37]">
            Foto: {customerName}
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl transition-all">
            <XCircle size={24} className="text-white/20" />
          </button>
        </div>
        
        <div className="flex flex-col items-center justify-center pb-6">
          <CameraCapture
            onPhotoCaptured={(photoBase64) => setPhoto(photoBase64)}
            initialPhoto={photo}
          />
        </div>

        <button 
          type="button"
          onClick={handleSave}
          disabled={!photo || isUploading || photo === initialPhoto}
          className={`w-full py-4 sm:py-5 rounded-3xl font-black uppercase tracking-widest mt-2 shadow-xl transition-all flex items-center justify-center gap-2 shrink-0 ${
            !photo || isUploading || photo === initialPhoto
              ? 'bg-white/5 text-white/20 cursor-not-allowed'
              : 'bg-[#D4AF37] text-black hover:bg-[#b8962f]'
          }`}
        >
          {isUploading ? <Loader2 className="animate-spin" /> : (
            <>
              <CheckCircle2 size={20} />
              SALVAR FOTO
            </>
          )}
        </button>
      </div>
    </div>
  );
}
