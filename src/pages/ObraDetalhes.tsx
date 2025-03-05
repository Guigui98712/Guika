import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, Building2, Calendar as CalendarIcon, DollarSign, FileText, Plus, Pencil } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis } from 'recharts';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { supabase } from '@/lib/supabase';
import FluxogramaObra from '@/components/FluxogramaObra';
import { format, addDays, startOfWeek, endOfWeek, addWeeks, subWeeks, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { buscarObra, listarRegistrosDiario, gerarRelatorioSemanal, atualizarObra } from '@/lib/api';
import { useToast } from '@/components/ui/use-toast';
import GraficoEtapas from '@/components/GraficoEtapas';

interface DiarioRegistro {
  id: number;
  data: string;
  descricao: string;
  observacoes: string;
  fotos: string[];
  obra_id: number;
  etapas_iniciadas: string[];
  etapas_concluidas: string[];
  etapas_info?: {
    [etapa: string]: {
      data_inicio?: string;
      data_conclusao?: string;
      duracao_dias?: number;
    };
  };
}

interface Obra {
  id: number;
  nome: string;
  endereco: string;
  data_inicio: string;
  data_fim_prevista: string;
  status: string;
  progresso: number;
  custo_previsto: number;
  custo_real: number;
}

interface EtapaComDatas {
  etapa_nome: string;
  data_inicio: string;
  data_fim?: string;
  status: 'em_andamento' | 'concluida';
}

const ObraDetalhes = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [obra, setObra] = useState<Obra | null>(null);
  const [etapas, setEtapas] = useState<EtapaComDatas[]>([]);
  const [registrosDiario, setRegistrosDiario] = useState<DiarioRegistro[]>([]);
  const [datasComRegistro, setDatasComRegistro] = useState<Date[]>([]);
  const [data, setData] = useState<Date>(new Date());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const [etapasStatus, setEtapasStatus] = useState<{[key: string]: 'pendente' | 'em_andamento' | 'concluida'}>({});

  const calcularProgresso = async (registros: DiarioRegistro[]) => {
    try {
      // Processa os registros para determinar o status atual de cada etapa
      const etapasStatus: { [key: string]: 'pendente' | 'em_andamento' | 'concluida' } = {};
      const todasEtapas = [
        'Serviços Preliminares', 'Terraplenagem', 'Fundação', 'Alvenaria', 'Estrutura',
        'Passagens Elétricas', 'Passagens Hidráulicas', 'Laje', 'Cobertura',
        'Instalações Elétricas', 'Instalações Hidráulicas', 'Reboco', 'Regularização',
        'Revestimento', 'Gesso', 'Marmoraria', 'Pintura', 'Esquadrias', 'Limpeza Bruta',
        'Marcenaria', 'Metais', 'Limpeza Final'
      ];

      // Inicializa todas as etapas como pendentes
      todasEtapas.forEach(etapa => {
        etapasStatus[etapa] = 'pendente';
      });

      // Atualiza o status das etapas baseado nos registros
      for (const registro of registros) {
        registro.etapas_iniciadas?.forEach(etapa => {
          if (etapasStatus[etapa] !== 'concluida') {
            etapasStatus[etapa] = 'em_andamento';
          }
        });

        registro.etapas_concluidas?.forEach(etapa => {
          etapasStatus[etapa] = 'concluida';
        });
      }

      // Calcula o progresso baseado nas etapas concluídas
      const etapasConcluidas = Object.values(etapasStatus).filter(status => status === 'concluida').length;
      const progresso = Math.round((etapasConcluidas / todasEtapas.length) * 100);
      
      return progresso;
    } catch (error) {
      console.error('Erro ao calcular progresso:', error);
      return 0;
    }
  };

  useEffect(() => {
    if (!id) {
      toast({
        title: "Erro",
        description: "ID da obra não fornecido",
        variant: "destructive"
      });
      navigate('/obras');
      return;
    }
    carregarDados();
  }, [id]);

  const carregarDados = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Carregando dados da obra:', id);

      const obraData = await buscarObra(Number(id));
      if (!obraData) {
        throw new Error('Obra não encontrada');
      }
      
      console.log('Dados da obra carregados:', obraData);
      setObra(obraData);
      setEtapas(obraData.etapas || []);

      // Carregar registros do diário
      console.log('Carregando registros do diário...');
      const registros = await listarRegistrosDiario(Number(id));
      console.log('Registros carregados:', registros);
      setRegistrosDiario(registros);
      
      // Atualizar datas com registro
      const datas = registros.map(reg => parseISO(reg.data));
      setDatasComRegistro(datas);

      // Calcular progresso baseado nos registros do diário
      const novoProgresso = await calcularProgresso(registros);
      console.log('Novo progresso calculado:', novoProgresso);

      // Se o progresso calculado for diferente do progresso armazenado, atualiza
      if (novoProgresso !== obraData.progresso) {
        console.log('Atualizando progresso:', { novoProgresso, progressoAtual: obraData.progresso });
        const obraAtualizada = await atualizarObra(Number(id), { progresso: novoProgresso });
        setObra(obraAtualizada);
      }

    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      setError(error instanceof Error ? error.message : 'Erro ao carregar dados da obra');
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : 'Não foi possível carregar os dados da obra',
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const carregarStatusEtapas = async () => {
      try {
        console.log('Carregando status das etapas...');
        const { data: etapasDatas, error } = await supabase
          .from('etapas_datas')
          .select('etapa_nome, status')
          .eq('obra_id', Number(id));

        if (error) {
          console.error('Erro ao carregar status das etapas:', error);
          throw error;
        }

        if (etapasDatas) {
          const statusMap = etapasDatas.reduce((acc, etapa) => ({
            ...acc,
            [etapa.etapa_nome]: etapa.status || 'pendente'
          }), {} as { [key: string]: 'pendente' | 'em_andamento' | 'concluida' });

          // Garantir que todas as etapas do fluxograma tenham um status
          const todasEtapas = [
            'Serviços Preliminares', 'Terraplenagem', 'Fundação', 'Alvenaria', 'Estrutura',
            'Passagens Elétricas', 'Passagens Hidráulicas', 'Laje', 'Cobertura',
            'Instalações Elétricas', 'Instalações Hidráulicas', 'Reboco', 'Regularização',
            'Revestimento', 'Gesso', 'Marmoraria', 'Pintura', 'Esquadrias', 'Limpeza Bruta',
            'Marcenaria', 'Metais', 'Limpeza Final'
          ];

          const statusMapCompleto = todasEtapas.reduce((acc, etapa) => ({
            ...acc,
            [etapa]: statusMap[etapa] || 'pendente'
          }), {} as { [key: string]: 'pendente' | 'em_andamento' | 'concluida' });
          
          console.log('Status das etapas carregado:', statusMapCompleto);
          setEtapasStatus(statusMapCompleto);
        }
      } catch (error) {
        console.error('Erro ao carregar status das etapas:', error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar o status das etapas.",
          variant: "destructive"
        });
      }
    };

    if (id) {
      carregarStatusEtapas();
    }
  }, [id]);

  const CORES_STATUS = {
    concluido: "#4CAF50",
    em_andamento: "#FFC107",
    pendente: "#F44336"
  };

  const dadosCustoPorEtapa = etapas.map(etapa => ({
    name: etapa.nome,
    value: etapa.custo,
    status: etapa.status
  }));

  const dadosCustoTotal = [
    { name: "Realizado", value: obra?.custoReal || 0 },
    { name: "Restante", value: (obra?.custoPrevisto || 0) - (obra?.custoReal || 0) }
  ];

  const tileClassName = ({ date }: { date: Date }) => {
    return datasComRegistro.some(d => 
      d.getDate() === date.getDate() && 
      d.getMonth() === date.getMonth() && 
      d.getFullYear() === date.getFullYear()
    ) ? 'bg-blue-100' : '';
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
        <p className="text-gray-600">Carregando dados da obra...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <p className="text-red-600 mb-4">{error}</p>
        <div className="flex gap-4">
          <Button onClick={() => navigate('/obras')}>
            Voltar para Obras
          </Button>
          <Button onClick={carregarDados}>
            Tentar Novamente
          </Button>
        </div>
      </div>
    );
  }

  if (!obra) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <p className="text-gray-600 mb-4">Obra não encontrada</p>
        <Button onClick={() => navigate('/obras')}>
          Voltar para Obras
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6 max-w-7xl mx-auto">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/obras')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold text-gray-800">{obra.nome}</h1>
        </div>
        <Button
          onClick={() => navigate(`/obras/${id}/diario`)}
          className="bg-primary hover:bg-primary-dark"
        >
          <CalendarIcon className="w-4 h-4 mr-2" />
          Diário de Obra
        </Button>
      </div>

      {/* Seção 1 - Informações Gerais */}
      <Card className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <h3 className="font-medium text-gray-600">Endereço</h3>
            <p className="text-lg">{obra.endereco}</p>
          </div>
          <div>
            <h3 className="font-medium text-gray-600">Status</h3>
            <p className="capitalize">{obra.status.replace('_', ' ')}</p>
          </div>
          <div>
            <h3 className="font-medium text-gray-600">Progresso Geral</h3>
            <Progress value={obra.progresso} className="mt-2" />
            <p className="text-sm text-right mt-1">{obra.progresso}%</p>
          </div>
        </div>
      </Card>

      {/* Seção 2 - Gráficos de Custo */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Custo por Etapa</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={dadosCustoPorEtapa}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                >
                  {dadosCustoPorEtapa.map((entry, index) => (
                    <Cell key={index} fill={CORES_STATUS[entry.status]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Custo Total</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={dadosCustoTotal}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                >
                  <Cell fill="#4CAF50" />
                  <Cell fill="#F44336" />
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Seção 3 - Etapas e Fluxograma */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Fluxograma da Obra</h3>
        <FluxogramaObra registros={registrosDiario} />
      </Card>

      {/* Análise de Duração */}
      <Card className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold">Análise de Duração das Etapas</h2>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-end space-x-2">
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-[#22c55e] mr-2"></div>
              <span className="text-sm">Concluída</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-[#eab308] mr-2"></div>
              <span className="text-sm">Em Andamento</span>
            </div>
          </div>
          <GraficoEtapas registros={registrosDiario} />
        </div>
      </Card>

      {/* Seção 4 - Calendário */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Diário de Obra</h3>
        <div className="flex justify-center">
          <Calendar
            tileClassName={tileClassName}
            className="border rounded-lg p-4"
          />
        </div>
      </Card>

      {/* Seção 5 - Relatórios Semanais */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Relatórios Semanais</h3>
        <div className="space-y-4">
          {registrosDiario.length === 0 ? (
            <div className="flex justify-center items-center h-24 text-gray-500">
              Nenhum relatório disponível ainda
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              <Button 
                variant="outline" 
                className="w-full flex justify-between items-center"
                onClick={() => navigate(`/obras/${id}/relatorios`)}
              >
                <span>Ver Relatórios</span>
                <FileText className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* Seção 6 - Relatório Final */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Relatório Final</h3>
        <div className="flex justify-center">
          <Button variant="outline" disabled={true}>
            <FileText className="w-4 h-4 mr-2" />
            Gerar Relatório Final
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default ObraDetalhes; 