export interface TrelloBoard {
  lists: (TrelloList & { cards: TrelloCard[] })[];
}

export interface TrelloList {
  id: number;
  obra_id: number;
  title: string;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface TrelloCard {
  id: number;
  list_id: number;
  title: string;
  description?: string;
  position: number;
  due_date?: string;
  labels: TrelloLabel[];
  checklists: TrelloChecklist[];
  comments: TrelloComment[];
  attachments: TrelloAttachment[];
  created_at: string;
  updated_at: string;
}

export interface TrelloChecklist {
  id: number;
  card_id: number;
  title: string;
  position: number;
  items: TrelloChecklistItem[];
  created_at: string;
  updated_at: string;
}

export interface TrelloChecklistItem {
  id: number;
  checklist_id: number;
  title: string;
  checked: boolean;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface TrelloComment {
  id: number;
  card_id: number;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface TrelloAttachment {
  id: number;
  card_id: number;
  file_name: string;
  file_url: string;
  file_type?: string;
  file_size?: number;
  created_at: string;
  updated_at: string;
}

export interface TrelloLabel {
  id: number;
  title: string;
  color: string;
  created_at: string;
} 