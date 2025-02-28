import { supabase } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return new Response(JSON.stringify({ error: 'Nenhum arquivo enviado' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const { data, error } = await supabase.storage
      .from('fotos')
      .upload(`diario/${fileName}`, file);

    if (error) {
      throw error;
    }

    const { data: publicUrl } = supabase.storage
      .from('fotos')
      .getPublicUrl(`diario/${fileName}`);

    return new Response(JSON.stringify({ url: publicUrl.publicUrl }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Erro no upload:', error);
    return new Response(JSON.stringify({ error: 'Erro no upload do arquivo' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
} 