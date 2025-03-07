import { useState } from 'react';
import { Card as CardUI, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2, MoveLeft, MoveRight } from 'lucide-react';
import { TrelloCard, TrelloChecklist, TrelloChecklistItem, TrelloLabel } from '@/types/trello';
import { criarChecklist, adicionarItemChecklist, atualizarItemChecklist, excluirItemChecklist, excluirChecklist } from '@/lib/trello-local';
import { CardChecklist } from './CardChecklist';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { CardExpanded } from './CardExpanded';

interface CardProps {
  card: TrelloCard;
  listTitle: string;
  onDelete: (cardId: number) => void;
  onMoveLeft: (cardId: number) => void;
  onMoveRight: (cardId: number) => void;
  onUpdate: (cardId: number, updates: Partial<TrelloCard>) => void;
  onAddChecklist: (cardId: number, title: string) => Promise<void>;
  onAddComment: (cardId: number, content: string) => Promise<void>;
  onAddAttachment: (cardId: number, file: File) => Promise<void>;
  onToggleLabel: (cardId: number, labelId: number) => Promise<void>;
  availableLabels: TrelloLabel[];
}

export function Card({
  card,
  listTitle,
  onDelete,
  onMoveLeft,
  onMoveRight,
  onUpdate,
  onAddChecklist,
  onAddComment,
  onAddAttachment,
  onToggleLabel,
  availableLabels
}: CardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(card.title);
  const [showExpanded, setShowExpanded] = useState(false);

  const handleSave = () => {
    onUpdate(card.id, { title });
    setIsEditing(false);
  };

  const handleClick = (e: React.MouseEvent) => {
    if (!isEditing) {
      setShowExpanded(true);
    }
  };

  return (
    <>
      <CardUI 
        className="mb-2 cursor-pointer hover:shadow-md transition-shadow"
        onClick={handleClick}
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex-1">
              {isEditing ? (
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onBlur={handleSave}
                  onClick={(e) => e.stopPropagation()}
                  autoFocus
                />
              ) : (
                <div onClick={(e) => {
                  e.stopPropagation();
                  setIsEditing(true);
                }}>
                  {title}
                </div>
              )}
            </div>
            <div className="flex items-center space-x-1">
              {listTitle !== 'A Fazer' && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    onMoveLeft(card.id);
                  }}
                >
                  <MoveLeft className="h-4 w-4" />
                </Button>
              )}
              {listTitle !== 'Concluído' && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    onMoveRight(card.id);
                  }}
                >
                  <MoveRight className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(card.id);
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Etiquetas */}
          {card.labels.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {card.labels.map((label) => (
                <div
                  key={label.id}
                  className="px-2 py-0.5 rounded text-xs text-white"
                  style={{ backgroundColor: label.color }}
                >
                  {label.title}
                </div>
              ))}
            </div>
          )}

          {/* Descrição */}
          {card.description && (
            <p className="text-sm text-gray-500 mt-2">{card.description}</p>
          )}

          {/* Indicadores */}
          <div className="flex gap-2 mt-2 text-xs text-gray-500">
            {card.checklists.length > 0 && (
              <div>
                {card.checklists.reduce((total, cl) => 
                  total + cl.items.filter(item => item.checked).length, 0
                )}/
                {card.checklists.reduce((total, cl) => total + cl.items.length, 0)} itens
              </div>
            )}
            {card.comments.length > 0 && (
              <div>{card.comments.length} comentários</div>
            )}
            {card.attachments.length > 0 && (
              <div>{card.attachments.length} anexos</div>
            )}
          </div>
        </CardContent>
      </CardUI>

      <CardExpanded
        card={card}
        open={showExpanded}
        onOpenChange={setShowExpanded}
        onUpdate={onUpdate}
        onAddChecklist={onAddChecklist}
        onAddComment={onAddComment}
        onAddAttachment={onAddAttachment}
        onToggleLabel={onToggleLabel}
        availableLabels={availableLabels}
      />
    </>
  );
} 