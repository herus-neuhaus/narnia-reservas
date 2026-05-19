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
  UserCheck
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function AdminLayoutShell({ children, activeItem }: { children: React.ReactNode, activeItem: string }) {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }

      // Check role dynamically via our internal API to avoid RLS 406 errors
      let role = 'customer';
      try {
        const response = await fetch(`/api/team/list?email=${encodeURIComponent(session.user.email || '')}`);
        const result = await response.json();
        if (result.success && result.data && result.data.length > 0) {
          role = result.data[0].role;
        }
      } catch (err) {
        console.error('Error fetching role:', err);
      }
        
      const isAuthAdmin = ['dono', 'gerente', 'admin'].includes(role) || session.user.email === 'narnia@admin.com';

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
      {/* Sidebar */}
      <aside className="w-full lg:w-72 bg-black border-r border-white/5 flex flex-col shrink-0 overflow-y-auto">
        <div className="p-8">
          <h1 
            onClick={() => router.push('/admin')}
            className="text-2xl font-serif font-black tracking-widest text-[#D4AF37] uppercase cursor-pointer hover:opacity-85 transition-opacity"
          >
            Nárnia
          </h1>
          <p className="text-[10px] font-black tracking-[0.4em] text-white/20 uppercase mt-1">Management Panel</p>
        </div>

        <nav className="flex-1 px-4 space-y-2">
          <Link 
            href="/admin?view=reservations"
            className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-bold uppercase tracking-widest text-xs transition-all ${activeItem === 'reservations' ? 'bg-[#D4AF37] text-black shadow-[0_0_20px_rgba(212,175,55,0.2)]' : 'text-white/40 hover:bg-white/5'}`}
          >
            <CalendarIcon size={18} /> Reservas & Listas
          </Link>
          
          <Link 
            href="/admin?view=clientes"
            className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-bold uppercase tracking-widest text-xs transition-all ${activeItem === 'clientes' ? 'bg-[#D4AF37] text-black shadow-[0_0_20px_rgba(212,175,55,0.2)]' : 'text-white/40 hover:bg-white/5'}`}
          >
            <Users size={18} /> Clientes
          </Link>

          <Link 
            href="/admin?view=blacklist"
            className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-bold uppercase tracking-widest text-xs transition-all ${activeItem === 'blacklist' ? 'bg-red-500 text-white shadow-[0_0_20px_rgba(239,68,68,0.2)]' : 'text-white/40 hover:bg-white/5'}`}
          >
            <ShieldAlert size={18} /> Blacklist
          </Link>

          <Link 
            href="/admin?view=events"
            className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-bold uppercase tracking-widest text-xs transition-all ${activeItem === 'events' ? 'bg-[#D4AF37] text-black shadow-[0_0_20px_rgba(212,175,55,0.2)]' : 'text-white/40 hover:bg-white/5'}`}
          >
            <CalendarDays size={18} /> Eventos
          </Link>

          <div className="border-t border-white/5 my-2 pt-2">
            <p className="px-6 text-[9px] font-black uppercase tracking-widest text-white/20 mb-2">Equipe</p>
            <Link 
              href="/admin?view=administradores"
              className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-bold uppercase tracking-widest text-xs transition-all ${activeItem === 'administradores' ? 'bg-[#D4AF37] text-black shadow-[0_0_20px_rgba(212,175,55,0.2)]' : 'text-white/40 hover:bg-white/5'}`}
            >
              <ShieldCheck size={18} /> Administradores
            </Link>
            <Link 
              href="/admin?view=recepcionistas"
              className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-bold uppercase tracking-widest text-xs transition-all ${activeItem === 'recepcionistas' ? 'bg-[#D4AF37] text-black shadow-[0_0_20px_rgba(212,175,55,0.2)]' : 'text-white/40 hover:bg-white/5'}`}
            >
              <UserCheck size={18} /> Recepcionistas
            </Link>
          </div>

          <Link 
            href="/portaria"
            className="w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-bold uppercase tracking-widest text-xs text-white/40 hover:bg-white/5 transition-all"
          >
            <UserPlus size={18} /> Tela da Portaria
          </Link>
        </nav>

        <div className="p-6 border-t border-white/5">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-bold uppercase tracking-widest text-xs text-red-500/60 hover:text-red-500 hover:bg-red-500/5 transition-all"
          >
            <LogOut size={18} /> Sair do Painel
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-screen overflow-hidden">
        {children}
      </main>
    </div>
  );
}
