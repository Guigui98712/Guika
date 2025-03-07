import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CardChecklist } from './CardChecklist';
import { 
  ListChecks, 
  MessageSquare, 
  Paperclip, 
  Tag,
  Plus,
  Trash2,
  Upload
} from 'lucide-react';
import { TrelloCard, TrelloLabel, TrelloComment, TrelloAttachment } from '@/types/trello';
import { useToast } from '@/components/ui/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  atualizarItemChecklist, 
  adicionarItemChecklist, 
  excluirItemChecklist, 
  excluirChecklist,
  excluirComentario
} from '@/lib/trello-local';

interface CardExpandedProps {
  card: TrelloCard;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: (cardId: number, updates: Partial<TrelloCard>) => void;
  onAddChecklist: (cardId: number, title: string) => Promise<void>;
  onAddComment: (cardId: number, content: string) => Promise<void>;
  onAddAttachment: (cardId: number, file: File) => Promise<void>;
  onToggleLabel: (cardId: number, labelId: number) => Promise<void>;
  availableLabels: TrelloLabel[];
}

export function CardExpanded({
  card,
  open,
  onOpenChange,
  onUpdate,
  onAddChecklist,
  onAddComment,
  onAddAttachment,
  onToggleLabel,
  availableLabels
}: CardExpandedProps) {
  const { toast } = useToast();
  const [newChecklistTitle, setNewChecklistTitle] = useState('');
  const [newComment, setNewComment] = useState('');
  const [isAddingChecklist, setIsAddingChecklist] = useState(false);
  const [newCommentContent, setNewCommentContent] = useState('');
  const [isAddingComment, setIsAddingComment] = useState(false);
  const [localChecklists, setLocalChecklists] = useState<TrelloChecklist[]>(card.checklists || []);
  const [localComments, setLocalComments] = useState<TrelloComment[]>(card.comments || []);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLocalChecklists(card.checklists || []);
    setLocalComments(card.comments || []);
  }, [card.checklists, card.comments]);

  const handleAddChecklist = async () => {
    try {
      if (!newChecklistTitle.trim()) return;
      await onAddChecklist(card.id, newChecklistTitle);
      setNewChecklistTitle('');
      setIsAddingChecklist(false);
      toast({
        title: "Sucesso",
        description: "Checklist adicionado com sucesso!"
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao adicionar checklist",
        variant: "destructive"
      });
    }
  };

  const handleAddComment = async () => {
    try {
      if (!newComment.trim()) return;
      await onAddComment(card.id, newComment);
      setNewComment('');
      toast({
        title: "Sucesso",
        description: "Comentário adicionado com sucesso!"
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao adicionar comentário",
        variant: "destructive"
      });
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      await onAddAttachment(card.id, file);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      toast({
        title: "Sucesso",
        description: "Arquivo anexado com sucesso!"
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao anexar arquivo",
        variant: "destructive"
      });
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    try {
      // Atualizar o estado local primeiro para feedback imediato
      const updatedComments = localComments.filter(comment => comment.id !== commentId);
      setLocalComments(updatedComments);
      
      // Excluir o comentário no banco de dados
      await excluirComentario(commentId);
      
      // Propagar a atualização para o componente pai
      onUpdate(card.id, { 
        ...card,
        comments: updatedComments 
      });
      
      toast({
        title: "Sucesso",
        description: "Comentário excluído com sucesso!"
      });
    } catch (error) {
      // Restaurar o estado anterior em caso de erro
      setLocalComments(card.comments || []);
      toast({
        title: "Erro",
        description: "Erro ao excluir comentário",
        variant: "destructive"
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{card.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Descrição */}
          <div>
            <h3 className="font-medium mb-2">Descrição</h3>
            <Textarea
              value={card.description || ''}
              onChange={(e) => onUpdate(card.id, { description: e.target.value })}
              placeholder="Adicione uma descrição mais detalhada..."
              className="min-h-[100px]"
            />
          </div>

          {/* Etiquetas - Removidas para evitar duplicação */}

          <Tabs defaultValue="checklists">
            <TabsList>
              <TabsTrigger value="checklists" className="flex items-center gap-2">
                <ListChecks className="h-4 w-4" />
                Checklists
              </TabsTrigger>
              <TabsTrigger value="comments" className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Comentários
              </TabsTrigger>
              <TabsTrigger value="attachments" className="flex items-center gap-2">
                <Paperclip className="h-4 w-4" />
                Anexos
              </TabsTrigger>
            </TabsList>

            {/* Checklists */}
            <TabsContent value="checklists" className="space-y-4">
              {localChecklists.map((checklist) => (
                <CardChecklist
                  key={checklist.id}
                  checklist={checklist}
                  onUpdateItem={async (itemId, updates) => {
                    try {
                      const updatedItem = await atualizarItemChecklist(itemId, updates);
                      const updatedChecklists = localChecklists.map(cl => {
                        if (cl.id === checklist.id) {
                          return {
                            ...cl,
                            items: cl.items.map(item =>
                              item.id === itemId ? { ...item, ...updatedItem } : item
                            )
                          };
                        }
                        return cl;
                      });
                      
                      // Atualizar o estado local
                      setLocalChecklists(updatedChecklists);
                      
                      // Propagar a atualização para o componente pai
                      // Isso garante que o indicador de checklist seja atualizado imediatamente
                      onUpdate(card.id, { 
                        ...card,
                        checklists: updatedChecklists 
                      });
                      
                      return Promise.resolve();
                    } catch (error) {
                      toast({
                        title: "Erro",
                        description: "Erro ao atualizar item",
                        variant: "destructive"
                      });
                      return Promise.reject(error);
                    }
                  }}
                  onAddItem={async (title) => {
                    try {
                      const newItem = await adicionarItemChecklist(checklist.id, title);
                      const updatedChecklists = localChecklists.map(cl => {
                        if (cl.id === checklist.id) {
                          return {
                            ...cl,
                            items: [...cl.items, newItem]
                          };
                        }
                        return cl;
                      });
                      
                      // Atualizar o estado local
                      setLocalChecklists(updatedChecklists);
                      
                      // Propagar a atualização para o componente pai
                      onUpdate(card.id, { 
                        ...card,
                        checklists: updatedChecklists 
                      });
                      
                      return Promise.resolve(true);
                    } catch (error) {
                      toast({
                        title: "Erro",
                        description: "Erro ao adicionar item",
                        variant: "destructive"
                      });
                      return Promise.resolve(false);
                    }
                  }}
                  onDeleteItem={async (itemId) => {
                    try {
                      const updatedChecklists = localChecklists.map(cl => {
                        if (cl.id === checklist.id) {
                          return {
                            ...cl,
                            items: cl.items.filter(item => item.id !== itemId)
                          };
                        }
                        return cl;
                      });
                      
                      // Atualizar o estado local
                      setLocalChecklists(updatedChecklists);
                      
                      await excluirItemChecklist(itemId);
                      
                      // Propagar a atualização para o componente pai
                      onUpdate(card.id, { 
                        ...card,
                        checklists: updatedChecklists 
                      });
                      
                      return Promise.resolve();
                    } catch (error) {
                      setLocalChecklists(card.checklists || []);
                      toast({
                        title: "Erro",
                        description: "Erro ao excluir item",
                        variant: "destructive"
                      });
                      return Promise.reject(error);
                    }
                  }}
                  onDeleteChecklist={async () => {
                    try {
                      const checklistToDelete = checklist;
                      
                      const updatedChecklists = localChecklists.filter(cl => cl.id !== checklist.id);
                      
                      // Atualizar o estado local
                      setLocalChecklists(updatedChecklists);
                      
                      await excluirChecklist(checklist.id);
                      
                      // Propagar a atualização para o componente pai
                      onUpdate(card.id, { 
                        ...card,
                        checklists: updatedChecklists 
                      });
                      
                      toast({
                        title: "Sucesso",
                        description: "Checklist excluído com sucesso!"
                      });
                      
                      return Promise.resolve();
                    } catch (error) {
                      setLocalChecklists(card.checklists || []);
                      console.error('Erro ao excluir checklist:', error);
                      toast({
                        title: "Erro",
                        description: "Erro ao excluir checklist",
                        variant: "destructive"
                      });
                      return Promise.reject(error);
                    }
                  }}
                />
              ))}

              {isAddingChecklist ? (
                <div className="space-y-2">
                  <Input
                    value={newChecklistTitle}
                    onChange={(e) => setNewChecklistTitle(e.target.value)}
                    placeholder="Nome do checklist"
                  />
                  <div className="flex gap-2">
                    <Button onClick={handleAddChecklist}>Adicionar</Button>
                    <Button 
                      variant="ghost" 
                      onClick={() => {
                        setIsAddingChecklist(false);
                        setNewChecklistTitle('');
                      }}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setIsAddingChecklist(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Checklist
                </Button>
              )}
            </TabsContent>

            {/* Comentários */}
            <TabsContent value="comments" className="space-y-4">
              <div className="space-y-2">
                <Textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Escreva um comentário..."
                />
                <Button onClick={handleAddComment}>Comentar</Button>
              </div>

              <div className="space-y-4">
                {localComments.map((comment) => (
                  <div key={comment.id} className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm text-gray-500">
                          {formatDistanceToNow(new Date(comment.created_at), {
                            addSuffix: true,
                            locale: ptBR
                          })}
                        </p>
                        <p className="mt-1">{comment.content}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteComment(comment.id)}
                        className="h-8 w-8 text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            {/* Anexos */}
            <TabsContent value="attachments" className="space-y-4">
              <div className="space-y-2">
                <input
                  type="file"
                  onChange={handleFileUpload}
                  className="hidden"
                  ref={fileInputRef}
                />
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Adicionar Anexo
                </Button>
              </div>

              <div className="space-y-2">
                {card.attachments.map((attachment) => (
                  <div key={attachment.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div className="flex items-center gap-2">
                      <Paperclip className="h-4 w-4" />
                      <a
                        href={attachment.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:underline"
                      >
                        {attachment.file_name}
                      </a>
                    </div>
                    <p className="text-sm text-gray-500">
                      {formatDistanceToNow(new Date(attachment.created_at), {
                        addSuffix: true,
                        locale: ptBR
                      })}
                    </p>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
} 