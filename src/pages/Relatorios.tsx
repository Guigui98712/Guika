import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Calendar as CalendarIcon, Upload, ChevronLeft, ChevronRight, Download, ArrowLeft, Trash2, Plus, X, Check } from "lucide-react";
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, isWithinInterval, startOfMonth, endOfMonth, parseISO, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/components/ui/use-toast";
import { gerarRelatorioSemanal, excluirRelatorio } from "@/lib/api";
import { gerarRelatorioSemanalV2 } from "@/lib/relatorio";
import Calendar from "react-calendar";
import type { RelatorioSemanal } from "@/types/obra";
import { supabase } from "@/lib/supabase";
import "react-calendar/dist/Calendar.css";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import html2pdf from "html2pdf.js";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Interface para o funcionário
interface Funcionario {
  id: string;
  nome: string;
  presencas: { [key: string]: number }; // data no formato 'yyyy-MM-dd': 0 (ausente), 0.5 (meio período), 1 (período completo)
}

// Interface para armazenar presenças por semana
interface PresencasPorSemana {
  [semanaKey: string]: {
    [funcionarioId: string]: {
      [data: string]: number
    }
  }
}

const Relatorios = () => {
  // Verificar se a função gerarRelatorioSemanal está sendo importada corretamente
  console.log('[DEBUG] Tipo da função gerarRelatorioSemanal:', typeof gerarRelatorioSemanal);
  
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [semanaAtual, setSemanaAtual] = useState(new Date());
  const [relatoriosAnteriores, setRelatoriosAnteriores] = useState<any[]>([]);
  const [diasComDiario, setDiasComDiario] = useState<Date[]>([]);
  const [gerando, setGerando] = useState(false);
  const [novoFuncionario, setNovoFuncionario] = useState("");
  
  // Estado para os funcionários e suas presenças
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  
  // Estado para armazenar presenças por semana
  const [presencasPorSemana, setPresencasPorSemana] = useState<PresencasPorSemana>({});

  // Estado para armazenar funcionários por semana
  const [funcionariosPorSemana, setFuncionariosPorSemana] = useState<{[semanaKey: string]: Funcionario[]}>({});

  // Estado para o diálogo de detalhes do diário
  const [diarioSelecionado, setDiarioSelecionado] = useState<any | null>(null);
  const [showDiarioDialog, setShowDiarioDialog] = useState(false);
  
  // Estado para armazenar os dados completos dos diários
  const [diariosCompletos, setDiariosCompletos] = useState<any[]>([]);

  // Estado para controlar se as pendências devem ser incluídas no relatório
  const [incluirPendencias, setIncluirPendencias] = useState(true);

  // Função para obter os dias úteis da semana (segunda a sexta)
  const getDiasUteis = (dataInicio: Date) => {
    const dias = [];
    // Ajustando para garantir que o início da semana seja domingo
    const inicioSemana = startOfWeek(dataInicio, { weekStartsOn: 0 });
    
    // Adicionar dias de segunda (índice 1) a sexta (índice 5)
    for (let i = 1; i <= 5; i++) {
      const dia = addDays(inicioSemana, i);
      dias.push(dia);
    }
    
    return dias;
  };

  // Efeito para carregar dados iniciais
  useEffect(() => {
    if (id) {
      carregarRelatoriosAnteriores();
      carregarDiarios();
      
      // Carregar funcionários e presenças do localStorage
      carregarFuncionariosDoLocalStorage();
      
      // Carregar presenças para a semana atual
      const semanaKey = format(startOfWeek(semanaAtual, { weekStartsOn: 0 }), 'yyyy-MM-dd');
      carregarFuncionariosDaSemana(semanaKey);
    }
  }, [id]);

  // Efeito para carregar presenças quando a semana muda
  useEffect(() => {
    const semanaKey = format(startOfWeek(semanaAtual, { weekStartsOn: 0 }), 'yyyy-MM-dd');
    console.log('[DEBUG] Mudança de semana. Semana atual:', semanaKey);
    
    // Carregar funcionários para a semana atual
    carregarFuncionariosDaSemana(semanaKey);
  }, [semanaAtual, funcionariosPorSemana]);

  // Função para carregar funcionários do localStorage
  const carregarFuncionariosDoLocalStorage = () => {
    try {
      // Carregar funcionários por semana
      const funcionariosSalvos = localStorage.getItem('funcionariosPorSemana');
      if (funcionariosSalvos) {
        const funcionariosParsed = JSON.parse(funcionariosSalvos);
        console.log('[DEBUG] Carregando funcionários do localStorage:', funcionariosParsed);
        setFuncionariosPorSemana(funcionariosParsed);
      }
      
      // Carregar presenças por semana
      const presencasSalvas = localStorage.getItem('presencasPorSemana');
      if (presencasSalvas) {
        const presencasParsed = JSON.parse(presencasSalvas);
        console.log('[DEBUG] Carregando presenças do localStorage:', presencasParsed);
        setPresencasPorSemana(presencasParsed);
      }
    } catch (error) {
      console.error('[DEBUG] Erro ao carregar dados do localStorage:', error);
    }
  };

  // Função para carregar funcionários da semana atual
  const carregarFuncionariosDaSemana = (semanaKey: string) => {
    // Verificar se já temos funcionários para esta semana
    if (funcionariosPorSemana[semanaKey]) {
      console.log('[DEBUG] Usando funcionários já carregados para a semana:', funcionariosPorSemana[semanaKey]);
      setFuncionarios(funcionariosPorSemana[semanaKey]);
    } else {
      // Se não temos funcionários para esta semana, verificar se temos funcionários em outras semanas
      const todasSemanas = Object.keys(funcionariosPorSemana);
      if (todasSemanas.length > 0) {
        // Usar funcionários da semana mais recente
        const semanaRecente = todasSemanas[todasSemanas.length - 1];
        const funcionariosRecentes = funcionariosPorSemana[semanaRecente];
        
        // Criar novos funcionários para esta semana, mas sem presenças
        const novosFuncionarios = funcionariosRecentes.map(func => ({
          ...func,
          presencas: {}
        }));
        
        console.log('[DEBUG] Criando funcionários para nova semana baseados em semana anterior:', novosFuncionarios);
        
        // Atualizar estado
        setFuncionarios(novosFuncionarios);
        setFuncionariosPorSemana(prev => ({
          ...prev,
          [semanaKey]: novosFuncionarios
        }));
        
        // Salvar no localStorage
        salvarFuncionariosNoLocalStorage({
          ...funcionariosPorSemana,
          [semanaKey]: novosFuncionarios
        });
      } else {
        // Verificar se temos dados salvos no localStorage
        const funcionariosSalvos = localStorage.getItem('funcionariosPorSemana');
        
        if (funcionariosSalvos) {
          try {
            const funcionariosParsed = JSON.parse(funcionariosSalvos);
            
            // Verificar se temos funcionários em alguma semana salva
            const semanasLocalStorage = Object.keys(funcionariosParsed);
            
            if (semanasLocalStorage.length > 0) {
              // Usar funcionários da semana mais recente do localStorage
              const semanaRecenteLS = semanasLocalStorage[semanasLocalStorage.length - 1];
              const funcionariosRecentesLS = funcionariosParsed[semanaRecenteLS];
              
              // Criar novos funcionários para esta semana, mas sem presenças
              const novosFuncionarios = funcionariosRecentesLS.map((func: Funcionario) => ({
                ...func,
                presencas: {}
              }));
              
              console.log('[DEBUG] Criando funcionários para nova semana baseados em localStorage:', novosFuncionarios);
              
              // Atualizar estado
              setFuncionarios(novosFuncionarios);
              setFuncionariosPorSemana(prev => ({
                ...prev,
                [semanaKey]: novosFuncionarios
              }));
              
              // Salvar no localStorage
              salvarFuncionariosNoLocalStorage({
                ...funcionariosPorSemana,
                [semanaKey]: novosFuncionarios
              });
              
              return; // Sair da função, pois já carregamos os funcionários
            }
          } catch (error) {
            console.error('[DEBUG] Erro ao processar funcionários do localStorage:', error);
          }
        }
        
        // Se não temos funcionários em nenhuma semana e não há dados no localStorage, criar funcionários padrão
        const funcionariosPadrao = [];
        
        console.log('[DEBUG] Criando lista vazia de funcionários para a semana');
        
        // Atualizar estado
        setFuncionarios(funcionariosPadrao);
        setFuncionariosPorSemana(prev => ({
          ...prev,
          [semanaKey]: funcionariosPadrao
        }));
        
        // Salvar no localStorage
        salvarFuncionariosNoLocalStorage({
          ...funcionariosPorSemana,
          [semanaKey]: funcionariosPadrao
        });
      }
    }
  };

  // Função para salvar funcionários no localStorage
  const salvarFuncionariosNoLocalStorage = (funcionarios: {[semanaKey: string]: Funcionario[]}) => {
    try {
      localStorage.setItem('funcionariosPorSemana', JSON.stringify(funcionarios));
      console.log('[DEBUG] Funcionários salvos no localStorage');
    } catch (error) {
      console.error('[DEBUG] Erro ao salvar funcionários no localStorage:', error);
    }
  };

  const carregarDiarios = async () => {
    if (!id) return;

    try {
      const { data, error } = await supabase
        .from('diario_obra')
        .select('*')
        .eq('obra_id', id);

      if (error) throw error;

      const datas = (data || []).map(d => parseISO(d.data));
      setDiasComDiario(datas);
      
      // Armazenar os dados completos dos diários para uso posterior
      setDiariosCompletos(data || []);
    } catch (error) {
      console.error('Erro ao carregar diários:', error);
    }
  };

  const carregarRelatoriosAnteriores = async () => {
    if (!id) return;
    
    try {
      const { data, error } = await supabase
        .from('relatorios')
        .select('*')
        .eq('obra_id', id)
        .order('data_inicio', { ascending: false });

      if (error) throw error;
      setRelatoriosAnteriores(data || []);
    } catch (error) {
      console.error('Erro ao carregar relatórios:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os relatórios anteriores.",
        variant: "destructive"
      });
    }
  };

  const gerarRelatorio = async () => {
    if (!id) {
      console.error('[DEBUG] ID da obra não fornecido');
      toast({
        title: "Erro de identificação",
        description: "Não foi possível identificar a obra para gerar o relatório.",
        variant: "destructive"
      });
      return;
    }

    try {
      setGerando(true);
      console.log('[DEBUG] Iniciando geração de relatório...');
      
      const dataInicio = format(startOfWeek(semanaAtual, { weekStartsOn: 0 }), 'yyyy-MM-dd');
      const dataFim = format(endOfWeek(semanaAtual, { weekStartsOn: 0 }), 'yyyy-MM-dd');
      
      console.log('[DEBUG] Período do relatório:', { dataInicio, dataFim });

      // Verificar se já existe relatório para esta semana
      console.log('[DEBUG] Verificando se já existe relatório para esta semana...');
      const { data: relatorioExistente, error: errorVerificacao } = await supabase
        .from('relatorios')
        .select('*')
        .eq('obra_id', id)
        .eq('data_inicio', dataInicio)
        .eq('data_fim', dataFim)
        .single();

      if (errorVerificacao && errorVerificacao.code !== 'PGRST116') {
        console.error('[DEBUG] Erro ao verificar relatório existente:', errorVerificacao);
        throw new Error(`Erro ao verificar relatório existente: ${errorVerificacao.message}`);
      }

      if (relatorioExistente) {
        console.log('[DEBUG] Relatório já existe para esta semana:', relatorioExistente);
        toast({
          title: "Relatório já existe",
          description: "Já existe um relatório para esta semana. Você pode visualizá-lo na lista abaixo.",
          variant: "destructive"
        });
        setGerando(false);
        return;
      }

      // Incluir dados de presença no relatório
      console.log('[DEBUG] Formatando dados de presença...');
      const presencasFormatadas = funcionarios.map(func => ({
        nome: func.nome,
        presencas: getDiasUteis(semanaAtual)
          .map(dia => ({
            data: format(dia, 'yyyy-MM-dd'),
            presente: func.presencas[format(dia, 'yyyy-MM-dd')] || 0
          }))
      }));
      
      console.log('[DEBUG] Presenças formatadas:', presencasFormatadas);
      console.log('[DEBUG] Chamando API para gerar relatório...');

      try {
        console.log('[DEBUG] Tipo da função gerarRelatorioSemanal:', typeof gerarRelatorioSemanal);
        console.log('[DEBUG] Tipo da função gerarRelatorioSemanalV2:', typeof gerarRelatorioSemanalV2);
        console.log('[DEBUG] Parâmetros para gerarRelatorioSemanalV2:', {
          obraId: Number(id),
          dataInicio,
          dataFim,
          presencasFormatadas,
          incluirPendencias
        });
        
        // Usar a nova função V2 que inclui atividades, pendências e etapas em andamento
        const html = await gerarRelatorioSemanalV2(Number(id), dataInicio, dataFim, presencasFormatadas, incluirPendencias);
        
        console.log('[DEBUG] HTML recebido da função gerarRelatorioSemanalV2:', html ? html.substring(0, 200) + '...' : 'vazio');
        
        if (!html) {
          console.error('[DEBUG] O relatório gerado está vazio');
          throw new Error('O relatório gerado está vazio');
        }
        
        console.log('[DEBUG] Relatório HTML gerado com sucesso');
        console.log('[DEBUG] Salvando relatório no Supabase...');
        
        try {
          // Salvar o relatório no Supabase
          const { data: novoRelatorio, error } = await supabase
            .from('relatorios')
            .insert([{
              obra_id: Number(id),
              data_inicio: dataInicio,
              data_fim: dataFim,
              tipo: 'semanal',
              conteudo: html
            }])
            .select()
            .single();

          if (error) {
            console.error('[DEBUG] Erro ao salvar relatório no Supabase:', error);
            
            // Tentar uma versão simplificada se houver erro de coluna
            if (error.message?.includes('column') || error.code === 'PGRST204') {
              console.log('[DEBUG] Tentando salvar com estrutura simplificada...');
              
              // Verificar se a tabela usa 'data' em vez de 'data_inicio'
              const { data: verificaColuna } = await supabase
                .from('relatorios')
                .select('data')
                .limit(1);
                
              const temColunaData = verificaColuna !== null;
              
              // Tentar inserir com a estrutura antiga (usando 'data' em vez de 'data_inicio')
              if (temColunaData) {
                const { data: relatorioSimplificado, error: erroSimplificado } = await supabase
                  .from('relatorios')
                  .insert([{
                    obra_id: Number(id),
                    data: dataInicio,
                    tipo: 'semanal',
                    conteudo: html
                  }])
                  .select()
                  .single();
                  
                if (erroSimplificado) {
                  console.error('[DEBUG] Erro ao salvar relatório simplificado:', erroSimplificado);
                  throw erroSimplificado;
                }
                
                console.log('[DEBUG] Relatório salvo com estrutura simplificada:', relatorioSimplificado);
                await carregarRelatoriosAnteriores();
                
                toast({
                  title: "Relatório gerado com sucesso! 📊",
                  description: "O relatório semanal foi gerado e está disponível para visualização e download.",
                });
                
                return;
              } else {
                throw error;
              }
            } else {
              throw error;
            }
          }
          
          console.log('[DEBUG] Relatório salvo com sucesso:', novoRelatorio);
          await carregarRelatoriosAnteriores();
          
          toast({
            title: "Relatório gerado com sucesso! 📊",
            description: "O relatório semanal foi gerado e está disponível para visualização e download.",
          });
        } catch (error) {
          console.error('[DEBUG] Erro ao salvar relatório:', error);
          toast({
            title: "Erro na geração do relatório",
            description: "O relatório foi gerado, mas não foi possível salvá-lo. Verifique a estrutura do banco de dados.",
            variant: "destructive"
          });
        }
      } catch (err: any) {
        console.error('[DEBUG] Erro específico ao gerar relatório:', err);
        toast({
          title: "Erro na geração do relatório",
          description: `Não foi possível gerar o relatório: ${err.message || 'Erro desconhecido'}. Verifique se há registros no diário para esta semana.`,
          variant: "destructive"
        });
      }
    } catch (error: any) {
      console.error('[DEBUG] Erro geral ao gerar relatório:', error);
      toast({
        title: "Falha no processamento",
        description: `Não foi possível gerar o relatório: ${error.message || 'Erro desconhecido'}. Tente novamente mais tarde.`,
        variant: "destructive"
      });
    } finally {
      setGerando(false);
    }
  };

  const handleSemanaChange = (direcao: 'anterior' | 'proxima') => {
    // Salvar presenças da semana atual antes de mudar
    const semanaAtualKey = format(startOfWeek(semanaAtual, { weekStartsOn: 0 }), 'yyyy-MM-dd');
    
    // Criar um objeto com as presenças atuais
    const presencasAtuais: {[funcionarioId: string]: {[data: string]: number}} = {};
    funcionarios.forEach(func => {
      presencasAtuais[func.id] = func.presencas;
    });
    
    // Atualizar o estado de presenças por semana
    setPresencasPorSemana(prev => ({
      ...prev,
      [semanaAtualKey]: presencasAtuais
    }));
    
    // Mudar para a nova semana
    setSemanaAtual(data => {
      const novaSemana = direcao === 'anterior' 
        ? subWeeks(data, 1)
        : addWeeks(data, 1);
      
      return novaSemana;
    });
  };

  const handleVisualizarRelatorio = (relatorio: any) => {
    try {
      console.log('[DEBUG] Visualizando relatório:', relatorio);
      
      // Criar um iframe temporário para exibir o relatório
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      document.body.appendChild(iframe);
      
      // Escrever o conteúdo HTML no iframe
      const iframeDocument = iframe.contentDocument || iframe.contentWindow?.document;
      if (iframeDocument) {
        iframeDocument.open();
        iframeDocument.write(relatorio.conteudo);
        iframeDocument.close();
        
        // Imprimir o iframe em uma nova janela
        iframe.onload = () => {
          try {
            iframe.contentWindow?.print();
          } catch (printError) {
            console.error('[DEBUG] Erro ao imprimir:', printError);
            
            // Alternativa: abrir em nova aba
            const blob = new Blob([relatorio.conteudo], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            const newWindow = window.open('', '_blank');
            if (newWindow) {
              newWindow.document.write(relatorio.conteudo);
              newWindow.document.close();
            } else {
              throw new Error('Não foi possível abrir uma nova janela. Verifique se o bloqueador de pop-ups está desativado.');
            }
          }
          
          // Remover o iframe após a impressão
          setTimeout(() => {
            document.body.removeChild(iframe);
          }, 1000);
        };
      }
    } catch (error) {
      console.error('[DEBUG] Erro ao visualizar o relatório:', error);
      
      // Método alternativo se o principal falhar
      try {
        const newWindow = window.open('', '_blank');
        if (newWindow) {
          newWindow.document.write(relatorio.conteudo);
          newWindow.document.close();
        } else {
          throw new Error('Não foi possível abrir uma nova janela. Verifique se o bloqueador de pop-ups está desativado.');
        }
      } catch (fallbackError) {
        console.error('[DEBUG] Erro no método alternativo:', fallbackError);
        toast({
          title: "Erro de visualização",
          description: "Não foi possível visualizar o relatório. Verifique se o bloqueador de pop-ups está desativado.",
          variant: "destructive"
        });
      }
    }
  };

  const handleExcluirRelatorio = async (relatorioId: number) => {
    if (!confirm('Tem certeza que deseja excluir este relatório?')) {
      return;
    }

    try {
      await excluirRelatorio(relatorioId);
      await carregarRelatoriosAnteriores();
      toast({
        title: "Relatório excluído! 🗑️",
        description: "O relatório foi removido permanentemente do sistema.",
      });
    } catch (error) {
      console.error('Erro ao excluir relatório:', error);
      toast({
        title: "Erro ao excluir",
        description: "Não foi possível excluir o relatório. Ele pode estar sendo usado em outros lugares do sistema.",
        variant: "destructive"
      });
    }
  };

  // Alternar presença - agora com três estados: 0 (ausente), 0.5 (meio período), 1 (período completo)
  // Ordem alterada para: 0 -> 1 -> 0.5 -> 0
  const togglePresenca = async (funcionarioId: string, data: string) => {
    const semanaKey = format(startOfWeek(semanaAtual, { weekStartsOn: 0 }), 'yyyy-MM-dd');
    
    // Atualizar o estado dos funcionários
    const novosFuncionarios = funcionarios.map(func => {
      if (func.id === funcionarioId) {
        const presencaAtual = func.presencas[data] || 0;
        let novaPresenca = 0;
        
        // Alternar entre os três estados: 0 -> 1 -> 0.5 -> 0
        if (presencaAtual === 0) novaPresenca = 1;
        else if (presencaAtual === 1) novaPresenca = 0.5;
        else novaPresenca = 0;
        
        return {
          ...func,
          presencas: {
            ...func.presencas,
            [data]: novaPresenca
          }
        };
      }
      return func;
    });
    
    setFuncionarios(novosFuncionarios);
    
    // Atualizar o estado de funcionários por semana
    setFuncionariosPorSemana(prev => ({
      ...prev,
      [semanaKey]: novosFuncionarios
    }));
    
    // Criar um objeto com as presenças atualizadas
    const presencasAtualizadas: {[funcionarioId: string]: {[data: string]: number}} = {};
    novosFuncionarios.forEach(func => {
      presencasAtualizadas[func.id] = func.presencas;
    });
    
    // Atualizar o estado de presenças por semana
    const novoPresencasPorSemana = {
      ...presencasPorSemana,
      [semanaKey]: presencasAtualizadas
    };
    
    setPresencasPorSemana(novoPresencasPorSemana);
    
    // Salvar no localStorage para persistência
    try {
      localStorage.setItem('presencasPorSemana', JSON.stringify(novoPresencasPorSemana));
      console.log('[DEBUG] Presenças salvas no localStorage');
    } catch (error) {
      console.error('[DEBUG] Erro ao salvar presenças no localStorage:', error);
    }
    
    // Tentar salvar no banco de dados
    try {
      const funcionario = novosFuncionarios.find(f => f.id === funcionarioId);
      if (!funcionario) {
        console.error('[DEBUG] Funcionário não encontrado:', funcionarioId);
        return;
      }
      
      const novaPresenca = funcionario.presencas[data];
      console.log('[DEBUG] Salvando presença no banco de dados:', {
        obra_id: id,
        funcionario_id: funcionarioId,
        nome_funcionario: funcionario.nome,
        data,
        presenca: novaPresenca,
        semana: semanaKey
      });
      
      // Verificar se já existe um registro para esta combinação
      const { data: registroExistente, error: erroConsulta } = await supabase
        .from('presencas_funcionarios')
        .select('*')
        .eq('obra_id', id)
        .eq('funcionario_id', funcionarioId)
        .eq('data', data)
        .single();
      
      if (erroConsulta && erroConsulta.code !== 'PGRST116') { // PGRST116 é o código para "nenhum resultado encontrado"
        console.error('[DEBUG] Erro ao consultar registro existente:', erroConsulta);
        // Não lançar erro, pois já salvamos no localStorage
      } else {
        if (registroExistente) {
          console.log('[DEBUG] Atualizando registro existente:', registroExistente.id);
          // Atualizar registro existente
          const { error } = await supabase
            .from('presencas_funcionarios')
            .update({
              presenca: novaPresenca,
              semana: semanaKey,
              nome_funcionario: funcionario.nome
            })
            .eq('id', registroExistente.id);
          
          if (error) {
            console.error('[DEBUG] Erro ao atualizar registro:', error);
            // Não lançar erro, pois já salvamos no localStorage
          }
        } else {
          console.log('[DEBUG] Criando novo registro');
          // Criar novo registro
          const { error } = await supabase
            .from('presencas_funcionarios')
            .insert({
              obra_id: id,
              funcionario_id: funcionarioId,
              nome_funcionario: funcionario.nome,
              data,
              presenca: novaPresenca,
              semana: semanaKey
            });
          
          if (error) {
            console.error('[DEBUG] Erro ao criar novo registro:', error);
            // Não lançar erro, pois já salvamos no localStorage
          }
        }
      }
      
      console.log('[DEBUG] Presença salva com sucesso');
    } catch (error) {
      console.error('[DEBUG] Erro ao salvar presença no banco de dados:', error);
      // Não lançar erro, pois já salvamos no localStorage
    }
    
    toast({
      title: "Sucesso",
      description: "Presença atualizada com sucesso!"
    });
  };

  // Filtrar relatórios do mês atual
  const relatoriosDoMes = relatoriosAnteriores.filter(relatorio => {
    const dataRelatorio = new Date(relatorio.data_inicio);
    return isWithinInterval(dataRelatorio, {
      start: startOfMonth(new Date()),
      end: endOfMonth(new Date())
    });
  });

  // Filtrar relatórios antigos (excluindo os do mês atual)
  const relatoriosAntigos = relatoriosAnteriores.filter(relatorio => {
    const dataRelatorio = new Date(relatorio.data_inicio);
    return !isWithinInterval(dataRelatorio, {
      start: startOfMonth(new Date()),
      end: endOfMonth(new Date())
    });
  });

  const tileClassName = ({ date }: { date: Date }) => {
    const temDiario = diasComDiario.some(d => 
      d.getDate() === date.getDate() &&
      d.getMonth() === date.getMonth() &&
      d.getFullYear() === date.getFullYear()
    );

    return temDiario ? 'bg-primary/10 font-bold cursor-pointer' : '';
  };

  // Obter os dias úteis da semana atual
  const diasUteis = getDiasUteis(startOfWeek(semanaAtual, { weekStartsOn: 0 }));

  const handleDownloadPDF = async (relatorio: any) => {
    try {
      console.log('[DEBUG] Baixando relatório como PDF:', relatorio);
      
      // Criar um elemento temporário para renderizar o HTML
      const container = document.createElement('div');
      container.innerHTML = relatorio.conteudo;
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      document.body.appendChild(container);
      
      // Configurações do PDF
      const options = {
        margin: 10,
        filename: `Relatório_${relatorio.data_inicio}_${relatorio.data_fim}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };
      
      // Gerar o PDF
      toast({
        title: "Processando",
        description: "Gerando PDF, por favor aguarde...",
      });
      
      const pdf = await html2pdf().from(container).set(options).save();
      
      // Remover o elemento temporário
      document.body.removeChild(container);
      
      toast({
        title: "Sucesso",
        description: "PDF gerado com sucesso!",
      });
    } catch (error) {
      console.error('[DEBUG] Erro ao gerar PDF:', error);
      toast({
        title: "Erro",
        description: "Não foi possível gerar o PDF. Tente novamente.",
        variant: "destructive"
      });
    }
  };

  // Função para adicionar um novo funcionário
  const adicionarFuncionario = () => {
    if (!novoFuncionario.trim()) {
      toast({
        title: "Erro",
        description: "O nome do funcionário não pode estar vazio.",
        variant: "destructive"
      });
      return;
    }

    const semanaKey = format(startOfWeek(semanaAtual, { weekStartsOn: 0 }), 'yyyy-MM-dd');
    
    // Criar novo funcionário com ID único
    const novoFunc: Funcionario = {
      id: Date.now().toString(), // ID único baseado no timestamp
      nome: novoFuncionario.trim(),
      presencas: {}
    };
    
    // Atualizar o estado dos funcionários
    const novosFuncionarios = [...funcionarios, novoFunc];
    setFuncionarios(novosFuncionarios);
    
    // Atualizar o estado de funcionários por semana
    const novoFuncionariosPorSemana = {
      ...funcionariosPorSemana,
      [semanaKey]: novosFuncionarios
    };
    
    setFuncionariosPorSemana(novoFuncionariosPorSemana);
    
    // Salvar no localStorage
    salvarFuncionariosNoLocalStorage(novoFuncionariosPorSemana);
    
    // Limpar o campo de entrada
    setNovoFuncionario("");
    
    toast({
      title: "Sucesso",
      description: "Funcionário adicionado com sucesso!",
    });
  };
  
  // Função para remover um funcionário
  const removerFuncionario = (funcionarioId: string) => {
    const semanaKey = format(startOfWeek(semanaAtual, { weekStartsOn: 0 }), 'yyyy-MM-dd');
    
    // Filtrar o funcionário a ser removido
    const novosFuncionarios = funcionarios.filter(func => func.id !== funcionarioId);
    setFuncionarios(novosFuncionarios);
    
    // Atualizar o estado de funcionários por semana
    const novoFuncionariosPorSemana = {
      ...funcionariosPorSemana,
      [semanaKey]: novosFuncionarios
    };
    
    setFuncionariosPorSemana(novoFuncionariosPorSemana);
    
    // Salvar no localStorage
    salvarFuncionariosNoLocalStorage(novoFuncionariosPorSemana);
    
    toast({
      title: "Sucesso",
      description: "Funcionário removido com sucesso!",
    });
  };

  // Função para lidar com o clique em um dia do calendário
  const handleDiaClick = (date: Date) => {
    // Formatar a data para comparação
    const dataFormatada = format(date, 'yyyy-MM-dd');
    
    // Buscar o diário correspondente à data clicada
    const diario = diariosCompletos.find(d => d.data === dataFormatada);
    
    if (diario) {
      setDiarioSelecionado(diario);
      setShowDiarioDialog(true);
    }
  };

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex items-center gap-4 mb-6">
        <Button 
          variant="outline" 
          size="icon"
          onClick={() => navigate(`/obras/${id}`)}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-3xl font-bold">Relatórios Semanais</h1>
      </div>

      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Gerar Novo Relatório</h2>
          </div>

          <div className="flex flex-col md:flex-row gap-6">
            {/* Coluna do calendário */}
            <div className="md:w-1/3">
              <h3 className="text-lg font-medium mb-2">Selecionar Semana</h3>
              <Calendar
                value={semanaAtual}
                onChange={(date) => setSemanaAtual(date as Date)}
                locale={ptBR as unknown as string}
                tileClassName={tileClassName}
                className="w-full border rounded-lg shadow-sm"
                onClickDay={handleDiaClick}
              />

              <div className="flex items-center justify-center gap-2 mt-4">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleSemanaChange('anterior')}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>

                <div className="flex-1 text-center px-4">
                  <p className="text-sm text-gray-500">Semana Selecionada</p>
                  <p className="font-medium">
                    {format(startOfWeek(semanaAtual, { weekStartsOn: 0 }), "dd 'de' MMMM", { locale: ptBR })}
                    {' - '}
                    {format(endOfWeek(semanaAtual, { weekStartsOn: 0 }), "dd 'de' MMMM", { locale: ptBR })}
                  </p>
                </div>

                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleSemanaChange('proxima')}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>

            </div>

            {/* Coluna da tabela de presença */}
            <div className="md:w-2/3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">Tabela de Presença</h3>
                <div className="flex gap-2">
                  <Input
                    placeholder="Nome do funcionário"
                    value={novoFuncionario}
                    onChange={(e) => setNovoFuncionario(e.target.value)}
                    className="w-64"
                  />
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={adicionarFuncionario}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="p-2 text-left border">Funcionário</th>
                      {diasUteis.map((dia, index) => (
                        <th key={index} className="p-2 text-center border">
                          {format(dia, 'EEE', { locale: ptBR })}
                          <br />
                          <span className="text-xs">{format(dia, 'dd/MM')}</span>
                        </th>
                      ))}
                      <th className="p-2 text-center border w-10">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {funcionarios.map((funcionario) => (
                      <tr key={funcionario.id} className="border-b hover:bg-gray-50">
                        <td className="p-2 border font-medium">{funcionario.nome}</td>
                        {diasUteis.map((dia, index) => {
                          const dataFormatada = format(dia, 'yyyy-MM-dd');
                          const presenca = funcionario.presencas[dataFormatada] || 0;
                          return (
                            <td key={index} className="p-2 text-center border">
                              <div className="flex justify-center">
                                <button
                                  onClick={() => togglePresenca(funcionario.id, dataFormatada)}
                                  className={`w-8 h-8 flex items-center justify-center rounded-md ${
                                    presenca === 0 ? 'bg-gray-200 text-gray-500' : 
                                    presenca === 0.5 ? 'bg-yellow-200 text-yellow-700' : 
                                    'bg-green-200 text-green-700'
                                  }`}
                                >
                                  {presenca === 0 ? '-' : presenca === 0.5 ? '½' : '1'}
                                </button>
                              </div>
                            </td>
                          );
                        })}
                        <td className="p-2 text-center border">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removerFuncionario(funcionario.id)}
                            className="h-8 w-8 text-red-500 hover:text-red-700"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="flex flex-col space-y-4">
            <Card className="p-6">
              <div className="flex flex-col space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold">Relatório Semanal</h2>
                  <div>
                    <p className="text-sm text-gray-500">
                      Período: {format(startOfWeek(semanaAtual, { weekStartsOn: 0 }), 'dd/MM/yyyy')} a {format(endOfWeek(semanaAtual, { weekStartsOn: 0 }), 'dd/MM/yyyy')}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center justify-end">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="incluir-pendencias" 
                        checked={incluirPendencias} 
                        onCheckedChange={(checked) => setIncluirPendencias(checked as boolean)}
                      />
                      <label 
                        htmlFor="incluir-pendencias" 
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        Incluir pendências no relatório
                      </label>
                    </div>
                    <Button 
                      onClick={gerarRelatorio} 
                      disabled={gerando}
                    >
                      {gerando ? (
                        <>
                          <div className="animate-spin mr-2 h-4 w-4 border-2 border-b-transparent border-white rounded-full"></div>
                          Gerando...
                        </>
                      ) : (
                        <>
                          <FileText className="w-4 h-4 mr-2" />
                          Gerar Relatório
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </Card>

      {relatoriosDoMes.length > 0 && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Relatórios do Mês Atual</h2>
          <div className="space-y-4">
            {relatoriosDoMes.map((relatorio) => (
              <div key={relatorio.id} className="flex flex-col p-4 border rounded-lg bg-white shadow-sm">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-lg font-semibold">
                    {format(parseISO(relatorio.data_inicio), 'dd/MM/yyyy')} a {format(parseISO(relatorio.data_fim), 'dd/MM/yyyy')}
                  </h3>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleVisualizarRelatorio(relatorio)}
                      title="Visualizar"
                    >
                      <FileText className="h-4 w-4" />
                      <span className="ml-1 hidden sm:inline">Visualizar</span>
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownloadPDF(relatorio)}
                      title="Baixar PDF"
                      className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-300"
                    >
                      <Download className="h-4 w-4" />
                      <span className="ml-1 hidden sm:inline">PDF</span>
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleExcluirRelatorio(relatorio.id)}
                      title="Excluir"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <p className="text-sm text-gray-500">
                  Tipo: {relatorio.tipo === 'semanal' ? 'Relatório Semanal' : 'Relatório Final'}
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {relatoriosAntigos.length > 0 && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Todos os Relatórios</h2>
          <div className="space-y-4">
            {relatoriosAntigos.map((relatorio) => (
              <div key={relatorio.id} className="flex flex-col p-4 border rounded-lg bg-white shadow-sm">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-lg font-semibold">
                    {format(parseISO(relatorio.data_inicio), 'dd/MM/yyyy')} a {format(parseISO(relatorio.data_fim), 'dd/MM/yyyy')}
                  </h3>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleVisualizarRelatorio(relatorio)}
                      title="Visualizar"
                    >
                      <FileText className="h-4 w-4" />
                      <span className="ml-1 hidden sm:inline">Visualizar</span>
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownloadPDF(relatorio)}
                      title="Baixar PDF"
                      className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-300"
                    >
                      <Download className="h-4 w-4" />
                      <span className="ml-1 hidden sm:inline">PDF</span>
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleExcluirRelatorio(relatorio.id)}
                      title="Excluir"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <p className="text-sm text-gray-500">
                  Tipo: {relatorio.tipo === 'semanal' ? 'Relatório Semanal' : 'Relatório Final'}
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Dialog para mostrar detalhes do diário */}
      <Dialog open={showDiarioDialog} onOpenChange={setShowDiarioDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              Diário de Obra - {diarioSelecionado ? format(parseISO(diarioSelecionado.data), 'dd/MM/yyyy') : ''}
            </DialogTitle>
          </DialogHeader>
          
          {diarioSelecionado && (
            <div className="space-y-4">
              <div>
                <h4 className="font-medium">Descrição da Atividade</h4>
                <p className="mt-1 text-gray-700 whitespace-pre-line">{diarioSelecionado.descricao}</p>
              </div>
              
              {diarioSelecionado.observacoes && (
                <div>
                  <h4 className="font-medium">Observações</h4>
                  <p className="mt-1 text-gray-700 whitespace-pre-line">{diarioSelecionado.observacoes}</p>
                </div>
              )}
              
              {diarioSelecionado.etapas_iniciadas && diarioSelecionado.etapas_iniciadas.length > 0 && (
                <div>
                  <h4 className="font-medium text-primary">Etapas Iniciadas</h4>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {diarioSelecionado.etapas_iniciadas.map((etapa: string) => (
                      <span key={etapa} className="bg-primary/10 text-primary text-sm px-2 py-1 rounded-md">
                        {etapa}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              {diarioSelecionado.etapas_concluidas && diarioSelecionado.etapas_concluidas.length > 0 && (
                <div>
                  <h4 className="font-medium text-green-700">Etapas Concluídas</h4>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {diarioSelecionado.etapas_concluidas.map((etapa: string) => (
                      <span key={etapa} className="bg-green-100 text-green-700 text-sm px-2 py-1 rounded-md">
                        {etapa}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              {diarioSelecionado.fotos && diarioSelecionado.fotos.length > 0 && (
                <div>
                  <h4 className="font-medium">Fotos ({diarioSelecionado.fotos.length})</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                    {diarioSelecionado.fotos.map((foto: string, index: number) => (
                      <img
                        key={index}
                        src={foto}
                        alt={`Foto ${index + 1}`}
                        className="w-full h-24 object-cover rounded-lg cursor-pointer"
                        onClick={() => window.open(foto, '_blank')}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Relatorios;
