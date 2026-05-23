-- 1. Garante que o bucket exista e configura limites (Tamanho e Tipos permitidos)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) 
VALUES (
  'customers_photos', 
  'customers_photos', 
  true, 
  2097152, -- Limite nativo do bucket para 2MB (2 * 1024 * 1024 bytes)
  ARRAY['image/jpeg', 'image/png', 'image/jpg'] -- Restringe os tipos MIME nativamente
)
ON CONFLICT (id) DO UPDATE SET 
  public = true,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Garante que o Row Level Security está ativado nos objetos
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Limpeza de políticas que possam já existir para não conflitar na migration
DROP POLICY IF EXISTS "Permitir leitura pública de fotos" ON storage.objects;
DROP POLICY IF EXISTS "Permitir upload de fotos apenas para autenticados" ON storage.objects;
DROP POLICY IF EXISTS "Permitir update de fotos apenas para autenticados" ON storage.objects;

-- 2. POLÍTICA DE LEITURA (SELECT)
-- Qualquer usuário (mesmo anônimo/deslogado) pode ler a foto
CREATE POLICY "Permitir leitura pública de fotos"
ON storage.objects FOR SELECT
USING (bucket_id = 'customers_photos');

-- 3. POLÍTICA DE CRIAÇÃO (INSERT)
-- Apenas contas com a role 'authenticated' (receptionistas/admins) podem enviar
CREATE POLICY "Permitir upload de fotos apenas para autenticados"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'customers_photos');

-- 4. POLÍTICA DE ATUALIZAÇÃO (UPDATE)
-- Apenas contas com a role 'authenticated' podem atualizar imagens existentes
CREATE POLICY "Permitir update de fotos apenas para autenticados"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'customers_photos');
