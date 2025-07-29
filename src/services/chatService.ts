import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where, 
  orderBy, 
  limit, 
  onSnapshot, 
  serverTimestamp, 
  increment,
  arrayUnion,
  arrayRemove,
  Timestamp,
  DocumentData,
  runTransaction,
  setDoc
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { ChatMessage, TypingIndicator } from '../types/chat';
import notificationService from './notificationService';

export class ChatService {
  private static instance: ChatService;
  private listeners: Map<string, () => void> = new Map();

  static getInstance(): ChatService {
    if (!ChatService.instance) {
      ChatService.instance = new ChatService();
    }
    return ChatService.instance;
  }

  // Envoyer un message
  async sendMessage(
    groupId: string, 
    userId: string, 
    userName: string, 
    userAvatar: string, 
    text: string, 
    replyTo?: string
  ): Promise<void> {
    try {
      const chatRef = collection(db, 'groups', groupId, 'chat');
      
      const docRef = await addDoc(chatRef, {
        userId,
        userName,
        userAvatar,
        text: text.trim(),
        type: 'text',
        timestamp: serverTimestamp(),
        replyTo: replyTo || null,
        reactions: {},
        isDeleted: false,
        editedAt: null,
        deletedAt: null
      });

      // Envoyer la notification aux autres membres du groupe
      await notificationService.sendChatMessageNotification(
        userName,
        text.trim(),
        groupId,
        docRef.id,
        userId
      );
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  // Envoyer une photo
  async sendPhoto(
    groupId: string, 
    userId: string, 
    userName: string, 
    userAvatar: string, 
    imageUri: string
  ): Promise<void> {
    try {
      console.log('ChatService - Sending photo with URL:', imageUri);
      const chatRef = collection(db, 'groups', groupId, 'chat');
      
      const messageData = {
        userId,
        userName,
        userAvatar,
        text: '📸 Photo',
        type: 'image',
        imageUrl: imageUri,
        timestamp: serverTimestamp(),
        replyTo: null,
        reactions: {},
        isDeleted: false,
        editedAt: null,
        deletedAt: null
      };

      console.log('ChatService - Message data:', messageData);
      
      const docRef = await addDoc(chatRef, messageData);
      console.log('ChatService - Photo message created with ID:', docRef.id);

      // Envoyer la notification pour la photo
      await notificationService.sendChatMessageNotification(
        userName,
        '📸 Photo',
        groupId,
        docRef.id,
        userId
      );
    } catch (error) {
      console.error('ChatService - Error sending photo:', error);
      throw error;
    }
  }

  // Envoyer une localisation
  async sendLocation(
    groupId: string, 
    userId: string, 
    userName: string, 
    userAvatar: string, 
    location: { latitude: number; longitude: number; address?: string }
  ): Promise<void> {
    try {
      const chatRef = collection(db, 'groups', groupId, 'chat');
      
      const locationText = location.address ? `📍 ${location.address}` : '📍 Ma position';
      
      const docRef = await addDoc(chatRef, {
        userId,
        userName,
        userAvatar,
        text: locationText,
        type: 'location',
        location,
        timestamp: serverTimestamp(),
        replyTo: null,
        reactions: {},
        isDeleted: false,
        editedAt: null,
        deletedAt: null
      });

      // Envoyer la notification pour la localisation
      await notificationService.sendChatMessageNotification(
        userName,
        locationText,
        groupId,
        docRef.id,
        userId
      );
    } catch (error) {
      console.error('Error sending location:', error);
      throw error;
    }
  }

  // Écouter les messages temps réel
  subscribeToChatMessages(
    groupId: string, 
    callback: (messages: ChatMessage[]) => void
  ): () => void {
    const chatRef = collection(db, 'groups', groupId, 'chat');
    const q = query(
      chatRef,
      orderBy('timestamp', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messages: ChatMessage[] = [];
      
      snapshot.forEach((doc) => {
        const data = doc.data() as DocumentData;
        
        // Debug pour les messages images
        if (data.type === 'image') {
          console.log('ChatService - Received image message:', {
            id: doc.id,
            imageUrl: data.imageUrl,
            userId: data.userId,
            userName: data.userName
          });
        }
        
        const message: ChatMessage = {
          id: doc.id,
          groupId,
          userId: data.userId,
          userName: data.userName,
          userAvatar: data.userAvatar,
          text: data.text,
          timestamp: data.timestamp?.toDate() || new Date(),
          editedAt: data.editedAt?.toDate() || undefined,
          replyTo: data.replyTo || undefined,
          reactions: data.reactions || {},
          isDeleted: data.isDeleted || false,
          deletedAt: data.deletedAt?.toDate() || undefined,
          type: data.type || 'text',
          imageUrl: data.imageUrl || undefined,
          location: data.location || undefined
        };
        messages.push(message);
      });

      console.log('ChatService - Total messages:', messages.length);
      console.log('ChatService - Image messages:', messages.filter(m => m.type === 'image').length);

      // Inverser pour avoir les messages dans l'ordre chronologique
      callback(messages.reverse());
    });

    // Stocker le listener pour pouvoir le nettoyer
    this.listeners.set(groupId, unsubscribe);
    return unsubscribe;
  }

  // Ajouter/retirer une réaction
  async toggleReaction(
    groupId: string, 
    messageId: string, 
    emoji: string, 
    userId: string
  ): Promise<void> {
    try {
      const messageRef = doc(db, 'groups', groupId, 'chat', messageId);
      
      // On utilise une transaction pour éviter les conflits
      await runTransaction(db, async (transaction) => {
        const messageDoc = await transaction.get(messageRef);
        
        if (!messageDoc.exists()) {
          throw new Error('Message not found');
        }

        const data = messageDoc.data();
        const reactions = data.reactions || {};
        
        if (!reactions[emoji]) {
          // Créer la réaction
          reactions[emoji] = {
            count: 1,
            userIds: [userId]
          };
        } else {
          // Toggler la réaction
          const userIds = reactions[emoji].userIds || [];
          if (userIds.includes(userId)) {
            // Retirer la réaction
            reactions[emoji].userIds = userIds.filter(id => id !== userId);
            reactions[emoji].count = Math.max(0, reactions[emoji].count - 1);
            
            // Supprimer la réaction si count = 0
            if (reactions[emoji].count === 0) {
              delete reactions[emoji];
            }
          } else {
            // Ajouter la réaction
            reactions[emoji].userIds.push(userId);
            reactions[emoji].count = (reactions[emoji].count || 0) + 1;
          }
        }

        transaction.update(messageRef, { reactions });
      });
    } catch (error) {
      console.error('Error toggling reaction:', error);
      throw error;
    }
  }

  // Modifier un message
  async editMessage(
    groupId: string, 
    messageId: string, 
    newText: string, 
    userId: string
  ): Promise<void> {
    try {
      const messageRef = doc(db, 'groups', groupId, 'chat', messageId);
      
      await updateDoc(messageRef, {
        text: newText.trim(),
        editedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error editing message:', error);
      throw error;
    }
  }

  // Supprimer un message
  async deleteMessage(
    groupId: string, 
    messageId: string, 
    userId: string
  ): Promise<void> {
    try {
      const messageRef = doc(db, 'groups', groupId, 'chat', messageId);
      
      await updateDoc(messageRef, {
        isDeleted: true,
        deletedAt: serverTimestamp(),
        text: 'Message supprimé'
      });
    } catch (error) {
      console.error('Error deleting message:', error);
      throw error;
    }
  }

  // Indicateur de frappe
  async setTypingIndicator(
    groupId: string, 
    userId: string, 
    userName: string, 
    isTyping: boolean
  ): Promise<void> {
    try {
      const typingRef = doc(db, 'groups', groupId, 'typing', userId);
      
      if (isTyping) {
        await setDoc(typingRef, {
          userId,
          userName,
          timestamp: serverTimestamp()
        }, { merge: true });
      } else {
        await deleteDoc(typingRef);
      }
    } catch (error) {
      console.error('Error setting typing indicator:', error);
    }
  }

  // Écouter les indicateurs de frappe
  subscribeToTypingIndicators(
    groupId: string, 
    currentUserId: string,
    callback: (typingUsers: string[]) => void
  ): () => void {
    const typingRef = collection(db, 'groups', groupId, 'typing');
    const q = query(typingRef, where('userId', '!=', currentUserId));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const typingUsers: string[] = [];
      const now = new Date();
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        const timestamp = data.timestamp?.toDate();
        
        // Considérer comme "en train d'écrire" seulement si < 5 secondes
        if (timestamp && (now.getTime() - timestamp.getTime()) < 5000) {
          typingUsers.push(data.userName);
        }
      });
      
      callback(typingUsers);
    });

    return unsubscribe;
  }

  // Nettoyer les listeners
  unsubscribeFromGroup(groupId: string): void {
    const unsubscribe = this.listeners.get(groupId);
    if (unsubscribe) {
      unsubscribe();
      this.listeners.delete(groupId);
    }
  }

  // Nettoyer tous les listeners
  unsubscribeAll(): void {
    this.listeners.forEach((unsubscribe) => {
      unsubscribe();
    });
    this.listeners.clear();
  }
}

export const chatService = ChatService.getInstance();