
export interface Empresa {
  nome: string;
  valor: number;
  observacoes: string;
  planilhaUrl: string;
  planilhaData?: any[]; // Dados da planilha convertidos
}

export interface Orcamento {
  id: number;
  nome: string;
  obraId: number;
  empresas: Empresa[];
  dataCriacao: string;
}

