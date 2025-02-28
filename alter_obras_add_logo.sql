-- Adicionar coluna logo_url na tabela obras
ALTER TABLE obras
ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Criar bucket no storage para logos se não existir
INSERT INTO storage.buckets (id, name)
VALUES ('logos', 'logos')
ON CONFLICT (id) DO NOTHING;

-- Criar política de storage para logos
CREATE POLICY "Permitir acesso público aos logos"
ON storage.objects FOR SELECT
USING ( bucket_id = 'logos' );

CREATE POLICY "Permitir upload de logos para usuários autenticados"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'logos' AND auth.role() = 'authenticated' );

CREATE POLICY "Permitir atualização de logos para usuários autenticados"
ON storage.objects FOR UPDATE
USING ( bucket_id = 'logos' AND auth.role() = 'authenticated' );

CREATE POLICY "Permitir deleção de logos para usuários autenticados"
ON storage.objects FOR DELETE
USING ( bucket_id = 'logos' AND auth.role() = 'authenticated' ); 