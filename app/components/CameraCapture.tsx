'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Camera, CameraOff, RotateCw, Trash2, User } from 'lucide-react';

interface CameraCaptureProps {
  onPhotoCaptured: (photoBase64: string | null) => void;
  initialPhoto?: string | null;
}

export default function CameraCapture({ onPhotoCaptured, initialPhoto = null }: CameraCaptureProps) {
  const [photo, setPhoto] = useState<string | null>(initialPhoto);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  const startCamera = async (mode: 'user' | 'environment' = facingMode) => {
    setError(null);
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      const constraints = {
        video: {
          facingMode: mode,
          width: { ideal: 640 },
          height: { ideal: 480 }
        },
        audio: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsCameraActive(true);
    } catch (err: any) {
      console.error('Error accessing camera:', err);
      setError('Não foi possível acessar a câmera. Verifique as permissões.');
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPhoto(initialPhoto);
  }, [initialPhoto]);

  useEffect(() => {
    // Cleanup camera stream on unmount
    return () => {
      stopCamera();
    };
  }, []);

  useEffect(() => {
    if (isCameraActive && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [isCameraActive]);

  const toggleFacingMode = async () => {
    const newMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newMode);
    if (isCameraActive) {
      await startCamera(newMode);
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Draw the video frame to the canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Compress to JPEG with 0.8 quality to keep DB size light
      const base64 = canvas.toDataURL('image/jpeg', 0.8);
      setPhoto(base64);
      onPhotoCaptured(base64);
      stopCamera();
    }
  };

  const clearPhoto = () => {
    setPhoto(null);
    onPhotoCaptured(null);
    setError(null);
  };

  return (
    <div className="flex flex-col items-center gap-3 w-full">
      <div className="relative w-40 h-40 rounded-3xl overflow-hidden border-2 border-white/10 bg-black/60 flex items-center justify-center shadow-inner group">
        {photo ? (
          <>
            <img src={photo} alt="Foto do Cliente" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={clearPhoto}
              className="absolute top-2 right-2 p-2 bg-red-500 hover:bg-red-600 text-white rounded-xl transition-all shadow-lg opacity-0 group-hover:opacity-100 duration-200"
              title="Remover foto"
            >
              <Trash2 size={16} />
            </button>
          </>
        ) : isCameraActive ? (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`} // Mirror effect only for front camera
            />
            <button
              type="button"
              onClick={toggleFacingMode}
              className="absolute bottom-2 right-2 p-2 bg-black/60 hover:bg-[#D4AF37] text-white hover:text-black rounded-xl transition-all shadow-lg z-10"
              title={facingMode === 'user' ? 'Usar Câmera Traseira' : 'Usar Câmera Frontal'}
            >
              <RotateCw size={14} />
            </button>
          </>
        ) : (
          <div className="flex flex-col items-center text-white/20">
            <User size={48} strokeWidth={1} />
            <span className="text-[9px] uppercase tracking-widest mt-1 font-bold">Sem Foto</span>
          </div>
        )}

        {/* Overlay error message */}
        {error && (
          <div className="absolute inset-0 bg-black/90 p-3 flex flex-col justify-center items-center text-center">
            <span className="text-[10px] text-red-500 font-bold leading-tight">{error}</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        {!photo && !isCameraActive && (
          <button
            type="button"
            onClick={() => startCamera()}
            className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5"
          >
            <Camera size={14} className="text-[#D4AF37]" />
            Abrir Câmera
          </button>
        )}

        {isCameraActive && (
          <>
            <button
              type="button"
              onClick={capturePhoto}
              className="px-4 py-2 bg-[#D4AF37] hover:bg-[#b8962f] text-black rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg"
            >
              Tirar Foto
            </button>
            <button
              type="button"
              onClick={stopCamera}
              className="px-3 py-2 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all border border-white/10"
            >
              Cancelar
            </button>
          </>
        )}

        {photo && !isCameraActive && (
          <button
            type="button"
            onClick={() => startCamera()}
            className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5"
          >
            <RotateCw size={14} className="text-[#D4AF37]" />
            Tirar Outra
          </button>
        )}
      </div>
    </div>
  );
}
