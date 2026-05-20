import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Otimização Vercel: Garante que a requisição sempre bata no banco e nunca em cache estático
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[API Team Activate] Erro Crítico: Variáveis de ambiente do Supabase ausentes.');
      return NextResponse.json(
        { error: 'Configuração interna do servidor ausente.' },
        { status: 500 }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'E-mail e senha são obrigatórios.' }, { status: 400 });
    }

    // 1. Verificar se o e-mail existe na tabela team_members e está pendente
    const { data: member, error: memberError } = await supabaseAdmin
      .from('team_members')
      .select('*')
      .eq('email', email)
      .single();

    if (memberError || !member) {
      return NextResponse.json({ error: 'E-mail não encontrado na lista de convites.' }, { status: 404 });
    }

    if (member.status === 'active') {
      return NextResponse.json({ error: 'Esta conta já foi ativada. Faça login.' }, { status: 400 });
    }

    // 2. Criar o usuário no auth.users do Supabase ignorando o envio de e-mail (email_confirm: true)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name: member.name },
      app_metadata: { role: member.role }
    });

    if (authError) throw authError;

    // 3. Atualizar o status na tabela team_members para ativo e vincular o UUID do Auth à tabela
    const { error: updateError } = await supabaseAdmin
      .from('team_members')
      .update({ status: 'active', id: authData.user.id })
      .eq('email', email);

    if (updateError) throw updateError;

    return NextResponse.json({ success: true, message: 'Conta ativada com sucesso!' }, { status: 201 });
  } catch (err: any) {
    console.error('[API Team Activate] Erro:', err);
    return NextResponse.json({ error: err.message || 'Erro interno no servidor.' }, { status: 500 });
  }
}
