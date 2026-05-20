'use client';

import React, { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, 
  Users, 
  ShieldAlert,
  CalendarDays,
  UserPlus,
  LogOut,
  Loader2,
  ShieldCheck,
  UserCheck,
  Menu,
  X
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function AdminLayoutShell({ children, activeItem }: { children: React.ReactNode, activeItem: string }) {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      setUserEmail(user.email || null);

      const role = user.app_metadata?.role || user.user_metadata?.role || 'customer';
      const email = user.email || '';
        
      const isAuthAdmin = ['dono', 'gerente', 'admin'].includes(role) || email === 'narnia@admin.com';

      if (!isAuthAdmin) {
        console.warn('User not authorized for Admin panel');
        if (role === 'portaria' || role === 'receptionist') {
          router.push('/portaria');
        } else {
          router.push('/login');
        }
      } else {
        setIsAuthorized(true);
      }
    };
    checkAuth();
  }, [supabase, router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-[#D4AF37] animate-spin" />
          <p className="text-xs uppercase tracking-[0.2em] text-[#D4AF37] font-serif font-black">Autenticando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black font-sans text-white flex flex-col lg:flex-row overflow-hidden">
      {/* Top Navbar Mobile */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-[#0d0d0d] border-b border-white/5 flex items-center justify-between px-6 z-40 lg:hidden shadow-md">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsMenuOpen(true)}
            className="p-2 text-white/80 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-all"
            aria-label="Abrir menu"
          >
            <Menu size={20} />
          </button>
          <span 
            onClick={() => router.push('/admin')}
            className="text-lg font-serif font-black tracking-widest text-[#D4AF37] uppercase cursor-pointer"
          >
            NÁRNIA
          </span>
        </div>
        
        {userEmail && (
          <div className="flex items-center gap-2">
            <div className="flex flex-col text-right hidden sm:flex">
              <span className="text-[10px] font-bold text-white/50 truncate max-w-[120px]">{userEmail}</span>
            </div>
            <div className="w-8 h-8 rounded-full bg-[#D4AF37]/20 border border-[#D4AF37]/40 flex items-center justify-center text-[10px] font-black text-[#D4AF37] uppercase">
              {userEmail.slice(0, 2)}
            </div>
          </div>
        )}
      </header>

      {/* Backdrop overlay for Mobile Drawer */}
      {isMenuOpen && (
        <div 
          onClick={() => setIsMenuOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 lg:hidden transition-opacity duration-300 animate-in fade-in"
        />
      )}

      {/* Sidebar (drawer on mobile, static on desktop) */}
      <aside className={`fixed lg:static top-0 bottom-0 left-0 w-72 bg-[#0d0d0d] border-r border-white/5 flex flex-col shrink-0 z-50 overflow-y-auto transform lg:transform-none transition-transform duration-300 ease-in-out ${
        isMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}>
        <div className="p-8 flex items-center justify-between">
          <div>
            <h1 
              onClick={() => {
                router.push('/admin');
                setIsMenuOpen(false);
              }}
              className="text-2xl font-serif font-black tracking-widest text-[#D4AF37] uppercase cursor-pointer hover:opacity-85 transition-opacity"
            >
              Nárnia
            </h1>
            <p className="text-[10px] font-black tracking-[0.4em] text-white/20 uppercase mt-1">Management Panel</p>
          </div>

          {/* Close Button inside Drawer for Mobile */}
          <button 
            onClick={() => setIsMenuOpen(false)}
            className="p-2 text-white/40 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-all lg:hidden"
            aria-label="Fechar menu"
          >
            <X size={16} />
          </button>
        </div>

        <nav className="flex-1 px-4 space-y-2">
          <Link 
            href="/admin?view=reservations"
            onClick={() => setIsMenuOpen(false)}
            className={`w-full min-h-[44px] flex items-center gap-4 px-6 py-3 rounded-2xl font-bold uppercase tracking-widest text-xs transition-all ${activeItem === 'reservations' ? 'bg-[#D4AF37] text-black shadow-[0_0_20px_rgba(212,175,55,0.2)]' : 'text-white/40 hover:bg-white/5'}`}
          >
            <CalendarIcon size={18} /> Reservas & Listas
          </Link>
          
          <Link 
            href="/admin?view=clientes"
            onClick={() => setIsMenuOpen(false)}
            className={`w-full min-h-[44px] flex items-center gap-4 px-6 py-3 rounded-2xl font-bold uppercase tracking-widest text-xs transition-all ${activeItem === 'clientes' ? 'bg-[#D4AF37] text-black shadow-[0_0_20px_rgba(212,175,55,0.2)]' : 'text-white/40 hover:bg-white/5'}`}
          >
            <Users size={18} /> Clientes
          </Link>

          <Link 
            href="/admin?view=blacklist"
            onClick={() => setIsMenuOpen(false)}
            className={`w-full min-h-[44px] flex items-center gap-4 px-6 py-3 rounded-2xl font-bold uppercase tracking-widest text-xs transition-all ${activeItem === 'blacklist' ? 'bg-red-500 text-white shadow-[0_0_20px_rgba(239,68,68,0.2)]' : 'text-white/40 hover:bg-white/5'}`}
          >
            <ShieldAlert size={18} /> Blacklist
          </Link>

          <Link 
            href="/admin?view=events"
            onClick={() => setIsMenuOpen(false)}
            className={`w-full min-h-[44px] flex items-center gap-4 px-6 py-3 rounded-2xl font-bold uppercase tracking-widest text-xs transition-all ${activeItem === 'events' ? 'bg-[#D4AF37] text-black shadow-[0_0_20px_rgba(212,175,55,0.2)]' : 'text-white/40 hover:bg-white/5'}`}
          >
            <CalendarDays size={18} /> Eventos
          </Link>

          <div className="border-t border-white/5 my-2 pt-2">
            <p className="px-6 text-[9px] font-black uppercase tracking-widest text-white/20 mb-2">Equipe</p>
            <Link 
              href="/admin?view=administradores"
              onClick={() => setIsMenuOpen(false)}
              className={`w-full min-h-[44px] flex items-center gap-4 px-6 py-3 rounded-2xl font-bold uppercase tracking-widest text-xs transition-all ${activeItem === 'administradores' ? 'bg-[#D4AF37] text-black shadow-[0_0_20px_rgba(212,175,55,0.2)]' : 'text-white/40 hover:bg-white/5'}`}
            >
              <ShieldCheck size={18} /> Administradores
            </Link>
            <Link 
              href="/admin?view=recepcionistas"
              onClick={() => setIsMenuOpen(false)}
              className={`w-full min-h-[44px] flex items-center gap-4 px-6 py-3 rounded-2xl font-bold uppercase tracking-widest text-xs transition-all ${activeItem === 'recepcionistas' ? 'bg-[#D4AF37] text-black shadow-[0_0_20px_rgba(212,175,55,0.2)]' : 'text-white/40 hover:bg-white/5'}`}
            >
              <UserCheck size={18} /> Recepcionistas
            </Link>
          </div>

          <Link 
            href="/portaria"
            onClick={() => setIsMenuOpen(false)}
            className="w-full min-h-[44px] flex items-center gap-4 px-6 py-3 rounded-2xl font-bold uppercase tracking-widest text-xs text-white/40 hover:bg-white/5 transition-all"
          >
            <UserPlus size={18} /> Tela da Portaria
          </Link>
        </nav>

        <div className="p-6 border-t border-white/5">
          <button 
            onClick={handleLogout}
            className="w-full min-h-[44px] flex items-center gap-4 px-6 py-3 rounded-2xl font-bold uppercase tracking-widest text-xs text-red-500/60 hover:text-red-500 hover:bg-red-500/5 transition-all"
          >
            <LogOut size={18} /> Sair do Painel
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-screen overflow-hidden pt-16 lg:pt-0">
        {children}
      </main>
    </div>
  );
}
