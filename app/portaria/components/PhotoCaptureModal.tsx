'use client';

import React, { useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import CameraCapture from '@/app/components/CameraCapture';

interface PhotoCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (photo: string | null) => void;
  capturedPhoto: string | null;
  setCapturedPhoto: (photo: string | null) => void;
}

export default function PhotoCaptureModal({
  isOpen,
  onClose,
  onConfirm,
  capturedPhoto,
  setCapturedPhoto
}: PhotoCaptureModalProps) {
  const [showSkipConfirm, setShowSkipConfirm] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="w-full max-w-md bg-[#0A0A0A] rounded-[40px] border border-white/10 p-8 shadow-2xl animate-in zoom-in-95 duration-300 text-center relative">
        {!showSkipConfirm ? (
          <>
            <h3 className="text-xl font-bold uppercase tracking-widest text-[#D4AF37] mb-2">Capturar Foto</h3>
            <p className="text-white/40 text-xs font-bold uppercase tracking-widest mb-6">
              O cliente não possui foto cadastrada no Nárnia Club.
            </p>

            <div className="flex flex-col items-center justify-center py-4 border-y border-white/5 mb-6">
              <CameraCapture
                onPhotoCaptured={(photoBase64) => setCapturedPhoto(photoBase64)}
                initialPhoto={capturedPhoto}
              />
            </div>

            <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-2xl flex items-start gap-3 text-left">
              <ShieldAlert size={20} className="text-yellow-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-yellow-500 text-[10px] font-black uppercase tracking-wider">Aviso Importante</h4>
                <p className="text-white/70 text-xs mt-1 leading-normal">
                  Este cliente está sem foto no cadastro. Por favor, capture a foto dele com o tablet/câmera para concluir a entrada com maior segurança.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <button
                type="button"
                onClick={() => {
                  if (!capturedPhoto) {
                    setShowSkipConfirm(true);
                  } else {
                    onConfirm(capturedPhoto);
                  }
                }}
                className="w-full py-4 bg-[#D4AF37] text-black rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl hover:bg-[#b8962f] transition-all"
              >
                {capturedPhoto ? 'SALVAR FOTO E ENTRAR' : 'ENTRAR SEM FOTO'}
              </button>
              
              <button
                type="button"
                onClick={onClose}
                className="w-full py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-black uppercase tracking-widest text-xs transition-all border border-white/10"
              >
                CANCELAR ENTRADA
              </button>
            </div>
          </>
        ) : (
          <div className="animate-in fade-in duration-300">
            <div className="w-16 h-16 bg-red-500/10 border border-red-500/30 rounded-full flex items-center justify-center text-red-500 mx-auto mb-4">
              <ShieldAlert size={32} />
            </div>
            <h3 className="text-lg font-bold text-red-500 uppercase tracking-widest mb-2">Entrada Sem Foto</h3>
            <p className="text-white/75 text-sm mb-6 leading-relaxed">
              Deseja realmente permitir a entrada do cliente sem tirar a foto? A foto é altamente recomendada para a segurança de todos no clube.
            </p>

            <div className="space-y-3">
              <button
                type="button"
                onClick={() => {
                  onConfirm(null);
                  setShowSkipConfirm(false);
                }}
                className="w-full py-4 bg-red-500 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl hover:bg-red-600 transition-all"
              >
                SIM, PERMITIR ENTRADA
              </button>
              
              <button
                type="button"
                onClick={() => setShowSkipConfirm(false)}
                className="w-full py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-black uppercase tracking-widest text-xs transition-all border border-white/10"
              >
                NÃO, VOLTAR PARA FOTO
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
