import { supabase } from './supabase';
import type { Database } from '@/types/supabase';
import { format, parseISO, startOfDay } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { ptBR } from 'date-fns/locale';
import { saveReportToDrive } from './googleDrive';

export type Obra = Database['public']['Tables']['obras']['Row'];
export type NovaObra = Database['public']['Tables']['obras']['Insert'];
// Tipo personalizado sem o campo data_previsao_fim
export type ObraParaEnvio = Omit<NovaObra, 'data_previsao_fim'> & { data_previsao_fim?: string | null };
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

export async function criarObra(obra: ObraParaEnvio) {
  console.log('[DEBUG] Função criarObra chamada');
  console.log('[DEBUG] Dados para criação:', obra);
  
  try {
    // Criar uma cópia dos dados
    const dadosFormatados = { ...obra } as ObraParaEnvio;
    
    // Não remover mais o campo data_previsao_fim pois ele existe na tabela
    // Apenas logar o valor para debug
    if (dadosFormatados.data_previsao_fim !== undefined) {
      console.log('[DEBUG] Valor do campo data_previsao_fim:', dadosFormatados.data_previsao_fim);
    }
    
    console.log('[DEBUG] Dados formatados para envio:', dadosFormatados);
    
    const { data, error } = await supabase
      .from('obras')
      .insert(dadosFormatados)
      .select()
      .single();

    if (error) {
      console.error('[DEBUG] Erro do Supabase ao criar obra:', error);
      throw error;
    }
    
    console.log('[DEBUG] Obra criada com sucesso:', data);
    return data;
  } catch (error) {
    console.error('[DEBUG] Erro ao criar obra:', error);
    throw error;
  }
}

export async function atualizarObra(id: number, obra: Partial<ObraParaEnvio>) {
  console.log('[DEBUG] Função atualizarObra chamada com ID:', id);
  console.log('[DEBUG] Dados para atualização:', obra);
  
  try {
    // Criar uma cópia dos dados
    const dadosFormatados = { ...obra } as Partial<ObraParaEnvio>;
    
    // Não remover mais o campo data_previsao_fim pois ele existe na tabela
    // Apenas logar o valor para debug
    if (dadosFormatados.data_previsao_fim !== undefined) {
      console.log('[DEBUG] Valor do campo data_previsao_fim:', dadosFormatados.data_previsao_fim);
    }
    
    console.log('[DEBUG] Dados formatados para envio:', dadosFormatados);
    
    const { data, error } = await supabase
      .from('obras')
      .update(dadosFormatados)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[DEBUG] Erro do Supabase ao atualizar obra:', error);
      throw error;
    }
    
    console.log('[DEBUG] Obra atualizada com sucesso:', data);
    return data;
  } catch (error) {
    console.error('[DEBUG] Erro ao atualizar obra:', error);
    throw error;
  }
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
    
    // Determinar o bucket com base na pasta
    const bucket = pasta === 'logos' ? 'logos' : 'fotos';
    console.log('[DEBUG] Bucket selecionado:', bucket);
    
    const { data, error } = await supabase.storage
      .from(bucket)
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
      .from(bucket)
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

