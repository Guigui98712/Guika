import { supabase } from './supabase';
import { TrelloBoard, TrelloList, TrelloCard, TrelloChecklist, TrelloChecklistItem } from '@/types/trello';

interface TrelloList {
  id: number;
  obra_id: number;
  title: string;
  position: number;
  created_at: string;
  updated_at: string;
}

interface TrelloCard {
  id: number;
  list_id: number;
  title: string;
  description: string | null;
  position: number;
  due_date: string | null;
  labels: string[];
  created_at: string;
  updated_at: string;
}

interface TrelloBoard {
  lists: (TrelloList & { cards: TrelloCard[] })[];
}

interface TrelloChecklist {
  id: number;
  card_id: number;
  title: string;
  position: number;
  items: TrelloChecklistItem[];
}

interface TrelloChecklistItem {
  id: number;
  checklist_id: number;
  title: string;
  position: number;
  checked: boolean;
}

// Função para criar listas padrão para uma obra
export const criarListasPadrao = async (obraId: number): Promise<void> => {
  try {
    const listasPadrao = [
      { title: 'A Fazer', position: 1 },
      { title: 'Em Andamento', position: 2 },
      { title: 'Concluído', position: 3 }
    ];

    // Verificar se já existem listas para esta obra
    const { data: listasExistentes } = await supabase
      .from('trello_lists')
      .select('id')
      .eq('obra_id', obraId);

    if (listasExistentes && listasExistentes.length > 0) {
      console.log('Listas já existem para esta obra');
      return;
    }

    // Criar as listas padrão
    const { error } = await supabase
      .from('trello_lists')
      .insert(listasPadrao.map(lista => ({
        obra_id: obraId,
        title: lista.title,
        position: lista.position
      })));

    if (error) throw error;
  } catch (error) {
    console.error('Erro ao criar listas padrão:', error);
    throw error;
  }
};

// Função para obter todas as listas e cards de uma obra
export const obterQuadroObra = async (obraId: number): Promise<TrelloBoard> => {
  try {
    // Criar listas padrão se não existirem
    await criarListasPadrao(obraId);

    // Buscar listas
    const { data: lists, error: listsError } = await supabase
      .from('trello_lists')
      .select('*')
      .eq('obra_id', obraId)
      .order('position');

    if (listsError) {
      console.error('Erro ao buscar listas:', listsError);
      throw listsError;
    }

    if (!lists || lists.length === 0) {
      console.error('Nenhuma lista encontrada para a obra');
      return { lists: [] };
    }

    // Buscar cards
    const { data: cards, error: cardsError } = await supabase
      .from('trello_cards')
      .select('*')
      .in('list_id', lists.map(l => l.id))
      .order('position');

    if (cardsError) {
      console.error('Erro ao buscar cards:', cardsError);
      throw cardsError;
    }

    // Buscar checklists e seus itens
    const cardIds = (cards || []).map(c => c.id);
    const { data: checklists, error: checklistsError } = await supabase
      .from('trello_checklists')
      .select('*')
      .in('card_id', cardIds)
      .order('position');

    if (checklistsError) {
      console.error('Erro ao buscar checklists:', checklistsError);
      throw checklistsError;
    }

    const checklistIds = (checklists || []).map(c => c.id);
    const { data: checklistItems, error: itemsError } = await supabase
      .from('trello_checklist_items')
      .select('*')
      .in('checklist_id', checklistIds)
      .order('position');

    if (itemsError) {
      console.error('Erro ao buscar itens dos checklists:', itemsError);
      throw itemsError;
    }

    // Buscar comentários
    const { data: comments, error: commentsError } = await supabase
      .from('trello_comments')
      .select('*')
      .in('card_id', cardIds)
      .order('created_at', { ascending: false });

    if (commentsError) {
      console.error('Erro ao buscar comentários:', commentsError);
      throw commentsError;
    }

    // Buscar anexos
    const { data: attachments, error: attachmentsError } = await supabase
      .from('trello_attachments')
      .select('*')
      .in('card_id', cardIds)
      .order('created_at', { ascending: false });

    if (attachmentsError) {
      console.error('Erro ao buscar anexos:', attachmentsError);
      throw attachmentsError;
    }

    // Buscar etiquetas dos cards
    const { data: cardLabels, error: cardLabelsError } = await supabase
      .from('trello_card_labels')
      .select('card_id, label:trello_labels(*)')
      .in('card_id', cardIds);

    if (cardLabelsError) {
      console.error('Erro ao buscar etiquetas dos cards:', cardLabelsError);
      throw cardLabelsError;
    }

    // Organizar os dados
    const checklistsWithItems = (checklists || []).map(checklist => ({
      ...checklist,
      items: (checklistItems || []).filter(item => item.checklist_id === checklist.id)
    }));

    const cardsWithEverything = (cards || []).map(card => ({
      ...card,
      comments: comments?.filter(comment => comment.card_id === card.id) || [],
      attachments: attachments?.filter(attachment => attachment.card_id === card.id) || [],
      labels: cardLabels
        ?.filter(cl => cl.card_id === card.id)
        .map(cl => cl.label) || [],
      checklists: checklistsWithItems.filter(checklist => checklist.card_id === card.id)
    }));

    const listsWithCards = lists.map(list => ({
      ...list,
      cards: cardsWithEverything.filter(card => card.list_id === list.id)
    }));

    return { lists: listsWithCards };
  } catch (error) {
    console.error('Erro ao obter quadro:', error);
    throw error;
  }
};

