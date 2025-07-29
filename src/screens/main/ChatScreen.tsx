import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Dimensions
} from 'react-native';
import { ChatList } from '../../components/chat/ChatList';
import { ChatInput } from '../../components/chat/ChatInput';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { useTheme } from '../../context/ThemeContext';
import { useAuthContext } from '../../context/AuthContext';
import { useGroupContext } from '../../context/GroupContext';
import { useChat } from '../../hooks/useChat';
import { ChatMessage } from '../../types/chat';
import { Ionicons } from '@expo/vector-icons';

interface ChatScreenProps {
  navigation: any;
}

export function ChatScreen({ navigation }: ChatScreenProps) {
  const { colors } = useTheme();
  const { user } = useAuthContext();
  const { group } = useGroupContext();
  const [replyToMessage, setReplyToMessage] = useState<ChatMessage | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const {
    messages,
    isLoading,
    isTyping,
    unreadCount,
    sendMessage,
    sendPhoto,
    sendLocation,
    toggleReaction,
    editMessage,
    deleteMessage,
    setTyping,
    markAsRead,
    refreshMessages
  } = useChat(
    group?.id || null,
    user?.id || null,
    user?.name || null,
    user?.avatar || null
  );

  // Écouter les événements clavier
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
      }
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
      }
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  // Marquer comme lu quand on ouvre l'écran
  useEffect(() => {
    if (messages.length > 0) {
      markAsRead();
    }
  }, [messages.length, markAsRead]);

  // Marquer comme lu quand on focus l'écran
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (messages.length > 0) {
        markAsRead();
      }
    });

    return unsubscribe;
  }, [navigation, messages.length, markAsRead]);

  const handleSendMessage = useCallback(async (text: string, replyTo?: string) => {
    try {
      await sendMessage(text, replyTo);
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Erreur', 'Impossible d\'envoyer le message');
    }
  }, [sendMessage]);

  const handleSendPhoto = useCallback(async (imageUri: string) => {
    try {
      await sendPhoto(imageUri);
    } catch (error) {
      console.error('Error sending photo:', error);
      Alert.alert('Erreur', 'Impossible d\'envoyer la photo');
    }
  }, [sendPhoto]);

  const handleSendLocation = useCallback(async (location: { latitude: number; longitude: number; address?: string }) => {
    try {
      await sendLocation(location);
    } catch (error) {
      console.error('Error sending location:', error);
      Alert.alert('Erreur', 'Impossible d\'envoyer la localisation');
    }
  }, [sendLocation]);

  const handleReaction = useCallback(async (messageId: string, emoji: string) => {
    try {
      await toggleReaction(messageId, emoji);
    } catch (error) {
      console.error('Error toggling reaction:', error);
      Alert.alert('Erreur', 'Impossible d\'ajouter la réaction');
    }
  }, [toggleReaction]);

  const handleEditMessage = useCallback(async (messageId: string, newText: string) => {
    try {
      await editMessage(messageId, newText);
    } catch (error) {
      console.error('Error editing message:', error);
      Alert.alert('Erreur', 'Impossible de modifier le message');
    }
  }, [editMessage]);

  const handleDeleteMessage = useCallback(async (messageId: string) => {
    try {
      await deleteMessage(messageId);
    } catch (error) {
      console.error('Error deleting message:', error);
      Alert.alert('Erreur', 'Impossible de supprimer le message');
    }
  }, [deleteMessage]);

  const handleReply = useCallback((message: ChatMessage) => {
    setReplyToMessage(message);
  }, []);

  const handleCancelReply = useCallback(() => {
    setReplyToMessage(null);
  }, []);

  const handleTyping = useCallback((isTyping: boolean) => {
    setTyping(isTyping);
  }, [setTyping]);

  const handleRefresh = useCallback(() => {
    refreshMessages();
  }, [refreshMessages]);

  // Vérifier si l'utilisateur est dans un groupe
  if (!group) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.errorContainer}>
          <Ionicons name="people-outline" size={64} color={colors.textLight} />
          <Text style={[styles.errorText, { color: colors.textLight }]}>
            Rejoignez un groupe pour chatter
          </Text>
        </View>
      </View>
    );
  }

  // Vérifier si l'utilisateur est connecté
  if (!user) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.errorContainer}>
          <Ionicons name="person-outline" size={64} color={colors.textLight} />
          <Text style={[styles.errorText, { color: colors.textLight }]}>
            Connectez-vous pour accéder au chat
          </Text>
        </View>
      </View>
    );
  }

  if (isLoading && messages.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <LoadingSpinner text="Chargement des messages..." fullScreen />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 80}
      >
        <ChatList
          messages={messages}
          currentUserId={user.id}
          isLoading={isLoading}
          isTyping={isTyping}
          onReaction={handleReaction}
          onReply={handleReply}
          onEditMessage={handleEditMessage}
          onDeleteMessage={handleDeleteMessage}
          onRefresh={handleRefresh}
          refreshing={isLoading}
        />
        
        <ChatInput
          onSendMessage={handleSendMessage}
          onSendPhoto={handleSendPhoto}
          onSendLocation={handleSendLocation}
          onTyping={handleTyping}
          replyToMessage={replyToMessage}
          onCancelReply={handleCancelReply}
          isLoading={isLoading}
          placeholder="Tapez votre message..."
        />
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  keyboardContainer: {
    flex: 1
  },
  inputWrapper: {
    // Wrapper pour l'input qui réagit au clavier
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32
  },
  errorText: {
    fontSize: 16,
    fontWeight: '500',
    marginTop: 16,
    textAlign: 'center'
  }
});