import { supabase } from './supabase';
import type { Database } from '@/types/supabase';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { RegistroDiario } from '@/types/obra';
import { createClient } from '@supabase/supabase-js';
import { differenceInDays } from 'date-fns';
import { obterQuadroObra } from './trello-local';

export type Obra = Database['public']['Tables']['obras']['Row'];
export type NovaObra = Database['public']['Tables']['obras']['Insert'];
// Tipo personalizado sem o campo data_previsao_fim
export type ObraParaEnvio = Omit<NovaObra, 'data_previsao_fim'> & { data_previsao_fim?: string | null };
export type Etapa = Database['public']['Tables']['etapas']['Row'];
type NovaEtapa = Database['public']['Tables']['etapas']['Insert'];
type Orcamento = Database['public']['Tables']['orcamentos']['Row'];
type NovoOrcamento = Database['public']['Tables']['orcamentos']['Insert'];

// Funções para Obras
export const listarObras = async () => {
  try {
    // Obter o usuário atual
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    
    console.log('[DEBUG] Listando obras para o usuário:', userId);
    
    let query = supabase
      .from('obras')
      .select('*')
      .order('created_at', { ascending: false });
    
    // Se estiver autenticado, filtrar por user_id
    if (userId) {
      query = query.eq('user_id', userId);
    }
    
    const { data, error } = await query;

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Erro ao listar obras:', error);
    throw error;
  }
};

export const buscarObra = async (id: number) => {
  try {
    const { data, error } = await supabase
      .from('obras')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Erro ao buscar obra:', error);
    throw error;
  }
};

export const criarObra = async (obra: ObraParaEnvio) => {
  try {
    // Obter o usuário atual
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    
    if (!userId) {
      throw new Error('Usuário não autenticado');
    }
    
    console.log('[DEBUG] Criando obra para o usuário:', userId);
    
    // Adicionar o user_id à obra
    const obraComUserId = {
      ...obra,
      user_id: userId
    };
    
    const { data, error } = await supabase
      .from('obras')
      .insert([obraComUserId])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Erro ao criar obra:', error);
    throw error;
  }
};

export const atualizarObra = async (id: number, obra: Partial<Obra>) => {
  try {
    const { data, error } = await supabase
      .from('obras')
      .update(obra)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Erro ao atualizar obra:', error);
    throw error;
  }
};

export const excluirObra = async (id: number) => {
  try {
    const { error } = await supabase
      .from('obras')
      .delete()
      .eq('id', id);

    if (error) throw error;
  } catch (error) {
    console.error('Erro ao excluir obra:', error);
    throw error;
  }
};

// Funções para Etapas
export const listarEtapas = async (obraId: number) => {
  try {
    const { data, error } = await supabase
      .from('etapas')
      .select('*')
      .eq('obra_id', obraId)
      .order('ordem', { ascending: true });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Erro ao listar etapas:', error);
    throw error;
  }
};

export const criarEtapa = async (etapa: Partial<Etapa>) => {
  try {
    const { data, error } = await supabase
      .from('etapas')
      .insert([etapa])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Erro ao criar etapa:', error);
    throw error;
  }
};

export const atualizarEtapa = async (id: number, etapa: Partial<Etapa>) => {
  try {
    const { data, error } = await supabase
      .from('etapas')
      .update(etapa)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Erro ao atualizar etapa:', error);
    throw error;
  }
};

