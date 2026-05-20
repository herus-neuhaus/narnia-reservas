import { NextRequest, NextResponse } from 'next/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[API Team Create] Erro Crítico: Variáveis de ambiente do Supabase ausentes.');
      return NextResponse.json(
        { error: 'Configuração interna do servidor ausente.' },
        { status: 500 }
      );
    }

    // 1. Validar autenticação do usuário logado
    const supabase = await createClient();
    
    let token: string | undefined;
    const authHeader = req.headers.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }

    const { data: { user }, error: authError } = token 
      ? await supabase.auth.getUser(token) 
      : await supabase.auth.getUser();

    if (authError || !user) {
      console.log('[API Team Create] Erro de autenticação ou usuário não encontrado.');
      console.log('[API Team Create] Auth error:', authError);
      console.log('[API Team Create] User data:', user);
      console.log('[API Team Create] Token:', token ? `Bearer ${token.substring(0, 10)}...` : 'Nenhum token nos headers de autorização');
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    const userRole = user.app_metadata?.role || user.user_metadata?.role || '';
    const emailClaim = user.email || '';
    const isAuthAdmin = ['dono', 'gerente', 'admin'].includes(userRole) || emailClaim === 'narnia@admin.com';

    if (!isAuthAdmin) {
      console.log('[API Team Create] Permissão insuficiente.');
      console.log('[API Team Create] User ID:', user.id);
      console.log('[API Team Create] User Email:', emailClaim);
      console.log('[API Team Create] User Role (app_metadata):', user.app_metadata?.role);
      console.log('[API Team Create] User Role (user_metadata):', user.user_metadata?.role);
      return NextResponse.json({ error: 'Permissão insuficiente.' }, { status: 403 });
    }

    const supabaseAdmin = createAdminClient(supabaseUrl, supabaseServiceKey);
    
    const body = await req.json();
    const { name, email, role } = body;

    if (!name || !email || !role) {
      return NextResponse.json(
        { error: 'Nome, e-mail e cargo são obrigatórios.' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('team_members')
      .insert([{ name, email, role, status: 'pending_invite' }])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (err: any) {
    console.error('[API Team Create] Erro na execução:', err);
    return NextResponse.json(
      { error: err.message || 'Erro interno no servidor.' },
      { status: 500 }
    );
  }
}
