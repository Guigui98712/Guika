export interface ChecklistItem {
  id: number;
  item: string;
  concluido: boolean;
}

export interface SubEtapa {
  id: number;
  nome: string;
  status: 'pendente' | 'em_andamento' | 'concluido';
  observacoes: string;
  checklist: ChecklistItem[];
  custo: number;
}

export interface Etapa {
  id: number;
  obra_id: number;
  nome: string;
  descricao: string | null;
  progresso: number;
  status: 'pendente' | 'em_andamento' | 'concluido';
  created_at: string;
  updated_at: string;
  subetapas: SubEtapa[];
}

export interface Obra {
  id: number;
  nome: string;
  endereco: string;
  custo_previsto: number;
  custo_real: number;
  progresso: number;
  status: 'pendente' | 'em_andamento' | 'concluido';
  created_at: string;
  updated_at: string;
  etapas?: Etapa[];
  logo_url?: string | null;
  cliente?: string | null;
  responsavel?: string | null;
  data_previsao_fim?: string | null;
  data_inicio?: string | null;
}

export interface RegistroDiario {
  id: number;
  obra_id: number;
  data: string;
  descricao: string;
  observacoes: string;
  etapas_iniciadas: string[];
  etapas_concluidas: string[];
  fotos: string[];
}

export interface RelatorioSemanal {
  dataInicio: string;
  dataFim: string;
  registrosDiarios: RegistroDiario[];
  etapasIniciadas: string[];
  etapasConcluidas: string[];
  observacoes: string[];
}
