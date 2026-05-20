'use client';

import React from 'react';
import { CheckCircle2, MessageCircle } from 'lucide-react';

interface ReservationSuccessProps {
  portalMode: string;
  listLimitTime: string;
  onReset: () => void;
}

export default function ReservationSuccess({
  portalMode,
  listLimitTime,
  onReset
}: ReservationSuccessProps) {
  const WHATSAPP_NUMBER = "5569999798553";
  const isLista = portalMode === 'lista';

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6 text-white text-center">
      <div className="max-w-sm w-full space-y-8 animate-in zoom-in duration-500">
        <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mx-auto shadow-[0_0_50px_rgba(34,197,94,0.3)]">
          <CheckCircle2 size={48} className="text-black" />
        </div>
        <div>
          <h2 className="text-3xl font-serif font-bold mb-3 uppercase tracking-widest text-[#D4AF37]">Sucesso!</h2>
          {isLista ? (
            <div className="space-y-4">
              <p className="text-white font-black uppercase tracking-wider text-sm">Seu nome já está na lista!</p>
              <p className="text-white/60 font-medium text-xs leading-relaxed">
                Lembre-se: o seu acesso com desconto ou benefício é garantido **até as {listLimitTime}**. 
                <br />
                <span className="text-[#D4AF37] font-black block mt-3 uppercase tracking-wider">Após as {listLimitTime}, será cobrado o valor normal de bilheteria.</span>
              </p>
            </div>
          ) : (
            <p className="text-white/60 font-medium">Sua solicitação foi processada. Siga as instruções no WhatsApp para finalizar.</p>
          )}
        </div>
        <div className="space-y-3">
          {!isLista && (
            <button 
              onClick={() => window.open(`https://wa.me/${WHATSAPP_NUMBER}`)} 
              className="w-full py-5 bg-[#25D366] text-black rounded-3xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 hover:bg-[#20ba5a] transition-all"
            >
              <MessageCircle size={20} /> Confirmar no WhatsApp
            </button>
          )}
          <button 
            onClick={onReset} 
            className="w-full py-5 bg-white/5 rounded-3xl font-black uppercase tracking-widest text-xs text-white/40 hover:text-white border border-white/10 transition-all"
          >
            Voltar ao Início
          </button>
        </div>
      </div>
    </div>
  );
}