export const gerarRelatorioSemanal = async (obraId: number, dataInicio: string, dataFim: string, presencas: any[] = []) => {
  console.log('[DEBUG] Iniciando geração de relatório semanal...');
  console.log('[DEBUG] Parâmetros:', { obraId, dataInicio, dataFim, presencas });

  try {
    // Buscar informações da obra
    const { data: obra, error: obraError } = await supabase
      .from('obras')
      .select('*')
      .eq('id', obraId)
      .single();

    if (obraError) {
      console.error('[DEBUG] Erro ao buscar obra:', obraError);
      throw new Error('Não foi possível encontrar a obra');
    }

    if (!obra) {
      console.error('[DEBUG] Obra não encontrada');
      throw new Error('Obra não encontrada');
    }

    console.log('[DEBUG] Obra encontrada:', obra);

    // Buscar o primeiro registro do diário para obter a data de início real
    const { data: primeiroRegistro, error: erroRegistro } = await supabase
      .from('diario_obra')
      .select('data')
      .eq('obra_id', obraId)
      .order('data', { ascending: true })
      .limit(1)
      .single();

    if (erroRegistro) {
      console.error('[DEBUG] Erro ao buscar primeiro registro:', erroRegistro);
    }

    // Se encontrou o primeiro registro, usar para cálculos
    if (primeiroRegistro) {
      console.log('[DEBUG] Primeiro registro encontrado:', primeiroRegistro);
    } else {
      console.log('[DEBUG] Nenhum registro encontrado para definir a data de início');
    }

    // Buscar registros do diário para o período
    let registros;
    try {
      const { data, error: registrosError } = await supabase
        .from('diario_obra')
        .select('*')
        .eq('obra_id', obraId)
        .gte('data', dataInicio)
        .lte('data', dataFim)
        .order('data', { ascending: true });

      if (registrosError) {
        console.error('[DEBUG] Erro ao buscar registros:', registrosError);
        // Não vamos lançar o erro, apenas logar
      }

      registros = data || [];
      console.log('[DEBUG] Registros encontrados:', registros?.length || 0);
    } catch (registrosError) {
      console.error('[DEBUG] Erro ao buscar registros:', registrosError);
      registros = [];
    }

    // Verificar se há dados de presença
    console.log('[DEBUG] Dados de presença recebidos:', presencas);
    
    // Ajustar as datas para o formato correto
    const dataInicioObj = parseISO(dataInicio);
    const dataFimObj = parseISO(dataFim);
    
    // Gerar HTML do relatório
    const html = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Relatório Semanal - ${obra.nome}</title>
        <style>
          body {
            font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f9f9f9;
          }
          h1, h2, h3 {
            color: #2c3e50;
            font-weight: 600;
          }
          .header {
            text-align: center;
            margin-bottom: 40px;
            border-bottom: 1px solid #eee;
            padding-bottom: 20px;
          }
          .logo {
            max-width: 180px;
            margin-bottom: 20px;
          }
          .info-block {
            margin-bottom: 40px;
            background-color: white;
            border-radius: 8px;
            padding: 25px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.05);
          }
          .info-card {
            display: flex;
            flex-wrap: wrap;
            gap: 20px;
          }
          .info-item {
            flex: 1 1 200px;
            margin-bottom: 15px;
          }
          .info-label {
            font-size: 0.9em;
            color: #6c757d;
            margin-bottom: 5px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .info-value {
            font-size: 1.1em;
            font-weight: 500;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 10px rgba(0,0,0,0.05);
          }
          th, td {
            border: 1px solid #eee;
            padding: 12px 15px;
            text-align: left;
          }
          th {
            background-color: #f8f9fa;
            font-weight: 600;
            color: #495057;
          }
          tr:nth-child(even) {
            background-color: #f8f9fa;
          }
          .footer {
            margin-top: 50px;
            text-align: center;
            font-size: 0.9em;
            color: #777;
            border-top: 1px solid #eee;
            padding-top: 20px;
          }
          .registro {
            margin-bottom: 25px;
            padding: 20px;
            background-color: white;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.05);
          }
          .registro-data {
            font-weight: 600;
            margin-bottom: 15px;
            color: #2c3e50;
            font-size: 1.1em;
            border-bottom: 1px solid #eee;
            padding-bottom: 8px;
          }
          .registro-descricao {
            margin-bottom: 15px;
          }
          .registro-observacoes {
            font-style: italic;
            color: #555;
            background-color: #f8f9fa;
            padding: 10px;
            border-radius: 4px;
          }
          .presenca-table {
            margin-top: 30px;
          }
          .presente {
            background-color: #d4edda;
            color: #155724;
            text-align: center;
            font-weight: bold;
          }
          .ausente {
            background-color: #f8d7da;
            color: #721c24;
            text-align: center;
            font-weight: bold;
          }
          .meio-periodo {
            background-color: #fff3cd;
            color: #856404;
            text-align: center;
            font-weight: bold;
          }
          .foto-container {
            display: flex;
            flex-wrap: wrap;
            gap: 15px;
            margin-top: 20px;
          }
          .foto {
            max-width: 200px;
            border-radius: 6px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
          }
          .registro-section {
            margin-bottom: 30px;
          }
          .registro-section h4 {
            font-size: 1.2em;
            margin-bottom: 15px;
            color: #2c3e50;
            border-bottom: 1px solid #eee;
            padding-bottom: 8px;
          }
          .atividade-item {
            margin-bottom: 20px;
          }
          .atividade-separator {
            border: 0;
            height: 1px;
            background-color: #eee;
            margin: 20px 0;
          }
          .etapa-inicio {
            color: #15803d;
            background-color: #dcfce7;
            padding: 4px 8px;
            border-radius: 4px;
            display: inline-block;
            margin: 2px 0;
            font-weight: 500;
          }
          .etapa-fim {
            color: #9a3412;
            background-color: #ffedd5;
            padding: 4px 8px;
            border-radius: 4px;
            display: inline-block;
            margin: 2px 0;
            font-weight: 500;
          }
          @media print {
            body {
              padding: 0;
              font-size: 12pt;
              background-color: white;
            }
            .info-block, .registro {
              box-shadow: none;
              border: 1px solid #eee;
            }
            .no-print {
              display: none;
            }
            .page-break {
              page-break-before: always;
            }
          }
        </style>
      </head>
      <body>
        <div class="header">
          ${obra.logo_url ? `<img src="${obra.logo_url}" alt="Logo" class="logo">` : ''}
          <h1>Relatório Semanal de Obra</h1>
          <h2>${obra.nome}</h2>
          <p>Período: ${format(dataInicioObj, 'dd/MM/yyyy')} a ${format(dataFimObj, 'dd/MM/yyyy')}</p>
        </div>

        <div class="info-block">
          <div class="info-card">
            <div class="info-item">
              <div class="info-label">ENDEREÇO</div>
              <div class="info-value">${obra.endereco || 'Não informado'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">RESPONSÁVEL</div>
              <div class="info-value">${obra.responsavel || 'Não informado'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">DATA DE INÍCIO</div>
              <div class="info-value">${primeiroRegistro ? format(parseISO(primeiroRegistro.data), 'dd/MM/yyyy') : 'Não informado'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">PREVISÃO DE TÉRMINO</div>
              <div class="info-value">${obra.data_previsao_fim ? format(parseISO(obra.data_previsao_fim), 'MM/yyyy') : 'Não informado'}</div>
            </div>
          </div>
        </div>

        <div class="info-block">
          ${registros && registros.length > 0 ? `
            <div class="registro">
              <div class="registro-section">
                <h4>Atividades</h4>
                ${registros.map((registro: any) => `
                  <div class="atividade-item">
                    <div class="registro-descricao">
                      ${registro.descricao.split('\n').filter(linha => 
                        !linha.trim().startsWith('Iniciada a etapa:') && 
                        !linha.trim().startsWith('Concluída a etapa:')
                      ).join('<br>')}
                      ${registro.etapas_iniciadas && registro.etapas_iniciadas.length > 0 ? `
                        <div style="margin-top: 8px">
                          ${registro.etapas_iniciadas.map((etapa: string) => `
                            <div class="etapa-inicio">✓ Início: ${etapa}</div>
                          `).join('')}
                        </div>
                      ` : ''}
                      ${registro.etapas_concluidas && registro.etapas_concluidas.length > 0 ? `
                        <div style="margin-top: 8px">
                          ${registro.etapas_concluidas.map((etapa: string) => `
                            <div class="etapa-fim">✓ Conclusão: ${etapa}</div>
                          `).join('')}
                        </div>
                      ` : ''}
                    </div>
                    ${registro.fotos && registro.fotos.length > 0 ? `
                      <div class="foto-container">
                        ${registro.fotos.map((foto: string) => `
                          <img src="${foto}" alt="Foto da atividade" class="foto">
                        `).join('')}
                      </div>
                    ` : ''}
                  </div>
                `).join('<hr class="atividade-separator">')}
              </div>
              
              <div class="registro-section">
                <h4>Observações</h4>
                ${registros.some(r => r.observacoes && r.observacoes.trim()) ? 
                  registros
                    .filter((registro: any) => registro.observacoes && registro.observacoes.trim())
                    .map((registro: any) => `
                      <div class="registro-observacoes">
                        ${registro.observacoes.replace(/\n/g, '<br>')}
                      </div>
                    `).join('<br>') 
                  : '<p>Nenhuma observação registrada para o período.</p>'
                }
              </div>
            </div>
          ` : '<p>Nenhum registro diário encontrado para o período selecionado.</p>'}
        </div>

        ${presencas && presencas.length > 0 ? `
          <div class="info-block">
            <h3>Controle de Presença</h3>
            <table class="presenca-table">
              <tr>
                <th>Funcionário</th>
                ${presencas[0].presencas.map((p: any) => {
                  // Criar um novo objeto Date a partir da string de data
                  // Isso garante que a data seja interpretada corretamente
                  const dataObj = parseISO(p.data);
                  return `<th>${format(dataObj, 'EEE, dd/MM', { locale: ptBR })}</th>`;
                }).join('')}
              </tr>
              ${presencas.map((funcionario: any) => `
                <tr>
                  <td>${funcionario.nome}</td>
                  ${funcionario.presencas.map((p: any) => {
                    if (p.presente === 1) {
                      return `<td class="presente">Presente</td>`;
                    } else if (p.presente === 0.5) {
                      return `<td class="meio-periodo">Meio Período</td>`;
                    } else {
                      return `<td class="ausente">Ausente</td>`;
                    }
                  }).join('')}
                </tr>
              `).join('')}
            </table>
          </div>
        ` : ''}

        <div class="footer">
          <p>Relatório gerado em ${format(new Date(), 'dd/MM/yyyy HH:mm')}</p>
          <p>${obra.nome} - Todos os direitos reservados</p>
        </div>
      </body>
      </html>
    `;

    // Salvar no Google Drive
    try {
      if (html) {
        console.log('[DEBUG] Tentando salvar no Google Drive...');
        const driveUrl = await saveReportToDrive(obra.nome, dataInicio, html);
        console.log('[DEBUG] Relatório salvo no Drive:', driveUrl);
        
        // Atualizar o registro no Supabase com o link do Drive
        if (novoRelatorio) {
          const { error: updateError } = await supabase
            .from('relatorios')
            .update({ drive_url: driveUrl })
            .eq('id', novoRelatorio.id);
            
          if (updateError) {
            console.error('[DEBUG] Erro ao atualizar link do Drive no registro:', updateError);
          }
        }
      }
    } catch (driveError) {
      console.error('[DEBUG] Erro ao salvar no Drive:', driveError);
      // Não interromper o processo se falhar o salvamento no Drive
    }

    return html;
  } catch (error) {
    console.error('[DEBUG] Erro na geração do relatório:', error);
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
    console.error('[DEBUG] Erro ao excluir relatório:', error);
    throw error;
  }
};

// Funções para Diário de Obra
export const excluirRegistroDiario = async (id: number) => {
  try {
    console.log('[DEBUG] Excluindo registro do diário:', id);
    
    const { error } = await supabase
      .from('diario_obra')
      .delete()
      .eq('id', id);

    if (error) throw error;
    console.log('[DEBUG] Registro excluído com sucesso');
  } catch (error) {
    console.error('[DEBUG] Erro ao excluir registro do diário:', error);
    throw error;
  }
};

export const atualizarRegistroDiario = async (id: number, registro: {
  descricao?: string;
  observacoes?: string;
  etapas_iniciadas?: string[];
  etapas_concluidas?: string[];
  fotos?: string[];
}) => {
  try {
    console.log('[DEBUG] Atualizando registro do diário:', id);
    console.log('[DEBUG] Dados:', registro);
    
    const { data, error } = await supabase
      .from('diario_obra')
      .update(registro)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    console.log('[DEBUG] Registro atualizado com sucesso');
    return data;
  } catch (error) {
    console.error('[DEBUG] Erro ao atualizar registro do diário:', error);
    throw error;
  }
};

// Funções para Orçamentos
export const listarOrcamentos = async (obraId: number) => {
  try {
    console.log('[DEBUG] Listando orçamentos para obra:', obraId);
    
    const { data, error } = await supabase
      .from('orcamentos')
      .select('*')
      .eq('obra_id', obraId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    console.log('[DEBUG] Orçamentos encontrados:', data?.length || 0);
    return data;
  } catch (error) {
    console.error('[DEBUG] Erro ao listar orçamentos:', error);
    throw error;
  }
};

export const excluirOrcamento = async (id: number) => {
  try {
    console.log('[DEBUG] Excluindo orçamento:', id);
    
    const { error } = await supabase
      .from('orcamentos')
      .delete()
      .eq('id', id);

    if (error) throw error;
    console.log('[DEBUG] Orçamento excluído com sucesso');
  } catch (error) {
    console.error('[DEBUG] Erro ao excluir orçamento:', error);
    throw error;
  }
};