// Função para criar um novo card
export const criarCard = async (
  listId: number,
  title: string,
  description: string | null = null,
  dueDate: string | null = null,
  labels: string[] = []
): Promise<TrelloCard> => {
  try {
    // Obter a última posição na lista
    const { data: lastCard, error: positionError } = await supabase
      .from('trello_cards')
      .select('position')
      .eq('list_id', listId)
      .order('position', { ascending: false })
      .limit(1)
      .single();

    if (positionError && positionError.code !== 'PGRST116') {
      console.error('Erro ao buscar última posição:', positionError);
      throw positionError;
    }

    const newPosition = (lastCard?.position || 0) + 1;

    // Criar novo card
    const { data, error } = await supabase
      .from('trello_cards')
      .insert([{
        list_id: listId,
        title,
        description,
        position: newPosition,
        due_date: dueDate
      }])
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar card:', error);
      throw error;
    }

    if (!data) {
      throw new Error('Card não foi criado');
    }

    return {
      ...data,
      labels: [],
      checklists: [],
      comments: [],
      attachments: []
    };
  } catch (error) {
    console.error('Erro ao criar card:', error);
    throw error;
  }
};

// Função para mover um card para outra lista
export const moverCard = async (
  cardId: number,
  novaListaId: number
): Promise<void> => {
  try {
    // Obter a última posição na nova lista
    const { data: lastCard } = await supabase
      .from('trello_cards')
      .select('position')
      .eq('list_id', novaListaId)
      .order('position', { ascending: false })
      .limit(1)
      .single();

    const newPosition = (lastCard?.position || 0) + 1;

    // Atualizar card
    const { error } = await supabase
      .from('trello_cards')
      .update({
        list_id: novaListaId,
        position: newPosition,
        updated_at: new Date().toISOString()
      })
      .eq('id', cardId);

    if (error) {
      console.error('Erro ao mover card:', error);
      throw error;
    }
  } catch (error) {
    console.error('Erro ao mover card:', error);
    throw error;
  }
};

// Função para excluir um card
export const excluirCard = async (cardId: number): Promise<void> => {
  try {
    const { error } = await supabase
      .from('trello_cards')
      .delete()
      .eq('id', cardId);

    if (error) {
      console.error('Erro ao excluir card:', error);
      throw error;
    }
  } catch (error) {
    console.error('Erro ao excluir card:', error);
    throw error;
  }
};

// Função para atualizar um card
export const atualizarCard = async (
  cardId: number,
  updates: Partial<TrelloCard>
): Promise<TrelloCard> => {
  try {
    const { data, error } = await supabase
      .from('trello_cards')
      .update(updates)
      .eq('id', cardId)
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar card:', error);
      throw error;
    }

    if (!data) {
      throw new Error('Card não foi atualizado');
    }

    return data;
  } catch (error) {
    console.error('Erro ao atualizar card:', error);
    throw error;
  }
};

// Função para reordenar cards em uma lista
export const reordenarCards = async (
  listId: number,
  cardIds: number[]
): Promise<void> => {
  try {
    // Atualizar posição de cada card
    await Promise.all(
      cardIds.map((cardId, index) =>
        supabase
          .from('trello_cards')
          .update({ position: index + 1 })
          .eq('id', cardId)
      )
    );
  } catch (error) {
    console.error('Erro ao reordenar cards:', error);
    throw error;
  }
};

// Função para criar um novo checklist
export const criarChecklist = async (
  cardId: number,
  title: string
): Promise<TrelloChecklist> => {
  try {
    // Obter a última posição
    const { data: lastChecklist } = await supabase
      .from('trello_checklists')
      .select('position')
      .eq('card_id', cardId)
      .order('position', { ascending: false })
      .limit(1)
      .single();

    const newPosition = (lastChecklist?.position || 0) + 1;

    // Criar checklist
    const { data, error } = await supabase
      .from('trello_checklists')
      .insert({
        card_id: cardId,
        title,
        position: newPosition
      })
      .select('*')
      .single();

    if (error) {
      console.error('Erro ao criar checklist:', error);
      throw error;
    }

    return { ...data, items: [] };
  } catch (error) {
    console.error('Erro ao criar checklist:', error);
    throw error;
  }
};

