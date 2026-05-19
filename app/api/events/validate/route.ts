import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

async function validateDate(date: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // 1. Fetch the event details for the given date
  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('*')
    .eq('event_date', date)
    .maybeSingle();

  if (eventError) {
    throw eventError;
  }

  if (!event) {
    return {
      allowed: true,
      reason: 'Nenhum evento especial cadastrado para esta data. Lista liberada.',
      currentCount: 0,
      capacity: 0
    };
  }

  // 2. Count current active guest list reservations on that day
  const { count, error: countError } = await supabase
    .from('reservations')
    .select('*', { count: 'exact', head: true })
    .eq('reservation_date', date)
    .eq('type', 'lista')
    .neq('status', 'cancelled');

  if (countError) {
    throw countError;
  }

  const currentCount = count || 0;
  const capacity = event.list_limit_capacity || 0;

  // 3. Check if list has reached capacity
  if (capacity > 0 && currentCount >= capacity) {
    return {
      allowed: false,
      reason: 'Desculpe, a lista de convidados para este evento atingiu a capacidade máxima.',
      currentCount,
      capacity
    };
  }

  return {
    allowed: true,
    currentCount,
    capacity,
    list_limit_time: event.list_limit_time
  };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date');

    if (!date) {
      return NextResponse.json(
        { error: 'Parâmetro "date" é obrigatório.' },
        { status: 400 }
      );
    }

    const result = await validateDate(date);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error('[API Events Validate GET] Erro:', err);
    return NextResponse.json(
      { error: err.message || 'Erro interno ao validar lista.' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const date = body.date;

    if (!date) {
      return NextResponse.json(
        { error: 'Parâmetro "date" é obrigatório.' },
        { status: 400 }
      );
    }

    const result = await validateDate(date);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error('[API Events Validate POST] Erro:', err);
    return NextResponse.json(
      { error: err.message || 'Erro interno ao validar lista.' },
      { status: 500 }
    );
  }
}
