import { NextResponse } from 'next/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
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

    // Check if the CPF already exists in our database reservations using Admin Client
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error('Supabase URL or Service Role key is missing.');
      }

      const supabaseAdmin = createAdminClient(supabaseUrl, supabaseServiceKey);
      const { data: dbData, error: dbError } = await supabaseAdmin.rpc('get_reservations_by_cpf', { p_cpf: cleanCpf });

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
              year: parseInt(yearStr, 10),
              photo: latest.photo
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
