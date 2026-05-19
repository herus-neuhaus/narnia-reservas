import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ cpf: string }> }
) {
  try {
    const { cpf } = await params;
    const cleanCpf = cpf.replace(/\D/g, '');

    if (cleanCpf.length !== 11) {
      return NextResponse.json(
        { success: false, error: 'CPF com formato inválido. Deve conter 11 dígitos.' },
        { status: 200 }
      );
    }

    // 1. Check if the CPF already exists in our database reservations
    try {
      const supabase = await createClient();
      const { data: dbData, error: dbError } = await supabase.rpc('get_reservations_by_cpf', { p_cpf: cleanCpf });

      if (!dbError && dbData && dbData.length > 0) {
        const latest = dbData[0];
        if (latest.name && latest.birth_date) {
          const [yearStr, monthStr, dayStr] = latest.birth_date.split('-');
          const birthDateFormatted = `${dayStr}/${monthStr}/${yearStr}`;
          
          console.log(`CPF ${cleanCpf} found in database. Returning cached registration info.`);
          return NextResponse.json({
            success: true,
            data: {
              cpf: cleanCpf,
              name: latest.name,
              nameUpper: latest.name.toUpperCase(),
              gender: null,
              birthDate: birthDateFormatted,
              day: parseInt(dayStr, 10),
              month: parseInt(monthStr, 10),
              year: parseInt(yearStr, 10)
            }
          });
        }
      }
    } catch (dbErr) {
      console.error('Database pre-lookup error (falling back to API):', dbErr);
    }

    const apiKey = process.env.CPFHUB_API_KEY;
    if (!apiKey) {
      console.error('CPFHUB_API_KEY is not defined in environment variables.');
      return NextResponse.json(
        { success: false, error: 'API Key do CPFHub não configurada no servidor.' },
        { status: 200 }
      );
    }

    // Call CPFHub.io API
    // Correct URL format from documentation: https://api.cpfhub.io/cpf/{cpf}
    const apiUrl = `https://api.cpfhub.io/cpf/${cleanCpf}`;
    console.log(`Querying CPFHub.io API for CPF: ${cleanCpf}`);
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'x-api-key': apiKey,
        'Accept': 'application/json',
      },
    });

    if (response.status === 404) {
      return NextResponse.json(
        { success: false, error: 'CPF não cadastrado ou não encontrado.' },
        { status: 200 }
      );
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`CPFHub.io API error [Status ${response.status}]:`, errorText);
      return NextResponse.json(
        { success: false, error: `Erro na consulta do CPF: status ${response.status}` },
        { status: 200 }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('CPFHub.io API integration unexpected error:', error);
    return NextResponse.json(
      { success: false, error: 'Ocorreu um erro interno ao processar a consulta do CPF.' },
      { status: 200 }
    );
  }
}
