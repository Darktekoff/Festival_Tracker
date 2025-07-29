import { useState, useEffect, useCallback, useRef } from 'react';
import { ChatMessage, ChatState } from '../types/chat';
import { chatService } from '../services/chatService';

export interface UseChatReturn {
  messages: ChatMessage[];
  isLoading: boolean;
  isTyping: string[];
  unreadCount: number;
  sendMessage: (text: string, replyTo?: string) => Promise<void>;
  sendPhoto: (imageUri: string) => Promise<void>;
  sendLocation: (location: { latitude: number; longitude: number; address?: string }) => Promise<void>;
  toggleReaction: (messageId: string, emoji: string) => Promise<void>;
  editMessage: (messageId: string, newText: string) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  setTyping: (isTyping: boolean) => void;
  markAsRead: () => void;
  refreshMessages: () => void;
}

export function useChat(
  groupId: string | null, 
  userId: string | null, 
  userName: string | null, 
  userAvatar: string | null
): UseChatReturn {
  const [state, setState] = useState<ChatState>({
    messages: [],
    isLoading: true,
    isTyping: [],
    unreadCount: 0,
    lastReadMessageId: undefined
  });

  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastReadMessageIdRef = useRef<string | undefined>(undefined);

  // Envoyer un message
  const sendMessage = useCallback(async (text: string, replyTo?: string) => {
    if (!groupId || !userId || !userName || !userAvatar) {
      throw new Error('Missing required user data');
    }

    if (!text.trim()) {
      return;
    }

    try {
      await chatService.sendMessage(
        groupId, 
        userId, 
        userName, 
        userAvatar, 
        text, 
        replyTo
      );
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }, [groupId, userId, userName, userAvatar]);

  // Envoyer une photo
  const sendPhoto = useCallback(async (imageUri: string) => {
    if (!groupId || !userId || !userName || !userAvatar) {
      throw new Error('Missing required user data');
    }

    try {
      await chatService.sendPhoto(
        groupId, 
        userId, 
        userName, 
        userAvatar, 
        imageUri
      );
    } catch (error) {
      console.error('Error sending photo:', error);
      throw error;
    }
  }, [groupId, userId, userName, userAvatar]);

  // Envoyer une localisation
  const sendLocation = useCallback(async (location: { latitude: number; longitude: number; address?: string }) => {
    if (!groupId || !userId || !userName || !userAvatar) {
      throw new Error('Missing required user data');
    }

    try {
      await chatService.sendLocation(
        groupId, 
        userId, 
        userName, 
        userAvatar, 
        location
      );
    } catch (error) {
      console.error('Error sending location:', error);
      throw error;
    }
  }, [groupId, userId, userName, userAvatar]);

  // Toggler une réaction
  const toggleReaction = useCallback(async (messageId: string, emoji: string) => {
    if (!groupId || !userId) {
      throw new Error('Missing required data');
    }

    try {
      await chatService.toggleReaction(groupId, messageId, emoji, userId);
    } catch (error) {
      console.error('Error toggling reaction:', error);
      throw error;
    }
  }, [groupId, userId]);

  // Modifier un message
  const editMessage = useCallback(async (messageId: string, newText: string) => {
    if (!groupId || !userId) {
      throw new Error('Missing required data');
    }

    try {
      await chatService.editMessage(groupId, messageId, newText, userId);
    } catch (error) {
      console.error('Error editing message:', error);
      throw error;
    }
  }, [groupId, userId]);

  // Supprimer un message
  const deleteMessage = useCallback(async (messageId: string) => {
    if (!groupId || !userId) {
      throw new Error('Missing required data');
    }

    try {
      await chatService.deleteMessage(groupId, messageId, userId);
    } catch (error) {
      console.error('Error deleting message:', error);
      throw error;
    }
  }, [groupId, userId]);

  // Indicateur de frappe
  const setTyping = useCallback((isTyping: boolean) => {
    if (!groupId || !userId || !userName) {
      return;
    }

    // Nettoyer le timeout précédent
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    if (isTyping) {
      chatService.setTypingIndicator(groupId, userId, userName, true);
      
      // Arrêter automatiquement après 3 secondes
      typingTimeoutRef.current = setTimeout(() => {
        chatService.setTypingIndicator(groupId, userId, userName, false);
      }, 3000);
    } else {
      chatService.setTypingIndicator(groupId, userId, userName, false);
    }
  }, [groupId, userId, userName]);

  // Marquer comme lu
  const markAsRead = useCallback(() => {
    if (state.messages.length > 0) {
      const lastMessage = state.messages[state.messages.length - 1];
      lastReadMessageIdRef.current = lastMessage.id;
      
      setState(prev => ({
        ...prev,
        unreadCount: 0,
        lastReadMessageId: lastMessage.id
      }));
    }
  }, [state.messages]);

  // Rafraîchir les messages
  const refreshMessages = useCallback(() => {
    if (groupId) {
      setState(prev => ({ ...prev, isLoading: true }));
    }
  }, [groupId]);

  // Calculer le nombre de messages non lus
  const calculateUnreadCount = useCallback((messages: ChatMessage[]) => {
    if (!lastReadMessageIdRef.current || !userId) {
      return 0;
    }

    const lastReadIndex = messages.findIndex(msg => msg.id === lastReadMessageIdRef.current);
    if (lastReadIndex === -1) {
      return messages.filter(msg => msg.userId !== userId).length;
    }

    return messages.slice(lastReadIndex + 1).filter(msg => msg.userId !== userId).length;
  }, [userId]);

  // Écouter les messages
  useEffect(() => {
    if (!groupId) {
      setState({
        messages: [],
        isLoading: false,
        isTyping: [],
        unreadCount: 0,
        lastReadMessageId: undefined
      });
      return;
    }

    setState(prev => ({ ...prev, isLoading: true }));

    const unsubscribe = chatService.subscribeToChatMessages(groupId, (messages) => {
      const unreadCount = calculateUnreadCount(messages);
      
      setState(prev => ({
        ...prev,
        messages,
        isLoading: false,
        unreadCount
      }));
    });

    return () => {
      unsubscribe();
    };
  }, [groupId, calculateUnreadCount]);

  // Écouter les indicateurs de frappe
  useEffect(() => {
    if (!groupId || !userId) {
      return;
    }

    const unsubscribe = chatService.subscribeToTypingIndicators(
      groupId, 
      userId, 
      (typingUsers) => {
        setState(prev => ({
          ...prev,
          isTyping: typingUsers
        }));
      }
    );

    return () => {
      unsubscribe();
    };
  }, [groupId, userId]);

  // Nettoyer les timeouts
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  return {
    messages: state.messages,
    isLoading: state.isLoading,
    isTyping: state.isTyping,
    unreadCount: state.unreadCount,
    sendMessage,
    sendPhoto,
    sendLocation,
    toggleReaction,
    editMessage,
    deleteMessage,
    setTyping,
    markAsRead,
    refreshMessages
  };
}