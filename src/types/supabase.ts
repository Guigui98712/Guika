export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      obras: {
        Row: {
          id: number
          nome: string
          endereco: string
          custo_previsto: number
          custo_real: number
          progresso: number
          status: 'pendente' | 'em_andamento' | 'concluido'
          logo_url: string | null
          cliente: string | null
          responsavel: string | null
          data_inicio: string | null
          data_previsao_fim: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['obras']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['obras']['Insert']>
      }
      funcionarios: {
        Row: {
          id: number
          nome: string
          cargo: string | null
          telefone: string | null
          email: string | null
          ativo: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['funcionarios']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['funcionarios']['Insert']>
      }
      presencas: {
        Row: {
          id: number
          obra_id: number
          funcionario_id: number
          data: string
          presente: number
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['presencas']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['presencas']['Insert']>
      }
      diario_obra: {
        Row: {
          id: number
          obra_id: number
          data: string
          descricao: string
          observacoes: string | null
          etapas_iniciadas: string[]
          etapas_concluidas: string[]
          fotos: string[]
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['diario_obra']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['diario_obra']['Insert']>
      }
      etapas_datas: {
        Row: {
          id: number
          obra_id: number
          etapa_nome: string
          data_inicio: string
          data_fim: string | null
          status: 'em_andamento' | 'concluida'
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['etapas_datas']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['etapas_datas']['Insert']>
      }
      etapas: {
        Row: {
          id: number
          obra_id: number
          nome: string
          descricao: string | null
          progresso: number
          status: 'pendente' | 'em_andamento' | 'concluido'
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['etapas']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['etapas']['Insert']>
      }
      orcamentos: {
        Row: {
          id: number
          obra_id: number
          nome: string
          descricao: string | null
          valor_total: number
          status: 'pendente' | 'aprovado' | 'rejeitado'
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['orcamentos']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['orcamentos']['Insert']>
      }
      documentos: {
        Row: {
          id: number
          obra_id: number
          nome: string
          tipo: string
          url: string
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['documentos']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['documentos']['Insert']>
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
} 