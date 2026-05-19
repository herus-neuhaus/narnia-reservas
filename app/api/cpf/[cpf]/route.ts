import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cpf } from 'cpf-cnpj-validator';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ cpf: string }> }
) {
  try {
    const { cpf: rawCpf } = await params;
    const cleanCpf = rawCpf.replace(/\D/g, '');

    // Validate CPF using library
    if (!cpf.isValid(cleanCpf)) {
      return NextResponse.json(
        { success: false, error: 'CPF inválido.' },
        { status: 200 }
      );
    }

    // Check if the CPF already exists in our database reservations
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
      console.error('Database lookup error:', dbErr);
    }

    return NextResponse.json(
      { success: false, error: 'CPF válido, mas não possui cadastro prévio no banco de dados.' },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('CPF lookup unexpected error:', error);
    return NextResponse.json(
      { success: false, error: 'Ocorreu um erro interno ao processar a consulta do CPF.' },
      { status: 200 }
    );
  }
}
