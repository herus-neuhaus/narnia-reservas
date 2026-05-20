'use client';

export const dynamic = 'force-dynamic';

import React from 'react';
import { Search, ShieldAlert, Smartphone } from 'lucide-react';
import { differenceInDays, parseISO } from 'date-fns';
import { formatToBrlDateTime } from '@/lib/utils';
import QuickAddModal from '@/app/components/QuickAddModal';
import CustomAlertDialog from '@/app/components/CustomAlertDialog';
import PortariaHeader from './components/PortariaHeader';
import PortariaCounters from './components/PortariaCounters';
import PortariaSearchResult from './components/PortariaSearchResult';
import PortariaList from './components/PortariaList';
import PhotoCaptureModal from './components/PhotoCaptureModal';
import { usePortariaCheckIn } from '@/hooks/usePortariaCheckIn';
import { useRouter } from 'next/navigation';

export default function PortariaDashboard() {
  const router = useRouter();
  const {
    loading,
    searchTerm,
    reservations,
    blacklist,
    searchResult,
    isBlacklisted,
    showQuickAdd,
    setShowQuickAdd,
    blacklistAlert,
    setBlacklistAlert,
    duplicateAlert,
    setDuplicateAlert,
    isAdmin,
    isReceptionist,
    photoCaptureModalData,
    setPhotoCaptureModalData,
    capturedPhoto,
    setCapturedPhoto,
    todayBrl,
    filteredReservations,
    handleSearch,
    handleCheckInClick,
    toggleCheckInWithPhoto,
    onQuickAddSuccess,
    handleLogout,
    alertProps
  } = usePortariaCheckIn();

  return (
    <div className="min-h-screen bg-black font-sans text-white">
      <PortariaHeader 
        isAdmin={isAdmin}
        onAdminClick={() => router.push('/admin')}
        onLogout={handleLogout}
      />

      <main className="p-4 lg:p-8 max-w-5xl mx-auto space-y-6 pb-24">
        
        {/* Main Search Bar */}
        <div className="relative group">
          <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
            <Search className="text-[#D4AF37]/40 group-focus-within:text-[#D4AF37] transition-colors" size={24} />
          </div>
          <input 
            type="text" 
            placeholder="Buscar por CPF, Nome ou WhatsApp..." 
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-14 pr-6 py-6 bg-[#0A0A0A] border-2 border-white/5 rounded-[32px] text-xl font-medium shadow-2xl focus:outline-none focus:border-[#D4AF37]/50 focus:ring-4 focus:ring-[#D4AF37]/5 placeholder:text-white/10 transition-all text-white"
          />
        </div>

        {/* Search Result / Blacklist Alert */}
        <PortariaSearchResult
          searchResult={searchResult}
          isBlacklisted={isBlacklisted}
          isReceptionist={isReceptionist}
          onCheckInClick={handleCheckInClick}
        />

        {/* Counters */}
        <PortariaCounters
          totalList={reservations.filter(r => r.type === 'lista').length}
          totalTablesCamarotes={reservations.filter(r => r.type !== 'lista').length}
          enteredCount={reservations.filter(r => r.check_in_status === 'entered').length}
          totalGuests={reservations.reduce((acc, curr) => acc + (curr.num_guests || 1), 0)}
        />

        {/* Consolidated List */}
        <PortariaList
          todayBrl={todayBrl}
          loading={loading}
          filteredReservations={filteredReservations}
          isReceptionist={isReceptionist}
          onQuickAddClick={() => setShowQuickAdd(true)}
          onCheckInClick={handleCheckInClick}
        />

      </main>

      <QuickAddModal 
        isOpen={showQuickAdd}
        onClose={() => setShowQuickAdd(false)}
        onSuccess={onQuickAddSuccess}
        onBlocked={setBlacklistAlert}
        onDuplicate={setDuplicateAlert}
        blacklist={blacklist}
        reservations={reservations}
      />

      {/* Photo Capture Modal for Check-in */}
      <PhotoCaptureModal
        isOpen={!!photoCaptureModalData}
        onClose={() => {
          setPhotoCaptureModalData(null);
          setCapturedPhoto(null);
        }}
        onConfirm={async (photo) => {
          if (photoCaptureModalData) {
            await toggleCheckInWithPhoto(photoCaptureModalData.reservationId, photoCaptureModalData.currentStatus, photo);
            setPhotoCaptureModalData(null);
            setCapturedPhoto(null);
          }
        }}
        capturedPhoto={capturedPhoto}
        setCapturedPhoto={setCapturedPhoto}
      />

      {/* Blacklist Alert Modal */}
      {blacklistAlert && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="w-full max-w-md bg-[#0A0A0A] rounded-[40px] border-2 border-red-500/50 p-10 shadow-[0_0_50px_rgba(239,68,68,0.2)] text-center animate-in zoom-in-95 duration-300">
            <div className="w-24 h-24 bg-red-500 rounded-full flex items-center justify-center text-white mx-auto mb-6 shadow-[0_0_30px_rgba(239,68,68,0.5)] animate-pulse">
              <ShieldAlert size={48} />
            </div>
            <h2 className="text-3xl font-black uppercase tracking-tighter text-red-500 mb-2">ENTRADA NEGADA</h2>
            <p className="text-white/40 text-xs font-bold uppercase tracking-widest mb-8">Este cliente está na Blacklist</p>
            
            <div className="bg-white/5 rounded-3xl p-6 border border-white/10 mb-8 text-left">
              <div className="mb-4">
                <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest mb-1">Nome do Cliente</p>
                <p className="text-lg font-bold text-white">{blacklistAlert.name}</p>
              </div>
              <div className="mb-4">
                <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest mb-1">Motivo do Bloqueio</p>
                <p className="text-sm font-medium text-red-400 italic">&quot;{blacklistAlert.reason}&quot;</p>
              </div>
              <div className="pt-4 border-t border-white/5 text-center">
                <p className="text-[9px] font-black text-white/40 uppercase tracking-widest mb-1">Tempo Restante de Banimento</p>
                <div className="text-2xl font-black text-red-500 tracking-tighter">
                  {Math.max(0, differenceInDays(parseISO(blacklistAlert.end_date), new Date()))} DIAS
                </div>
              </div>
            </div>

            <button 
              onClick={() => setBlacklistAlert(null)}
              className="w-full py-5 bg-red-500 text-white rounded-[24px] font-black uppercase tracking-widest hover:bg-red-600 transition-all active:scale-95 shadow-xl shadow-red-500/20"
            >
              ENTENDIDO
            </button>
          </div>
        </div>
      )}

      {/* Duplicate Alert Modal */}
      {duplicateAlert && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="w-full max-w-md bg-[#0A0A0A] rounded-[40px] border-2 border-[#D4AF37]/50 p-10 shadow-[0_0_50px_rgba(212,175,55,0.15)] text-center animate-in zoom-in-95 duration-300">
            <div className="w-24 h-24 bg-[#D4AF37]/10 border border-[#D4AF37]/30 rounded-full flex items-center justify-center text-[#D4AF37] mx-auto mb-6 shadow-[0_0_30px_rgba(212,175,55,0.2)] animate-pulse">
              <ShieldAlert size={48} />
            </div>
            <h2 className="text-3xl font-black uppercase tracking-tighter text-[#D4AF37] mb-2">ENTRADA DUPLICADA</h2>
            <p className="text-white/40 text-xs font-bold uppercase tracking-widest mb-8">Este cliente já está na lista ou já entrou hoje</p>
            
            <div className="bg-white/5 rounded-3xl p-6 border border-white/10 mb-8 text-left">
              <div className="mb-4">
                <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest mb-1">Nome do Cliente</p>
                <p className="text-lg font-bold text-white">{duplicateAlert.name}</p>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest mb-1">Tipo de Acesso</p>
                  <p className="text-xs font-bold text-[#D4AF37] uppercase">{duplicateAlert.type}</p>
                </div>
                {duplicateAlert.location_id && (
                  <div>
                    <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest mb-1">Mesa/Camarote</p>
                    <p className="text-xs font-bold text-white uppercase">{duplicateAlert.location_id}</p>
                  </div>
                )}
              </div>
              <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest mb-1">Status do Check-in</p>
                  <span className={`inline-block px-2.5 py-1 text-[9px] font-black uppercase rounded-lg tracking-widest ${duplicateAlert.check_in_status === 'entered' ? 'bg-green-500/10 border border-green-500/20 text-green-500' : 'bg-yellow-500/10 border border-yellow-500/20 text-yellow-500'}`}>
                    {duplicateAlert.check_in_status === 'entered' ? 'ENTROU' : 'AGUARDANDO'}
                  </span>
                </div>
                {duplicateAlert.entered_at && (
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest mb-1">Horário da Entrada</p>
                    <p className="text-xs font-bold text-white/80">{formatToBrlDateTime(duplicateAlert.entered_at)}</p>
                  </div>
                )}
              </div>
            </div>

            <button 
              onClick={() => setDuplicateAlert(null)}
              className="w-full py-5 bg-[#D4AF37] text-black rounded-[24px] font-black uppercase tracking-widest hover:bg-[#b8962f] transition-all active:scale-95 shadow-xl shadow-[#D4AF37]/20"
            >
              ENTENDIDO
            </button>
          </div>
        </div>
      )}

      {/* Floating Check-in Stats for Mobile */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-3rem)] max-w-lg bg-[#D4AF37] text-black p-4 rounded-[28px] shadow-[0_20px_50px_rgba(212,175,55,0.3)] flex items-center justify-between lg:hidden">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-black/10 rounded-full flex items-center justify-center">
            <Smartphone size={20} />
          </div>
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest opacity-60">Status de Entrada</p>
            <p className="text-sm font-black uppercase leading-none">{reservations.filter(r => r.check_in_status === 'entered').length} de {reservations.length} Confirmados</p>
          </div>
        </div>
        <div className="h-2 w-20 bg-black/20 rounded-full overflow-hidden">
          <div 
            className="h-full bg-black transition-all duration-500" 
            style={{ width: `${(reservations.filter(r => r.check_in_status === 'entered').length / (reservations.length || 1)) * 100}%` }}
          />
        </div>
      </div>

      <CustomAlertDialog {...alertProps} />
    </div>
  );
}