// Função para adicionar um item ao checklist
export const adicionarItemChecklist = async (
  checklistId: number,
  title: string
): Promise<TrelloChecklistItem> => {
  try {
    // Obter a última posição
    const { data: lastItem } = await supabase
      .from('trello_checklist_items')
      .select('position')
      .eq('checklist_id', checklistId)
      .order('position', { ascending: false })
      .limit(1)
      .single();

    const newPosition = (lastItem?.position || 0) + 1;

    // Criar item
    const { data, error } = await supabase
      .from('trello_checklist_items')
      .insert({
        checklist_id: checklistId,
        title,
        position: newPosition,
        checked: false
      })
      .select('*')
      .single();

    if (error) {
      console.error('Erro ao criar item do checklist:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Erro ao criar item do checklist:', error);
    throw error;
  }
};

// Função para atualizar um item do checklist
export const atualizarItemChecklist = async (
  itemId: number,
  updates: Partial<TrelloChecklistItem>
): Promise<TrelloChecklistItem> => {
  try {
    const { data, error } = await supabase
      .from('trello_checklist_items')
      .update(updates)
      .eq('id', itemId)
      .select('*')
      .single();

    if (error) {
      console.error('Erro ao atualizar item do checklist:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Erro ao atualizar item do checklist:', error);
    throw error;
  }
};

// Função para excluir um item do checklist
export const excluirItemChecklist = async (itemId: number): Promise<void> => {
  try {
    const { error } = await supabase
      .from('trello_checklist_items')
      .delete()
      .eq('id', itemId);

    if (error) {
      console.error('Erro ao excluir item do checklist:', error);
      throw error;
    }
  } catch (error) {
    console.error('Erro ao excluir item do checklist:', error);
    throw error;
  }
};

// Função para excluir um checklist
export const excluirChecklist = async (checklistId: number): Promise<void> => {
  try {
    // Primeiro exclui todos os itens do checklist
    const { error: itemsError } = await supabase
      .from('trello_checklist_items')
      .delete()
      .eq('checklist_id', checklistId);

    if (itemsError) {
      console.error('Erro ao excluir itens do checklist:', itemsError);
      throw itemsError;
    }

    // Depois exclui o checklist
    const { error } = await supabase
      .from('trello_checklists')
      .delete()
      .eq('id', checklistId);

    if (error) {
      console.error('Erro ao excluir checklist:', error);
      throw error;
    }
  } catch (error) {
    console.error('Erro ao excluir checklist:', error);
    throw error;
  }
};

// Função para adicionar um comentário
export const adicionarComentario = async (
  cardId: number,
  content: string,
  userId: string
): Promise<TrelloComment> => {
  try {
    const { data, error } = await supabase
      .from('trello_comments')
      .insert({
        card_id: cardId,
        user_id: userId,
        content
      })
      .select('*')
      .single();

    if (error) {
      console.error('Erro ao adicionar comentário:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Erro ao adicionar comentário:', error);
    throw error;
  }
};

// Função para excluir um comentário
export const excluirComentario = async (commentId: number): Promise<void> => {
  try {
    const { error } = await supabase
      .from('trello_comments')
      .delete()
      .eq('id', commentId);

    if (error) {
      console.error('Erro ao excluir comentário:', error);
      throw error;
    }
  } catch (error) {
    console.error('Erro ao excluir comentário:', error);
    throw error;
  }
};

// Função para adicionar um anexo
export const adicionarAnexo = async (
  cardId: number,
  file: File
): Promise<TrelloAttachment> => {
  try {
    // Upload do arquivo para o storage
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from('attachments')
      .upload(fileName, file);

    if (uploadError) {
      console.error('Erro ao fazer upload do arquivo:', uploadError);
      throw uploadError;
    }

    // Obter URL pública do arquivo
    const { data: { publicUrl } } = supabase.storage
      .from('attachments')
      .getPublicUrl(fileName);

    // Criar registro do anexo
    const { data, error } = await supabase
      .from('trello_attachments')
      .insert({
        card_id: cardId,
        file_name: file.name,
        file_url: publicUrl,
        file_type: file.type,
        file_size: file.size
      })
      .select('*')
      .single();

    if (error) {
      // Se houver erro ao criar o registro, tentar excluir o arquivo
      await supabase.storage
        .from('attachments')
        .remove([fileName]);
      
      console.error('Erro ao criar registro do anexo:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Erro ao adicionar anexo:', error);
    throw error;
  }
};

// Função para excluir um anexo
export const excluirAnexo = async (attachmentId: number): Promise<void> => {
  try {
    // Primeiro, buscar o anexo para obter o nome do arquivo
    const { data: attachment, error: fetchError } = await supabase
      .from('trello_attachments')
      .select('file_url')
      .eq('id', attachmentId)
      .single();

    if (fetchError) {
      console.error('Erro ao buscar anexo:', fetchError);
      throw fetchError;
    }

    // Extrair o nome do arquivo da URL
    const fileName = attachment.file_url.split('/').pop();

    // Excluir o arquivo do storage
    const { error: storageError } = await supabase.storage
      .from('attachments')
      .remove([fileName]);

    if (storageError) {
      console.error('Erro ao excluir arquivo do storage:', storageError);
      throw storageError;
    }

    // Excluir o registro do anexo
    const { error } = await supabase
      .from('trello_attachments')
      .delete()
      .eq('id', attachmentId);

    if (error) {
      console.error('Erro ao excluir registro do anexo:', error);
      throw error;
    }
  } catch (error) {
    console.error('Erro ao excluir anexo:', error);
    throw error;
  }
};

// Função para buscar etiquetas disponíveis
export const buscarEtiquetas = async (): Promise<TrelloLabel[]> => {
  try {
    const { data, error } = await supabase
      .from('trello_labels')
      .select('*')
      .order('title');

    if (error) {
      console.error('Erro ao buscar etiquetas:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Erro ao buscar etiquetas:', error);
    throw error;
  }
};

// Função para adicionar uma etiqueta a um card
export const adicionarEtiqueta = async (
  cardId: number,
  labelId: number
): Promise<void> => {
  try {
    const { error } = await supabase
      .from('trello_card_labels')
      .insert({
        card_id: cardId,
        label_id: labelId
      });

    if (error) {
      console.error('Erro ao adicionar etiqueta:', error);
      throw error;
    }
  } catch (error) {
    console.error('Erro ao adicionar etiqueta:', error);
    throw error;
  }
};

// Função para remover uma etiqueta de um card
export const removerEtiqueta = async (
  cardId: number,
  labelId: number
): Promise<void> => {
  try {
    const { error } = await supabase
      .from('trello_card_labels')
      .delete()
      .match({
        card_id: cardId,
        label_id: labelId
      });

    if (error) {
      console.error('Erro ao remover etiqueta:', error);
      throw error;
    }
  } catch (error) {
    console.error('Erro ao remover etiqueta:', error);
    throw error;
  }
};

// Função para criar uma nova lista
export const criarLista = async (
  obraId: number,
  title: string
): Promise<TrelloList> => {
  try {
    // Obter a última posição
    const { data: lastList, error: positionError } = await supabase
      .from('trello_lists')
      .select('position')
      .eq('obra_id', obraId)
      .order('position', { ascending: false })
      .limit(1)
      .single();

    if (positionError && positionError.code !== 'PGRST116') {
      console.error('Erro ao buscar última posição:', positionError);
      throw positionError;
    }

    const newPosition = (lastList?.position || 0) + 1;

    // Criar nova lista
    const { data, error } = await supabase
      .from('trello_lists')
      .insert([{
        obra_id: obraId,
        title,
        position: newPosition
      }])
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar lista:', error);
      throw error;
    }

    if (!data) {
      throw new Error('Lista não foi criada');
    }

    return {
      ...data,
      cards: []
    };
  } catch (error) {
    console.error('Erro ao criar lista:', error);
    throw error;
  }
};

// Função para excluir uma lista
export const excluirLista = async (listId: number): Promise<void> => {
  try {
    // Primeiro, excluir todos os cards da lista
    const { data: cards } = await supabase
      .from('trello_cards')
      .select('id')
      .eq('list_id', listId);
    
    if (cards && cards.length > 0) {
      // Excluir todos os cards da lista
      for (const card of cards) {
        await excluirCard(card.id);
      }
    }

    // Excluir a lista
    const { error } = await supabase
      .from('trello_lists')
      .delete()
      .eq('id', listId);

    if (error) {
      console.error('Erro ao excluir lista:', error);
      throw error;
    }
  } catch (error) {
    console.error('Erro ao excluir lista:', error);
    throw error;
  }
};

// Função para renomear uma lista
export const renomearLista = async (
  listId: number,
  newTitle: string
): Promise<void> => {
  try {
    const { error } = await supabase
      .from('trello_lists')
      .update({
        title: newTitle,
        updated_at: new Date().toISOString()
      })
      .eq('id', listId);

    if (error) {
      console.error('Erro ao renomear lista:', error);
      throw error;
    }
  } catch (error) {
    console.error('Erro ao renomear lista:', error);
    throw error;
  }
}; 