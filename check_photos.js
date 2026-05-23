const { createClient } = require('@supabase/supabase-js');
const { loadEnvConfig } = require('@next/env');

const projectDir = process.cwd();
loadEnvConfig(projectDir);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function run() {
  const { data, error } = await supabase
    .from('customers')
    .select('id, photo')
    .not('photo', 'is', null)
    .limit(10);
    
  if (error) {
    console.error('Error:', error);
  } else {
    data.forEach(d => {
      console.log(`ID: ${d.id}, Photo: ${d.photo ? d.photo.substring(0, 30) + '...' : 'null'}`);
    });
  }
}

run();
