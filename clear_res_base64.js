const { createClient } = require('@supabase/supabase-js');
const { loadEnvConfig } = require('@next/env');

const projectDir = process.cwd();
loadEnvConfig(projectDir);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function run() {
  console.log('Cleaning up base64 photos from reservations...');
  const { data, error } = await supabase
    .from('reservations')
    .update({ photo: null })
    .like('photo', 'data:image%')
    .select('id');
    
  if (error) {
    console.error('Error:', error);
  } else {
    console.log(`Successfully cleared base64 photos from ${data?.length || 0} reservations.`);
  }
}

run();
