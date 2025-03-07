import { useState, useEffect } from 'react';
import { Card } from './Card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus } from 'lucide-react';
import { TrelloList, TrelloCard, TrelloLabel } from '@/types/trello';
import { 
  criarCard, 
  excluirCard, 
  atualizarCard,
  buscarEtiquetas,
  adicionarEtiqueta,
  removerEtiqueta,
  criarChecklist,
  adicionarComentario,
  adicionarAnexo,
  moverCard
} from '@/lib/trello-local';
import { toast } from 'sonner';

interface ListProps {
  list: TrelloList;
  allLists: TrelloList[];
  onUpdate: (listId: number, updates: Partial<TrelloList>) => void;
}

export function List({ list, allLists, onUpdate }: ListProps) {
  const [isAddingCard, setIsAddingCard] = useState(false);
  const [newCardTitle, setNewCardTitle] = useState('');
  const [availableLabels, setAvailableLabels] = useState<TrelloLabel[]>([]);

  useEffect(() => {
    loadLabels();
  }, []);

  const loadLabels = async () => {
    try {
      const labels = await buscarEtiquetas();
      // Garantir que não há etiquetas duplicadas
      const uniqueLabels = Array.from(new Map(labels.map(label => [label.id, label])).values());
      setAvailableLabels(uniqueLabels);
    } catch (error) {
      console.error('Erro ao carregar etiquetas:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar etiquetas",
        variant: "destructive"
      });
    }
  };

  const handleAddCard = async () => {
    try {
      if (!newCardTitle.trim()) return;

      const newCard = await criarCard(list.id, newCardTitle);
      onUpdate(list.id, {
        cards: [...(list.cards || []), newCard]
      });
      setNewCardTitle('');
      setIsAddingCard(false);
      
      toast({
        title: "Sucesso",
        description: "Card criado com sucesso!"
      });
    } catch (error) {
      console.error('Erro ao criar card:', error);
      toast({
        title: "Erro",
        description: "Erro ao criar card",
        variant: "destructive"
      });
    }
  };

  const handleDeleteCard = async (cardId: number) => {
    try {
      await excluirCard(cardId);
      onUpdate(list.id, {
        cards: list.cards.filter(card => card.id !== cardId)
      });
      
      toast({
        title: "Sucesso",
        description: "Card excluído com sucesso!"
      });
    } catch (error) {
      console.error('Erro ao excluir card:', error);
      toast({
        title: "Erro",
        description: "Erro ao excluir card",
        variant: "destructive"
      });
    }
  };

  const handleMoveCard = async (cardId: number, direction: 'left' | 'right') => {
    try {
      const currentIndex = allLists.findIndex(l => l.id === list.id);
      const targetList = direction === 'left' 
        ? allLists[currentIndex - 1] 
        : allLists[currentIndex + 1];

      if (!targetList) return;

      await moverCard(cardId, targetList.id);
      
      // Remover o card da lista atual
      onUpdate(list.id, {
        cards: list.cards.filter(card => card.id !== cardId)
      });

      // Adicionar o card à lista de destino
      const movedCard = list.cards.find(card => card.id === cardId);
      if (movedCard) {
        onUpdate(targetList.id, {
          cards: [...(targetList.cards || []), { ...movedCard, list_id: targetList.id }]
        });
      }

      toast({
        title: "Sucesso",
        description: "Card movido com sucesso!"
      });
    } catch (error) {
      console.error('Erro ao mover card:', error);
      toast({
        title: "Erro",
        description: "Erro ao mover card",
        variant: "destructive"
      });
    }
  };

  const handleUpdateCard = async (cardId: number, updates: Partial<TrelloCard>) => {
    try {
      await atualizarCard(cardId, updates);
      const card = list.cards.find(c => c.id === cardId);
      if (card) {
        const updatedCard = { ...card, ...updates };
        onUpdate(list.id, {
          cards: list.cards.map(c => c.id === cardId ? updatedCard : c)
        });
      }
    } catch (error) {
      console.error('Erro ao atualizar card:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar card",
        variant: "destructive"
      });
    }
  };

  const handleAddChecklist = async (cardId: number, title: string) => {
    try {
      const newChecklist = await criarChecklist(cardId, title);
      const card = list.cards.find(c => c.id === cardId);
      if (card) {
        const updatedCard = {
          ...card,
          checklists: [...(card.checklists || []), { ...newChecklist, items: [] }]
        };
        onUpdate(list.id, {
          cards: list.cards.map(c => c.id === cardId ? updatedCard : c)
        });
      }
      toast({
        title: "Sucesso",
        description: "Checklist adicionado com sucesso!"
      });
    } catch (error) {
      console.error('Erro ao adicionar checklist:', error);
      toast({
        title: "Erro",
        description: "Erro ao adicionar checklist",
        variant: "destructive"
      });
    }
  };

  const handleAddComment = async (cardId: number, content: string) => {
    try {
      const newComment = await adicionarComentario(cardId, content);
      const card = list.cards.find(c => c.id === cardId);
      if (card) {
        const updatedCard = {
          ...card,
          comments: [...(card.comments || []), newComment]
        };
        onUpdate(list.id, {
          cards: list.cards.map(c => 
            c.id === cardId ? updatedCard : c
          )
        });
      }
      toast({
        title: "Sucesso",
        description: "Comentário adicionado com sucesso!"
      });
    } catch (error) {
      console.error('Erro ao adicionar comentário:', error);
      toast({
        title: "Erro",
        description: "Erro ao adicionar comentário",
        variant: "destructive"
      });
      throw error;
    }
  };

  const handleAddAttachment = async (cardId: number, file: File) => {
    try {
      const newAttachment = await adicionarAnexo(cardId, file);
      const card = list.cards.find(c => c.id === cardId);
      if (card) {
        const updatedCard = {
          ...card,
          attachments: [...(card.attachments || []), newAttachment]
        };
        onUpdate(list.id, {
          cards: list.cards.map(c => 
            c.id === cardId ? updatedCard : c
          )
        });
      }
      toast({
        title: "Sucesso",
        description: "Anexo adicionado com sucesso!"
      });
    } catch (error) {
      console.error('Erro ao adicionar anexo:', error);
      toast({
        title: "Erro",
        description: "Erro ao adicionar anexo",
        variant: "destructive"
      });
      throw error;
    }
  };

  const handleToggleLabel = async (cardId: number, labelId: number) => {
    try {
      const card = list.cards.find(c => c.id === cardId);
      if (!card) return;

      const hasLabel = card.labels.some(l => l.id === labelId);
      
      if (hasLabel) {
        await removerEtiqueta(cardId, labelId);
        const updatedCard = {
          ...card,
          labels: card.labels.filter(l => l.id !== labelId)
        };
        onUpdate(list.id, {
          cards: list.cards.map(c => c.id === cardId ? updatedCard : c)
        });
      } else {
        await adicionarEtiqueta(cardId, labelId);
        const label = availableLabels.find(l => l.id === labelId);
        if (label) {
          const updatedCard = {
            ...card,
            labels: [...card.labels.filter(l => l.id !== labelId), label]
          };
          onUpdate(list.id, {
            cards: list.cards.map(c => c.id === cardId ? updatedCard : c)
          });
        }
      }

      toast({
        title: "Sucesso",
        description: hasLabel ? "Etiqueta removida com sucesso!" : "Etiqueta adicionada com sucesso!"
      });
    } catch (error) {
      console.error('Erro ao alternar etiqueta:', error);
      toast({
        title: "Erro",
        description: "Erro ao alternar etiqueta",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="bg-gray-100 rounded-lg p-4 w-72">
      <h3 className="font-semibold mb-4">{list.title}</h3>
      
      {list.cards?.map((card) => (
        <Card
          key={card.id}
          card={card}
          listTitle={list.title}
          onDelete={handleDeleteCard}
          onMoveLeft={(cardId) => handleMoveCard(cardId, 'left')}
          onMoveRight={(cardId) => handleMoveCard(cardId, 'right')}
          onUpdate={handleUpdateCard}
          onAddChecklist={handleAddChecklist}
          onAddComment={handleAddComment}
          onAddAttachment={handleAddAttachment}
          onToggleLabel={handleToggleLabel}
          availableLabels={availableLabels}
        />
      ))}

      {isAddingCard ? (
        <div className="mt-2">
          <Input
            value={newCardTitle}
            onChange={(e) => setNewCardTitle(e.target.value)}
            placeholder="Título do card"
            className="mb-2"
          />
          <div className="flex gap-2">
            <Button onClick={handleAddCard}>Adicionar</Button>
            <Button variant="ghost" onClick={() => setIsAddingCard(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      ) : (
        <Button
          variant="ghost"
          className="w-full mt-2"
          onClick={() => setIsAddingCard(true)}
        >
          <Plus className="h-4 w-4 mr-2" /> Adicionar Card
        </Button>
      )}
    </div>
  );
} 