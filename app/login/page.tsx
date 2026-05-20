'use client';

export const dynamic = 'force-dynamic';

import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { LogIn, Lock, Mail, AlertCircle, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError(authError.message);
      } else if (data?.session) {
        // Obter o cargo diretamente dos metadados seguros da sessão do Auth
        const user = data.session.user;
        const role = user.app_metadata?.role || user.user_metadata?.role || 'customer';
        const email = user.email || '';

        const isAuthAdmin = ['dono', 'gerente', 'admin'].includes(role) || email === 'narnia@admin.com';
        
        if (role === 'portaria' || role === 'receptionist') {
          router.push('/portaria');
        } else if (isAuthAdmin) {
          router.push('/admin');
        } else {
          setError('Acesso negado: Perfil não autorizado para o painel de funcionários.');
          await supabase.auth.signOut();
        }
        router.refresh();
      }
    } catch (err) {
      setError('Ocorreu um erro ao tentar fazer login.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 font-sans text-white">
      <div className="w-full max-w-[400px] bg-[#0A0A0A] rounded-[32px] shadow-2xl overflow-hidden border border-white/10 p-8">
        <div className="text-center mb-8">
          <div className="bg-[#D4AF37] text-black w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Lock size={32} />
          </div>
          <h1 className="text-2xl font-serif font-bold tracking-wide uppercase text-white">Acesso Restrito</h1>
          <p className="text-xs opacity-60 uppercase tracking-widest mt-1 text-[#D4AF37]">Nárnia Club Admin</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 ml-1 opacity-70">E-mail</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-[#D4AF37]/40" size={18} />
               <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-black border border-white/10 rounded-2xl text-lg text-white focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] transition-all placeholder:text-white/20"
                placeholder="exemplo@email.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 ml-1 opacity-70">Senha</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-[#4A3728]/40" size={18} />
               <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-black border border-white/10 rounded-2xl text-lg text-white focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] transition-all placeholder:text-white/20"
                placeholder="••••••••"
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-xs animate-in fade-in zoom-in duration-200">
              <AlertCircle size={16} className="shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-[#D4AF37] text-black rounded-2xl font-bold uppercase tracking-[2px] text-xs shadow-xl hover:bg-[#b8962f] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70"
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : <LogIn size={18} />}
            Entrar no Painel
          </button>
        </form>

        <div className="text-center mt-6">
          <button
            type="button"
            onClick={() => router.push('/ativar')}
            className="text-xs text-[#D4AF37]/80 hover:text-[#D4AF37] hover:underline bg-transparent border-none cursor-pointer uppercase tracking-widest font-bold transition-colors"
          >
            Seu primeiro acesso? Clique aqui
          </button>
        </div>

        <p className="text-center text-[9px] mt-8 opacity-40 uppercase tracking-widest text-white/40">
          Sistema de Gestão Interna • Nárnia
        </p>
      </div>
    </div>
  );
}
