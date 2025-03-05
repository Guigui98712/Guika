import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Calendar as CalendarIcon, Upload, ChevronLeft, ChevronRight, Download, ArrowLeft, Trash2, Plus, X, Check } from "lucide-react";
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, isWithinInterval, startOfMonth, endOfMonth, parseISO, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/components/ui/use-toast";
import { gerarRelatorioSemanal, excluirRelatorio } from "@/lib/api";
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
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([
    { id: '1', nome: 'João Silva', presencas: {} },
    { id: '2', nome: 'Maria Oliveira', presencas: {} },
    { id: '3', nome: 'Pedro Santos', presencas: {} }
  ]);
  
  // Estado para armazenar presenças por semana
  const [presencasPorSemana, setPresencasPorSemana] = useState<PresencasPorSemana>({});

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

  useEffect(() => {
    carregarRelatoriosAnteriores();
    carregarDiarios();
  }, [id]);
  
  // Efeito para carregar presenças quando a semana muda
  useEffect(() => {
    const semanaKey = format(startOfWeek(semanaAtual, { weekStartsOn: 0 }), 'yyyy-MM-dd');
    console.log('[DEBUG] Mudança de semana. Semana atual:', semanaKey);
    console.log('[DEBUG] Presenças por semana:', presencasPorSemana);
    
    const presencasDaSemana = presencasPorSemana[semanaKey];
    
    if (presencasDaSemana) {
      console.log('[DEBUG] Carregando presenças salvas para a semana:', presencasDaSemana);
      // Se já temos presenças salvas para esta semana, carregá-las
      setFuncionarios(prevFuncionarios => prevFuncionarios.map(func => ({
        ...func,
        presencas: presencasDaSemana[func.id] || {}
      })));
    } else {
      console.log('[DEBUG] Nenhuma presença salva para esta semana. Limpando presenças.');
      // Se não temos presenças para esta semana, limpar as presenças
      setFuncionarios(prevFuncionarios => prevFuncionarios.map(func => ({
        ...func,
        presencas: {}
      })));
    }
  }, [semanaAtual, presencasPorSemana]);

  // Efeito para carregar presenças do localStorage quando o componente é montado
  useEffect(() => {
    const presencasSalvas = localStorage.getItem('presencasPorSemana');
    if (presencasSalvas) {
      try {
        const presencasParsed = JSON.parse(presencasSalvas);
        console.log('[DEBUG] Carregando presenças do localStorage:', presencasParsed);
        setPresencasPorSemana(presencasParsed);
      } catch (error) {
        console.error('[DEBUG] Erro ao carregar presenças do localStorage:', error);
      }
    }
  }, []);

  const carregarDiarios = async () => {
    if (!id) return;

    try {
      const { data, error } = await supabase
        .from('diario_obra')
        .select('data')
        .eq('obra_id', id);

      if (error) throw error;

      const datas = (data || []).map(d => parseISO(d.data));
      setDiasComDiario(datas);
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
    console.log('[DEBUG] Botão de gerar relatório clicado!');
    if (!id) {
      console.error('[DEBUG] ID da obra não fornecido');
      return;
    }

    try {
      console.log('[DEBUG] Iniciando geração de relatório...');
      setGerando(true);
      // Ajustando para usar weekStartsOn: 0 para garantir que o domingo seja o início da semana
      const dataInicio = format(startOfWeek(semanaAtual, { weekStartsOn: 0 }), 'yyyy-MM-dd');
      const dataFim = format(endOfWeek(semanaAtual, { weekStartsOn: 0 }), 'yyyy-MM-dd');
      console.log('[DEBUG] Período selecionado:', { dataInicio, dataFim });

      // Verificar se já existe relatório para esta semana
      try {
        const { data: relatorioExistente, error } = await supabase
          .from('relatorios')
          .select('*')
          .eq('obra_id', id)
          .eq('data_inicio', dataInicio)
          .eq('data_fim', dataFim)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('[DEBUG] Erro ao verificar relatório existente:', error);
          throw error;
        }

        if (relatorioExistente) {
          console.log('[DEBUG] Relatório já existe para esta semana:', relatorioExistente);
          toast({
            title: "Aviso",
            description: "Já existe um relatório para esta semana.",
            variant: "destructive"
          });
          return;
        }
      } catch (checkError) {
        console.error('[DEBUG] Erro ao verificar relatório existente:', checkError);
        // Continuar mesmo se houver erro na verificação
      }

      // Incluir dados de presença no relatório
      const presencasFormatadas = funcionarios.map(func => ({
        nome: func.nome,
        presencas: getDiasUteis(semanaAtual)
          .map(dia => ({
            data: format(dia, 'yyyy-MM-dd'),
            presente: func.presencas[format(dia, 'yyyy-MM-dd')] || 0
          }))
      }));
      console.log('[DEBUG] Presenças formatadas:', JSON.stringify(presencasFormatadas, null, 2));

      console.log('[DEBUG] Chamando gerarRelatorioSemanal...');
      try {
        const html = await gerarRelatorioSemanal(Number(id), dataInicio, dataFim, presencasFormatadas);
        console.log('[DEBUG] HTML recebido, tamanho:', html?.length || 0);
        
        if (!html) {
          console.error('[DEBUG] HTML retornado é nulo ou vazio');
          throw new Error('O relatório gerado está vazio');
        }
        
        // Salvar o relatório no Supabase
        console.log('[DEBUG] Salvando relatório no Supabase...');
        try {
          const { data: novoRelatorio, error } = await supabase
            .from('relatorios')
            .insert([
              {
                obra_id: Number(id),
                data_inicio: dataInicio,
                data_fim: dataFim,
                tipo: 'semanal',
                conteudo: html
              }
            ])
            .select()
            .single();

          if (error) {
            console.error('[DEBUG] Erro ao salvar relatório:', error);
            // Não vamos lançar o erro, apenas logar
            toast({
              title: "Aviso",
              description: "O relatório foi gerado, mas não foi possível salvá-lo no banco de dados.",
              variant: "destructive"
            });
          } else {
            console.log('[DEBUG] Relatório salvo com sucesso:', novoRelatorio);
            // Atualizar a lista de relatórios apenas se salvou com sucesso
            await carregarRelatoriosAnteriores();
          }
        } catch (saveError) {
          console.error('[DEBUG] Erro ao salvar relatório:', saveError);
        }
        
        // Criar um Blob com o HTML e abrir em nova aba - independente de salvar ou não
        console.log('[DEBUG] Criando Blob e abrindo em nova aba...');
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const novaJanela = window.open(url, '_blank');
        
        if (!novaJanela) {
          console.error('[DEBUG] Falha ao abrir nova janela. Possível bloqueio de pop-up.');
          toast({
            title: "Atenção",
            description: "O relatório foi gerado, mas não foi possível abri-lo automaticamente. Verifique se o bloqueador de pop-ups está ativado.",
            variant: "destructive"
          });
        }

        toast({
          title: "Sucesso",
          description: "Relatório gerado com sucesso!",
        });
      } catch (apiError) {
        console.error('[DEBUG] Erro ao chamar gerarRelatorioSemanal:', apiError);
        throw apiError;
      }
    } catch (error) {
      console.error('[DEBUG] Erro ao gerar relatório:', error);
      // Verificar se é um erro do Supabase
      if (error && typeof error === 'object' && 'code' in error) {
        console.error('[DEBUG] Erro do Supabase:', error.code, error.message);
      }
      toast({
        title: "Erro",
        description: "Não foi possível gerar o relatório. Verifique o console para mais detalhes.",
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

  const handleVisualizarRelatorio = async (relatorio: any) => {
    try {
      const blob = new Blob([relatorio.conteudo], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (error) {
      console.error('Erro ao visualizar relatório:', error);
      toast({
        title: "Erro",
        description: "Não foi possível visualizar o relatório.",
        variant: "destructive"
      });
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
        title: "Sucesso",
        description: "Relatório excluído com sucesso!",
      });
    } catch (error) {
      console.error('Erro ao excluir relatório:', error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir o relatório.",
        variant: "destructive"
      });
    }
  };

  // Adicionar novo funcionário
  const adicionarFuncionario = () => {
    if (!novoFuncionario.trim()) {
      toast({
        title: "Erro",
        description: "Digite o nome do funcionário.",
        variant: "destructive"
      });
      return;
    }

    const novoFunc = {
      id: Date.now().toString(),
      nome: novoFuncionario,
      presencas: {}
    };

    const novosFuncionarios = [...funcionarios, novoFunc];
    setFuncionarios(novosFuncionarios);
    
    // Atualizar também o estado de presenças por semana
    const semanaKey = format(startOfWeek(semanaAtual, { weekStartsOn: 0 }), 'yyyy-MM-dd');
    
    // Obter as presenças atuais da semana ou inicializar um objeto vazio
    const presencasAtuaisDaSemana = presencasPorSemana[semanaKey] || {};
    
    // Adicionar o novo funcionário às presenças da semana
    const novoPresencasPorSemana = {
      ...presencasPorSemana,
      [semanaKey]: {
        ...presencasAtuaisDaSemana,
        [novoFunc.id]: {}
      }
    };
    
    setPresencasPorSemana(novoPresencasPorSemana);
    
    // Salvar no localStorage para persistência
    try {
      localStorage.setItem('presencasPorSemana', JSON.stringify(novoPresencasPorSemana));
    } catch (error) {
      console.error('[DEBUG] Erro ao salvar presenças no localStorage:', error);
    }
    
    setNovoFuncionario("");
  };

  // Remover funcionário
  const removerFuncionario = (id: string) => {
    const novosFuncionarios = funcionarios.filter(f => f.id !== id);
    setFuncionarios(novosFuncionarios);
    
    // Atualizar também o estado de presenças por semana
    const semanaKey = format(startOfWeek(semanaAtual, { weekStartsOn: 0 }), 'yyyy-MM-dd');
    
    // Obter as presenças atuais da semana
    const presencasAtuaisDaSemana = {...(presencasPorSemana[semanaKey] || {})};
    
    // Remover o funcionário das presenças da semana
    if (presencasAtuaisDaSemana[id]) {
      delete presencasAtuaisDaSemana[id];
    }
    
    // Atualizar o estado
    const novoPresencasPorSemana = {
      ...presencasPorSemana,
      [semanaKey]: presencasAtuaisDaSemana
    };
    
    setPresencasPorSemana(novoPresencasPorSemana);
    
    // Salvar no localStorage para persistência
    try {
      localStorage.setItem('presencasPorSemana', JSON.stringify(novoPresencasPorSemana));
    } catch (error) {
      console.error('[DEBUG] Erro ao salvar presenças no localStorage:', error);
    }
  };

  // Alternar presença - agora com três estados: 0 (ausente), 0.5 (meio período), 1 (período completo)
  // Ordem alterada para: 0 -> 1 -> 0.5 -> 0
  const togglePresenca = (funcionarioId: string, data: string) => {
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
    
    // Atualizar também o estado de presenças por semana
    const semanaKey = format(startOfWeek(semanaAtual, { weekStartsOn: 0 }), 'yyyy-MM-dd');
    
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

    return temDiario ? 'bg-primary/10 font-bold' : '';
  };

  // Obter os dias úteis da semana atual
  const diasUteis = getDiasUteis(startOfWeek(semanaAtual, { weekStartsOn: 0 }));

  // Função de teste para verificar se o problema está na função gerarRelatorioSemanal
  const testarGeracaoRelatorio = async () => {
    console.log('[DEBUG] Função de teste chamada!');
    if (!id) {
      console.error('[DEBUG] ID da obra não fornecido');
      return;
    }
    
    try {
      const dataInicio = format(startOfWeek(semanaAtual, { weekStartsOn: 0 }), 'yyyy-MM-dd');
      const dataFim = format(endOfWeek(semanaAtual, { weekStartsOn: 0 }), 'yyyy-MM-dd');
      console.log('[DEBUG] Chamando gerarRelatorioSemanal diretamente...');
      
      const html = await gerarRelatorioSemanal(Number(id), dataInicio, dataFim, []);
      console.log('[DEBUG] HTML recebido, tamanho:', html?.length || 0);
      
      alert('Função gerarRelatorioSemanal executada com sucesso!');
    } catch (error) {
      console.error('[DEBUG] Erro ao chamar gerarRelatorioSemanal diretamente:', error);
      alert('Erro ao chamar gerarRelatorioSemanal: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  return (
    <div className="space-y-8">
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

          <Button 
            className="w-full mt-6"
            onClick={gerarRelatorio}
            onMouseDown={() => console.log('[DEBUG] Evento onMouseDown acionado!')}
            disabled={false}
          >
            <FileText className="w-4 h-4 mr-2" />
            Gerar Relatório
          </Button>
          
          <Button 
            className="w-full mt-2"
            onClick={testarGeracaoRelatorio}
            variant="outline"
          >
            Testar Geração de Relatório
          </Button>

          <Button 
            className="w-full mt-2"
            onClick={() => {
              console.log('[DEBUG] Botão inline clicado!');
              if (!id) {
                console.error('[DEBUG] ID da obra não fornecido');
                return;
              }
              
              const dataInicio = format(startOfWeek(semanaAtual, { weekStartsOn: 0 }), 'yyyy-MM-dd');
              const dataFim = format(endOfWeek(semanaAtual, { weekStartsOn: 0 }), 'yyyy-MM-dd');
              
              alert(`Botão inline clicado! ID: ${id}, Período: ${dataInicio} a ${dataFim}`);
            }}
            variant="outline"
          >
            Função Inline
          </Button>
        </div>
      </Card>

      {relatoriosDoMes.length > 0 && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Relatórios do Mês Atual</h2>
          <div className="space-y-4">
            {relatoriosDoMes.map((relatorio) => (
              <div
                key={relatorio.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
              >
                <div>
                  <p className="font-medium">
                    {format(parseISO(relatorio.data_inicio), "dd/MM/yyyy")} - {format(parseISO(relatorio.data_fim), "dd/MM/yyyy")}
                  </p>
                  <p className="text-sm text-gray-500">
                    Gerado em: {format(parseISO(relatorio.created_at), "dd/MM/yyyy HH:mm")}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleVisualizarRelatorio(relatorio)}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Visualizar
                  </Button>
                  {relatorio.pdf_url && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(relatorio.pdf_url, '_blank')}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download PDF
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:text-red-700"
                    onClick={() => handleExcluirRelatorio(relatorio.id)}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Excluir
                  </Button>
                </div>
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
              <div
                key={relatorio.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
              >
                <div>
                  <p className="font-medium">
                    {format(parseISO(relatorio.data_inicio), "dd/MM/yyyy")} - {format(parseISO(relatorio.data_fim), "dd/MM/yyyy")}
                  </p>
                  <p className="text-sm text-gray-500">
                    Gerado em: {format(parseISO(relatorio.created_at), "dd/MM/yyyy HH:mm")}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleVisualizarRelatorio(relatorio)}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Visualizar
                  </Button>
                  {relatorio.pdf_url && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(relatorio.pdf_url, '_blank')}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download PDF
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:text-red-700"
                    onClick={() => handleExcluirRelatorio(relatorio.id)}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Excluir
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};

export default Relatorios;
