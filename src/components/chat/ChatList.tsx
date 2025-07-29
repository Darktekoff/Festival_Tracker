import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  Alert,
  TouchableWithoutFeedback
} from 'react-native';
import { ChatMessage as ChatMessageType } from '../../types/chat';
import { ChatMessage } from './ChatMessage';
import { TypingIndicator } from './TypingIndicator';
import { useTheme } from '../../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

interface ChatListProps {
  messages: ChatMessageType[];
  currentUserId: string;
  isLoading: boolean;
  isTyping: string[];
  onReaction: (messageId: string, emoji: string) => Promise<void>;
  onReply: (message: ChatMessageType) => void;
  onEditMessage: (messageId: string, newText: string) => Promise<void>;
  onDeleteMessage: (messageId: string) => Promise<void>;
  onRefresh?: () => void;
  refreshing?: boolean;
}

export function ChatList({
  messages,
  currentUserId,
  isLoading,
  isTyping,
  onReaction,
  onReply,
  onEditMessage,
  onDeleteMessage,
  onRefresh,
  refreshing = false
}: ChatListProps) {
  const { colors } = useTheme();
  const flatListRef = useRef<FlatList>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [openReactionMessageId, setOpenReactionMessageId] = useState<string | null>(null);

  // Scroll automatique vers le bas quand nouveaux messages
  useEffect(() => {
    if (messages.length > 0 && flatListRef.current) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  const handleReaction = async (messageId: string, emoji: string) => {
    try {
      await onReaction(messageId, emoji);
    } catch (error) {
      console.error('Error reacting to message:', error);
      Alert.alert('Erreur', 'Impossible d\'ajouter la réaction');
    }
  };

  const handleEditMessage = (messageId: string, currentText: string) => {
    Alert.prompt(
      'Modifier le message',
      'Entrez le nouveau texte :',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Modifier',
          onPress: async (newText) => {
            if (newText && newText.trim() !== currentText) {
              try {
                await onEditMessage(messageId, newText.trim());
              } catch (error) {
                console.error('Error editing message:', error);
                Alert.alert('Erreur', 'Impossible de modifier le message');
              }
            }
          }
        }
      ],
      'plain-text',
      currentText
    );
  };

  const handleDeleteMessage = (messageId: string) => {
    Alert.alert(
      'Supprimer le message',
      'Êtes-vous sûr de vouloir supprimer ce message ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await onDeleteMessage(messageId);
            } catch (error) {
              console.error('Error deleting message:', error);
              Alert.alert('Erreur', 'Impossible de supprimer le message');
            }
          }
        }
      ]
    );
  };

  const shouldShowAvatar = (message: ChatMessageType, index: number) => {
    if (message.userId === currentUserId) return false;
    if (index === 0) return true;
    
    const prevMessage = messages[index - 1];
    return prevMessage.userId !== message.userId;
  };

  const shouldShowName = (message: ChatMessageType, index: number) => {
    if (index === 0) return true;
    
    const prevMessage = messages[index - 1];
    return prevMessage.userId !== message.userId;
  };

  const getReplyToMessage = (replyToId: string) => {
    return messages.find(msg => msg.id === replyToId);
  };

  const renderMessage = ({ item: message, index }: { item: ChatMessageType; index: number }) => {
    const isOwn = message.userId === currentUserId;
    const showAvatar = shouldShowAvatar(message, index);
    const showName = shouldShowName(message, index);
    const replyToMessage = message.replyTo ? getReplyToMessage(message.replyTo) : undefined;

    return (
      <ChatMessage
        key={message.id}
        message={message}
        isOwn={isOwn}
        showAvatar={showAvatar}
        showName={showName}
        replyToMessage={replyToMessage}
        onReaction={(emoji) => handleReaction(message.id, emoji)}
        onReply={() => onReply(message)}
        onEdit={isOwn && !message.isDeleted ? () => handleEditMessage(message.id, message.text) : undefined}
        onDelete={isOwn && !message.isDeleted ? () => handleDeleteMessage(message.id) : undefined}
        showReactionPicker={openReactionMessageId === message.id}
        onToggleReactionPicker={() => {
          setOpenReactionMessageId(openReactionMessageId === message.id ? null : message.id);
        }}
      />
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="chatbubbles-outline" size={64} color={colors.textLight} />
      <Text style={[styles.emptyText, { color: colors.textLight }]}>
        Aucun message
      </Text>
      <Text style={[styles.emptySubtext, { color: colors.textLight }]}>
        Soyez le premier à écrire dans ce chat !
      </Text>
    </View>
  );

  const renderFooter = () => {
    if (isTyping.length === 0) return null;

    return (
      <View style={styles.footerContainer}>
        <TypingIndicator typingUsers={isTyping} />
      </View>
    );
  };

  return (
    <TouchableWithoutFeedback onPress={() => setOpenReactionMessageId(null)}>
      <View style={styles.container}>
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.listContainer,
            messages.length === 0 && styles.emptyList
          ]}
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[colors.primary]}
              />
            ) : undefined
          }
          ListEmptyComponent={renderEmpty}
          ListFooterComponent={renderFooter}
          maintainVisibleContentPosition={{
            minIndexForVisible: 0,
            autoscrollToTopThreshold: 10
          }}
          onScrollToIndexFailed={() => {
            // Ignore scroll errors
          }}
        />
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  listContainer: {
    paddingVertical: 16,
    flexGrow: 1
  },
  emptyList: {
    flex: 1,
    justifyContent: 'center'
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center'
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center'
  },
  footerContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8
  }
});