'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { 
  Search, 
  Plus, 
  Loader2, 
  MoreVertical, 
  X, 
  User, 
  Mail, 
  Trash2, 
  Check, 
  UserCheck 
} from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'receptionist';
  status: 'active' | 'pending_invite';
  created_at: string;
}

interface TeamManagerProps {
  role: 'admin' | 'receptionist';
}

export default function TeamManager({ role }: TeamManagerProps) {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Multi-invite inputs state
  const [inviteEntries, setInviteEntries] = useState<{ name: string; email: string }[]>([
    { name: '', email: '' }
  ]);

  const supabase = createClient();
  const menuRef = useRef<HTMLDivElement>(null);

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        setLoading(false);
        return;
      }

      const res = await fetch(`/api/team/list?role=${role}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
      });

      const resData = await res.json();
      if (res.ok && resData.success) {
        setMembers(resData.data || []);
      } else {
        console.error('Erro ao buscar equipe:', resData.error);
      }
    } catch (err) {
      console.error('Erro de rede ao buscar equipe:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchMembers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  // Close contextual menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenuId(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Filter out completely empty entries
    const validEntries = inviteEntries.filter(entry => entry.name.trim() !== '' || entry.email.trim() !== '');

    if (validEntries.length === 0) {
      alert('Preencha pelo menos um convite.');
      return;
    }

    // Validate email patterns
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    for (const entry of validEntries) {
      if (!entry.name.trim()) {
        alert('O nome do membro da equipe é obrigatório.');
        return;
      }
      if (!emailRegex.test(entry.email.trim())) {
        alert(`O e-mail "${entry.email}" é inválido.`);
        return;
      }
    }

    setIsSubmitting(true);

    try {
      let succeededCount = 0;
      let errorsList: string[] = [];

      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      for (const entry of validEntries) {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch('/api/team/create', {
          method: 'POST',
          headers,
          credentials: 'include',
          body: JSON.stringify({
            name: entry.name,
            email: entry.email,
            role: role
          })
        });

        const resData = await response.json();
        if (response.ok && resData.success) {
          succeededCount++;
        } else {
          errorsList.push(`${entry.email}: ${resData.error || 'Erro desconhecido'}`);
        }
      }

      if (errorsList.length > 0) {
        alert(`Sucesso: ${succeededCount} convites enviados. Falhas:\n${errorsList.join('\n')}`);
      } else {
        alert('Todos os convites foram enviados com sucesso!');
      }

      setIsModalOpen(false);
      setInviteEntries([{ name: '', email: '' }]);
      fetchMembers();
    } catch (err: any) {
      alert('Erro ao enviar convites: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddMoreEntry = () => {
    setInviteEntries([...inviteEntries, { name: '', email: '' }]);
  };

  const handleRemoveEntry = (index: number) => {
    if (inviteEntries.length === 1) return;
    setInviteEntries(inviteEntries.filter((_, i) => i !== index));
  };

  const handleEntryChange = (index: number, field: 'name' | 'email', value: string) => {
    const updated = [...inviteEntries];
    updated[index][field] = value;
    setInviteEntries(updated);
  };

  const handleDeleteMember = async (id: string) => {
    if (!confirm('Deseja realmente remover este membro da equipe?')) return;
    try {
      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchMembers();
    } catch (err: any) {
      alert('Erro ao remover membro da equipe: ' + err.message);
    } finally {
      setActiveMenuId(null);
    }
  };

  const filteredMembers = members.filter(m => 
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    m.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const titleText = role === 'admin' ? 'Administradores' : 'Recepcionistas';
  const actionButtonText = role === 'admin' ? 'Adicionar Administradores' : 'Adicionar Recepcionistas';

  return (
    <div className="space-y-6">
      {/* Header & Search */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-black/40 backdrop-blur-md p-6 rounded-3xl border border-white/5">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
          <input 
            type="text" 
            placeholder={`Buscar por nome ou e-mail...`} 
            value={searchTerm} 
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-6 py-3.5 bg-zinc-950 border border-zinc-800 text-white focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] outline-none rounded-2xl text-sm transition-all"
          />
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-2 bg-[#d4af37] hover:bg-[#b8952e] text-black font-bold uppercase transition-all duration-200 py-3.5 px-6 rounded-2xl text-xs tracking-wider shrink-0"
        >
          <Plus size={16} /> {actionButtonText}
        </button>
      </div>

      {/* List / Cards */}
      {loading ? (
        <div className="flex items-center justify-center p-20">
          <Loader2 className="animate-spin text-[#d4af37]" size={40} />
        </div>
      ) : filteredMembers.length === 0 ? (
        <div className="text-center py-16 border border-white/5 rounded-3xl bg-[#0d0d0d] text-white/20">
          <p className="text-sm font-bold uppercase tracking-widest">Nenhum membro encontrado</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMembers.map(member => (
            <div 
              key={member.id} 
              className="bg-[#0d0d0d] border border-zinc-800 hover:border-[#d4af37]/30 p-6 rounded-3xl transition-all duration-300 relative group flex flex-col justify-between"
            >
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-white uppercase tracking-wider">{member.name}</h4>
                  <p className="text-xs text-white/40 font-medium">{member.email}</p>
                </div>
                
                {/* Contextual Actions Menu */}
                <div className="relative">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveMenuId(activeMenuId === member.id ? null : member.id);
                    }}
                    className="p-2 text-white/40 hover:text-white hover:bg-white/5 rounded-xl transition-all"
                  >
                    <MoreVertical size={16} />
                  </button>

                  {activeMenuId === member.id && (
                    <div 
                      ref={menuRef} 
                      className="absolute right-0 mt-2 w-48 bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl z-50 p-2 animate-in fade-in slide-in-from-top-1 duration-200"
                    >
                      <button 
                        onClick={() => handleDeleteMember(member.id)}
                        className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-red-500/10 text-red-500 rounded-xl text-left text-xs font-bold uppercase tracking-wider transition-all"
                      >
                        <Trash2 size={14} /> Remover Acesso
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Status Badge */}
              <div className="mt-6 flex items-center justify-between">
                {member.status === 'active' ? (
                  <span className="flex items-center gap-1.5 px-3 py-1 bg-green-500/10 text-green-500 border border-green-500/20 text-[10px] font-black uppercase tracking-widest rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                    Ativo
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 text-amber-500 border border-amber-500/20 text-[10px] font-black uppercase tracking-widest rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                    Convite enviado
                  </span>
                )}
                
                <span className="text-[9px] text-white/20 font-bold uppercase tracking-widest">
                  Criado em {format(parseISO(member.created_at), 'dd/MM/yyyy')}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Invite Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="bg-[#0d0d0d] border border-zinc-800 w-full max-w-2xl rounded-3xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-zinc-800 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-white uppercase tracking-widest">Enviar Convite de Equipe</h3>
                <p className="text-[10px] text-white/40 uppercase tracking-wider mt-1">Convidando para o cargo de {titleText.slice(0, -1)}</p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-white/40 hover:text-white hover:bg-white/5 rounded-xl transition-all"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleInviteSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
              {inviteEntries.map((entry, idx) => (
                <div 
                  key={idx} 
                  className="bg-black/40 border border-zinc-800/60 p-5 rounded-2xl relative space-y-4 animate-in slide-in-from-bottom-2 duration-300"
                >
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Membro #{idx + 1}</span>
                    {inviteEntries.length > 1 && (
                      <button 
                        type="button" 
                        onClick={() => handleRemoveEntry(idx)}
                        className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                        title="Remover este campo"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 ml-2 mb-1 block">Nome Completo</label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" size={16} />
                        <input 
                          type="text" 
                          required
                          value={entry.name}
                          onChange={e => handleEntryChange(idx, 'name', e.target.value)}
                          placeholder="Ex: Carlos Silva"
                          className="w-full pl-10 pr-4 py-3 bg-zinc-950 border border-zinc-800 text-white focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] outline-none rounded-xl text-sm transition-all"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 ml-2 mb-1 block">E-mail Institucional</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" size={16} />
                        <input 
                          type="email" 
                          required
                          value={entry.email}
                          onChange={e => handleEntryChange(idx, 'email', e.target.value)}
                          placeholder="Ex: carlos@narniaclub.com"
                          className="w-full pl-10 pr-4 py-3 bg-zinc-950 border border-zinc-800 text-white focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] outline-none rounded-xl text-sm transition-all"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              <button 
                type="button" 
                onClick={handleAddMoreEntry}
                className="w-full py-3.5 border border-dashed border-zinc-800 hover:border-[#d4af37]/40 text-xs font-bold uppercase tracking-widest text-[#d4af37] rounded-2xl transition-all duration-300"
              >
                + Adicionar mais um
              </button>
            </form>

            {/* Modal Footer */}
            <div className="p-6 border-t border-zinc-800 flex justify-end gap-3 bg-black/40">
              <button 
                type="button" 
                onClick={() => setIsModalOpen(false)}
                className="px-6 py-3 border border-zinc-800 hover:bg-white/5 text-white/60 hover:text-white rounded-xl text-xs font-bold uppercase tracking-widest transition-all"
              >
                Voltar
              </button>
              <button 
                type="submit" 
                onClick={handleInviteSubmit}
                disabled={isSubmitting}
                className="px-8 py-3 bg-[#d4af37] hover:bg-[#b8952e] disabled:opacity-50 text-black font-bold uppercase rounded-xl text-xs tracking-widest flex items-center gap-2 transition-all"
              >
                {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : <><UserCheck size={16} /> Convidar</>}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
