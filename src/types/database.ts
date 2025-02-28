
export interface DiarioRegistro {
  id: number;
  data: string;
  descricao: string;
  observacoes?: string;
  etapas_iniciadas?: number[];
  etapas_concluidas?: number[];
  fotos_urls: string[];
  obra_id: number;
  created_at: string;
}

export interface Relatorio {
  id: number;
  data_inicio: string;
  data_fim: string;
  obra_id: number;
  tipo: 'semanal' | 'final';
  conteudo: string;
  created_at: string;
}

export interface Database {
  public: {
    Tables: {
      obras: {
        Row: {
          id: number;
          nome: string;
          endereco: string;
          custo_previsto: number;
          custo_real: number;
          progresso: number;
          status: 'pendente' | 'em_andamento' | 'concluido';
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['obras']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['obras']['Insert']>;
      };
      etapas: {
        Row: {
          id: number;
          nome: string;
          obra_id: number;
          status: 'pendente' | 'em_andamento' | 'concluido';
          ordem: number;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['etapas']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['etapas']['Insert']>;
      };
      diario: {
        Row: DiarioRegistro;
        Insert: Omit<DiarioRegistro, 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['diario']['Insert']>;
      };
      relatorios: {
        Row: Relatorio;
        Insert: Omit<Relatorio, 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['relatorios']['Insert']>;
      };
    };
  };
}
