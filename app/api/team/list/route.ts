import { NextRequest, NextResponse } from 'next/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';

// Otimização Vercel: Garante que a requisição sempre bata no banco e nunca em cache estático
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[API Team List] Erro Crítico: Variáveis de ambiente do Supabase ausentes.');
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
      console.log('[API Team List] Erro de autenticação ou usuário não encontrado.');
      console.log('[API Team List] Auth error:', authError);
      console.log('[API Team List] User data:', user);
      console.log('[API Team List] Token:', token ? `Bearer ${token.substring(0, 10)}...` : 'Nenhum token nos headers de autorização');
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    const userRole = user.app_metadata?.role || user.user_metadata?.role || '';
    const emailClaim = user.email || '';
    
    const isAuthAdmin = ['dono', 'gerente', 'admin'].includes(userRole) || emailClaim === 'narnia@admin.com';

    if (!isAuthAdmin) {
      console.log('[API Team List] Permissão insuficiente.');
      console.log('[API Team List] User ID:', user.id);
      console.log('[API Team List] User Email:', emailClaim);
      console.log('[API Team List] User Role (app_metadata):', user.app_metadata?.role);
      console.log('[API Team List] User Role (user_metadata):', user.user_metadata?.role);
      return NextResponse.json({ error: 'Permissão insuficiente.' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const role = searchParams.get('role');
    const email = searchParams.get('email');

    // Instanciação segura do admin client para execução da query
    const supabaseAdmin = createAdminClient(supabaseUrl, supabaseServiceKey);

    let query = supabaseAdmin.from('team_members').select('*');
    
    if (role) {
      query = query.eq('role', role);
    }
    if (email) {
      query = query.eq('email', email);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (err: any) {
    console.error('[API Team List] Erro na execução:', err);
    return NextResponse.json(
      { error: err.message || 'Erro interno no servidor.' },
      { status: 500 }
    );
  }
}
