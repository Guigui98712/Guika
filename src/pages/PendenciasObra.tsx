import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Plus } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { buscarObra } from '@/lib/api';
import { List } from '@/components/trello/List';
import { TrelloList, TrelloBoard } from '@/types/trello';
import { obterQuadroObra, criarLista, excluirLista } from '@/lib/trello-local';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose
} from '@/components/ui/dialog';

const PendenciasObra = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [board, setBoard] = useState<TrelloBoard>({ lists: [] });
  const [isAddingList, setIsAddingList] = useState(false);
  const [newListTitle, setNewListTitle] = useState('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [listToDelete, setListToDelete] = useState<TrelloList | null>(null);

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

  const handleAddList = async () => {
    if (!newListTitle.trim()) return;

    try {
      const newList = await criarLista(Number(id), newListTitle);
      setBoard(prev => ({
        ...prev,
        lists: [...prev.lists, newList]
      }));
      setNewListTitle('');
      setIsAddingList(false);
      
      toast({
        title: "Sucesso",
        description: "Seção criada com sucesso!"
      });
    } catch (error) {
      console.error('Erro ao criar seção:', error);
      toast({
        title: "Erro",
        description: "Não foi possível criar a seção.",
        variant: "destructive"
      });
    }
  };

  const handleDeleteList = async (listId: number) => {
    const list = board.lists.find(l => l.id === listId);
    if (!list) return;

    if (list.cards.length > 0) {
      setListToDelete(list);
      setShowDeleteDialog(true);
      return;
    }

    await confirmDeleteList(listId);
  };

  const confirmDeleteList = async (listId: number) => {
    try {
      await excluirLista(listId);
      setBoard(prev => ({
        ...prev,
        lists: prev.lists.filter(l => l.id !== listId)
      }));
      
      toast({
        title: "Sucesso",
        description: "Seção excluída com sucesso!"
      });
      
      setShowDeleteDialog(false);
      setListToDelete(null);
    } catch (error) {
      console.error('Erro ao excluir seção:', error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir a seção.",
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
            onDelete={handleDeleteList}
          />
        ))}

        {isAddingList ? (
          <div className="bg-gray-100 rounded-lg shadow-sm w-80 flex-shrink-0 p-3">
            <Input
              placeholder="Título da seção..."
              value={newListTitle}
              onChange={(e) => setNewListTitle(e.target.value)}
              className="mb-2"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleAddList();
                } else if (e.key === 'Escape') {
                  setNewListTitle('');
                  setIsAddingList(false);
                }
              }}
            />
            <div className="flex justify-between">
              <Button size="sm" onClick={handleAddList}>
                Adicionar
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setNewListTitle('');
                  setIsAddingList(false);
                }}
              >
                Cancelar
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="outline"
            className="h-12 px-4 flex items-center gap-2 self-start"
            onClick={() => setIsAddingList(true)}
          >
            <Plus className="h-4 w-4" />
            Adicionar Seção
          </Button>
        )}
      </div>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar exclusão</DialogTitle>
          </DialogHeader>
          <p>
            Tem certeza que deseja excluir a seção "{listToDelete?.title}"?
            Esta ação também excluirá todos os {listToDelete?.cards.length} cards contidos nela.
          </p>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancelar</Button>
            </DialogClose>
            <Button 
              variant="destructive" 
              onClick={() => listToDelete && confirmDeleteList(listToDelete.id)}
            >
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PendenciasObra; 