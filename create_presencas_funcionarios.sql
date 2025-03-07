-- Criar tabela para armazenar presenças de funcionários
CREATE TABLE IF NOT EXISTS public.presencas_funcionarios (
    id SERIAL PRIMARY KEY,
    obra_id INTEGER NOT NULL REFERENCES public.obras(id) ON DELETE CASCADE,
    funcionario_id TEXT NOT NULL,
    nome_funcionario TEXT NOT NULL,
    data DATE NOT NULL,
    presenca NUMERIC(2,1) NOT NULL DEFAULT 0, -- 0 (ausente), 0.5 (meio período), 1 (período completo)
    semana TEXT NOT NULL, -- Formato 'yyyy-MM-dd' representando o início da semana
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices para melhorar a performance das consultas
CREATE INDEX IF NOT EXISTS idx_presencas_obra_id ON public.presencas_funcionarios(obra_id);
CREATE INDEX IF NOT EXISTS idx_presencas_funcionario_id ON public.presencas_funcionarios(funcionario_id);
CREATE INDEX IF NOT EXISTS idx_presencas_semana ON public.presencas_funcionarios(semana);
CREATE INDEX IF NOT EXISTS idx_presencas_data ON public.presencas_funcionarios(data);

-- Adicionar restrição única para evitar duplicatas
ALTER TABLE public.presencas_funcionarios 
ADD CONSTRAINT unique_presenca_funcionario_data 
UNIQUE (obra_id, funcionario_id, data);

-- Configurar RLS (Row Level Security)
ALTER TABLE public.presencas_funcionarios ENABLE ROW LEVEL SECURITY;

-- Criar políticas de acesso simplificadas (sem depender de usuarios_obras)
CREATE POLICY "Permitir acesso a usuários autenticados" 
ON public.presencas_funcionarios 
FOR ALL 
TO authenticated 
USING (true);

-- Criar função para atualizar o timestamp de updated_at
CREATE OR REPLACE FUNCTION update_presencas_funcionarios_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger para atualizar o timestamp de updated_at
CREATE TRIGGER update_presencas_funcionarios_updated_at
BEFORE UPDATE ON public.presencas_funcionarios
FOR EACH ROW
EXECUTE FUNCTION update_presencas_funcionarios_updated_at(); 