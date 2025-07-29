import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Alert,
  Animated,
  Image,
  Modal,
  Linking
} from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { ChatMessage as ChatMessageType, CHAT_REACTIONS } from '../../types/chat';
import { Avatar } from '../ui/Avatar';
import { useTheme } from '../../context/ThemeContext';
import { formatDateTime } from '../../utils/dateUtils';
import { format } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';
import { convertEmojiToIcon } from '../../utils/iconMappings';

interface ChatMessageProps {
  message: ChatMessageType;
  isOwn: boolean;
  onReaction: (emoji: string) => void;
  onReply?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  replyToMessage?: ChatMessageType;
  showAvatar?: boolean;
  showName?: boolean;
  showReactionPicker?: boolean;
  onToggleReactionPicker?: () => void;
}

export function ChatMessage({
  message,
  isOwn,
  onReaction,
  onReply,
  onEdit,
  onDelete,
  replyToMessage,
  showAvatar = true,
  showName = true,
  showReactionPicker = false,
  onToggleReactionPicker
}: ChatMessageProps) {
  const { colors } = useTheme();
  const [showImageModal, setShowImageModal] = useState(false);
  const translateX = useRef(new Animated.Value(0)).current;
  const replyOpacity = useRef(new Animated.Value(0)).current;

  const handleLongPress = () => {
    const actions = [];
    
    // Ajouter réaction (toujours disponible)
    actions.push({
      text: '😀 Réagir',
      onPress: () => onToggleReactionPicker?.()
    });
    
    if (onReply) {
      actions.push({
        text: 'Répondre',
        onPress: onReply
      });
    }
    
    if (isOwn && onEdit) {
      actions.push({
        text: 'Modifier',
        onPress: onEdit
      });
    }
    
    if (isOwn && onDelete) {
      actions.push({
        text: 'Supprimer',
        style: 'destructive' as const,
        onPress: onDelete
      });
    }
    
    actions.push({
      text: 'Annuler',
      style: 'cancel' as const
    });

    Alert.alert('Actions', '', actions);
  };

  const handleReactionPress = (emoji: string) => {
    onReaction(emoji);
    onToggleReactionPicker?.(); // Fermer le picker après sélection
  };

  const renderReactions = () => {
    const reactions = Object.entries(message.reactions);
    if (reactions.length === 0) return null;

    return (
      <View style={styles.reactionsContainer}>
        {reactions.map(([emoji, reaction]) => (
          <TouchableOpacity
            key={emoji}
            style={[
              styles.reactionBubble,
              { backgroundColor: colors.surface }
            ]}
            onPress={() => onReaction(emoji)}
          >
            <Text style={styles.reactionEmoji}>{emoji}</Text>
            <Text style={[styles.reactionCount, { color: colors.text }]}>
              {reaction.count}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderReplyTo = () => {
    if (!replyToMessage) return null;

    return (
      <View style={[styles.replyContainer, { backgroundColor: colors.surface }]}>
        <View style={[styles.replyBorder, { backgroundColor: colors.primary }]} />
        <View style={styles.replyContent}>
          <Text style={[styles.replyAuthor, { color: colors.primary }]}>
            {replyToMessage.userName}
          </Text>
          <Text
            style={[styles.replyText, { color: colors.textLight }]}
            numberOfLines={1}
          >
            {replyToMessage.text}
          </Text>
        </View>
      </View>
    );
  };

  const renderReactionPicker = () => {
    if (!showReactionPicker) return null;

    return (
      <View style={[
        styles.reactionPicker, 
        { backgroundColor: colors.surface },
        isOwn ? styles.reactionPickerOwn : styles.reactionPickerOther
      ]}>
        <Text style={[styles.reactionPickerTitle, { color: colors.textLight }]}>
          Réagir au message
        </Text>
        <View style={styles.reactionOptions}>
          {Object.keys(CHAT_REACTIONS).map((emoji) => (
            <TouchableOpacity
              key={emoji}
              style={[styles.reactionOption, { backgroundColor: colors.background }]}
              onPress={() => handleReactionPress(emoji)}
              activeOpacity={0.7}
            >
              <Text style={styles.reactionOptionEmoji}>{emoji}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  const handleImagePress = () => {
    setShowImageModal(true);
  };

  const renderImageContent = () => {
    if (message.type !== 'image' || !message.imageUrl) return null;

    console.log('ChatMessage - Rendering image with URL:', message.imageUrl);

    return (
      <>
        <View style={styles.imageContainer}>
          <TouchableOpacity onPress={handleImagePress}>
            <Image 
              source={{ uri: message.imageUrl }} 
              style={styles.messageImage}
              resizeMode="cover"
              onError={(error) => {
                console.error('ChatMessage - Image load error:', error.nativeEvent.error);
                console.error('ChatMessage - Failed URL:', message.imageUrl);
              }}
              onLoad={() => {
                console.log('ChatMessage - Image loaded successfully:', message.imageUrl);
              }}
            />
          </TouchableOpacity>
        </View>
        
        <Modal
          visible={showImageModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowImageModal(false)}
        >
          <TouchableWithoutFeedback onPress={() => setShowImageModal(false)}>
            <View style={styles.imageModalOverlay}>
              <TouchableWithoutFeedback>
                <View style={styles.imageModalContainer}>
                  <Image 
                    source={{ uri: message.imageUrl }} 
                    style={styles.fullScreenImage}
                    resizeMode="contain"
                    onError={(error) => {
                      console.error('ChatMessage - Modal image load error:', error.nativeEvent.error);
                    }}
                  />
                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={() => setShowImageModal(false)}
                  >
                    <Ionicons name="close" size={24} color="white" />
                  </TouchableOpacity>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      </>
    );
  };

  const handleLocationPress = async () => {
    if (!message.location) return;

    const { latitude, longitude } = message.location;
    console.log('ChatMessage - Opening location:', { latitude, longitude });
    
    // Formats d'URLs à essayer en ordre de préférence
    const urlsToTry = [
      // Google Maps web (universel)
      `https://www.google.com/maps?q=${latitude},${longitude}`,
      // Google Maps app deep link
      `google.navigation:q=${latitude},${longitude}`,
      // Apple Maps (iOS) ou Maps générique
      `maps:${latitude},${longitude}`,
      // Alternative Apple Maps
      `http://maps.apple.com/?q=${latitude},${longitude}`,
      // Waze
      `https://waze.com/ul?ll=${latitude},${longitude}`
    ];

    for (const url of urlsToTry) {
      try {
        console.log('ChatMessage - Trying URL:', url);
        const canOpen = await Linking.canOpenURL(url);
        console.log('ChatMessage - Can open URL:', canOpen, url);
        
        if (canOpen) {
          await Linking.openURL(url);
          console.log('ChatMessage - Successfully opened:', url);
          return;
        }
      } catch (error) {
        console.error('ChatMessage - Error with URL:', url, error);
        continue;
      }
    }
    
    // Si aucune URL n'a fonctionné, essayer de force l'ouverture avec Google Maps web
    try {
      console.log('ChatMessage - Force opening Google Maps web');
      const fallbackUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
      await Linking.openURL(fallbackUrl);
    } catch (error) {
      console.error('ChatMessage - All location methods failed:', error);
      Alert.alert(
        'Erreur', 
        'Impossible d\'ouvrir la carte. Veuillez copier ces coordonnées :\n' +
        `${latitude}, ${longitude}`,
        [
          { text: 'OK' }
        ]
      );
    }
  };

  const handleSwipeGesture = (event: any) => {
    const { translationX, velocityX, state } = event.nativeEvent;
    
    if (state === State.ACTIVE) {
      // Permettre le swipe vers la gauche seulement (translationX négatif)
      if (translationX < 0) {
        const progress = Math.min(Math.abs(translationX) / 80, 1);
        translateX.setValue(Math.max(translationX, -100)); // Limiter à -100px
        replyOpacity.setValue(progress);
      } else {
        // Empêcher le swipe vers la droite
        translateX.setValue(0);
        replyOpacity.setValue(0);
      }
    } else if (state === State.END || state === State.CANCELLED || state === State.FAILED) {
      // Si on a swipé assez loin ou assez vite, déclencher la réponse
      if (Math.abs(translationX) > 50 || Math.abs(velocityX) > 500) {
        if (translationX < 0 && onReply) {
          onReply();
        }
      }
      
      // Toujours remettre à zéro l'animation
      Animated.parallel([
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
          tension: 200,
          friction: 8,
        }),
        Animated.spring(replyOpacity, {
          toValue: 0,
          useNativeDriver: true,
          tension: 200,
          friction: 8,
        }),
      ]).start();
    }
  };

  const renderLocationContent = () => {
    if (message.type !== 'location' || !message.location) return null;

    return (
      <TouchableOpacity 
        style={[styles.locationContainer, { backgroundColor: colors.surface }]}
        onPress={handleLocationPress}
        activeOpacity={0.7}
      >
        <View style={styles.locationHeader}>
          <Ionicons name="location" size={20} color={colors.primary} />
          <Text style={[styles.locationTitle, { color: colors.text }]}>
            Localisation partagée
          </Text>
          <Ionicons name="open-outline" size={16} color={colors.textLight} style={styles.openIcon} />
        </View>
        {message.location.address && (
          <Text style={[styles.locationAddress, { color: colors.textLight }]}>
            {message.location.address}
          </Text>
        )}
        <Text style={[styles.locationCoords, { color: colors.textLight }]}>
          {message.location.latitude.toFixed(6)}, {message.location.longitude.toFixed(6)}
        </Text>
        <Text style={[styles.locationHint, { color: colors.textLight }]}>
          Appuyez pour ouvrir dans Google Maps
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, isOwn && styles.ownMessage]}>
      {showAvatar && !isOwn && (
        <Avatar
          avatarData={message.userAvatar ? (
            message.userAvatar.startsWith('icon:') 
              ? (() => {
                  const [, name, color] = message.userAvatar.split(':');
                  return { type: 'icon' as const, value: name, color };
                })()
              : convertEmojiToIcon(message.userAvatar)
          ) : undefined}
          name={message.userName}
          size="small"
          style={styles.avatar}
        />
      )}
      
      <View style={styles.messageContent}>
        {renderReplyTo()}
        
        <View style={styles.messageBubbleContainer}>
          {/* Icône de réponse qui apparaît pendant le swipe */}
          <Animated.View 
            style={[
              styles.replyIndicator,
              {
                opacity: replyOpacity,
                transform: [{ translateX: -30 }]
              }
            ]}
          >
            <Ionicons name="arrow-undo" size={20} color={colors.primary} />
          </Animated.View>
          
          <PanGestureHandler 
            onGestureEvent={handleSwipeGesture}
            onHandlerStateChange={handleSwipeGesture}
            activeOffsetX={[-10, 10]}
            failOffsetY={[-5, 5]}
          >
            <Animated.View
              style={[
                styles.swipeContainer,
                {
                  transform: [{ translateX }]
                }
              ]}
            >
              <TouchableOpacity
                style={[
                  styles.messageBubble,
                  {
                    backgroundColor: isOwn ? colors.primary : colors.surface,
                    marginLeft: !showAvatar || isOwn ? 0 : 8
                  }
                ]}
                onLongPress={handleLongPress}
                onPress={() => {
                  // Si c'est une image, ouvrir la modal d'image
                  if (message.type === 'image') {
                    handleImagePress();
                  } else if (message.type === 'location') {
                    handleLocationPress();
                  } else {
                    // Fermer le picker si ouvert, sinon l'ouvrir
                    onToggleReactionPicker?.();
                  }
                }}
              >
            {showName && (
              <Text style={[
                styles.authorName, 
                { 
                  color: isOwn ? 'rgba(255,255,255,0.8)' : colors.textLight,
                  textAlign: isOwn ? 'right' : 'left'
                }
              ]}>
                {message.userName}
              </Text>
            )}
            
            {message.type === 'text' || !message.type ? (
              <Text
                style={[
                  styles.messageText,
                  { color: isOwn ? '#ffffff' : colors.text }
                ]}
              >
                {message.text}
              </Text>
            ) : message.type === 'image' ? (
              <>
                <Text
                  style={[
                    styles.messageText,
                    { color: isOwn ? '#ffffff' : colors.text }
                  ]}
                >
                  {message.text}
                </Text>
                {renderImageContent()}
              </>
            ) : (
              <Text
                style={[
                  styles.messageText,
                  { color: isOwn ? '#ffffff' : colors.text }
                ]}
              >
                {message.text}
              </Text>
            )}
            
            {message.type === 'location' && renderLocationContent()}
            
            <View style={styles.messageFooter}>
              <Text
                style={[
                  styles.timestamp,
                  { color: isOwn ? 'rgba(255,255,255,0.7)' : colors.textLight }
                ]}
              >
                {format(message.timestamp, 'HH:mm')}
              </Text>
              
              {message.editedAt && (
                <Text
                  style={[
                    styles.editedIndicator,
                    { color: isOwn ? 'rgba(255,255,255,0.7)' : colors.textLight }
                  ]}
                >
                  modifié
                </Text>
              )}
            </View>
              </TouchableOpacity>
              
              {renderReactionPicker()}
            </Animated.View>
          </PanGestureHandler>
        </View>
        
        {renderReactions()}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginVertical: 2,
    paddingHorizontal: 16,
    alignItems: 'flex-end'
  },
  ownMessage: {
    justifyContent: 'flex-end'
  },
  avatar: {
    marginRight: 8,
    marginBottom: 4
  },
  messageContent: {
    flex: 1,
    maxWidth: '80%'
  },
  messageBubbleContainer: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center'
  },
  swipeContainer: {
    flex: 1
  },
  replyIndicator: {
    position: 'absolute',
    right: 0,
    top: '50%',
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1
  },
  replyContainer: {
    marginBottom: 4,
    borderRadius: 8,
    padding: 8,
    flexDirection: 'row'
  },
  replyBorder: {
    width: 3,
    borderRadius: 2,
    marginRight: 8
  },
  replyContent: {
    flex: 1
  },
  replyAuthor: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2
  },
  replyText: {
    fontSize: 12
  },
  messageBubble: {
    borderRadius: 16,
    padding: 12,
    maxWidth: '100%'
  },
  authorName: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 8
  },
  timestamp: {
    fontSize: 11
  },
  editedIndicator: {
    fontSize: 11,
    fontStyle: 'italic'
  },
  reactionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
    gap: 4
  },
  reactionBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4
  },
  reactionEmoji: {
    fontSize: 14
  },
  reactionCount: {
    fontSize: 12,
    fontWeight: '500'
  },
  reactionPicker: {
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    position: 'absolute',
    top: -60,
    zIndex: 1000,
    minWidth: 280
  },
  reactionPickerOther: {
    left: 0
  },
  reactionPickerOwn: {
    right: 0
  },
  reactionPickerTitle: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 8,
    textAlign: 'center'
  },
  reactionOptions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 8
  },
  reactionOption: {
    padding: 8,
    borderRadius: 20,
    minWidth: 44,
    alignItems: 'center'
  },
  reactionOptionEmoji: {
    fontSize: 24
  },
  // Styles pour les images
  imageContainer: {
    marginTop: 8
  },
  messageImage: {
    width: 200,
    height: 150,
    borderRadius: 8
  },
  imageModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  imageModalContainer: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center'
  },
  fullScreenImage: {
    width: '90%',
    height: '90%'
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  // Styles pour la localisation
  locationContainer: {
    marginTop: 8,
    padding: 12,
    borderRadius: 8,
    minWidth: 200
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4
  },
  locationTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
    flex: 1
  },
  openIcon: {
    marginLeft: 8
  },
  locationAddress: {
    fontSize: 13,
    marginBottom: 2
  },
  locationCoords: {
    fontSize: 11,
    fontFamily: 'monospace',
    marginBottom: 4
  },
  locationHint: {
    fontSize: 10,
    fontStyle: 'italic',
    textAlign: 'center'
  }
});