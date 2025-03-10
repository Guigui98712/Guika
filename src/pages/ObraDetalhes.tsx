import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, Building2, Calendar as CalendarIcon, DollarSign, FileText, Plus, Pencil, CalendarDays, AlertCircle } from 'lucide-react';
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
import { obterQuadroObra } from '@/lib/trello-local';

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
  responsavel?: string;
  trello_board_id?: string;
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
  const [numeroPendencias, setNumeroPendencias] = useState(0);

  const calcularProgresso = (registros: DiarioRegistro[]) => {
    try {
      const todasEtapas = [
        'Serviços Preliminares', 'Terraplenagem', 'Fundação', 'Alvenaria', 'Estrutura',
        'Passagens Elétricas', 'Passagens Hidráulicas', 'Laje', 'Cobertura',
        'Instalações Elétricas', 'Instalações Hidráulicas', 'Reboco', 'Regularização',
        'Revestimento', 'Gesso', 'Marmoraria', 'Pintura', 'Esquadrias', 'Limpeza Bruta',
        'Marcenaria', 'Metais', 'Limpeza Final'
      ];

      const etapasStatus: { [key: string]: 'pendente' | 'em_andamento' | 'concluida' } = {};
      todasEtapas.forEach(etapa => {
        etapasStatus[etapa] = 'pendente';
      });

      registros.forEach(registro => {
        registro.etapas_iniciadas?.forEach(etapa => {
          if (etapasStatus[etapa] !== 'concluida') {
            etapasStatus[etapa] = 'em_andamento';
          }
        });

        registro.etapas_concluidas?.forEach(etapa => {
          etapasStatus[etapa] = 'concluida';
        });
      });

      const etapasConcluidas = Object.values(etapasStatus).filter(status => status === 'concluida').length;
      return Math.round((etapasConcluidas / todasEtapas.length) * 100);
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

      const obraData = await buscarObra(Number(id));
      if (!obraData) {
        throw new Error('Obra não encontrada');
      }
      
      setObra(obraData);
      setEtapas(obraData.etapas || []);

      const registros = await listarRegistrosDiario(Number(id));
      setRegistrosDiario(registros);
      
      const datas = registros.map(reg => parseISO(reg.data));
      setDatasComRegistro(datas);

    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      setError(error instanceof Error ? error.message : 'Erro ao carregar dados da obra');
      toast({
        title: "Erro ao carregar obra",
        description: error instanceof Error ? error.message : 'Não foi possível carregar os dados da obra. Verifique sua conexão e tente novamente.',
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
          title: "Erro ao carregar etapas",
          description: "Não foi possível carregar o status das etapas. Algumas informações podem estar incompletas.",
          variant: "destructive"
        });
      }
    };

    if (id) {
      carregarStatusEtapas();
    }
  }, [id]);

  useEffect(() => {
    if (obra) {
      carregarPendencias();
    }
  }, [obra]);

  const carregarPendencias = async () => {
    try {
      if (!obra) return;

      const quadro = await obterQuadroObra(obra.id);
      const pendentes = quadro.lists.find(l => l.title === 'A Fazer')?.cards || [];
      const emAndamento = quadro.lists.find(l => l.title === 'Em Andamento')?.cards || [];
      
      setNumeroPendencias(pendentes.length + emAndamento.length);
    } catch (error) {
      console.error('Erro ao carregar pendências:', error);
    }
  };

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

  const handleVoltar = () => {
    navigate('/obras');
  };

  const handleDiarioClick = () => {
    navigate(`/obras/${id}/diario`);
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

  const progressoGeral = calcularProgresso(registrosDiario);

  return (
    <div className="space-y-8 p-6 max-w-7xl mx-auto">
      <div className="grid grid-cols-1 gap-6 mt-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold">{obra?.nome}</h2>
              <p className="text-gray-600">{obra?.endereco}</p>
            </div>
            <div className="flex gap-4">
              <Button variant="outline" onClick={handleVoltar}>
                Voltar
              </Button>
              <Button onClick={handleDiarioClick}>
                <CalendarDays className="w-4 h-4 mr-2" />
                Diário de Obra
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="p-4 bg-gray-50 rounded-lg">
              <h3 className="text-sm font-medium text-gray-500">Status</h3>
              <p className="mt-1 text-lg font-semibold">{obra?.status || 'Em Andamento'}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <h3 className="text-sm font-medium text-gray-500">Responsável</h3>
              <p className="mt-1 text-lg font-semibold">{obra?.responsavel || 'Não informado'}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <h3 className="text-sm font-medium text-gray-500">Progresso Geral</h3>
              <div className="mt-1">
                <Progress value={progressoGeral} className="h-2" />
                <p className="mt-1 text-sm text-gray-600">{progressoGeral}% concluído</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div 
              className="p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors" 
              onClick={() => navigate(`/obras/${id}/pendencias`)}
            >
              <h3 className="text-sm font-medium text-gray-500">Pendências</h3>
              <div className="mt-1 flex items-center justify-between">
                <p className="text-lg font-semibold">{numeroPendencias}</p>
                <AlertCircle className={`w-5 h-5 ${numeroPendencias > 0 ? 'text-yellow-500' : 'text-green-500'}`} />
              </div>
              <p className="text-sm text-gray-500 mt-1">
                {numeroPendencias === 0 
                  ? 'Nenhuma pendência' 
                  : numeroPendencias === 1 
                    ? '1 pendência' 
                    : `${numeroPendencias} pendências`}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4">Fluxograma da Obra</h3>
          <div className="relative">
            <FluxogramaObra registros={registrosDiario} />
          </div>
        </div>
      </div>

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