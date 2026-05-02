-- Criar bucket para avatares se não existir
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Remover políticas antigas se existirem
DROP POLICY IF EXISTS "Avatar Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;

-- Políticas de acesso para o bucket avatars (STORAGE_EXPOSURE Prevention)
-- Qualquer um pode ver avatares (público)
CREATE POLICY "Avatar Public Access" ON storage.objects FOR SELECT 
USING (bucket_id = 'avatars');

-- Apenas usuários autenticados podem subir arquivos em sua própria pasta
CREATE POLICY "Users can upload their own avatar" ON storage.objects FOR INSERT 
WITH CHECK (
    bucket_id = 'avatars' AND 
    (auth.uid())::text = (storage.foldername(name))[1]
);

-- Usuários podem atualizar seus próprios arquivos
CREATE POLICY "Users can update their own avatar" ON storage.objects FOR UPDATE 
USING (
    bucket_id = 'avatars' AND 
    (auth.uid())::text = (storage.foldername(name))[1]
);

-- Usuários podem deletar seus próprios arquivos
CREATE POLICY "Users can delete their own avatar" ON storage.objects FOR DELETE 
USING (
    bucket_id = 'avatars' AND 
    (auth.uid())::text = (storage.foldername(name))[1]
);
