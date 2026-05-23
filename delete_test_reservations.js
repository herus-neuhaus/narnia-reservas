const { createClient } = require('@supabase/supabase-js');
const { loadEnvConfig } = require('@next/env');

const projectDir = process.cwd();
loadEnvConfig(projectDir);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function run() {
  const cpfs = ['09278107948', '09278108910', '092.781.079-48', '092.781.089-10'];
  console.log(`Deletando reservas para os CPFs: ${cpfs.join(', ')}...`);
  
  const { data, error } = await supabase
    .from('reservations')
    .delete()
    .in('cpf', cpfs)
    .select('id, cpf');
    
  if (error) {
    console.error('Error:', error);
  } else {
    console.log(`Foram apagadas ${data?.length || 0} reservas.`);
    if (data?.length > 0) {
      data.forEach(d => console.log(`- Apagada reserva ID: ${d.id} (CPF: ${d.cpf})`));
    }
  }
}

run();
