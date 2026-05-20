import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const { title, date, description, start_time, list_limit_capacity, list_limit_time, banner_url, visible_from } = body;

    if (!title || !date) {
      return NextResponse.json(
        { error: 'Título (Nome) e Data são campos obrigatórios.' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('events')
      .insert([
        {
          name: title,
          event_date: date,
          description,
          start_time,
          list_limit_capacity: list_limit_capacity ? parseInt(list_limit_capacity, 10) : 0,
          list_limit_time: list_limit_time || null,
          banner_url,
          image_url: banner_url,
          visible_from: visible_from || null
        }
      ])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (err: any) {
    console.error('[API Events Create] Erro:', err);
    return NextResponse.json(
      { error: err.message || 'Erro interno no servidor.' },
      { status: 500 }
    );
  }
}
