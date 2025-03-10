-- Script para resetar e recriar a estrutura do banco de dados
-- Este script irá:
-- 1. Desativar o RLS (Row Level Security) para todas as tabelas
-- 2. Remover todas as políticas de segurança
-- 3. Remover todas as tabelas existentes
-- 4. Recriar as tabelas com a estrutura correta

-- Desativar RLS para todas as tabelas
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public')
    LOOP
        EXECUTE format('ALTER TABLE public.%I DISABLE ROW LEVEL SECURITY;', r.tablename);
    END LOOP;
END $$;

-- Remover todas as políticas de segurança
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT 
            tablename, 
            policyname 
        FROM 
            pg_policies 
        WHERE 
            schemaname = 'public'
    )
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', r.policyname, r.tablename);
    END LOOP;
END $$;

-- Remover todas as tabelas existentes
DROP TABLE IF EXISTS public.pendencias CASCADE;
DROP TABLE IF EXISTS public.relatorios CASCADE;
DROP TABLE IF EXISTS public.diario_obra CASCADE;
DROP TABLE IF EXISTS public.orcamentos CASCADE;
DROP TABLE IF EXISTS public.presencas CASCADE;
DROP TABLE IF EXISTS public.funcionarios CASCADE;
DROP TABLE IF EXISTS public.etapas CASCADE;
DROP TABLE IF EXISTS public.obras CASCADE;
DROP TABLE IF EXISTS public.trello_cards CASCADE;
DROP TABLE IF EXISTS public.trello_lists CASCADE;
DROP TABLE IF EXISTS public.trello_boards CASCADE;

-- Recriar as tabelas com a estrutura correta

-- Tabela de obras
CREATE TABLE public.obras (
  id SERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  endereco TEXT,
  custo_previsto DECIMAL(10, 2) DEFAULT 0,
  custo_real DECIMAL(10, 2) DEFAULT 0,
  progresso INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pendente',
  logo_url TEXT,
  cliente TEXT,
  responsavel TEXT,
  data_inicio DATE,
  data_previsao_fim DATE,
  trello_board_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de funcionários
CREATE TABLE public.funcionarios (
  id SERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  cargo TEXT,
  telefone TEXT,
  email TEXT,
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de presenças
CREATE TABLE public.presencas (
  id SERIAL PRIMARY KEY,
  obra_id INTEGER REFERENCES public.obras(id),
  funcionario_id INTEGER REFERENCES public.funcionarios(id),
  data DATE NOT NULL,
  presente BOOLEAN DEFAULT TRUE,
  observacao TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de etapas
CREATE TABLE public.etapas (
  id SERIAL PRIMARY KEY,
  obra_id INTEGER REFERENCES public.obras(id),
  nome TEXT NOT NULL,
  descricao TEXT,
  data_inicio DATE,
  data_fim DATE,
  progresso INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pendente',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de orçamentos
CREATE TABLE public.orcamentos (
  id SERIAL PRIMARY KEY,
  obra_id INTEGER REFERENCES public.obras(id),
  descricao TEXT NOT NULL,
  valor DECIMAL(10, 2) NOT NULL,
  data DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de diário de obra
CREATE TABLE public.diario_obra (
  id SERIAL PRIMARY KEY,
  obra_id INTEGER REFERENCES public.obras(id),
  data DATE NOT NULL,
  descricao TEXT NOT NULL,
  clima TEXT,
  equipe_presente INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de relatórios
CREATE TABLE public.relatorios (
  id SERIAL PRIMARY KEY,
  obra_id INTEGER REFERENCES public.obras(id),
  data DATE NOT NULL,
  tipo TEXT NOT NULL,
  conteudo TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de pendências
CREATE TABLE public.pendencias (
  id SERIAL PRIMARY KEY,
  obra_id INTEGER REFERENCES public.obras(id),
  descricao TEXT NOT NULL,
  status TEXT DEFAULT 'pendente',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabelas para o Trello
CREATE TABLE public.trello_boards (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  obra_id INTEGER REFERENCES public.obras(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.trello_lists (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  board_id TEXT REFERENCES public.trello_boards(id),
  position FLOAT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.trello_cards (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  list_id TEXT REFERENCES public.trello_lists(id),
  position FLOAT,
  due_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Função para atualizar o timestamp de updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger para atualizar updated_at em todas as tabelas
CREATE TRIGGER update_obras_updated_at
BEFORE UPDATE ON public.obras
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_funcionarios_updated_at
BEFORE UPDATE ON public.funcionarios
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_presencas_updated_at
BEFORE UPDATE ON public.presencas
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_etapas_updated_at
BEFORE UPDATE ON public.etapas
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_orcamentos_updated_at
BEFORE UPDATE ON public.orcamentos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_diario_obra_updated_at
BEFORE UPDATE ON public.diario_obra
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_relatorios_updated_at
BEFORE UPDATE ON public.relatorios
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pendencias_updated_at
BEFORE UPDATE ON public.pendencias
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_trello_boards_updated_at
BEFORE UPDATE ON public.trello_boards
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_trello_lists_updated_at
BEFORE UPDATE ON public.trello_lists
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_trello_cards_updated_at
BEFORE UPDATE ON public.trello_cards
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir alguns dados de exemplo
INSERT INTO public.obras (nome, endereco, status, cliente, responsavel)
VALUES 
  ('Residencial Parque das Flores', 'Rua das Flores, 123', 'em_andamento', 'João Silva', 'Maria Oliveira'),
  ('Edifício Comercial Centro', 'Av. Paulista, 1000', 'pendente', 'Empresa XYZ', 'Carlos Santos');

INSERT INTO public.funcionarios (nome, cargo, telefone, email)
VALUES 
  ('José Pereira', 'Pedreiro', '(11) 98765-4321', 'jose@exemplo.com'),
  ('Ana Costa', 'Engenheira', '(11) 91234-5678', 'ana@exemplo.com');

-- Habilitar RLS para todas as tabelas
ALTER TABLE public.obras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.funcionarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.presencas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.etapas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orcamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diario_obra ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.relatorios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pendencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trello_boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trello_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trello_cards ENABLE ROW LEVEL SECURITY;

-- Criar políticas de segurança para permitir acesso a usuários autenticados
CREATE POLICY "Permitir acesso a usuários autenticados" ON public.obras
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Permitir acesso a usuários autenticados" ON public.funcionarios
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Permitir acesso a usuários autenticados" ON public.presencas
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Permitir acesso a usuários autenticados" ON public.etapas
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Permitir acesso a usuários autenticados" ON public.orcamentos
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Permitir acesso a usuários autenticados" ON public.diario_obra
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Permitir acesso a usuários autenticados" ON public.relatorios
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Permitir acesso a usuários autenticados" ON public.pendencias
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Permitir acesso a usuários autenticados" ON public.trello_boards
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Permitir acesso a usuários autenticados" ON public.trello_lists
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Permitir acesso a usuários autenticados" ON public.trello_cards
  FOR ALL USING (auth.role() = 'authenticated'); 