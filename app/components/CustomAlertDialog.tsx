'use client';

import React from 'react';
import { ShieldAlert, CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

export interface CustomAlertDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  isConfirm?: boolean;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => void;
  onClose: () => void;
}

export default function CustomAlertDialog({
  isOpen,
  title,
  message,
  type = 'info',
  isConfirm = false,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  onConfirm,
  onClose,
}: CustomAlertDialogProps) {
  if (!isOpen) return null;

  const typeConfig = {
    info: {
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/30',
      icon: <Info size={40} className="text-blue-500" />,
      titleColor: 'text-blue-400',
      btnBg: 'bg-blue-500 hover:bg-blue-600 text-white',
    },
    success: {
      bg: 'bg-green-500/10',
      border: 'border-green-500/30',
      icon: <CheckCircle2 size={40} className="text-green-500" />,
      titleColor: 'text-green-400',
      btnBg: 'bg-green-500 hover:bg-green-600 text-black',
    },
    warning: {
      bg: 'bg-yellow-500/10',
      border: 'border-yellow-500/30',
      icon: <AlertTriangle size={40} className="text-yellow-500" />,
      titleColor: 'text-yellow-500',
      btnBg: 'bg-yellow-500 hover:bg-yellow-600 text-black',
    },
    error: {
      bg: 'bg-red-500/10',
      border: 'border-red-500/50',
      icon: <ShieldAlert size={40} className="text-red-500" />,
      titleColor: 'text-red-500',
      btnBg: 'bg-red-500 hover:bg-red-600 text-white',
    },
  };

  const config = typeConfig[type] || typeConfig.info;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in duration-300">
      <div className={`w-full max-w-md bg-[#0A0A0A] rounded-[40px] border-2 ${config.border} p-8 shadow-2xl animate-in zoom-in-95 duration-300 text-center relative`}>
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 bg-white/5 hover:bg-white/10 rounded-xl text-white/40 hover:text-white transition-colors"
        >
          <X size={16} />
        </button>

        <div className="flex flex-col items-center gap-4 mb-6">
          <div className={`w-20 h-20 rounded-full flex items-center justify-center ${config.bg} shadow-lg`}>
            {config.icon}
          </div>
          <div>
            <h3 className={`text-xl font-black uppercase tracking-widest ${config.titleColor}`}>{title}</h3>
            <p className="text-white/70 text-sm mt-3 leading-relaxed whitespace-pre-line">{message}</p>
          </div>
        </div>

        <div className="flex gap-3 justify-center">
          {isConfirm && (
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-black uppercase tracking-widest text-xs transition-all border border-white/10"
            >
              {cancelLabel}
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              if (isConfirm && onConfirm) {
                onConfirm();
              } else {
                onClose();
              }
            }}
            className={`py-4 px-8 rounded-2xl font-black uppercase tracking-widest text-xs transition-all flex-1 shadow-lg ${config.btnBg}`}
          >
            {isConfirm ? confirmLabel : 'OK'}
          </button>
        </div>
      </div>
    </div>
  );
}
