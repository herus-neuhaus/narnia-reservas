'use client';

import React, { useState } from 'react';
import { ZoomIn, ZoomOut, X, Maximize2 } from 'lucide-react';

interface MapElement {
  id: string;
  type: 'mesa' | 'camarote';
  label: string;
  available: boolean;
}

interface SVGMapProps {
  elements: MapElement[];
  onSelect: (id: string) => void;
  selectedId?: string;
}

export default function SVGMap({ elements, onSelect, selectedId }: SVGMapProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [scale, setScale] = useState(1);

  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.5, 3));
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.5, 1));

  return (
    <div className="w-full flex flex-col gap-6">
      <div 
        className="relative w-full bg-white/5 rounded-[32px] border border-white/10 overflow-hidden p-2 group cursor-pointer"
        onClick={() => { setIsModalOpen(true); setScale(1); }}
      >
        <img src="/mapa-mesas-camarote.PNG" alt="Mapa do Local" className="w-full h-auto rounded-[24px]" />
        
        {/* Hover Overlay */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-[32px]">
          <div className="bg-black/80 px-5 py-3 rounded-2xl flex items-center gap-3 text-[#D4AF37] shadow-xl border border-white/10 scale-95 group-hover:scale-100 transition-all">
            <Maximize2 size={20} />
            <span className="text-xs font-black uppercase tracking-widest">Ampliar Mapa</span>
          </div>
        </div>
      </div>
      
      <div className="text-center px-2">
        <p className="text-[10px] font-bold text-[#D4AF37] uppercase tracking-[0.2em] mb-4">
          Escolher {elements[0]?.type === 'mesa' ? 'mesa' : 'camarote'} conforme o mapa
        </p>
        
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
          {elements.map((el) => {
            const isSelected = selectedId === el.id;
            return (
              <button
                key={el.id}
                onClick={() => el.available && onSelect(el.id)}
                disabled={!el.available}
                className={`py-4 rounded-2xl font-black text-lg border transition-all active:scale-95 ${
                  isSelected 
                    ? 'bg-[#D4AF37] text-black border-[#D4AF37] shadow-[0_0_20px_rgba(212,175,55,0.4)]' 
                    : el.available 
                      ? 'bg-black border-white/10 text-white hover:bg-white/5 hover:border-[#D4AF37]/50' 
                      : 'bg-red-500/10 border-red-500/20 text-red-500/50 cursor-not-allowed'
                }`}
              >
                {el.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Zoom Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-xl flex flex-col animate-in fade-in zoom-in-95 duration-300">
          <div className="p-4 flex justify-between items-center bg-black/50 border-b border-white/10 shrink-0">
            <h3 className="text-[#D4AF37] font-bold tracking-widest uppercase text-xs">Mapa do Local</h3>
            <div className="flex items-center gap-2 sm:gap-4">
              <button onClick={handleZoomOut} disabled={scale <= 1} className="p-2 sm:p-3 bg-white/5 rounded-xl hover:bg-white/10 disabled:opacity-30 text-white transition-all">
                <ZoomOut size={20} />
              </button>
              <button onClick={handleZoomIn} disabled={scale >= 3} className="p-2 sm:p-3 bg-white/5 rounded-xl hover:bg-white/10 disabled:opacity-30 text-white transition-all">
                <ZoomIn size={20} />
              </button>
              <div className="w-px h-6 bg-white/20 mx-1 sm:mx-2" />
              <button onClick={() => setIsModalOpen(false)} className="p-2 sm:p-3 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500/20 transition-all">
                <X size={20} />
              </button>
            </div>
          </div>
          
          <div className="flex-1 overflow-auto p-4 sm:p-8 custom-scrollbar relative">
            <img 
              src="/mapa-mesas-camarote.PNG" 
              alt="Mapa Nárnia Ampliado" 
              className="rounded-2xl transition-all duration-300 origin-top-left shadow-[0_0_50px_rgba(0,0,0,0.5)]"
              style={{ width: `${scale * 100}%`, minWidth: '100%' }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