// Função para upload de fotos
export const uploadFoto = async (file: File) => {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `fotos/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('obra-tracker')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from('obra-tracker')
      .getPublicUrl(filePath);

    return data.publicUrl;
  } catch (error) {
    console.error('Erro ao fazer upload da foto:', error);
    throw error;
  }
};

// Funções para Registros Diários
export const listarRegistrosDiario = async (obraId: number) => {
  try {
    const { data, error } = await supabase
      .from('diario_obra')
      .select('*')
      .eq('obra_id', obraId)
      .order('data', { ascending: false });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Erro ao listar registros diários:', error);
    throw error;
  }
};

export const salvarRegistroDiario = async (registro: Partial<RegistroDiario>) => {
  try {
    console.log('[API] Tentando salvar registro diário:', JSON.stringify(registro, null, 2));
    
    // Verificar se os campos obrigatórios estão presentes
    if (!registro.obra_id) {
      throw new Error('Campo obra_id é obrigatório');
    }
    if (!registro.data) {
      throw new Error('Campo data é obrigatório');
    }
    if (!registro.descricao) {
      throw new Error('Campo descricao é obrigatório');
    }
    
    // Criar um objeto com apenas os campos básicos garantidos
    const registroBasico = {
      obra_id: registro.obra_id,
      data: registro.data,
      descricao: registro.descricao,
      observacoes: registro.observacoes || null
    };
    
    try {
      // Primeiro, tentar inserir com todos os campos
      const { data, error } = await supabase
        .from('diario_obra')
        .insert([registro])
        .select()
        .single();

      if (error) {
        console.error('[API] Erro do Supabase ao salvar registro diário completo:', error);
        
        // Se falhar, tentar inserir apenas com os campos básicos
        console.log('[API] Tentando salvar apenas campos básicos:', registroBasico);
        const { data: dataBasico, error: errorBasico } = await supabase
          .from('diario_obra')
          .insert([registroBasico])
          .select()
          .single();
          
        if (errorBasico) {
          console.error('[API] Erro do Supabase ao salvar registro básico:', errorBasico);
          throw errorBasico;
        }
        
        console.log('[API] Registro diário básico salvo com sucesso:', dataBasico);
        return dataBasico;
      }
      
      console.log('[API] Registro diário completo salvo com sucesso:', data);
      return data;
    } catch (error) {
      console.error('[API] Erro do Supabase ao salvar registro diário:', error);
      throw error;
    }
  } catch (error) {
    console.error('[API] Erro ao salvar registro diário:', error);
    throw error;
  }
};

export const atualizarRegistroDiario = async (id: number, registro: Partial<RegistroDiario>) => {
  try {
    const { data, error } = await supabase
      .from('diario_obra')
      .update(registro)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Erro ao atualizar registro diário:', error);
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
    console.error('Erro ao excluir registro diário:', error);
    throw error;
  }
};

// Função para gerar relatório semanal
export const gerarRelatorioSemanal = async (obraId: number, dataInicio: string, dataFim: string, presencas: any[] = []) => {
  // Versão atualizada: inclui atividades, pendências e etapas em andamento
  console.log('[DEBUG] Iniciando geração de relatório semanal (versão atualizada)...');
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

    // Buscar o primeiro registro do diário
    const { data: primeiroRegistro, error: erroRegistro } = await supabase
      .from('diario_obra')
      .select('data')
      .eq('obra_id', obraId)
      .order('data', { ascending: true })
      .limit(1)
      .single();

    // Buscar registros do período
    const { data: registros = [], error: registrosError } = await supabase
      .from('diario_obra')
      .select('*')
      .eq('obra_id', obraId)
      .gte('data', dataInicio)
      .lte('data', dataFim)
      .order('data', { ascending: true });

    if (registrosError) {
      console.error('[DEBUG] Erro ao buscar registros:', registrosError);
    }

    console.log('[DEBUG] Registros encontrados:', registros.length);
    console.log('[DEBUG] Registros:', registros);

    // Buscar pendências da obra (quadro Trello)
    let pendencias = { lists: [] };
    try {
      pendencias = await obterQuadroObra(obraId);
      console.log('[DEBUG] Pendências encontradas:', pendencias);
    } catch (error) {
      console.error('[DEBUG] Erro ao buscar pendências:', error);
    }

    // Buscar etapas em andamento
    const etapasEmAndamento = [];
    const etapasConcluidas = [];
    const etapasInfo = new Map();

    try {
      // Buscar todos os registros do diário para análise de etapas
      const { data: todosRegistros = [] } = await supabase
        .from('diario_obra')
        .select('data, etapas_iniciadas, etapas_concluidas')
        .eq('obra_id', obraId)
        .order('data', { ascending: true });

      // Processar etapas iniciadas e concluídas
      todosRegistros.forEach(registro => {
        const data = registro.data;
        
        // Registrar etapas iniciadas
        registro.etapas_iniciadas?.forEach(etapa => {
          if (!etapasInfo.has(etapa)) {
            etapasInfo.set(etapa, {
              nome: etapa,
              data_inicio: data,
              status: 'em_andamento'
            });
          }
        });
        
        // Registrar etapas concluídas
        registro.etapas_concluidas?.forEach(etapa => {
          const info = etapasInfo.get(etapa);
          if (info) {
            info.data_fim = data;
            info.status = 'concluida';
          }
        });
      });

      // Separar etapas em andamento e concluídas
      etapasInfo.forEach(info => {
        if (info.status === 'em_andamento') {
          etapasEmAndamento.push(info);
        } else {
          etapasConcluidas.push(info);
        }
      });

      console.log('[DEBUG] Etapas em andamento:', etapasEmAndamento);
      console.log('[DEBUG] Etapas concluídas:', etapasConcluidas);
    } catch (error) {
      console.error('[DEBUG] Erro ao processar etapas:', error);
    }

    // Ajustar as datas
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
          @page {
            margin: 15mm;
            size: A4;
          }
          body {
            font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            line-height: 1.4;
            color: #333;
            margin: 0;
            padding: 0;
            background-color: white;
            font-size: 11pt;
          }
          .container {
            max-width: 100%;
            margin: 0 auto;
          }
          h1, h2, h3 {
            color: #2c3e50;
            font-weight: 600;
            margin: 0;
            padding: 0;
          }
          h1 { font-size: 18pt; }
          h2 { font-size: 16pt; }
          h3 { 
            font-size: 14pt;
            margin-bottom: 8px;
          }
          .header {
            text-align: center;
            margin-bottom: 15px;
            border-bottom: 1px solid #eee;
            padding-bottom: 10px;
          }
          .header p {
            margin: 5px 0 0 0;
          }
          .info-block {
            margin-bottom: 15px;
            background-color: white;
            border: 1px solid #eee;
            border-radius: 4px;
            padding: 12px;
            page-break-inside: avoid;
            break-inside: avoid;
          }
          .info-card {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 10px;
            width: 100%;
          }
          .info-item {
            padding: 8px;
            border: 1px solid #eee;
            border-radius: 4px;
          }
          .info-label {
            font-size: 0.9em;
            color: #6c757d;
            margin-bottom: 2px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .info-value {
            font-size: 1em;
            font-weight: 500;
          }
          .atividade-item {
            margin-bottom: 8px;
            padding-bottom: 8px;
            border-bottom: 1px solid #eee;
          }
          .registro-descricao {
            margin: 5px 0;
            font-size: 0.95em;
            line-height: 1.3;
          }
          .foto-container {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
            gap: 10px;
            margin-top: 10px;
          }
          .foto {
            width: 100%;
            height: auto;
            border-radius: 4px;
          }
          @media print {
            body {
              background-color: white;
            }
            .info-block {
              break-inside: avoid;
            }
            .atividade-item {
              break-inside: avoid;
            }
            .foto-container {
              break-inside: avoid;
            }
          }
          .etapa-inicio {
            color: #15803d;
            background-color: #dcfce7;
            padding: 8px 12px;
            margin: 4px 0;
            font-size: 1.1em;
            display: flex;
            align-items: center;
            justify-content: flex-start;
            min-height: 40px;
            line-height: 1.2;
            border-radius: 4px;
            font-weight: 500;
          }
          .etapa-fim {
            color: #9a3412;
            background-color: #ffedd5;
            padding: 8px 12px;
            margin: 4px 0;
            font-size: 1.1em;
            display: flex;
            align-items: center;
            justify-content: flex-start;
            min-height: 40px;
            line-height: 1.2;
            border-radius: 4px;
            font-weight: 500;
          }
          .presenca-table {
            margin-top: 10px;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            display: table;
            width: 100%;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 15px;
            border-radius: 4px;
            overflow: hidden;
            border: 1px solid #eee;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          th, td {
            border: 1px solid #eee;
            padding: 8px;
            text-align: left;
            font-size: 0.9em;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .footer {
            margin-top: 30px;
            text-align: center;
            font-size: 0.8em;
            color: #777;
            border-top: 1px solid #eee;
            padding-top: 15px;
            padding-bottom: 15px;
            page-break-inside: avoid;
            break-inside: avoid;
          }
          .footer p {
            margin: 5px 0;
          }
          .registro-observacoes {
            font-style: italic;
            color: #555;
            background-color: #f8f9fa;
            padding: 8px;
            border-radius: 4px;
            font-size: 0.9em;
            margin-bottom: 8px;
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
          .pendencia-item {
            margin-bottom: 8px;
            padding: 8px;
            border-radius: 4px;
            background-color: #f8f9fa;
          }
          .pendencia-titulo {
            font-weight: 600;
            margin-bottom: 4px;
          }
          .pendencia-descricao {
            font-size: 0.9em;
            color: #555;
          }
          .etapa-andamento {
            background-color: #e9f5fe;
            color: #0369a1;
            padding: 8px 12px;
            margin: 4px 0;
            font-size: 1.1em;
            border-radius: 4px;
            font-weight: 500;
          }
          .data-inicio {
            font-size: 0.8em;
            color: #555;
            margin-top: 2px;
          }
          .lista-titulo {
            font-weight: 600;
            color: #333;
            margin-top: 12px;
            margin-bottom: 8px;
            padding-bottom: 4px;
            border-bottom: 1px solid #eee;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Relatório Semanal de Obra</h1>
            <h2>${obra.nome}</h2>
            <p>Período: ${format(dataInicioObj, 'dd/MM/yyyy')} a ${format(dataFimObj, 'dd/MM/yyyy')}</p>
          </div>

          <div class="content">
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
              <h3>Atividades Realizadas</h3>
              <div class="atividades-container">
                ${registros.length > 0 ? registros.map((registro) => {
                  const dataFormatada = format(parseISO(registro.data), 'dd/MM/yyyy (EEEE)', { locale: ptBR });
                  const descricaoLinhas = registro.descricao
                    .split('\n')
                    .filter(linha => 
                      !linha.trim().startsWith('Iniciada a etapa:') && 
                      !linha.trim().startsWith('Concluída a etapa:')
                    );
                  
                  return `
                    <div class="atividade-item">
                      <div style="font-weight: 600; color: #0369a1; margin-bottom: 5px;">${dataFormatada}</div>
                      <div class="registro-descricao">
                        ${descricaoLinhas.join('<br>')}
                        
                        ${registro.etapas_iniciadas?.length ? `
                          <div style="margin-top: 8px">
                            ${registro.etapas_iniciadas.map(etapa => 
                              `<div class="etapa-inicio">Etapa iniciada: ${etapa}</div>`
                            ).join('')}
                          </div>
                        ` : ''}
                        
                        ${registro.etapas_concluidas?.length ? `
                          <div style="margin-top: 8px">
                            ${registro.etapas_concluidas.map(etapa => 
                              `<div class="etapa-fim">Etapa concluída: ${etapa}</div>`
                            ).join('')}
                          </div>
                        ` : ''}
                      </div>
                      
                      ${registro.fotos?.length ? `
                        <div class="foto-container">
                          ${registro.fotos.map(foto => 
                            `<img src="${foto}" alt="Foto da atividade" class="foto" onerror="this.style.display='none'">`
                          ).join('')}
                        </div>
                      ` : ''}
                    </div>
                  `;
                }).join('') : '<p>Nenhuma atividade registrada para o período.</p>'}
              </div>
            </div>

            <div class="info-block">
              <h3>Etapas em Andamento</h3>
              ${etapasEmAndamento.length > 0 ? `
                <div>
                  ${etapasEmAndamento.map(etapa => `
                    <div class="etapa-andamento">
                      ${etapa.nome}
                      <div class="data-inicio">Iniciada em: ${format(parseISO(etapa.data_inicio), 'dd/MM/yyyy')}</div>
                    </div>
                  `).join('')}
                </div>
              ` : '<p>Nenhuma etapa em andamento no momento.</p>'}
            </div>

            <div class="info-block">
              <h3>Pendências da Obra</h3>
              ${pendencias.lists.length > 0 ? `
                <div>
                  ${pendencias.lists.map(lista => `
                    <div class="lista-titulo">${lista.title}</div>
                    ${lista.cards && lista.cards.length > 0 ? 
                      lista.cards.map(card => `
                        <div class="pendencia-item">
                          <div class="pendencia-titulo">${card.title}</div>
                          ${card.description ? `<div class="pendencia-descricao">${card.description}</div>` : ''}
                        </div>
                      `).join('') : '<p>Nenhuma pendência nesta lista.</p>'
                    }
                  `).join('')}
                </div>
              ` : '<p>Nenhuma pendência registrada para esta obra.</p>'}
            </div>

            <div class="info-block">
              <h3>Observações</h3>
              ${registros
                .filter(registro => registro.observacoes?.trim())
                .map(registro => `
                  <div class="registro-observacoes">
                    ${registro.observacoes.replace(/\n/g, '<br>')}
                  </div>
                `).join('<br>') || '<p>Nenhuma observação registrada para o período.</p>'
              }
            </div>

            ${presencas?.length ? `
              <div class="info-block">
                <h3>Controle de Presença</h3>
                <table class="presenca-table">
                  <tr>
                    <th>Funcionário</th>
                    ${presencas[0].presencas.map((p: any) => {
                      const dataObj = parseISO(p.data);
                      return `<th>${format(dataObj, 'EEE, dd/MM', { locale: ptBR })}</th>`;
                    }).join('')}
                  </tr>
                  ${presencas.map((funcionario: any) => `
                    <tr>
                      <td>${funcionario.nome}</td>
                      ${funcionario.presencas.map((p: any) => {
                        if (p.presente === 1) {
                          return `<td class="presente">✓</td>`;
                        } else if (p.presente === 0.5) {
                          return `<td class="meio-periodo">½</td>`;
                        } else {
                          return `<td class="ausente">✗</td>`;
                        }
                      }).join('')}
                    </tr>
                  `).join('')}
                </table>
              </div>
            ` : ''}
          </div>
        </div>

        <div class="footer">
          <p>Relatório gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")}</p>
          <p>${obra.nome} - Todos os direitos reservados</p>
        </div>
      </body>
      </html>
    `;

    return html;
  } catch (error) {
    console.error('[DEBUG] Erro ao gerar relatório:', error);
    throw error;
  }
};

// Função para excluir relatório
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

export const atualizarTrelloBoardId = async (obraId: number, boardId: string) => {
  try {
    console.log('Atualizando ID do quadro do Trello:', { obraId, boardId });
    
    const { data, error } = await supabase
      .from('obras')
      .update({ trello_board_id: boardId })
      .eq('id', obraId)
      .select()
      .single();

    if (error) {
      console.error('Erro do Supabase:', error);
      throw error;
    }

    console.log('Atualização bem-sucedida:', data);
    return data;
  } catch (error) {
    console.error('Erro detalhado ao atualizar ID do quadro do Trello:', error);
    throw error;
  }
};