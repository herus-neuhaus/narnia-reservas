'use client';

import React, { useState, useEffect } from 'react';
import { Ticket, Gift, GlassWater, BarChart3, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { format, startOfToday } from 'date-fns';
import { 
  fetchTicketBatches, 
  createTicketBatch, 
  updateTicketBatch, 
  activateTicketBatch,
  deleteTicketBatch,
  closeBoxOffice, 
  fetchBoxOfficeReport 
} from '@/src/services/ticketing';
import { 
  fetchComplimentaryTickets, 
  updateComplimentaryStatus,
  deleteComplimentaryTicket,
  updateComplimentaryNotes
} from '@/src/services/complimentary';
import { 
  fetchCamarotesWithOccupation, 
  registerExtraCamaroteEntry 
} from '@/src/services/camarotes';
import { fetchEventReservations } from '@/src/services/reservations';
import { createClient } from '@/lib/supabase/client';

export default function BoxOfficeTabs({ event }: { event: any }) {
  const [activeTab, setActiveTab] = useState<'lotes' | 'cortesias' | 'camarotes' | 'fechamento'>('lotes');
  const [loading, setLoading] = useState(false);
  const [adminId, setAdminId] = useState<string | null>(null);

  const [batches, setBatches] = useState<any[]>([]);
  const [complimentary, setComplimentary] = useState<any[]>([]);
  const [camarotes, setCamarotes] = useState<any[]>([]);
  const [report, setReport] = useState<any>(null);
  const [reservations, setReservations] = useState<any[]>([]);

  const supabase = createClient();

  const loadData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setAdminId(user?.id || null);

      const [bData, cData, camData, rData, resData] = await Promise.all([
        fetchTicketBatches({ eventId: event.id }),
        fetchComplimentaryTickets(event.id),
        fetchCamarotesWithOccupation(event.id),
        fetchBoxOfficeReport(event.id),
        fetchEventReservations(event.id)
      ]);
      setBatches(bData);
      setComplimentary(cData);
      setCamarotes(camData);
      setReport(rData);
      setReservations(resData);
    } catch (err: any) {
      alert(err.message || 'Erro ao carregar dados');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    const channel = supabase.channel('admin-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ticket_batches' }, () => loadData(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'complimentary_tickets' }, () => loadData(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'camarote_entries' }, () => loadData(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'box_office_reports' }, () => loadData(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reservations' }, () => loadData(true))
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event.id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event.id]);

  const tabs: any[] = [
    { id: 'lotes', label: 'Lotes de Pulseira', icon: Ticket },
    { id: 'cortesias', label: 'Cortesias', icon: Gift, badge: complimentary.filter(c => c.status === 'pending').length },
    { id: 'camarotes', label: 'Camarotes', icon: GlassWater },
    { id: 'fechamento', label: 'Fechamento', icon: BarChart3 }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#0A0A0A] p-6 rounded-[32px] border border-white/5">
        <div className="flex gap-2 overflow-x-auto w-full custom-scrollbar pb-2 sm:pb-0">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold uppercase tracking-widest text-[10px] transition-all whitespace-nowrap ${
                activeTab === tab.id ? 'bg-[#D4AF37] text-black shadow-[0_0_15px_rgba(212,175,55,0.3)]' : 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white'
              }`}
            >
              <tab.icon size={16} /> {tab.label}
              {tab.badge ? (
                <span className={`px-2 py-0.5 rounded-full text-[9px] ${activeTab === tab.id ? 'bg-black text-[#D4AF37]' : 'bg-[#D4AF37] text-black'}`}>
                  {tab.badge}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-[#0A0A0A] border border-white/5 rounded-[32px] p-6 sm:p-10 min-h-[500px]">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full opacity-30 pt-20">
            <Loader2 className="animate-spin mb-4" size={40} />
            <p className="text-xs uppercase tracking-widest font-bold">Carregando...</p>
          </div>
        ) : (
          <>
            {activeTab === 'lotes' && <BatchesTab batches={batches} eventDate={event.event_date} eventId={event.id} onReload={loadData} />}
            {activeTab === 'cortesias' && <ComplimentaryTab complimentary={complimentary} adminId={adminId} onReload={loadData} />}
            {activeTab === 'camarotes' && <CamarotesTab camarotes={camarotes} adminId={adminId} onReload={loadData} />}
            {activeTab === 'fechamento' && <BoxOfficeTab report={report} eventDate={event.event_date} eventId={event.id} adminId={adminId} onReload={loadData} batches={batches} complimentary={complimentary} camarotes={camarotes} reservations={reservations} />}
          </>
        )}
      </div>
    </div>
  );
}

function BatchesTab({ batches, eventDate, eventId, onReload }: any) {
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState('');
  const [order, setOrder] = useState('1');
  const [selectedEventId, setSelectedEventId] = useState<string>(eventId || '');
  const [events, setEvents] = useState<any[]>([]);

  const supabase = createClient();

  useEffect(() => {
    if (!eventId) {
      supabase.from('events').select('id, name, event_date').order('event_date', { ascending: false }).limit(20).then(({ data }) => {
        if (data) setEvents(data);
      });
    }
  }, [eventId, supabase]);

  const resetForm = () => {
    setIsCreating(false);
    setEditingId(null);
    setName('');
    setPrice('');
    setQuantity('');
    setOrder('1');
    if (!eventId) setSelectedEventId('');
  };

  const handleEdit = (b: any) => {
    setEditingId(b.id);
    setName(b.name);
    setPrice(b.price.toString());
    setQuantity(b.total_quantity.toString());
    setOrder(b.batch_order.toString());
    if (b.event_id) setSelectedEventId(b.event_id);
    setIsCreating(true);
  };

  const handleDelete = async (b: any) => {
    if (b.consumed_quantity > 0) {
      if (!confirm(`ATENÇÃO: Este lote já tem ${b.consumed_quantity} pulseira(s) vendida(s)! Ao apagar, as vendas serão mantidas no sistema, mas o lote será excluído.\n\nTem certeza ABSOLUTA que deseja FORÇAR a exclusão deste lote?`)) return;
    } else {
      if (!confirm('Tem certeza que deseja apagar este lote?')) return;
    }
    
    try {
      await deleteTicketBatch(b.id);
      onReload();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSave = async () => {
    try {
      if (!selectedEventId && !editingId) {
        throw new Error('Selecione o evento vinculado a este lote.');
      }
      
      if (editingId) {
        await updateTicketBatch(editingId, {
          name,
          price: Number(price),
          total_quantity: Number(quantity),
          batch_order: Number(order),
          event_id: selectedEventId || undefined
        });
      } else {
        const evDateToUse = eventId ? eventDate : (events.find(e => e.id === selectedEventId)?.event_date || eventDate);
        
        await createTicketBatch({
          event_date: evDateToUse,
          event_id: selectedEventId,
          name,
          price: Number(price),
          total_quantity: Number(quantity),
          batch_order: Number(order),
          status: 'draft'
        });
      }
      resetForm();
      onReload();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      await updateTicketBatch(id, { status: status as any });
      onReload();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleActivate = async (id: string) => {
    try {
      await activateTicketBatch(id);
      onReload();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold">Gestão de Lotes</h3>
        <button onClick={() => isCreating ? resetForm() : setIsCreating(true)} className="bg-[#D4AF37] text-black px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest">
          {isCreating ? 'Cancelar' : '+ Novo Lote'}
        </button>
      </div>

      {isCreating && (
        <div className="bg-white/5 p-6 rounded-2xl border border-white/10 flex flex-col gap-4">
          {!eventId && (
            <div>
              <label className="text-[10px] uppercase text-white/40 font-bold mb-1 block">Evento Vinculado</label>
              <select value={selectedEventId} onChange={e => setSelectedEventId(e.target.value)} className="w-full bg-black border border-white/10 rounded-xl px-4 py-2 text-sm text-white">
                <option value="">-- Selecione o Evento --</option>
                {events.map(ev => (
                  <option key={ev.id} value={ev.id}>{ev.name} ({ev.event_date?.split('-').reverse().join('/')})</option>
                ))}
              </select>
            </div>
          )}
          <div className="flex flex-wrap md:flex-nowrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="text-[10px] uppercase text-white/40 font-bold mb-1 block">Nome do Lote</label>
              <input type="text" placeholder="Ex: Lote 1" value={name} onChange={e => setName(e.target.value)} className="w-full bg-black border border-white/10 rounded-xl px-4 py-2 text-sm" />
            </div>
            <div className="w-32">
              <label className="text-[10px] uppercase text-white/40 font-bold mb-1 block">Valor (R$)</label>
              <input type="number" placeholder="50.00" value={price} onChange={e => setPrice(e.target.value)} className="w-full bg-black border border-white/10 rounded-xl px-4 py-2 text-sm" />
            </div>
            <div className="w-24">
              <label className="text-[10px] uppercase text-white/40 font-bold mb-1 block">Ordem</label>
              <input type="number" placeholder="1" value={order} onChange={e => setOrder(e.target.value)} className="w-full bg-black border border-white/10 rounded-xl px-4 py-2 text-sm" />
            </div>
            <div className="w-32">
              <label className="text-[10px] uppercase text-white/40 font-bold mb-1 block">Quantidade</label>
              <input type="number" placeholder="100" value={quantity} onChange={e => setQuantity(e.target.value)} className="w-full bg-black border border-white/10 rounded-xl px-4 py-2 text-sm" />
            </div>
            <button onClick={handleSave} className="bg-green-500 text-black px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest h-[38px]">
              Salvar
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        {batches.map((b: any) => (
          <div key={b.id} className={`p-6 rounded-2xl border flex flex-col md:flex-row justify-between items-center gap-6 ${b.status === 'active' ? 'bg-[#D4AF37]/10 border-[#D4AF37]/50' : 'bg-white/5 border-white/10'}`}>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h4 className="text-xl font-black">{b.name}</h4>
                <span className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-widest ${
                  b.status === 'active' ? 'bg-[#D4AF37] text-black' : 
                  b.status === 'exhausted' ? 'bg-red-500/20 text-red-500' : 
                  'bg-white/10 text-white/50'
                }`}>{b.status === 'draft' ? 'Rascunho' : b.status === 'active' ? 'Ativo' : 'Esgotado'}</span>
              </div>
              {b.events?.name && (
                <p className="text-[10px] text-[#D4AF37] font-bold uppercase tracking-widest mb-1">
                  Evento: {b.events.name}
                </p>
              )}
              <p className="text-xs text-white/50">
                {b.consumed_quantity} vendidas de {b.total_quantity} • R$ {b.price.toFixed(2)} un.
              </p>
              <div className="w-full max-w-md bg-black rounded-full h-1.5 mt-3">
                <div className="bg-[#D4AF37] h-1.5 rounded-full" style={{ width: `${(b.consumed_quantity / b.total_quantity) * 100}%` }} />
              </div>
            </div>
            <div className="flex flex-col text-right">
              <p className="text-[10px] uppercase text-white/40 font-bold mb-1">Arrecadado</p>
              <p className="text-2xl font-black text-green-500">R$ {(b.consumed_quantity * b.price).toFixed(2)}</p>
              
              <div className="flex gap-2 mt-3 flex-wrap justify-end">
                {b.status !== 'active' && (
                  <button onClick={() => handleActivate(b.id)} className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all">
                    Ativar Lote
                  </button>
                )}
                {b.status === 'active' && (
                  <button onClick={() => handleUpdateStatus(b.id, 'exhausted')} className="px-4 py-2 bg-yellow-500/20 text-yellow-500 hover:bg-yellow-500 hover:text-white rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all">
                    Marcar Esgotado
                  </button>
                )}
                <button onClick={() => handleEdit(b)} className="px-4 py-2 bg-blue-500/20 text-blue-500 hover:bg-blue-500 hover:text-white rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all">
                  Editar
                </button>
                <button onClick={() => handleDelete(b)} className="px-4 py-2 bg-red-500/20 text-red-500 hover:bg-red-500 hover:text-white rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all">
                  Apagar
                </button>
              </div>
            </div>
          </div>
        ))}
        {batches.length === 0 && <p className="text-white/30 text-center py-10 uppercase text-xs font-bold tracking-widest">Nenhum lote criado</p>}
      </div>
    </div>
  );
}

