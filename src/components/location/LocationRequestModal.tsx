import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Alert,
  Animated,
  Dimensions
} from 'react-native';
import { BlurView } from 'expo-blur';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../ui/Button';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { Avatar } from '../ui/Avatar';
import { useTheme } from '../../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { LocationRequest } from '../../types/location';
import { useLocation } from '../../hooks/useLocation';
import locationRequestService from '../../services/locationRequestService';

const { height: screenHeight } = Dimensions.get('window');

interface LocationRequestModalProps {
  visible: boolean;
  request: LocationRequest | null;
  onClose: () => void;
  onResponse: (accepted: boolean) => void;
}

export function LocationRequestModal({ 
  visible, 
  request, 
  onClose, 
  onResponse 
}: LocationRequestModalProps) {
  const { colors, isDark } = useTheme();
  const { getCurrentPosition, hasPermission, requestPermissions } = useLocation();
  const [isResponding, setIsResponding] = useState(false);
  const [responseStatus, setResponseStatus] = useState<'accepting' | 'declining' | null>(null);

  const handleAccept = async () => {
    if (!request) return;

    try {
      setIsResponding(true);
      setResponseStatus('accepting');

      // Vérifier les permissions de géolocalisation
      let hasLocationPermission = hasPermission;
      
      if (!hasLocationPermission) {
        const permissionStatus = await requestPermissions();
        hasLocationPermission = permissionStatus === 'granted';
      }

      if (!hasLocationPermission) {
        Alert.alert(
          'Permission refusée',
          'L\'autorisation de géolocalisation est nécessaire pour partager votre position.',
          [
            { text: 'Annuler', style: 'cancel' },
            { 
              text: 'Ouvrir paramètres', 
              onPress: () => {
                // TODO: Ouvrir les paramètres de l'app
              }
            }
          ]
        );
        setResponseStatus(null);
        return;
      }

      // Répondre à la demande via le service
      await locationRequestService.respondToLocationRequest(
        request.id,
        'accepted'
      );

      onResponse(true);
      onClose();

    } catch (error: any) {
      console.error('Error accepting location request:', error);
      
      Alert.alert(
        'Erreur',
        error.message || 'Impossible de partager votre position actuellement'
      );
    } finally {
      setIsResponding(false);
      setResponseStatus(null);
    }
  };

  const handleDecline = async () => {
    if (!request) return;

    try {
      setIsResponding(true);
      setResponseStatus('declining');

      await locationRequestService.respondToLocationRequest(
        request.id,
        'declined'
      );

      onResponse(false);
      onClose();

    } catch (error: any) {
      console.error('Error declining location request:', error);
      
      Alert.alert(
        'Erreur',
        'Impossible de répondre à la demande actuellement'
      );
    } finally {
      setIsResponding(false);
      setResponseStatus(null);
    }
  };

  const handleBackdropPress = () => {
    if (!isResponding) {
      onClose();
    }
  };

  if (!request) return null;

  const isExpired = new Date() > request.expiresAt;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={handleBackdropPress}
    >
      <View style={styles.overlay}>
        {isDark ? (
          <View style={[styles.backdrop, { backgroundColor: 'rgba(0, 0, 0, 0.7)' }]} />
        ) : (
          <BlurView intensity={20} style={styles.backdrop} />
        )}
        
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
          <Animated.View style={[styles.modal, { backgroundColor: colors.surface }]}>
            {/* Header avec icône de localisation */}
            <View style={styles.header}>
              <View style={[styles.iconContainer, { backgroundColor: colors.primary }]}>
                <Ionicons name="location" size={32} color="#ffffff" />
              </View>
            </View>

            {/* Contenu principal */}
            <View style={styles.content}>
              {/* Avatar et nom de l'utilisateur */}
              <View style={styles.userInfo}>
                <Avatar
                  avatarData={undefined} // TODO: utiliser l'avatar réel
                  name={request.fromUserName}
                  size="medium"
                />
                <Text style={[styles.userName, { color: colors.text }]}>
                  {request.fromUserName}
                </Text>
              </View>

              {/* Message principal */}
              <Text style={[styles.title, { color: colors.text }]}>
                Demande de localisation
              </Text>
              
              <Text style={[styles.message, { color: colors.textLight }]}>
                {request.message || 
                  `${request.fromUserName} aimerait savoir où tu te trouves pour te rejoindre !`
                }
              </Text>

              <Text style={[styles.question, { color: colors.text }]}>
                Veux-tu lui donner ta position actuelle ?
              </Text>

              {/* Indicateur d'expiration */}
              {isExpired && (
                <View style={styles.expiredContainer}>
                  <Ionicons name="time-outline" size={16} color={colors.danger} />
                  <Text style={[styles.expiredText, { color: colors.danger }]}>
                    Cette demande a expiré
                  </Text>
                </View>
              )}
            </View>

            {/* Boutons d'action */}
            <View style={styles.actions}>
              {!isExpired ? (
                <>
                  <Button
                    title={responseStatus === 'declining' ? 'Refus...' : 'Non'}
                    onPress={handleDecline}
                    variant="ghost"
                    disabled={isResponding}
                    style={styles.button}
                    icon={responseStatus === 'declining' ? 
                      <LoadingSpinner size="small" color={colors.textLight} /> : 
                      undefined
                    }
                  />
                  <Button
                    title={responseStatus === 'accepting' ? 'Partage...' : 'Oui'}
                    onPress={handleAccept}
                    variant="primary"
                    disabled={isResponding}
                    style={styles.button}
                    icon={responseStatus === 'accepting' ? 
                      <LoadingSpinner size="small" color="#ffffff" /> : 
                      undefined
                    }
                  />
                </>
              ) : (
                <Button
                  title="Fermer"
                  onPress={onClose}
                  variant="secondary"
                  style={styles.button}
                />
              )}
            </View>
          </Animated.View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modal: {
    borderRadius: 20,
    paddingBottom: 24,
    minWidth: 320,
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 16,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    alignItems: 'center',
  },
  userInfo: {
    alignItems: 'center',
    marginBottom: 16,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 12,
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 16,
  },
  question: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 8,
  },
  expiredContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 12,
  },
  expiredText: {
    fontSize: 14,
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    gap: 12,
  },
  button: {
    flex: 1,
  },
});