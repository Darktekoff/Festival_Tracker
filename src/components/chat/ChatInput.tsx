import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { ChatMessage } from '../../types/chat';
import { useTheme } from '../../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

interface ChatInputProps {
  onSendMessage: (text: string, replyTo?: string) => Promise<void>;
  onSendPhoto: (imageUri: string) => Promise<void>;
  onSendLocation: (location: { latitude: number; longitude: number; address?: string }) => Promise<void>;
  onTyping: (isTyping: boolean) => void;
  replyToMessage?: ChatMessage;
  onCancelReply?: () => void;
  isLoading?: boolean;
  placeholder?: string;
}

export function ChatInput({
  onSendMessage,
  onSendPhoto,
  onSendLocation,
  onTyping,
  replyToMessage,
  onCancelReply,
  isLoading = false,
  placeholder = "Tapez votre message..."
}: ChatInputProps) {
  const { colors } = useTheme();
  const [text, setText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleTextChange = useCallback((newText: string) => {
    setText(newText);
    
    // Déclencher l'indicateur de frappe
    onTyping(newText.length > 0);
    
    // Arrêter l'indicateur après 1 seconde d'inactivité
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    typingTimeoutRef.current = setTimeout(() => {
      onTyping(false);
    }, 1000);
  }, [onTyping]);

  const handleSend = useCallback(async () => {
    const trimmedText = text.trim();
    
    if (!trimmedText || isSending) {
      return;
    }

    setIsSending(true);
    
    try {
      await onSendMessage(trimmedText, replyToMessage?.id);
      setText('');
      onTyping(false);
      onCancelReply?.();
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Erreur', 'Impossible d\'envoyer le message');
    } finally {
      setIsSending(false);
    }
  }, [text, isSending, onSendMessage, replyToMessage?.id, onTyping, onCancelReply]);

  const handleSubmitEditing = useCallback(() => {
    handleSend();
  }, [handleSend]);

  const handleTakePhoto = useCallback(async () => {
    try {
      // Demander la permission d'accès à la caméra
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission refusée', 'Nous avons besoin de l\'accès à la caméra pour prendre des photos.');
        return;
      }

      // Prendre une photo
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await onSendPhoto(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Erreur', 'Impossible de prendre la photo');
    }
  }, [onSendPhoto]);

  const handleSendLocation = useCallback(async () => {
    try {
      // Vérifier que onSendLocation est défini
      if (!onSendLocation) {
        console.error('onSendLocation is not defined');
        Alert.alert('Erreur', 'Fonction d\'envoi de localisation non disponible');
        return;
      }

      // Demander la permission d'accès à la localisation
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission refusée', 'Nous avons besoin de l\'accès à la localisation pour partager votre position.');
        return;
      }

      // Obtenir la position actuelle avec précision maximale
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: 10000, // 10 secondes
      });
      
      // Essayer d'obtenir l'adresse (optionnel)
      let address = undefined;
      try {
        const reverseGeocode = await Location.reverseGeocodeAsync({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
        
        if (reverseGeocode.length > 0) {
          const place = reverseGeocode[0];
          address = `${place.name || place.street || ''} ${place.city || ''}`.trim();
        }
      } catch (geocodeError) {
        console.log('Geocoding failed:', geocodeError);
      }

      await onSendLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        address
      });
    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert('Erreur', 'Impossible d\'obtenir votre position');
    }
  }, [onSendLocation]);

  const renderReplyPreview = () => {
    if (!replyToMessage) return null;

    return (
      <View style={[styles.replyPreview, { backgroundColor: colors.surface }]}>
        <View style={[styles.replyBorder, { backgroundColor: colors.primary }]} />
        <View style={styles.replyContent}>
          <Text style={[styles.replyAuthor, { color: colors.primary }]}>
            Répondre à {replyToMessage.userName}
          </Text>
          <Text
            style={[styles.replyText, { color: colors.textLight }]}
            numberOfLines={1}
          >
            {replyToMessage.text}
          </Text>
        </View>
        <TouchableOpacity
          onPress={onCancelReply}
          style={styles.cancelReplyButton}
        >
          <Ionicons name="close" size={20} color={colors.textLight} />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      {renderReplyPreview()}
      
      <View style={styles.inputContainer}>
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.background }]}
            onPress={handleTakePhoto}
            disabled={isLoading || isSending}
          >
            <Ionicons name="camera" size={20} color={colors.primary} />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.background }]}
            onPress={handleSendLocation}
            disabled={isLoading || isSending}
          >
            <Ionicons name="location" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>
        
        <TextInput
          ref={inputRef}
          style={[
            styles.textInput,
            {
              color: colors.text,
              backgroundColor: colors.background
            }
          ]}
          value={text}
          onChangeText={handleTextChange}
          placeholder={placeholder}
          placeholderTextColor={colors.textLight}
          multiline
          maxLength={1000}
          returnKeyType="send"
          onSubmitEditing={handleSubmitEditing}
          blurOnSubmit={false}
          editable={!isLoading && !isSending}
        />
        
        <TouchableOpacity
          style={[
            styles.sendButton,
            {
              backgroundColor: text.trim() ? colors.primary : colors.textLight
            }
          ]}
          onPress={handleSend}
          disabled={!text.trim() || isSending || isLoading}
        >
          {isSending ? (
            <Ionicons name="hourglass" size={20} color="#ffffff" />
          ) : (
            <Ionicons name="send" size={20} color="#ffffff" />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    // backgroundColor sera défini via props
  },
  replyPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 8
  },
  replyBorder: {
    width: 3,
    height: '100%',
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
  cancelReplyButton: {
    padding: 4
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 16,
    gap: 12
  },
  actionButtons: {
    flexDirection: 'column',
    gap: 8
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center'
  },
  textInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    textAlignVertical: 'top'
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center'
  }
});