import { createClient } from '@/lib/supabase/client';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function uploadCustomerPhoto(base64Image: string, identifier: string): Promise<string> {
  const supabase = createClient();
  
  // Converter base64 para Blob
  const response = await fetch(base64Image);
  const blob = await response.blob();
  
  // Gerar um nome de arquivo único
  const isWebp = base64Image.includes('image/webp');
  const ext = isWebp ? 'webp' : 'jpg';
  const contentType = isWebp ? 'image/webp' : 'image/jpeg';
  const fileName = `${identifier}-${Date.now()}.${ext}`;
  
  const MAX_RETRIES = 3;
  let lastError: any = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      // Fazer o upload para o bucket
      const { error } = await supabase.storage
        .from('customers_photos')
        .upload(fileName, blob, {
          contentType: contentType,
          upsert: true
        });
        
      if (error) {
        throw error;
      }
      
      // Se passou, podemos obter a URL pública e retornar
      const { data: publicUrlData } = supabase.storage
        .from('customers_photos')
        .getPublicUrl(fileName);
        
      return publicUrlData.publicUrl;
    } catch (err: any) {
      console.error(`Falha na tentativa ${attempt} de upload da foto:`, err);
      lastError = err;
      if (attempt < MAX_RETRIES) {
        await delay(500);
      }
    }
  }

  // Se o loop terminar, todas as tentativas falharam
  console.error('Todas as tentativas de upload falharam. Último erro:', lastError);
  throw new Error('Não foi possível fazer o upload da foto após múltiplas tentativas');
}
