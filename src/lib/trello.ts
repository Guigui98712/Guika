// Documentação da API do Trello: https://developer.atlassian.com/cloud/trello/rest/api-group-actions/
const TRELLO_API_KEY = import.meta.env.VITE_TRELLO_API_KEY;
const TRELLO_TOKEN = import.meta.env.VITE_TRELLO_TOKEN;
const TRELLO_BASE_URL = 'https://api.trello.com/1';

interface TrelloCard {
  id: string;
  name: string;
  desc: string;
  idList: string;
  due: string | null;
}

interface TrelloList {
  id: string;
  name: string;
  cards: TrelloCard[];
}

interface TrelloBoard {
  id: string;
  name: string;
  lists: TrelloList[];
}

// Função para criar um novo quadro para uma obra
export const criarQuadroObra = async (nomeObra: string): Promise<string> => {
  try {
    const response = await fetch(`${TRELLO_BASE_URL}/boards?key=${TRELLO_API_KEY}&token=${TRELLO_TOKEN}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: `Obra: ${nomeObra}`,
        defaultLists: false,
      }),
    });

    if (!response.ok) {
      throw new Error('Erro ao criar quadro no Trello');
    }

    const board = await response.json();
    
    // Criar as listas padrão
    await Promise.all([
      criarLista(board.id, 'Pendente'),
      criarLista(board.id, 'Em Andamento'),
      criarLista(board.id, 'Concluído'),
    ]);

    return board.id;
  } catch (error) {
    console.error('Erro ao criar quadro:', error);
    throw error;
  }
};

// Função para criar uma lista em um quadro
const criarLista = async (boardId: string, nome: string): Promise<string> => {
  const response = await fetch(`${TRELLO_BASE_URL}/lists?key=${TRELLO_API_KEY}&token=${TRELLO_TOKEN}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: nome,
      idBoard: boardId,
    }),
  });

  if (!response.ok) {
    throw new Error('Erro ao criar lista no Trello');
  }

  const list = await response.json();
  return list.id;
};

// Função para obter todas as pendências de um quadro
export const obterPendencias = async (boardId: string): Promise<TrelloBoard> => {
  try {
    const response = await fetch(
      `${TRELLO_BASE_URL}/boards/${boardId}/lists?key=${TRELLO_API_KEY}&token=${TRELLO_TOKEN}&cards=open`,
    );

    if (!response.ok) {
      throw new Error('Erro ao obter pendências do Trello');
    }

    const lists = await response.json();
    return {
      id: boardId,
      name: '',
      lists: lists.map((list: any) => ({
        id: list.id,
        name: list.name,
        cards: list.cards || [],
      })),
    };
  } catch (error) {
    console.error('Erro ao obter pendências:', error);
    throw error;
  }
};

// Função para criar um novo cartão (pendência)
export const criarPendencia = async (
  listId: string,
  nome: string,
  descricao: string,
): Promise<TrelloCard> => {
  try {
    const response = await fetch(`${TRELLO_BASE_URL}/cards?key=${TRELLO_API_KEY}&token=${TRELLO_TOKEN}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: nome,
        desc: descricao,
        idList: listId,
      }),
    });

    if (!response.ok) {
      throw new Error('Erro ao criar pendência no Trello');
    }

    return response.json();
  } catch (error) {
    console.error('Erro ao criar pendência:', error);
    throw error;
  }
};

// Função para mover um cartão para outra lista
export const moverPendencia = async (cardId: string, listId: string): Promise<void> => {
  try {
    const response = await fetch(
      `${TRELLO_BASE_URL}/cards/${cardId}?key=${TRELLO_API_KEY}&token=${TRELLO_TOKEN}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          idList: listId,
        }),
      },
    );

    if (!response.ok) {
      throw new Error('Erro ao mover pendência no Trello');
    }
  } catch (error) {
    console.error('Erro ao mover pendência:', error);
    throw error;
  }
};

// Função para excluir um cartão
export const excluirPendencia = async (cardId: string): Promise<void> => {
  try {
    const response = await fetch(
      `${TRELLO_BASE_URL}/cards/${cardId}?key=${TRELLO_API_KEY}&token=${TRELLO_TOKEN}`,
      {
        method: 'DELETE',
      },
    );

    if (!response.ok) {
      throw new Error('Erro ao excluir pendência no Trello');
    }
  } catch (error) {
    console.error('Erro ao excluir pendência:', error);
    throw error;
  }
}; 