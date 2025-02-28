import { supabase } from './supabase';
import type { Database } from '@/types/supabase';
import { format, parseISO, startOfDay } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';

type Obra = Database['public']['Tables']['obras']['Row'];
type NovaObra = Database['public']['Tables']['obras']['Insert'];
type Etapa = Database['public']['Tables']['etapas']['Row'];
type NovaEtapa = Database['public']['Tables']['etapas']['Insert'];
type Orcamento = Database['public']['Tables']['orcamentos']['Row'];
type NovoOrcamento = Database['public']['Tables']['orcamentos']['Insert'];

// Funções para Obras
export async function listarObras() {
  const { data, error } = await supabase
    .from('obras')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function buscarObra(id: number) {
  try {
    console.log('[DEBUG] Buscando obra:', id);
    
    const { data, error } = await supabase
      .from('obras')
      .select(`
        *,
        etapas (
          id,
          nome,
          status,
          created_at,
          obra_id
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('[DEBUG] Erro ao buscar obra:', error);
      throw error;
    }

    console.log('[DEBUG] Obra encontrada:', data);
    console.log('[DEBUG] Etapas da obra:', data?.etapas);

    // Garantir que as etapas estejam ordenadas por created_at
    if (data?.etapas) {
      data.etapas = data.etapas.sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
    }

    return data;
  } catch (error) {
    console.error('[DEBUG] Erro ao buscar obra:', error);
    throw error;
  }
}

export async function criarObra(obra: NovaObra) {
  const { data, error } = await supabase
    .from('obras')
    .insert(obra)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function atualizarObra(id: number, obra: Partial<NovaObra>) {
  const { data, error } = await supabase
    .from('obras')
    .update(obra)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function excluirObra(id: number) {
  const { error } = await supabase
    .from('obras')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// Funções para Etapas
export async function listarEtapas(obraId: number) {
  const { data, error } = await supabase
    .from('etapas')
    .select('*')
    .eq('obra_id', obraId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data;
}

export async function criarEtapa(etapa: NovaEtapa) {
  const { data, error } = await supabase
    .from('etapas')
    .insert(etapa)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function atualizarEtapa(id: number, etapa: Partial<NovaEtapa>) {
  const { data, error } = await supabase
    .from('etapas')
    .update(etapa)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Funções para upload de arquivos
export async function uploadFoto(file: File, pasta: string) {
  try {
    console.log('[DEBUG] Iniciando upload de foto:', file.name);
    console.log('[DEBUG] Pasta:', pasta);
    
    const nomeArquivo = `${Date.now()}-${file.name}`;
    console.log('[DEBUG] Nome do arquivo:', nomeArquivo);
    
    const { data, error } = await supabase.storage
      .from('fotos')
      .upload(nomeArquivo, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('[DEBUG] Erro no upload:', error);
      throw error;
    }

    console.log('[DEBUG] Upload realizado com sucesso:', data);
    
    const { data: { publicUrl } } = supabase.storage
      .from('fotos')
      .getPublicUrl(nomeArquivo);
      
    console.log('[DEBUG] URL pública gerada:', publicUrl);
    return { path: nomeArquivo, url: publicUrl };
  } catch (error) {
    console.error('[DEBUG] Erro no upload:', error);
    throw error;
  }
}

// Funções para Diário de Obra
export const listarRegistrosDiario = async (obraId: number) => {
  try {
    console.log('[DEBUG] Iniciando listagem de registros para obra:', obraId);
    
    if (!obraId) {
      throw new Error('ID da obra não fornecido');
    }

    const { data, error } = await supabase
      .from('diario_obra')
      .select('*')
      .eq('obra_id', obraId)
      .order('data', { ascending: false });

    if (error) {
      console.error('[DEBUG] Erro do Supabase ao listar:', error);
      throw error;
    }

    if (!data) {
      console.log('[DEBUG] Nenhum registro encontrado');
      return [];
    }

    // Garantir que os arrays estejam inicializados e ajustar datas para o fuso horário local
    const registrosProcessados = data.map(reg => ({
      ...reg,
      data: format(parseISO(reg.data), 'yyyy-MM-dd'),
      fotos: reg.fotos || []
    }));

    console.log('[DEBUG] Registros encontrados:', registrosProcessados.length);
    console.log('[DEBUG] Dados dos registros:', registrosProcessados);
    return registrosProcessados;
  } catch (error) {
    console.error('[DEBUG] Erro ao listar registros:', error);
    throw error;
  }
};

export const salvarRegistroDiario = async (registro: {
  obra_id: number;
  data: string;
  descricao: string;
  observacoes: string;
  fotos: string[];
}) => {
  try {
    console.log('[DEBUG] Salvando registro:', registro);

    // Formata a data diretamente
    const registroAjustado = {
      ...registro,
      data: format(parseISO(registro.data), 'yyyy-MM-dd')
    };

    console.log('[DEBUG] Registro ajustado:', registroAjustado);

    const { data, error } = await supabase
      .from('diario_obra')
      .insert([registroAjustado])
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('[DEBUG] Erro ao salvar registro:', error);
    throw error;
  }
};

export const gerarRelatorioSemanal = async (obraId: number, dataInicio: string, dataFim: string, presencas?: any[]) => {
  try {
    console.log('[DEBUG] Iniciando geração de relatório semanal:', { obraId, dataInicio, dataFim, presencas });
    
    if (!obraId) {
      console.error('[DEBUG] ID da obra não fornecido');
      throw new Error('ID da obra não fornecido');
    }
    
    // Buscar informações da obra
    const { data: obra, error: erroObra } = await supabase
      .from('obras')
      .select('*')
      .eq('id', obraId)
      .single();

    if (erroObra) {
      console.error('[DEBUG] Erro ao buscar obra:', erroObra);
      throw erroObra;
    }
    
    console.log('[DEBUG] Obra encontrada:', obra);

    // Buscar registros do período
    const { data: registros, error: erroRegistros } = await supabase
      .from('diario_obra')
      .select('*')
      .eq('obra_id', obraId)
      .gte('data', dataInicio)
      .lte('data', dataFim)
      .order('data', { ascending: true });

    if (erroRegistros) {
      console.error('[DEBUG] Erro ao buscar registros:', erroRegistros);
      throw erroRegistros;
    }
    
    console.log('[DEBUG] Registros encontrados:', registros?.length || 0);
    
    // Verificar se temos dados de presença
    let tabelaPresenca = '';
    if (presencas && presencas.length > 0) {
      console.log('[DEBUG] Dados de presença recebidos:', presencas);
      
      // Gerar tabela de presença
      tabelaPresenca = `
        <div class="secao">
          <div class="secao-titulo">Registro de Presença</div>
          <table class="tabela-presenca">
            <thead>
              <tr>
                <th>Funcionário</th>
                ${presencas[0]?.presencas?.map((p: any) => `
                  <th>${new Date(p.data).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })}</th>
                `).join('') || ''}
              </tr>
            </thead>
            <tbody>
              ${presencas.map((funcionario: any) => `
                <tr>
                  <td>${funcionario.nome}</td>
                  ${funcionario.presencas?.map((p: any) => {
                    let classe = '';
                    let texto = '';
                    
                    if (p.presente === 1) {
                      classe = 'presente';
                      texto = '1';
                    } else if (p.presente === 0.5) {
                      classe = 'meio-periodo';
                      texto = '½';
                    } else {
                      classe = 'ausente';
                      texto = '-';
                    }
                    
                    return `<td class="${classe}">${texto}</td>`;
                  }).join('') || ''}
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    } else {
      console.log('[DEBUG] Nenhum dado de presença recebido');
    }

    // Gerar HTML do relatório
    const html = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
          
          body {
            font-family: 'Inter', sans-serif;
            line-height: 1.6;
            color: #1f2937;
            margin: 0;
            padding: 0;
          }
          
          .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 2rem;
          }
          
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 3rem;
            padding-bottom: 1rem;
            border-bottom: 2px solid #e5e7eb;
          }
          
          .logo {
            max-height: 80px;
          }
          
          .obra-info {
            text-align: right;
          }
          
          .titulo {
            font-size: 24px;
            font-weight: 700;
            color: #111827;
            margin-bottom: 0.5rem;
          }
          
          .periodo {
            font-size: 16px;
            color: #6b7280;
          }
          
          .secao {
            margin-bottom: 2rem;
            padding: 1.5rem;
            background-color: #f9fafb;
            border-radius: 8px;
          }
          
          .secao-titulo {
            font-size: 18px;
            font-weight: 600;
            color: #374151;
            margin-bottom: 1rem;
          }
          
          .registro {
            background-color: white;
            padding: 1rem;
            margin-bottom: 1rem;
            border-radius: 6px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          }
          
          .registro-data {
            font-weight: 500;
            color: #4b5563;
            margin-bottom: 0.5rem;
          }
          
          .etapas-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
            gap: 1rem;
            margin-top: 1rem;
          }
          
          .etapa-item {
            background-color: #f3f4f6;
            padding: 0.5rem;
            border-radius: 4px;
            font-size: 14px;
          }
          
          .galeria {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
            gap: 1rem;
            margin-top: 1rem;
          }
          
          .foto {
            width: 100%;
            height: 150px;
            object-fit: cover;
            border-radius: 4px;
          }
          
          .progresso-info {
            display: flex;
            justify-content: space-between;
            margin-top: 2rem;
            padding: 1rem;
            background-color: #f3f4f6;
            border-radius: 6px;
          }
          
          .footer {
            margin-top: 3rem;
            padding-top: 1rem;
            border-top: 2px solid #e5e7eb;
            text-align: center;
            font-size: 14px;
            color: #6b7280;
          }
          
          .tabela-presenca {
            width: 100%;
            border-collapse: collapse;
            margin-top: 1rem;
          }
          
          .tabela-presenca th, .tabela-presenca td {
            border: 1px solid #e5e7eb;
            padding: 0.5rem;
            text-align: center;
          }
          
          .tabela-presenca th {
            background-color: #f3f4f6;
            font-weight: 600;
          }
          
          .presente {
            background-color: #d1fae5;
            color: #065f46;
          }
          
          .meio-periodo {
            background-color: #fef3c7;
            color: #92400e;
          }
          
          .ausente {
            background-color: #fee2e2;
            color: #b91c1c;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            ${obra.logo_url ? `<img src="${obra.logo_url}" alt="Logo da Obra" class="logo" />` : ''}
            <div class="obra-info">
              <div class="titulo">${obra.nome}</div>
              <div class="periodo">Relatório Semanal: ${new Date(dataInicio).toLocaleDateString()} - ${new Date(dataFim).toLocaleDateString()}</div>
            </div>
          </div>

          <div class="secao">
            <div class="secao-titulo">Resumo da Semana</div>
            <p>Progresso atual da obra: ${obra.progresso}%</p>
            <p>Endereço: ${obra.endereco}</p>
          </div>
          
          ${tabelaPresenca}

          <div class="secao">
            <div class="secao-titulo">Registros Diários</div>
            ${registros?.map(registro => `
              <div class="registro">
                <div class="registro-data">${new Date(registro.data).toLocaleDateString()}</div>
                <p>${registro.descricao}</p>
                ${registro.observacoes ? `<p><strong>Observações:</strong> ${registro.observacoes}</p>` : ''}
                
                <div class="etapas-grid">
                  ${registro.etapas_iniciadas.map(etapa => `
                    <div class="etapa-item">✦ Iniciada: ${etapa}</div>
                  `).join('')}
                  ${registro.etapas_concluidas.map(etapa => `
                    <div class="etapa-item">✓ Concluída: ${etapa}</div>
                  `).join('')}
                </div>

                ${registro.fotos.length > 0 ? `
                  <div class="galeria">
                    ${registro.fotos.map(foto => `
                      <img src="${foto}" alt="Foto do dia" class="foto">
                    `).join('')}
                  </div>
                ` : ''}
              </div>
            `).join('')}
          </div>

          <div class="footer">
            <p>Relatório gerado em ${new Date().toLocaleString()}</p>
            <p>${obra.nome} - Todos os direitos reservados</p>
          </div>
        </div>
      </body>
      </html>
    `;
    
    console.log('[DEBUG] HTML gerado com sucesso, tamanho:', html.length);
    
    // Testar criação do Blob
    try {
      const blob = new Blob([html], { type: 'text/html' });
      console.log('[DEBUG] Blob criado com sucesso, tamanho:', blob.size);
    } catch (error) {
      console.error('[DEBUG] Erro ao criar Blob:', error);
    }

    return html;
  } catch (error) {
    console.error('[DEBUG] Erro ao gerar relatório:', error);
    throw error;
  }
};

export const excluirRegistroDiario = async (id: number) => {
  try {
    const { error } = await supabase
      .from('diario_obra')
      .delete()
      .eq('id', id);

    if (error) throw error;
  } catch (error) {
    console.error('[DEBUG] Erro ao excluir registro:', error);
    throw error;
  }
};

export const atualizarRegistroDiario = async (id: number, registro: {
  data: string;
  descricao: string;
  observacoes: string;
  etapas_iniciadas?: string[];
  etapas_concluidas?: string[];
  fotos?: string[];
  obra_id: number;
}) => {
  try {
    console.log('[DEBUG] Atualizando registro:', id, registro);
    console.log('[DEBUG] Fotos a serem atualizadas:', registro.fotos);

    // Primeiro, atualizar o registro no diário
    const { data, error } = await supabase
      .from('diario_obra')
      .update({
        data: registro.data,
        descricao: registro.descricao,
        observacoes: registro.observacoes,
        etapas_iniciadas: registro.etapas_iniciadas || [],
        etapas_concluidas: registro.etapas_concluidas || [],
        fotos: registro.fotos || []
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[DEBUG] Erro ao atualizar registro:', error);
      throw error;
    }

    console.log('[DEBUG] Registro atualizado com sucesso:', data);

    // Depois, tentar atualizar etapas_datas
    if (registro.obra_id) {
      try {
        await atualizarEtapasDatas(
          registro.obra_id,
          registro.data,
          registro.etapas_iniciadas || [],
          registro.etapas_concluidas || []
        );
      } catch (etapasError) {
        // Se houver erro ao atualizar etapas, apenas logar o erro mas não impedir a atualização do registro
        console.error('[DEBUG] Erro ao atualizar etapas_datas:', etapasError);
      }
    }

    return data;
  } catch (error) {
    console.error('[DEBUG] Erro ao atualizar registro:', error);
    throw error;
  }
};

// Funções para Orçamentos
export async function listarOrcamentos() {
  const { data, error } = await supabase
    .from('orcamentos')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function buscarOrcamento(id: number) {
  const { data, error } = await supabase
    .from('orcamentos')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

export async function criarOrcamento(orcamento: NovoOrcamento) {
  const { data, error } = await supabase
    .from('orcamentos')
    .insert(orcamento)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function atualizarOrcamento(id: number, orcamento: Partial<NovoOrcamento>) {
  const { data, error } = await supabase
    .from('orcamentos')
    .update(orcamento)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function excluirOrcamento(id: number) {
  const { error } = await supabase
    .from('orcamentos')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// Funções para gerenciar etapas_datas
export const atualizarEtapasDatas = async (
  obra_id: number,
  data: string,
  etapasIniciadas: string[],
  etapasConcluidas: string[]
) => {
  try {
    console.log('Atualizando etapas:', { obra_id, data, etapasIniciadas, etapasConcluidas });

    // Atualizar etapas iniciadas
    for (const etapa of etapasIniciadas) {
      const { data: existingData, error: checkError } = await supabase
        .from('etapas_datas')
        .select('*')
        .eq('obra_id', obra_id)
        .eq('etapa_nome', etapa)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      if (!existingData) {
        const { error: insertError } = await supabase
          .from('etapas_datas')
          .insert({
            obra_id,
            etapa_nome: etapa,
            data_inicio: data,
            status: 'em_andamento'
          });

        if (insertError) throw insertError;
      } else if (existingData.status === 'pendente') {
        const { error: updateError } = await supabase
          .from('etapas_datas')
          .update({
            status: 'em_andamento',
            data_inicio: data
          })
          .eq('id', existingData.id);

        if (updateError) throw updateError;
      }
    }

    // Atualizar etapas concluídas
    for (const etapa of etapasConcluidas) {
      const { data: existingData, error: checkError } = await supabase
        .from('etapas_datas')
        .select('*')
        .eq('obra_id', obra_id)
        .eq('etapa_nome', etapa)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      const updateData = {
        status: 'concluida' as const,
        data_fim: data
      };

      if (!existingData) {
        const { error: insertError } = await supabase
          .from('etapas_datas')
          .insert({
            obra_id,
            etapa_nome: etapa,
            data_inicio: data,
            ...updateData
          });

        if (insertError) throw insertError;
      } else {
        const { error: updateError } = await supabase
          .from('etapas_datas')
          .update(updateData)
          .eq('id', existingData.id);

        if (updateError) throw updateError;
      }
    }

    // Buscar todas as etapas concluídas para calcular o progresso
    const { data: etapasConcluidas, error: countError } = await supabase
      .from('etapas_datas')
      .select('status')
      .eq('obra_id', obra_id)
      .eq('status', 'concluida');

    if (countError) throw countError;

    // Calcular e atualizar o progresso
    const TOTAL_ETAPAS = 22;
    const progresso = Math.round((etapasConcluidas?.length || 0) * 100 / TOTAL_ETAPAS);

    const { error: progressError } = await supabase
      .from('obras')
      .update({ progresso })
      .eq('id', obra_id);

    if (progressError) throw progressError;

    console.log('Etapas atualizadas com sucesso. Novo progresso:', progresso);
    return { success: true, progresso };

  } catch (error) {
    console.error('Erro ao atualizar etapas:', error);
    throw error;
  }
};

async function verificarECriarTabelaEtapasDatas() {
  try {
    // Verifica se a tabela existe
    const { data: existingTable, error: checkError } = await supabase
      .from('etapas_datas')
      .select('id')
      .limit(1);

    if (checkError) {
      // Se houver erro, provavelmente a tabela não existe
      const { error: createError } = await supabase.rpc('criar_tabela_etapas_datas');
      if (createError) throw createError;
      console.log('Tabela etapas_datas criada com sucesso');
    }
  } catch (error) {
    console.error('Erro ao verificar/criar tabela etapas_datas:', error);
  }
}

// Chamar a função quando o módulo for carregado
verificarECriarTabelaEtapasDatas();

export const limparDiariosAntigos = async () => {
  try {
    const tresMesesAtras = new Date();
    tresMesesAtras.setMonth(tresMesesAtras.getMonth() - 3);

    // Primeiro, busca os IDs dos diários que já estão em relatórios
    const { data: relatorios, error: erroRelatorios } = await supabase
      .from('relatorios')
      .select('data_inicio, data_fim');

    if (erroRelatorios) throw erroRelatorios;

    // Cria um array com todas as datas cobertas pelos relatórios
    const datasRelatorios = relatorios?.flatMap(rel => {
      const datas = [];
      const dataInicio = new Date(rel.data_inicio);
      const dataFim = new Date(rel.data_fim);
      
      for (let d = new Date(dataInicio); d <= dataFim; d.setDate(d.getDate() + 1)) {
        datas.push(new Date(d).toISOString().split('T')[0]);
      }
      return datas;
    }) || [];

    // Deleta diários antigos que já estão em relatórios
    const { error: erroDelete } = await supabase
      .from('diario_obra')
      .delete()
      .lt('data', tresMesesAtras.toISOString())
      .in('data', datasRelatorios);

    if (erroDelete) throw erroDelete;

    console.log('Limpeza de diários antigos concluída com sucesso');
  } catch (error) {
    console.error('Erro ao limpar diários antigos:', error);
    throw error;
  }
};

export const excluirRelatorio = async (id: number) => {
  try {
    const { error } = await supabase
      .from('relatorios')
      .delete()
      .eq('id', id);

    if (error) throw error;
  } catch (error) {
    console.error('Erro ao excluir relatório:', error);
    throw error;
  }
}; 