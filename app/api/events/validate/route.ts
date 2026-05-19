import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

async function validateDate(date: string, cpf?: string | null) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // 1. Check if the CPF already has an active reservation for this date
  if (cpf) {
    const cleanCpf = cpf.replace(/\D/g, '');
    const formattedCpf = cleanCpf.length === 11 
      ? `${cleanCpf.slice(0, 3)}.${cleanCpf.slice(3, 6)}.${cleanCpf.slice(6, 9)}-${cleanCpf.slice(9, 11)}`
      : cpf;

    const { data: existingReservation, error: dupError } = await supabase
      .from('reservations')
      .select('id')
      .or(`cpf.eq."${cleanCpf}",cpf.eq."${formattedCpf}"`)
      .eq('reservation_date', date)
      .neq('status', 'cancelled')
      .maybeSingle();

    if (dupError) {
      throw dupError;
    }

    if (existingReservation) {
      return {
        allowed: false,
        error: 'CPF_DUPLICATE',
        reason: 'Este CPF já foi adicionado à lista para este evento neste dia.',
        currentCount: 0,
        capacity: 0
      };
    }
  }

  // 2. Fetch the event details for the given date
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

  // 3. Count current active guest list reservations on that day
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

  // 4. Check if list has reached capacity
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
    const cpf = searchParams.get('cpf');

    if (!date) {
      return NextResponse.json(
        { error: 'Parâmetro "date" é obrigatório.' },
        { status: 400 }
      );
    }

    const result = await validateDate(date, cpf);
    if (result.error === 'CPF_DUPLICATE') {
      return NextResponse.json(
        { error: 'CPF_DUPLICATE', message: result.reason },
        { status: 400 }
      );
    }
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
    const cpf = body.cpf;

    if (!date) {
      return NextResponse.json(
        { error: 'Parâmetro "date" é obrigatório.' },
        { status: 400 }
      );
    }

    const result = await validateDate(date, cpf);
    if (result.error === 'CPF_DUPLICATE') {
      return NextResponse.json(
        { error: 'CPF_DUPLICATE', message: result.reason },
        { status: 400 }
      );
    }
    return NextResponse.json(result);
  } catch (err: any) {
    console.error('[API Events Validate POST] Erro:', err);
    return NextResponse.json(
      { error: err.message || 'Erro interno ao validar lista.' },
      { status: 500 }
    );
  }
}
