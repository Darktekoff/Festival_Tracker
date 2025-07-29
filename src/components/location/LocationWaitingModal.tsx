import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Animated,
  Easing
} from 'react-native';
import { BlurView } from 'expo-blur';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../ui/Button';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { Avatar } from '../ui/Avatar';
import { useTheme } from '../../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { LocationRequest } from '../../types/location';

interface LocationWaitingModalProps {
  visible: boolean;
  request: LocationRequest | null;
  onCancel: () => void;
  timeLeft?: number; // Temps restant en secondes
}

export function LocationWaitingModal({ 
  visible, 
  request, 
  onCancel,
  timeLeft = 0
}: LocationWaitingModalProps) {
  const { colors, isDark } = useTheme();
  const pulseAnimation = new Animated.Value(1);

  // Animation de pulsation pour l'icône
  useEffect(() => {
    if (visible) {
      const pulse = () => {
        Animated.sequence([
          Animated.timing(pulseAnimation, {
            toValue: 1.2,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnimation, {
            toValue: 1,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]).start(() => pulse());
      };
      pulse();
    }
  }, [visible]);

  const formatTimeLeft = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (!request) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        {isDark ? (
          <View style={[styles.backdrop, { backgroundColor: 'rgba(0, 0, 0, 0.7)' }]} />
        ) : (
          <BlurView intensity={20} style={styles.backdrop} />
        )}
        
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
          <Animated.View style={[styles.modal, { backgroundColor: colors.surface }]}>
            {/* Header avec icône animée */}
            <View style={styles.header}>
              <Animated.View 
                style={[
                  styles.iconContainer, 
                  { 
                    backgroundColor: colors.primary,
                    transform: [{ scale: pulseAnimation }]
                  }
                ]}
              >
                <Ionicons name="location" size={32} color="#ffffff" />
              </Animated.View>
            </View>

            {/* Contenu principal */}
            <View style={styles.content}>
              {/* Avatar et nom de l'utilisateur */}
              <View style={styles.userInfo}>
                <Avatar
                  avatarData={undefined} // TODO: utiliser l'avatar réel
                  name={request.toUserName}
                  size="medium"
                />
                <Text style={[styles.userName, { color: colors.text }]}>
                  {request.toUserName}
                </Text>
              </View>

              {/* Spinner et message d'attente */}
              <View style={styles.waitingSection}>
                <LoadingSpinner size="large" color={colors.primary} />
                <Text style={[styles.title, { color: colors.text }]}>
                  En attente de réponse
                </Text>
                <Text style={[styles.message, { color: colors.textLight }]}>
                  Nous avons envoyé votre demande de localisation à {request.toUserName}.
                </Text>
                <Text style={[styles.message, { color: colors.textLight }]}>
                  Patientez pendant qu'il/elle décide de partager sa position...
                </Text>
              </View>

              {/* Indicateur de temps restant */}
              {timeLeft > 0 && (
                <View style={styles.timerContainer}>
                  <Ionicons name="time-outline" size={16} color={colors.textLight} />
                  <Text style={[styles.timerText, { color: colors.textLight }]}>
                    Expiration dans {formatTimeLeft(timeLeft)}
                  </Text>
                </View>
              )}
            </View>

            {/* Bouton d'annulation */}
            <View style={styles.actions}>
              <Button
                title="Annuler la demande"
                onPress={onCancel}
                variant="ghost"
                icon={<Ionicons name="close" size={18} color={colors.textLight} />}
              />
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
    marginBottom: 24,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
  },
  waitingSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 12,
  },
  message: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 8,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(107, 114, 128, 0.1)',
    borderRadius: 12,
  },
  timerText: {
    fontSize: 14,
    fontWeight: '500',
  },
  actions: {
    paddingHorizontal: 24,
  },
});