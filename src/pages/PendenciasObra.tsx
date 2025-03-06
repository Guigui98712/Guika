import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Plus, AlertCircle, Trash2, MoveRight, MoveLeft } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { buscarObra, atualizarTrelloBoardId } from '@/lib/api';
import { criarQuadroObra, obterPendencias, criarPendencia, moverPendencia, excluirPendencia } from '@/lib/trello';

interface Pendencia {
  id: string;
  nome: string;
  descricao: string;
  status: 'pendente' | 'em_andamento' | 'concluida';
  data_criacao: string;
}

const PendenciasObra = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [pendencias, setPendencias] = useState<Pendencia[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [novaPendencia, setNovaPendencia] = useState({
    nome: '',
    descricao: ''
  });
  const [boardId, setBoardId] = useState<string | null>(null);
  const [listas, setListas] = useState<{[key: string]: string}>({});

  useEffect(() => {
    carregarDados();
  }, [id]);

  const carregarDados = async () => {
    try {
      setLoading(true);
      console.log('Iniciando carregamento de dados para obra ID:', id);
      
      // Buscar dados da obra
      const obra = await buscarObra(Number(id));
      console.log('Dados da obra:', obra);
      
      if (!obra) {
        console.error('Obra não encontrada');
        toast({
          title: "Erro",
          description: "Obra não encontrada",
          variant: "destructive"
        });
        return;
      }

      // Se a obra não tiver um quadro no Trello, criar um
      if (!obra.trello_board_id) {
        console.log('Obra não tem quadro no Trello, criando...');
        try {
          const novoQuadroId = await criarQuadroObra(obra.nome);
          console.log('Novo quadro criado:', novoQuadroId);
          
          await atualizarTrelloBoardId(Number(id), novoQuadroId);
          console.log('ID do quadro atualizado na obra');
          
          setBoardId(novoQuadroId);
        } catch (trelloError) {
          console.error('Erro ao criar quadro no Trello:', trelloError);
          toast({
            title: "Erro",
            description: "Não foi possível criar o quadro no Trello",
            variant: "destructive"
          });
          return;
        }
      } else {
        console.log('Obra já tem quadro no Trello:', obra.trello_board_id);
        setBoardId(obra.trello_board_id);
      }

      await carregarPendencias();
    } catch (error) {
      console.error('Erro detalhado ao carregar dados:', error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Não foi possível carregar os dados.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const carregarPendencias = async () => {
    if (!boardId) {
      console.log('Não há boardId, não é possível carregar pendências');
      return;
    }

    try {
      console.log('Carregando pendências do quadro:', boardId);
      const board = await obterPendencias(boardId);
      console.log('Dados do quadro:', board);
      
      // Mapear IDs das listas
      const listasMap: {[key: string]: string} = {};
      board.lists.forEach(lista => {
        if (lista.name === 'Pendente') listasMap.pendente = lista.id;
        if (lista.name === 'Em Andamento') listasMap.em_andamento = lista.id;
        if (lista.name === 'Concluído') listasMap.concluido = lista.id;
      });
      console.log('IDs das listas mapeados:', listasMap);
      setListas(listasMap);

      // Converter cards do Trello para o formato de pendências
      const todasPendencias: Pendencia[] = [];
      board.lists.forEach(lista => {
        lista.cards.forEach(card => {
          let status: 'pendente' | 'em_andamento' | 'concluida';
          if (lista.name === 'Pendente') status = 'pendente';
          else if (lista.name === 'Em Andamento') status = 'em_andamento';
          else status = 'concluida';

          todasPendencias.push({
            id: card.id,
            nome: card.name,
            descricao: card.desc,
            status,
            data_criacao: card.due || new Date().toISOString()
          });
        });
      });
      console.log('Pendências carregadas:', todasPendencias);
      setPendencias(todasPendencias);
    } catch (error) {
      console.error('Erro detalhado ao carregar pendências:', error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Não foi possível carregar as pendências.",
        variant: "destructive"
      });
    }
  };

  const adicionarPendencia = async () => {
    console.log('Tentando adicionar pendência...');
    console.log('boardId:', boardId);
    console.log('listas:', listas);
    console.log('novaPendencia:', novaPendencia);

    if (!boardId || !listas.pendente) {
      console.log('Faltando boardId ou lista pendente');
      return;
    }

    try {
      console.log('Chamando criarPendencia com:', {
        listaId: listas.pendente,
        nome: novaPendencia.nome,
        descricao: novaPendencia.descricao
      });

      await criarPendencia(
        listas.pendente,
        novaPendencia.nome,
        novaPendencia.descricao
      );

      setShowDialog(false);
      setNovaPendencia({ nome: '', descricao: '' });
      toast({
        title: "Sucesso",
        description: "Pendência adicionada com sucesso!"
      });
      
      await carregarPendencias();
    } catch (error) {
      console.error('Erro ao adicionar pendência:', error);
      toast({
        title: "Erro",
        description: "Não foi possível adicionar a pendência.",
        variant: "destructive"
      });
    }
  };

  const handleMoverPendencia = async (pendenciaId: string, novoStatus: 'pendente' | 'em_andamento' | 'concluida') => {
    const listaDestino = listas[novoStatus === 'concluida' ? 'concluido' : novoStatus];
    if (!listaDestino) return;

    try {
      await moverPendencia(pendenciaId, listaDestino);
      await carregarPendencias();
      
      toast({
        title: "Sucesso",
        description: "Pendência movida com sucesso!"
      });
    } catch (error) {
      console.error('Erro ao mover pendência:', error);
      toast({
        title: "Erro",
        description: "Não foi possível mover a pendência.",
        variant: "destructive"
      });
    }
  };

  const handleExcluirPendencia = async (pendenciaId: string) => {
    try {
      await excluirPendencia(pendenciaId);
      await carregarPendencias();
      
      toast({
        title: "Sucesso",
        description: "Pendência excluída com sucesso!"
      });
    } catch (error) {
      console.error('Erro ao excluir pendência:', error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir a pendência.",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
        <p className="text-gray-600">Carregando pendências...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(`/obras/${id}`)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold">Pendências da Obra</h1>
        </div>

        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Nova Pendência
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Nova Pendência</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <label className="text-sm font-medium">Título</label>
                <Input
                  value={novaPendencia.nome}
                  onChange={(e) => setNovaPendencia({ ...novaPendencia, nome: e.target.value })}
                  placeholder="Digite o título da pendência"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Descrição</label>
                <Input
                  value={novaPendencia.descricao}
                  onChange={(e) => setNovaPendencia({ ...novaPendencia, descricao: e.target.value })}
                  placeholder="Digite a descrição da pendência"
                />
              </div>
              <Button onClick={adicionarPendencia} className="w-full">
                Adicionar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {pendencias.length === 0 ? (
        <div className="text-center py-12">
          <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <p className="text-gray-500 mb-4">Nenhuma pendência cadastrada</p>
          <Button onClick={() => setShowDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Primeira Pendência
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Coluna: Pendente */}
          <div>
            <h2 className="font-semibold mb-4">Pendente</h2>
            <div className="space-y-4">
              {pendencias
                .filter((p) => p.status === 'pendente')
                .map((pendencia) => (
                  <Card key={pendencia.id} className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-medium">{pendencia.nome}</h3>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleMoverPendencia(pendencia.id, 'em_andamento')}
                        >
                          <MoveRight className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleExcluirPendencia(pendencia.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-sm text-gray-500">{pendencia.descricao}</p>
                  </Card>
                ))}
            </div>
          </div>

          {/* Coluna: Em Andamento */}
          <div>
            <h2 className="font-semibold mb-4">Em Andamento</h2>
            <div className="space-y-4">
              {pendencias
                .filter((p) => p.status === 'em_andamento')
                .map((pendencia) => (
                  <Card key={pendencia.id} className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-medium">{pendencia.nome}</h3>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleMoverPendencia(pendencia.id, 'pendente')}
                        >
                          <MoveLeft className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleMoverPendencia(pendencia.id, 'concluida')}
                        >
                          <MoveRight className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleExcluirPendencia(pendencia.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-sm text-gray-500">{pendencia.descricao}</p>
                  </Card>
                ))}
            </div>
          </div>

          {/* Coluna: Concluído */}
          <div>
            <h2 className="font-semibold mb-4">Concluído</h2>
            <div className="space-y-4">
              {pendencias
                .filter((p) => p.status === 'concluida')
                .map((pendencia) => (
                  <Card key={pendencia.id} className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-medium">{pendencia.nome}</h3>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleMoverPendencia(pendencia.id, 'em_andamento')}
                        >
                          <MoveLeft className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleExcluirPendencia(pendencia.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-sm text-gray-500">{pendencia.descricao}</p>
                  </Card>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PendenciasObra; 