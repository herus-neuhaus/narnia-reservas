'use client';

export const dynamic = 'force-dynamic';

import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Lock, Mail, AlertCircle, Loader2, UserCheck } from 'lucide-react';

export default function AtivarPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();
  const router = useRouter();

  const handleActivation = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // 1. Enviar requisição para ativar a conta
      const response = await fetch('/api/team/activate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const resData = await response.json();

      if (!response.ok) {
        setError(resData.error || 'Erro ao ativar a conta.');
        setLoading(false);
        return;
      }

      // 2. Realizar login imediatamente após ativação com sucesso
      const { data: signInData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError('Conta ativada, mas houve um erro ao fazer o login automático. Vá para a tela de login.');
        setLoading(false);
        return;
      }

      if (signInData?.user) {
        // Buscar os metadados do usuário que definimos na criação (user_metadata)
        const userRole = signInData.user.user_metadata?.role;

        if (userRole === 'admin' || userRole === 'dono' || userRole === 'gerente' || email === 'narnia@admin.com') {
          router.push('/admin');
        } else if (userRole === 'receptionist' || userRole === 'portaria') {
          router.push('/portaria');
        } else {
          router.push('/'); // Fallback de segurança
        }
        router.refresh();
      }
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro ao processar a ativação.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0d0d0d] flex items-center justify-center p-4 font-sans text-white">
      <div className="w-full max-w-[400px] bg-black border border-zinc-850 rounded-[32px] shadow-2xl p-8">
        <div className="text-center mb-8">
          <div className="bg-[#D4AF37] text-black w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <UserCheck size={32} />
          </div>
          <h1 className="text-2xl font-serif font-bold tracking-wide uppercase text-white">Ativar Conta</h1>
          <p className="text-xs opacity-60 uppercase tracking-widest mt-1 text-[#D4AF37]">Nárnia Club Equipe</p>
          <p className="text-[11px] text-white/40 mt-3 max-w-[280px] mx-auto leading-relaxed">
            Digite seu e-mail corporativo e crie uma senha de acesso.
          </p>
        </div>

        <form onSubmit={handleActivation} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 ml-1 opacity-70">E-mail Corporativo</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-[#D4AF37]/40" size={18} />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-zinc-950 border border-zinc-800 rounded-2xl text-base text-white focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] transition-all placeholder:text-white/20"
                placeholder="nome@narniaclub.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 ml-1 opacity-70">Nova Senha</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-[#D4AF37]/40" size={18} />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-zinc-950 border border-zinc-800 rounded-2xl text-base text-white focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] transition-all placeholder:text-white/20"
                placeholder="Mínimo 6 caracteres"
                minLength={6}
              />
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2.5 p-4 bg-red-950/20 border border-red-900/30 rounded-2xl text-red-400 text-xs animate-in fade-in zoom-in duration-200">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <p className="leading-relaxed">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-[#D4AF37] text-black rounded-2xl font-bold uppercase tracking-[2px] text-xs shadow-xl hover:bg-[#b8962f] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={18} /> Ativando...
              </>
            ) : (
              <>
                <UserCheck size={18} /> Ativar e Entrar
              </>
            )}
          </button>
        </form>

        <p className="text-center text-[9px] mt-8 opacity-45 uppercase tracking-widest text-white/30">
          Primeiro Acesso • Nárnia Club
        </p>
      </div>
    </div>
  );
}
