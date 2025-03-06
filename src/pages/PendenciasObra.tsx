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
import { buscarObra } from '@/lib/api';
import { obterQuadroObra, criarCard, moverCard, excluirCard } from '@/lib/trello-local';

interface Pendencia {
  id: number;
  title: string;
  description: string | null;
  list_id: number;
}

interface Lista {
  id: number;
  title: string;
  cards: Pendencia[];
}

const PendenciasObra = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [novaPendencia, setNovaPendencia] = useState({
    title: '',
    description: ''
  });
  const [listas, setListas] = useState<Lista[]>([]);

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
    try {
      console.log('Carregando pendências da obra:', id);
      const quadro = await obterQuadroObra(Number(id));
      console.log('Dados do quadro:', quadro);
      
      if (!quadro.lists || quadro.lists.length === 0) {
        console.log('Nenhuma lista encontrada, tentando criar listas padrão...');
        await carregarDados();
        return;
      }

      setListas(quadro.lists);
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
    try {
      console.log('Tentando adicionar pendência...');
      const listaAFazer = listas.find(l => l.title === 'A Fazer');
      console.log('Lista "A Fazer":', listaAFazer);
      
      if (!listaAFazer) {
        console.error('Lista "A Fazer" não encontrada');
        toast({
          title: "Erro",
          description: 'Lista "A Fazer" não encontrada',
          variant: "destructive"
        });
        return;
      }

      if (!novaPendencia.title.trim()) {
        toast({
          title: "Erro",
          description: "O título da pendência é obrigatório",
          variant: "destructive"
        });
        return;
      }

      console.log('Criando card com:', {
        listId: listaAFazer.id,
        title: novaPendencia.title,
        description: novaPendencia.description
      });

      await criarCard(
        listaAFazer.id,
        novaPendencia.title,
        novaPendencia.description
      );

      setShowDialog(false);
      setNovaPendencia({ title: '', description: '' });
      toast({
        title: "Sucesso",
        description: "Pendência adicionada com sucesso!"
      });
      
      await carregarPendencias();
    } catch (error) {
      console.error('Erro ao adicionar pendência:', error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Não foi possível adicionar a pendência.",
        variant: "destructive"
      });
    }
  };

  const handleMoverPendencia = async (cardId: number, novaListaId: number) => {
    try {
      await moverCard(cardId, novaListaId);
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

  const handleExcluirPendencia = async (cardId: number) => {
    try {
      await excluirCard(cardId);
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
                  value={novaPendencia.title}
                  onChange={(e) => setNovaPendencia({ ...novaPendencia, title: e.target.value })}
                  placeholder="Digite o título da pendência"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Descrição</label>
                <Input
                  value={novaPendencia.description}
                  onChange={(e) => setNovaPendencia({ ...novaPendencia, description: e.target.value })}
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

      {listas.length === 0 ? (
        <div className="text-center py-12">
          <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <p className="text-gray-500 mb-4">Nenhuma lista encontrada</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {listas.map((lista) => (
            <div key={lista.id}>
              <h2 className="font-semibold mb-4">{lista.title}</h2>
              <div className="space-y-4">
                {lista.cards.map((card) => (
                  <Card key={card.id} className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-medium">{card.title}</h3>
                      <div className="flex gap-2">
                        {lista.title !== 'A Fazer' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              const listaAnterior = listas.find(l => 
                                l.title === (lista.title === 'Em Andamento' ? 'A Fazer' : 'Em Andamento')
                              );
                              if (listaAnterior) {
                                handleMoverPendencia(card.id, listaAnterior.id);
                              }
                            }}
                          >
                            <MoveLeft className="h-4 w-4" />
                          </Button>
                        )}
                        {lista.title !== 'Concluído' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              const proximaLista = listas.find(l => 
                                l.title === (lista.title === 'A Fazer' ? 'Em Andamento' : 'Concluído')
                              );
                              if (proximaLista) {
                                handleMoverPendencia(card.id, proximaLista.id);
                              }
                            }}
                          >
                            <MoveRight className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleExcluirPendencia(card.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                    {card.description && (
                      <p className="text-sm text-gray-500">{card.description}</p>
                    )}
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PendenciasObra; 