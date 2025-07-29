export interface ChatMessage {
  id: string;
  groupId: string;
  userId: string;
  userName: string;
  userAvatar: string;
  text: string;
  timestamp: Date;
  editedAt?: Date;
  replyTo?: string; // ID du message répondu
  reactions: {
    [emoji: string]: {
      count: number;
      userIds: string[];
    };
  };
  isDeleted: boolean;
  deletedAt?: Date;
  // Nouvelles propriétés pour les médias
  type?: 'text' | 'image' | 'location';
  imageUrl?: string;
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
    placeName?: string;
  };
}

export interface ChatReaction {
  emoji: string;
  count: number;
  userIds: string[];
}

export interface TypingIndicator {
  userId: string;
  userName: string;
  timestamp: Date;
}

export const CHAT_REACTIONS = {
  '👍': 'like',
  '❤️': 'love',
  '😂': 'laugh',
  '🍺': 'cheers',
  '🔥': 'fire',
  '😱': 'wow'
} as const;

export type ChatReactionType = typeof CHAT_REACTIONS[keyof typeof CHAT_REACTIONS];

export interface ChatState {
  messages: ChatMessage[];
  isLoading: boolean;
  isTyping: string[]; // Liste des userIds en train d'écrire
  unreadCount: number;
  lastReadMessageId?: string;
}