import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/lib/supabase';
import { useParams, useNavigate } from 'react-router-dom';
import { buscarObra, salvarRegistroDiario, listarRegistrosDiario, excluirRegistroDiario, atualizarRegistroDiario, uploadFoto } from '@/lib/api';
import { useToast } from '@/components/ui/use-toast';
import { ArrowLeft, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { FaCamera } from 'react-icons/fa';
import { differenceInDays } from 'date-fns';

interface Etapa {
  id: number;
  nome: string;
  status: 'pendente' | 'em_andamento' | 'concluido';
  created_at: string;
  obra_id: number;
}

interface RegistroDiario {
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

const ETAPAS_FLUXOGRAMA = [
  'Serviços Preliminares',
  'Terraplenagem',
  'Fundação',
  'Alvenaria',
  'Estrutura',
  'Passagens Elétricas',
  'Passagens Hidráulicas',
  'Laje',
  'Cobertura',
  'Instalações Elétricas',
  'Instalações Hidráulicas',
  'Reboco',
  'Regularização',
  'Revestimento',
  'Gesso',
  'Marmoraria',
  'Pintura',
  'Esquadrias',
  'Limpeza Bruta',
  'Marcenaria',
  'Metais',
  'Limpeza Final'
];

const DiarioObra = () => {
  const { id: obraId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Inicializa a data como hoje à meia-noite no fuso horário local
  const [data, setData] = useState<Date>(() => {
    const hoje = new Date();
    // Garantir que a data seja criada sem problemas de fuso horário
    return new Date(Date.UTC(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 12, 0, 0));
  });
  
  const [descricao, setDescricao] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [fotos, setFotos] = useState<File[]>([]);
  const [registrosAnteriores, setRegistrosAnteriores] = useState<RegistroDiario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [registroSelecionado, setRegistroSelecionado] = useState<RegistroDiario | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [registroEmEdicao, setRegistroEmEdicao] = useState<RegistroDiario | null>(null);
  const [etapasIniciadas, setEtapasIniciadas] = useState<string[]>([]);
  const [etapasConcluidas, setEtapasConcluidas] = useState<string[]>([]);
  const [etapasDisponiveis, setEtapasDisponiveis] = useState<string[]>([]);
  const [etapasEmAndamento, setEtapasEmAndamento] = useState<string[]>([]);

  useEffect(() => {
    const init = async () => {
      try {
        if (!obraId) {
          toast({
            title: "Erro",
            description: "ID da obra não fornecido",
            variant: "destructive"
          });
          navigate('/obras');
          return;
        }
        await carregarDados();
      } catch (error) {
        console.error('Erro na inicialização:', error);
        setError('Erro ao inicializar a página');
      }
    };
    
    init();
  }, [obraId]);

  useEffect(() => {
    const atualizarEtapasDisponiveis = () => {
      // Todas as etapas que já foram iniciadas em registros anteriores
      const todasEtapasIniciadas = registrosAnteriores.flatMap(reg => reg.etapas_iniciadas || []);
      // Todas as etapas que já foram concluídas
      const todasEtapasConcluidas = registrosAnteriores.flatMap(reg => reg.etapas_concluidas || []);
      
      // Etapas que estão em andamento (iniciadas mas não concluídas)
      const emAndamento = todasEtapasIniciadas.filter(etapa => !todasEtapasConcluidas.includes(etapa));
      
      // Etapas disponíveis para iniciar (não iniciadas ainda)
      const disponiveis = ETAPAS_FLUXOGRAMA.filter(etapa => !todasEtapasIniciadas.includes(etapa));
      
      setEtapasEmAndamento(emAndamento);
      setEtapasDisponiveis(disponiveis);
    };

    atualizarEtapasDisponiveis();
  }, [registrosAnteriores]);

  const carregarDados = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('[DEBUG] Carregando dados para obra:', obraId);

      if (!obraId) {
        throw new Error('ID da obra não fornecido');
      }

      const registros = await listarRegistrosDiario(Number(obraId));
      console.log('[DEBUG] Registros carregados:', registros);
      
      if (!Array.isArray(registros)) {
        throw new Error('Formato de dados inválido');
      }
      
      const registrosProcessados = registros.map(reg => ({
        ...reg,
        fotos: Array.isArray(reg.fotos) ? reg.fotos : []
      }));
      
      setRegistrosAnteriores(registrosProcessados);

    } catch (error) {
      console.error('[DEBUG] Erro ao carregar dados:', error);
      const mensagem = error instanceof Error ? error.message : 'Erro ao carregar os registros do diário';
      setError(mensagem);
      toast({
        title: "Erro",
        description: mensagem,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSalvar = async () => {
    if (!obraId || !descricao.trim()) {
      toast({
        title: "Erro",
        description: "Por favor, preencha a descrição da atividade.",
        variant: "destructive"
      });
      return;
    }

    try {
      setSalvando(true);
      console.log('[DEBUG] Iniciando salvamento do registro');
      
      const fotosUrls = [];
      for (const foto of fotos) {
        try {
          const resultado = await uploadFoto(foto, 'diario');
          fotosUrls.push(resultado.url);
        } catch (error) {
          console.error('[DEBUG] Erro ao fazer upload da foto:', error);
          toast({
            title: "Erro",
            description: "Erro ao fazer upload de uma ou mais fotos.",
            variant: "destructive"
          });
        }
      }
      
      // Formata a data mantendo o dia correto, usando UTC para evitar problemas de fuso horário
      const dataObj = new Date(data);
      // Garantir que a data seja formatada corretamente no formato ISO
      const dataFormatada = format(new Date(Date.UTC(dataObj.getFullYear(), dataObj.getMonth(), dataObj.getDate(), 12, 0, 0)), 'yyyy-MM-dd');
      console.log('[DEBUG] Data original:', data);
      console.log('[DEBUG] Data formatada:', dataFormatada);
      
      const registro = {
        obra_id: Number(obraId),
        data: dataFormatada,
        descricao: descricao.trim(),
        observacoes: observacoes.trim() || null,
        fotos: fotosUrls,
        etapas_iniciadas: etapasIniciadas,
        etapas_concluidas: etapasConcluidas
      };

      console.log('[DEBUG] Registro a ser salvo:', JSON.stringify(registro, null, 2));
      
      try {
        const resultado = await salvarRegistroDiario(registro);
        console.log('[DEBUG] Resultado do salvamento:', resultado);
        await carregarDados();
        
        setDescricao('');
        setObservacoes('');
        setFotos([]);
        setEtapasIniciadas([]);
        setEtapasConcluidas([]);

        toast({
          title: "Sucesso",
          description: "Registro salvo com sucesso!",
        });
      } catch (err: any) {
        console.error('[DEBUG] Erro específico ao salvar no Supabase:', err);
        toast({
          title: "Erro no Banco de Dados",
          description: `Não foi possível salvar o registro: ${err.message || 'Erro desconhecido'}`,
          variant: "destructive"
        });
      }
    } catch (error: any) {
      console.error('[DEBUG] Erro geral ao salvar:', error);
      toast({
        title: "Erro",
        description: `Não foi possível salvar o registro: ${error.message || 'Erro desconhecido'}`,
        variant: "destructive"
      });
    } finally {
      setSalvando(false);
    }
  };

  const handleEditarRegistro = (registro: RegistroDiario) => {
    setRegistroEmEdicao(registro);
    setShowEditDialog(true);
  };

  const handleSalvarEdicao = async () => {
    if (!registroEmEdicao || !obraId) return;

    try {
      await atualizarRegistroDiario(registroEmEdicao.id, {
        ...registroEmEdicao,
        obra_id: Number(obraId)
      });
      await carregarDados();
      setShowEditDialog(false);
      setRegistroEmEdicao(null);
      
      toast({
        title: "Sucesso",
        description: "Registro atualizado com sucesso!",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o registro.",
        variant: "destructive"
      });
    }
  };

  const handleExcluirRegistro = async (registro: RegistroDiario) => {
    if (!confirm('Tem certeza que deseja excluir este registro?')) return;

    try {
      await excluirRegistroDiario(registro.id);
      await carregarDados();
      
      toast({
        title: "Sucesso",
        description: "Registro excluído com sucesso!",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível excluir o registro.",
        variant: "destructive"
      });
    }
  };

  const handleDiaClick = (date: Date | undefined) => {
    if (!date) return;
    
    // Ajustar para meio-dia UTC para evitar problemas de fuso horário
    const dataAjustada = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0));
    console.log('[DEBUG] Data selecionada:', date);
    console.log('[DEBUG] Data ajustada:', dataAjustada);
    
    setData(dataAjustada);
    
    // Verificar se já existe um registro para esta data
    const dataFormatada = format(dataAjustada, 'yyyy-MM-dd');
    const registroExistente = registrosAnteriores.find(r => r.data === dataFormatada);
    
    if (registroExistente) {
      setRegistroSelecionado(registroExistente);
    } else {
      setRegistroSelecionado(null);
    }
  };

  const handleDateInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dateStr = e.target.value;
    if (!dateStr) return;
    
    // Criar data a partir da string, ajustando para meio-dia UTC
    const dateParts = dateStr.split('-').map(Number);
    const novaData = new Date(Date.UTC(dateParts[0], dateParts[1] - 1, dateParts[2], 12, 0, 0));
    console.log('[DEBUG] Nova data do input:', novaData);
    
    setData(novaData);
    
    // Verificar se já existe um registro para esta data
    const registroExistente = registrosAnteriores.find(r => r.data === dateStr);
    
    if (registroExistente) {
      setRegistroSelecionado(registroExistente);
    } else {
      setRegistroSelecionado(null);
    }
  };

  const tileClassName = ({ date }: { date: Date }) => {
    // Formata a data mantendo o dia correto
    const dataFormatada = format(date, 'yyyy-MM-dd');
    
    return registrosAnteriores.some(reg => reg.data === dataFormatada)
      ? 'bg-primary/20 hover:bg-primary/30 cursor-pointer'
      : '';
  };

  const handleEtapasIniciadasChange = (novasEtapas: string[]) => {
    try {
      setEtapasIniciadas(novasEtapas);
      
      // Atualiza a descrição automaticamente com as etapas iniciadas
      const etapasAdicionadas = novasEtapas.filter(etapa => !etapasIniciadas.includes(etapa));
      if (etapasAdicionadas.length > 0) {
        const novaDescricao = descricao + (descricao ? '\n\n' : '') + 
          etapasAdicionadas.map(etapa => `Iniciada a etapa: ${etapa}`).join('\n');
        setDescricao(novaDescricao);
      }
    } catch (error) {
      console.error('[DEBUG] Erro ao atualizar etapas iniciadas:', error);
    }
  };

  const handleEtapasConcluidasChange = (novasEtapas: string[]) => {
    try {
      setEtapasConcluidas(novasEtapas);
      
      // Atualiza a descrição automaticamente com as etapas concluídas
      const etapasFinalizadas = novasEtapas.filter(etapa => !etapasConcluidas.includes(etapa));
      if (etapasFinalizadas.length > 0) {
        const dataAtual = format(data, 'yyyy-MM-dd');
        
        // Encontra a data de início de cada etapa
        const etapasInfo = etapasFinalizadas.map(etapa => {
          const registroInicio = registrosAnteriores.find(reg => 
            reg.etapas_iniciadas?.includes(etapa)
          );
          
          if (registroInicio) {
            const dataInicio = parseISO(registroInicio.data);
            const duracao = differenceInDays(parseISO(dataAtual), dataInicio) + 1;
            return `Concluída a etapa: ${etapa} (Duração: ${duracao} dias)`;
          }
          return `Concluída a etapa: ${etapa}`;
        });
        
        const novaDescricao = descricao + (descricao ? '\n\n' : '') + etapasInfo.join('\n');
        setDescricao(novaDescricao);
      }
    } catch (error) {
      console.error('[DEBUG] Erro ao atualizar etapas concluídas:', error);
    }
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <div className="text-red-600 mb-4">{error}</div>
        <div className="flex gap-4">
          <Button onClick={() => navigate('/obras')}>
            Voltar para Obras
          </Button>
          <Button onClick={() => window.location.reload()}>
            Tentar Novamente
          </Button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
        <p className="text-gray-600">Carregando dados...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6 max-w-4xl mx-auto">
      <div className="flex items-center space-x-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(`/obras/${obraId}`)}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-3xl font-bold text-gray-800">Diário de Obra</h1>
      </div>

      {/* Calendário */}
      <Card className="p-6">
        <div className="flex flex-col items-center">
          <h2 className="text-2xl font-semibold mb-6">Calendário de Registros</h2>
          <div className="w-full max-w-3xl">
            <Calendar
              mode="single"
              selected={data}
              onSelect={handleDiaClick}
              className="w-full rounded-lg border-2 border-primary/20 p-6 bg-white shadow-lg"
              locale={ptBR}
              modifiers={{ 
                hasRegistro: (date) => {
                  try {
                    const dataFormatada = format(date, 'yyyy-MM-dd');
                    return registrosAnteriores.some(reg => reg.data === dataFormatada);
                  } catch (error) {
                    console.error('Erro ao verificar registros:', error);
                    return false;
                  }
                }
              }}
              modifiersClassNames={{
                hasRegistro: 'bg-primary text-primary-foreground font-bold hover:bg-primary/80',
                today: 'bg-secondary/20 font-bold border-2 border-secondary',
                selected: 'bg-primary/80 text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground'
              }}
              defaultMonth={data}
              fromDate={new Date(2024, 0, 1)}
              toDate={new Date(2025, 11, 31)}
              disabled={(date) => date > new Date()}
            />
          </div>
          <div className="flex items-center justify-center space-x-4 mt-4">
            <div className="flex items-center">
              <div className="w-4 h-4 rounded-full bg-primary mr-2"></div>
              <span className="text-sm">Com Registro</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 rounded-full bg-secondary/20 border-2 border-secondary mr-2"></div>
              <span className="text-sm">Hoje</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Formulário */}
      <Card className="p-6 space-y-6">
        <div>
          <Label>Data do Registro</Label>
          <Input
            type="date"
            value={format(data, 'yyyy-MM-dd')}
            onChange={handleDateInputChange}
            className="mt-1 w-full"
            max={format(new Date(), 'yyyy-MM-dd')} // Impede seleção de datas futuras
          />
        </div>

        <div>
          <Label>Descrição da Atividade</Label>
          <Textarea
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            className="mt-1"
            placeholder="Descreva as atividades realizadas neste dia..."
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Iniciar Etapas</Label>
            <Select
              value={etapasIniciadas}
              onValueChange={(value) => {
                try {
                  handleEtapasIniciadasChange([...etapasIniciadas, value]);
                } catch (error) {
                  console.error('[DEBUG] Erro ao selecionar etapa:', error);
                }
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione as etapas para iniciar" />
              </SelectTrigger>
              <SelectContent>
                {etapasDisponiveis.map((etapa) => (
                  <SelectItem key={etapa} value={etapa} onSelect={(e) => e.preventDefault()}>
                    {etapa}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {etapasIniciadas.length > 0 && (
              <div className="mt-2">
                <p className="text-sm font-medium mb-1">Etapas selecionadas para iniciar:</p>
                <div className="flex flex-wrap gap-2">
                  {etapasIniciadas.map((etapa) => (
                    <div key={etapa} className="bg-primary/10 text-primary text-sm px-2 py-1 rounded-md flex items-center">
                      {etapa}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          setEtapasIniciadas(etapasIniciadas.filter(e => e !== etapa));
                        }}
                        className="ml-2 hover:text-red-600"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div>
            <Label>Concluir Etapas</Label>
            <Select
              value={etapasConcluidas}
              onValueChange={(value) => {
                try {
                  handleEtapasConcluidasChange([...etapasConcluidas, value]);
                } catch (error) {
                  console.error('[DEBUG] Erro ao selecionar etapa:', error);
                }
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione as etapas para concluir" />
              </SelectTrigger>
              <SelectContent>
                {etapasEmAndamento.map((etapa) => (
                  <SelectItem key={etapa} value={etapa} onSelect={(e) => e.preventDefault()}>
                    {etapa}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {etapasConcluidas.length > 0 && (
              <div className="mt-2">
                <p className="text-sm font-medium mb-1">Etapas selecionadas para concluir:</p>
                <div className="flex flex-wrap gap-2">
                  {etapasConcluidas.map((etapa) => (
                    <div key={etapa} className="bg-green-100 text-green-700 text-sm px-2 py-1 rounded-md flex items-center">
                      {etapa}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          setEtapasConcluidas(etapasConcluidas.filter(e => e !== etapa));
                        }}
                        className="ml-2 hover:text-red-600"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div>
          <Label>Observações</Label>
          <Textarea
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
            className="mt-1"
            placeholder="Adicione observações adicionais aqui..."
          />
        </div>

        <div>
          <Label>Fotos</Label>
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {fotos.map((foto, index) => (
                <div key={index} className="relative aspect-square">
                  <img
                    src={URL.createObjectURL(foto)}
                    alt={`Foto ${index + 1}`}
                    className="w-full h-full object-cover rounded-lg"
                  />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2"
                    onClick={() => setFotos(fotos.filter((_, i) => i !== index))}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            <div className="flex items-center space-x-4">
              <Input
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => {
                  if (e.target.files) {
                    setFotos([...fotos, ...Array.from(e.target.files)]);
                  }
                }}
                className="flex-1"
              />
              {fotos.length > 0 && (
                <Button
                  variant="outline"
                  onClick={() => setFotos([])}
                >
                  Limpar Fotos
                </Button>
              )}
            </div>
          </div>
        </div>

        <Button 
          onClick={handleSalvar} 
          className="w-full"
          disabled={salvando}
        >
          {salvando ? 'Salvando...' : 'Salvar Registro'}
        </Button>
      </Card>

      {/* Registros Anteriores */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Registros Anteriores</h2>
        {registrosAnteriores.length === 0 ? (
          <div className="flex justify-center items-center h-[200px] text-gray-500">
            Nenhum registro disponível
          </div>
        ) : (
          <div className="space-y-4">
            {registrosAnteriores.map((registro) => (
              <Card key={registro.id} className="p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="font-medium">
                      {format(parseISO(registro.data), "dd 'de' MMMM 'de' yyyy", {
                        locale: ptBR,
                      })}
                    </p>
                    <p className="text-sm text-gray-600 mt-2">
                      <strong>Descrição:</strong> {registro.descricao}
                    </p>
                    {registro.observacoes && (
                      <p className="text-sm text-gray-600 mt-2">
                        <strong>Observações:</strong> {registro.observacoes}
                      </p>
                    )}
                    {registro.etapas_iniciadas && registro.etapas_iniciadas.length > 0 && (
                      <div className="mt-2">
                        <p className="text-sm font-medium text-primary">Etapas Iniciadas:</p>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {registro.etapas_iniciadas.map((etapa) => (
                            <span key={etapa} className="bg-primary/10 text-primary text-sm px-2 py-1 rounded-md">
                              {etapa}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {registro.etapas_concluidas && registro.etapas_concluidas.length > 0 && (
                      <div className="mt-2">
                        <p className="text-sm font-medium text-green-700">Etapas Concluídas:</p>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {registro.etapas_concluidas.map((etapa) => (
                            <span key={etapa} className="bg-green-100 text-green-700 text-sm px-2 py-1 rounded-md">
                              {etapa}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {registro.fotos && registro.fotos.length > 0 && (
                      <div className="mt-4">
                        <p className="text-sm text-gray-600 mb-2">
                          <strong>Fotos:</strong> {registro.fotos.length} foto(s)
                        </p>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {registro.fotos.map((foto, index) => (
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
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEditarRegistro(registro)}>
                        <Pencil className="w-4 h-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleExcluirRegistro(registro)}
                        className="text-red-600"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </Card>
            ))}
          </div>
        )}
      </Card>

      {/* Dialog de Edição */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Registro</DialogTitle>
          </DialogHeader>
          {registroEmEdicao && (
            <div className="space-y-4">
              <div>
                <Label>Data</Label>
                <Input
                  type="date"
                  value={registroEmEdicao.data}
                  onChange={(e) => setRegistroEmEdicao({
                    ...registroEmEdicao,
                    data: e.target.value
                  })}
                />
              </div>
              <div>
                <Label>Descrição</Label>
                <Textarea
                  value={registroEmEdicao.descricao}
                  onChange={(e) => setRegistroEmEdicao({
                    ...registroEmEdicao,
                    descricao: e.target.value
                  })}
                />
              </div>
              <div>
                <Label>Observações</Label>
                <Textarea
                  value={registroEmEdicao.observacoes}
                  onChange={(e) => setRegistroEmEdicao({
                    ...registroEmEdicao,
                    observacoes: e.target.value
                  })}
                />
              </div>

              {/* Upload de Novas Fotos */}
              <div>
                <Label>Adicionar Novas Fotos</Label>
                <div className="space-y-4">
                  <Input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={async (e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        const novasUrls = [];
                        for (const foto of Array.from(e.target.files)) {
                          try {
                            console.log('[DEBUG] Iniciando upload de nova foto na edição:', foto.name);
                            const resultado = await uploadFoto(foto, 'diario');
                            novasUrls.push(resultado.url);
                          } catch (error) {
                            console.error('[DEBUG] Erro ao fazer upload da foto na edição:', error);
                            toast({
                              title: "Erro",
                              description: "Erro ao fazer upload de uma ou mais fotos.",
                              variant: "destructive"
                            });
                          }
                        }
                        
                        setRegistroEmEdicao({
                          ...registroEmEdicao,
                          fotos: [...(registroEmEdicao.fotos || []), ...novasUrls]
                        });
                      }
                    }}
                  />
                </div>
              </div>

              <Button onClick={handleSalvarEdicao} className="w-full">
                Salvar Alterações
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog de Visualização */}
      <Dialog open={!!registroSelecionado} onOpenChange={() => setRegistroSelecionado(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Registro do dia {registroSelecionado && format(parseISO(registroSelecionado.data), "dd 'de' MMMM 'de' yyyy", {
                locale: ptBR,
              })}
            </DialogTitle>
          </DialogHeader>
          {registroSelecionado && (
            <div className="space-y-4">
              <div>
                <Label>Descrição</Label>
                <p className="mt-1 text-sm">{registroSelecionado.descricao}</p>
              </div>
              {registroSelecionado.observacoes && (
                <div>
                  <Label>Observações</Label>
                  <p className="mt-1 text-sm">{registroSelecionado.observacoes}</p>
                </div>
              )}
              {registroSelecionado.fotos && registroSelecionado.fotos.length > 0 && (
                <div>
                  <Label>Fotos ({registroSelecionado.fotos.length})</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-2">
                    {registroSelecionado.fotos.map((foto, index) => (
                      <div key={index} className="relative aspect-square group">
                        <img
                          src={foto}
                          alt={`Foto ${index + 1}`}
                          className="w-full h-full object-cover rounded-lg cursor-pointer transition-transform hover:scale-105"
                          onClick={() => window.open(foto, '_blank')}
                          onError={(e) => {
                            console.error('[DEBUG] Erro ao carregar imagem:', foto);
                            (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400x400?text=Erro+ao+carregar+imagem';
                          }}
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-opacity rounded-lg flex items-center justify-center">
                          <Button
                            variant="secondary"
                            size="sm"
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(foto, '_blank');
                            }}
                          >
                            Ver Ampliado
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => handleEditarRegistro(registroSelecionado)}
                >
                  <Pencil className="w-4 h-4 mr-2" />
                  Editar
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    handleExcluirRegistro(registroSelecionado);
                    setRegistroSelecionado(null);
                  }}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Excluir
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DiarioObra;
