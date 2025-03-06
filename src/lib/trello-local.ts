import { supabase } from './supabase';

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

    // Buscar cards para todas as listas
    const { data: cards, error: cardsError } = await supabase
      .from('trello_cards')
      .select('*')
      .in('list_id', lists.map(l => l.id))
      .order('position');

    if (cardsError) {
      console.error('Erro ao buscar cards:', cardsError);
      throw cardsError;
    }

    // Organizar cards por lista
    const listsWithCards = lists.map(list => ({
      ...list,
      cards: (cards || []).filter(card => card.list_id === list.id)
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
    const { data: lastCard, error: lastCardError } = await supabase
      .from('trello_cards')
      .select('position')
      .eq('list_id', listId)
      .order('position', { ascending: false })
      .limit(1)
      .single();

    if (lastCardError && lastCardError.code !== 'PGRST116') {
      console.error('Erro ao buscar última posição:', lastCardError);
      throw lastCardError;
    }

    const newPosition = (lastCard?.position || 0) + 1;

    // Criar novo card
    const { data, error } = await supabase
      .from('trello_cards')
      .insert({
        list_id: listId,
        title,
        description,
        position: newPosition,
        due_date: dueDate,
        labels
      })
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar card:', error);
      throw error;
    }

    if (!data) {
      throw new Error('Card não foi criado');
    }

    return data;
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
    const { data: lastCard, error: lastCardError } = await supabase
      .from('trello_cards')
      .select('position')
      .eq('list_id', novaListaId)
      .order('position', { ascending: false })
      .limit(1)
      .single();

    if (lastCardError && lastCardError.code !== 'PGRST116') {
      console.error('Erro ao buscar última posição:', lastCardError);
      throw lastCardError;
    }

    const newPosition = (lastCard?.position || 0) + 1;

    // Atualizar card
    const { error } = await supabase
      .from('trello_cards')
      .update({
        list_id: novaListaId,
        position: newPosition
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