function ComplimentaryTab({ complimentary, adminId, onReload }: any) {
  const handleUpdate = async (id: string, status: string) => {
    try {
      await updateComplimentaryStatus(id, status as any);
      onReload();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleEditNotes = async (id: string, currentNotes: string) => {
    const newNotes = prompt('Editar observação da cortesia:', currentNotes || '');
    if (newNotes === null) return;
    try {
      await updateComplimentaryNotes(id, newNotes);
      onReload();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja apagar esta cortesia do histórico?')) return;
    try {
      await deleteComplimentaryTicket(id);
      onReload();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const pending = complimentary.filter((c: any) => c.status === 'pending');
  const resolved = complimentary.filter((c: any) => c.status !== 'pending');

  return (
    <div className="space-y-8 animate-in fade-in">
      <div>
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">Pendentes <span className="bg-yellow-500/20 text-yellow-500 text-xs px-2 py-1 rounded-full">{pending.length}</span></h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {pending.map((c: any) => (
            <div key={c.id} className="p-5 bg-yellow-500/5 border border-yellow-500/20 rounded-2xl">
              <div className="flex justify-between items-start mb-1">
                <p className="font-bold text-sm">{c.customers?.name}</p>
                <div className="flex gap-2">
                  <button onClick={() => handleEditNotes(c.id, c.notes)} title="Editar Observação" className="text-blue-400 hover:text-blue-300">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                  </button>
                  <button onClick={() => handleDelete(c.id)} title="Apagar" className="text-red-400 hover:text-red-300">
                    <XCircle size={14} />
                  </button>
                </div>
              </div>
              <p className="text-[10px] text-white/50 uppercase mb-2">CPF: {c.customers?.cpf}</p>
              <p className="text-xs text-white/70 italic mb-4">Sol. por: {c.requested_by_user?.name}</p>
              {c.notes && <p className="text-xs bg-black/50 p-2 rounded mb-4">Obs: {c.notes}</p>}
              <div className="flex gap-2">
                <button onClick={() => handleUpdate(c.id, 'approved')} className="flex-1 py-2 bg-green-500/20 text-green-500 hover:bg-green-500 hover:text-black rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all">Aprovar</button>
                <button onClick={() => handleUpdate(c.id, 'rejected')} className="flex-1 py-2 bg-red-500/20 text-red-500 hover:bg-red-500 hover:text-white rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all">Reprovar</button>
              </div>
            </div>
          ))}
          {pending.length === 0 && <p className="text-white/30 text-xs font-bold uppercase tracking-widest col-span-full">Nenhuma cortesia pendente</p>}
        </div>
      </div>

      <div className="pt-8 border-t border-white/10">
        <h3 className="text-xl font-bold mb-4">Histórico</h3>
        <div className="space-y-2">
          {resolved.map((c: any) => (
            <div key={c.id} className="flex justify-between items-center p-3 bg-white/5 rounded-xl border border-white/5 group">
              <div>
                <p className="text-xs font-bold">{c.customers?.name} <span className="text-white/30 font-normal">({c.customers?.cpf})</span></p>
                <p className="text-[9px] text-white/40 uppercase mt-0.5">Resp: {c.approved_by_user?.name}</p>
              </div>
              <div className="flex items-center gap-4">
                <button onClick={() => handleDelete(c.id)} className="opacity-0 group-hover:opacity-100 p-1 text-red-500 hover:bg-red-500/20 rounded transition-all">
                  <XCircle size={14} />
                </button>
                <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase ${c.status === 'approved' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                  {c.status === 'approved' ? 'Aprovada' : 'Reprovada'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CamarotesTab({ camarotes, adminId, onReload }: any) {
  const handleExtra = async (camId: string) => {
    const cpf = prompt('Digite o CPF do cliente para liberar a entrada extra:');
    if (!cpf) return;
    const name = prompt('Digite o Nome do cliente:');
    if (!name) return;
    try {
      await registerExtraCamaroteEntry({ camaroteId: camId, cpf, name });
      alert('Extra liberado com sucesso!');
      onReload();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <h3 className="text-xl font-bold">Ocupação de Camarotes</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {camarotes.map((cam: any) => {
          const normal = cam.entries?.filter((e: any) => !e.is_extra)?.length || 0;
          const extra = cam.entries?.filter((e: any) => e.is_extra)?.length || 0;
          const isFull = normal >= cam.capacity;

          return (
            <div key={cam.id} className="bg-white/5 border border-white/10 p-6 rounded-2xl flex flex-col">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className="text-lg font-black text-purple-400">{cam.name}</h4>
                  <p className="text-[10px] uppercase text-white/40 tracking-widest mt-1">Dono: {cam.owner?.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-white">{normal} / {cam.capacity}</p>
                  {extra > 0 && <p className="text-[10px] text-yellow-500 font-bold">+{extra} Extras</p>}
                </div>
              </div>
              
              <div className="w-full bg-black/50 rounded-full h-2 mb-6">
                <div className={`h-2 rounded-full ${isFull ? 'bg-red-500' : 'bg-purple-500'}`} style={{ width: `${Math.min((normal / cam.capacity) * 100, 100)}%` }} />
              </div>

              <button 
                onClick={() => handleExtra(cam.id)}
                className="mt-auto w-full py-3 bg-white/5 hover:bg-yellow-500/20 hover:text-yellow-500 text-white/50 transition-all rounded-xl text-[10px] font-black uppercase tracking-widest border border-transparent hover:border-yellow-500/30"
              >
                Autorizar Extra
              </button>
            </div>
          );
        })}
        {camarotes.length === 0 && <p className="text-white/30 text-xs font-bold uppercase tracking-widest col-span-full py-10 text-center">Nenhum camarote registrado</p>}
      </div>
    </div>
  );
}

function BoxOfficeTab({ report, eventDate, eventId, adminId, onReload, batches, complimentary, camarotes, reservations }: any) {
  const [closing, setClosing] = useState(false);

  const handleClose = async () => {
    if (!confirm('ATENÇÃO: Encerrar a bilheteria irá bloquear todos os lotes ativos e gerar o relatório final. Deseja prosseguir?')) return;
    setClosing(true);
    try {
      await closeBoxOffice(eventId);
      alert('Bilheteria encerrada com sucesso!');
      onReload();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setClosing(false);
    }
  };

  if (report && report.snapshot_data) {
    const snap = report.snapshot_data;
    const totalEntered = snap.total_entered || 0;
    const byType = snap.by_type || {};
    const reportBatches = snap.batches || [];
    const comp = snap.complimentary || { approved: 0, rejected: 0, pending: 0, entered: 0 };
    const reportCamarotes = snap.camarotes || [];
    
    const totalArrecadado = report.total_revenue || 0;

    const generateWhatsAppMessage = () => {
      let msg = `*RELATÓRIO DE BILHETERIA*\n`;
      msg += `Data: ${format(new Date(eventDate), 'dd/MM/yyyy')}\n\n`;
      msg += `*RESUMO DE ENTRADAS (Total: ${totalEntered})*\n`;
      msg += `- Lista: ${byType['lista'] || 0}\n`;
      msg += `- Pulseira: ${byType['pulseira'] || 0}\n`;
      msg += `- Mesa: ${byType['mesa'] || 0}\n`;
      msg += `- Camarote: ${byType['camarote'] || 0}\n`;
      msg += `- Cortesia: ${byType['cortesia'] || 0}\n\n`;
      
      msg += `*PULSEIRAS / FINANCEIRO*\n`;
      reportBatches.forEach((b: any) => {
        msg += `> ${b.name}: ${b.consumed_quantity} de ${b.total_quantity} vendidas (R$ ${b.price})\n`;
      });
      msg += `Total Arrecadado: R$ ${totalArrecadado.toFixed(2)}\n\n`;

      msg += `*CORTESIAS*\n`;
      msg += `- Aprovadas: ${comp.approved}\n`;
      msg += `- Reprovadas: ${comp.rejected}\n`;
      msg += `- Check-in Feito: ${comp.entered}\n\n`;

      msg += `*CAMAROTES*\n`;
      reportCamarotes.forEach((c: any) => {
        msg += `> ${c.name} (${c.owner || 'Sem Dono'}): ${c.normal_entries}/${c.capacity} ocupado` + (c.extra_entries > 0 ? ` (+${c.extra_entries} extras)\n` : '\n');
      });

      return encodeURIComponent(msg);
    };

    return (
      <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in" id="printable-report">
        <style dangerouslySetInnerHTML={{__html: `
          @media print {
            body * { visibility: hidden; }
            #printable-report, #printable-report * { visibility: visible; }
            #printable-report { position: absolute; left: 0; top: 0; width: 100%; color: black !important; }
            #printable-report .no-print { display: none !important; }
            #printable-report .bg-white\\/5 { background: transparent; border: 1px solid #ccc; }
            #printable-report .text-white { color: black !important; }
            #printable-report .text-white\\/40 { color: #555 !important; }
            #printable-report .text-\\[\\#D4AF37\\] { color: #000 !important; font-weight: bold; }
          }
        `}} />
        
        <div className="flex justify-between items-center no-print">
          <div className="text-left">
            <h3 className="text-2xl font-black text-green-500 uppercase flex items-center gap-2">
              <CheckCircle size={28} /> Bilheteria Encerrada
            </h3>
            <p className="text-white/40 text-xs uppercase tracking-widest mt-1">Fechado por {report.closed_by_user?.name} em {formatToBrlDateTime(report.closed_at || report.created_at || new Date().toISOString())}</p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => window.print()}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-bold uppercase tracking-widest transition-all"
            >
              Imprimir / PDF
            </button>
            <a 
              href={`https://wa.me/?text=${generateWhatsAppMessage()}`}
              target="_blank" rel="noreferrer"
              className="px-4 py-2 bg-green-500 text-black hover:bg-green-600 rounded-xl text-xs font-bold uppercase tracking-widest transition-all"
            >
              Enviar WhatsApp
            </a>
          </div>
        </div>

        {/* Printable Title */}
        <div className="hidden print:block text-center mb-8 border-b border-black pb-4">
          <h1 className="text-3xl font-black uppercase">Relatório de Fechamento - Nárnia</h1>
          <p className="text-sm mt-2">Data do Evento: {format(new Date(eventDate), 'dd/MM/yyyy')} | Fechado por: {report.closed_by_user?.name}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
            <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-4">Resumo de Entradas</p>
            <div className="flex justify-between items-end border-b border-white/5 pb-4 mb-4">
              <p className="text-xs font-bold uppercase text-white/50">Total Geral (Check-in)</p>
              <p className="text-3xl font-black text-white">{totalEntered}</p>
            </div>
            <div className="space-y-2 text-sm font-bold">
              <div className="flex justify-between"><span>Lista</span> <span className="text-[#D4AF37]">{byType['lista'] || 0}</span></div>
              <div className="flex justify-between"><span>Pulseira</span> <span className="text-[#D4AF37]">{byType['pulseira'] || 0}</span></div>
              <div className="flex justify-between"><span>Mesa</span> <span className="text-[#D4AF37]">{byType['mesa'] || 0}</span></div>
              <div className="flex justify-between"><span>Camarote</span> <span className="text-[#D4AF37]">{byType['camarote'] || 0}</span></div>
              <div className="flex justify-between"><span>Cortesia</span> <span className="text-[#D4AF37]">{byType['cortesia'] || 0}</span></div>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
             <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-4">Financeiro & Cortesias</p>
             <div className="flex justify-between items-end border-b border-white/5 pb-4 mb-4">
              <p className="text-xs font-bold uppercase text-white/50">Receita Bruta Pulseiras</p>
              <p className="text-3xl font-black text-green-500">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalArrecadado)}</p>
            </div>
            <div className="space-y-2 text-sm font-bold">
              <div className="flex justify-between text-white/50 text-[10px] uppercase"><span>Status das Cortesias</span> <span>Qtd</span></div>
              <div className="flex justify-between"><span>Aprovadas</span> <span className="text-green-500">{comp.approved}</span></div>
              <div className="flex justify-between"><span>Reprovadas</span> <span className="text-red-500">{comp.rejected}</span></div>
              <div className="flex justify-between mt-2 pt-2 border-t border-white/10 text-white/70"><span>Check-in Realizado</span> <span className="text-white">{comp.entered}</span></div>
            </div>
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
          <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-4">Detalhamento de Lotes (Pulseiras)</p>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-[10px] uppercase text-white/30 border-b border-white/10">
                <tr>
                  <th className="pb-2">Lote</th>
                  <th className="pb-2 text-center">Inicial</th>
                  <th className="pb-2 text-center">Vendido</th>
                  <th className="pb-2 text-center">Restante</th>
                  <th className="pb-2 text-right">Valor Un.</th>
                  <th className="pb-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {reportBatches.map((b: any, idx: number) => (
                  <tr key={idx}>
                    <td className="py-3 font-bold">{b.name}</td>
                    <td className="py-3 text-center">{b.total_quantity}</td>
                    <td className="py-3 text-center text-[#D4AF37] font-bold">{b.consumed_quantity}</td>
                    <td className="py-3 text-center text-white/50">{b.total_quantity - b.consumed_quantity}</td>
                    <td className="py-3 text-right">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(b.price)}</td>
                    <td className="py-3 text-right font-bold text-green-500">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(b.consumed_quantity * b.price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
          <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-4">Ocupação Final de Camarotes</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {reportCamarotes.map((c: any, idx: number) => {
              return (
                <div key={idx} className="border border-white/5 rounded-xl p-4 bg-black/20">
                  <p className="font-bold text-purple-400">{c.name}</p>
                  <p className="text-[10px] text-white/40 uppercase mb-2">Resp: {c.owner || 'Não atribuído'}</p>
                  <div className="flex justify-between text-xs font-bold">
                    <span>Ocupação: {c.normal_entries}/{c.capacity}</span>
                    {c.extra_entries > 0 && <span className="text-yellow-500">+{c.extra_entries} Extras</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-[400px] text-center max-w-md mx-auto animate-in zoom-in-95">
      <div className="w-20 h-20 bg-[#D4AF37]/10 text-[#D4AF37] rounded-full flex items-center justify-center mb-6 border border-[#D4AF37]/20 shadow-[0_0_50px_rgba(212,175,55,0.2)]">
        <BarChart3 size={40} />
      </div>
      <h3 className="text-2xl font-black uppercase tracking-tighter mb-2">Encerrar Turno</h3>
      <p className="text-sm text-white/50 mb-8 leading-relaxed">
        O encerramento de bilheteria compila todas as vendas de pulseiras, contagem de cortesias e gera um relatório imutável do evento.
      </p>
      <button 
        onClick={handleClose}
        disabled={closing}
        className="w-full bg-[#D4AF37] text-black py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-[#b8962f] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(212,175,55,0.3)] flex justify-center items-center gap-2"
      >
        {closing ? <Loader2 className="animate-spin" size={20} /> : 'Confirmar Fechamento'}
      </button>
    </div>
  );
}

// Dummy helper if formatToBrlDateTime is missing in imports
function formatToBrlDateTime(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', { timeZone: 'America/Porto_Velho' });
}
