import React, { useState, useEffect, useRef } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Trash2, Plus } from 'lucide-react';
import type { TrelloChecklist, TrelloChecklistItem } from '@/types/trello';
import { toast } from '@/components/ui/use-toast';

interface CardChecklistProps {
  checklist: TrelloChecklist;
  onUpdateItem: (itemId: number, updates: Partial<TrelloChecklistItem>) => Promise<void>;
  onAddItem: (title: string) => Promise<boolean>;
  onDeleteItem: (itemId: number) => Promise<void>;
  onDeleteChecklist: () => Promise<void>;
}

export function CardChecklist({
  checklist,
  onUpdateItem,
  onAddItem,
  onDeleteItem,
  onDeleteChecklist,
}: CardChecklistProps) {
  const [newItemTitle, setNewItemTitle] = useState('');
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [localItems, setLocalItems] = useState<TrelloChecklistItem[]>(checklist.items);
  const [pendingUpdates, setPendingUpdates] = useState<Map<number, boolean>>(new Map());
  const isFirstRender = useRef(true);
  
  // Sincroniza o estado local quando as props mudam, mas apenas se não for o primeiro render
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    
    // Mescla os itens recebidos com o estado local, preservando os itens que estão sendo atualizados
    const updatedItems = checklist.items.map(serverItem => {
      // Se o item estiver em uma atualização pendente, mantém o estado local
      if (pendingUpdates.has(serverItem.id)) {
        const localItem = localItems.find(item => item.id === serverItem.id);
        return localItem || serverItem;
      }
      return serverItem;
    });
    
    setLocalItems(updatedItems);
  }, [checklist.items]);

  const progress = localItems.length > 0
    ? Math.round((localItems.filter(item => item.checked).length / localItems.length) * 100)
    : 0;

  const handleAddItem = async () => {
    if (!newItemTitle.trim()) return;
    
    // Cria um item temporário com ID temporário
    const tempId = Date.now() * -1; // ID negativo para garantir que não conflite com IDs reais
    const tempItem: TrelloChecklistItem = {
      id: tempId,
      checklist_id: checklist.id,
      title: newItemTitle,
      position: localItems.length + 1,
      checked: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    // Atualiza o estado local imediatamente
    setLocalItems(prev => [...prev, tempItem]);
    setNewItemTitle('');
    setIsAddingItem(false);
    
    // Envia para o servidor
    try {
      const success = await onAddItem(newItemTitle);
      if (!success) {
        // Se falhar, reverte a mudança local
        setLocalItems(prev => prev.filter(item => item.id !== tempId));
        toast({
          title: "Erro",
          description: "Não foi possível adicionar o item. Tente novamente.",
          variant: "destructive"
        });
      }
    } catch (error) {
      // Se falhar, reverte a mudança local
      setLocalItems(prev => prev.filter(item => item.id !== tempId));
      console.error('Erro ao adicionar item:', error);
      toast({
        title: "Erro",
        description: "Não foi possível adicionar o item. Tente novamente.",
        variant: "destructive"
      });
    }
  };

  const handleUpdateItem = async (itemId: number, updates: Partial<TrelloChecklistItem>) => {
    // Marca este item como tendo uma atualização pendente
    setPendingUpdates(prev => new Map(prev).set(itemId, true));
    
    // Atualiza o estado local imediatamente
    setLocalItems(prev => 
      prev.map(item => 
        item.id === itemId ? { ...item, ...updates } : item
      )
    );
    
    // Envia para o servidor
    try {
      await onUpdateItem(itemId, updates);
      // Remove a marca de atualização pendente após sucesso
      setPendingUpdates(prev => {
        const newMap = new Map(prev);
        newMap.delete(itemId);
        return newMap;
      });
    } catch (error) {
      console.error('Erro ao atualizar item:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o item. Tente novamente.",
        variant: "destructive"
      });
      
      // Remove a marca de atualização pendente após falha
      setPendingUpdates(prev => {
        const newMap = new Map(prev);
        newMap.delete(itemId);
        return newMap;
      });
    }
  };

  const handleDeleteItem = async (itemId: number) => {
    // Guarda o item que será excluído para possível reversão
    const itemToDelete = localItems.find(item => item.id === itemId);
    
    // Atualiza o estado local imediatamente
    setLocalItems(prev => prev.filter(item => item.id !== itemId));
    
    // Envia para o servidor
    try {
      await onDeleteItem(itemId);
    } catch (error) {
      // Se falhar, reverte a mudança local
      console.error('Erro ao excluir item:', error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir o item. Tente novamente.",
        variant: "destructive"
      });
      
      if (itemToDelete) {
        setLocalItems(prev => [...prev, itemToDelete]);
      }
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">{checklist.title}</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={async () => {
            try {
              await onDeleteChecklist();
            } catch (error) {
              console.error('Erro ao excluir checklist:', error);
              toast({
                title: "Erro",
                description: "Não foi possível excluir o checklist. Tente novamente.",
                variant: "destructive"
              });
            }
          }}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Progress value={progress} className="flex-1" />
        <span>{progress}%</span>
      </div>

      <div className="space-y-2">
        {localItems.map((item) => (
          <div key={item.id} className="flex items-center gap-2 group">
            <Checkbox
              checked={item.checked}
              onCheckedChange={(checked) => {
                handleUpdateItem(item.id, { checked: !!checked });
              }}
            />
            <span className={item.checked ? "line-through text-gray-500 flex-1" : "flex-1"}>
              {item.title}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="opacity-0 group-hover:opacity-100"
              onClick={() => handleDeleteItem(item.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      {isAddingItem ? (
        <div className="flex items-center gap-2">
          <Input
            value={newItemTitle}
            onChange={(e) => setNewItemTitle(e.target.value)}
            placeholder="Digite o título do item..."
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleAddItem();
              } else if (e.key === 'Escape') {
                setIsAddingItem(false);
                setNewItemTitle('');
              }
            }}
            autoFocus
          />
          <Button size="sm" onClick={handleAddItem}>
            Adicionar
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setIsAddingItem(false);
              setNewItemTitle('');
            }}
          >
            Cancelar
          </Button>
        </div>
      ) : (
        <Button
          variant="ghost"
          className="w-full justify-start"
          size="sm"
          onClick={() => setIsAddingItem(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Adicionar item
        </Button>
      )}
    </div>
  );
} 