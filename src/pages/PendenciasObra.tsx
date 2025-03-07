import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { buscarObra } from '@/lib/api';
import { List } from '@/components/trello/List';
import { TrelloList, TrelloBoard } from '@/types/trello';
import { obterQuadroObra } from '@/lib/trello-local';

const PendenciasObra = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [board, setBoard] = useState<TrelloBoard>({ lists: [] });

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

      setBoard(quadro);
    } catch (error) {
      console.error('Erro detalhado ao carregar pendências:', error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Não foi possível carregar as pendências.",
        variant: "destructive"
      });
    }
  };

  const handleUpdateList = (listId: number, updates: Partial<TrelloList>) => {
    setBoard(prev => {
      const updatedLists = prev.lists.map(list => {
        if (list.id === listId) {
          // Se a atualização inclui cards, precisamos manter as outras propriedades dos cards
          if (updates.cards) {
            return {
              ...list,
              ...updates,
              cards: updates.cards.map(updatedCard => {
                const existingCard = list.cards.find(c => c.id === updatedCard.id);
                return existingCard ? { ...existingCard, ...updatedCard } : updatedCard;
              })
            };
          }
          return { ...list, ...updates };
        }
        return list;
      });

      return { ...prev, lists: updatedLists };
    });
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
      <div className="flex items-center justify-between mb-6">
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
      </div>

      <div className="flex gap-6 overflow-x-auto pb-4">
        {board.lists.map((list) => (
          <List
            key={list.id}
            list={list}
            allLists={board.lists}
            onUpdate={handleUpdateList}
          />
        ))}
      </div>
    </div>
  );
};

export default PendenciasObra; 