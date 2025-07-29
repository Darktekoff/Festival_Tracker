import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Alert
} from 'react-native';
import { BlurView } from 'expo-blur';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../ui/Button';
import { Avatar } from '../ui/Avatar';
import { useTheme } from '../../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { LocationShare } from '../../types/location';
import { useLocation } from '../../hooks/useLocation';
import locationService from '../../services/locationService';

interface LocationReceivedModalProps {
  visible: boolean;
  locationShare: LocationShare | null;
  onClose: () => void;
}

export function LocationReceivedModal({ 
  visible, 
  locationShare, 
  onClose 
}: LocationReceivedModalProps) {
  const { colors, isDark } = useTheme();
  const { getCurrentPosition, calculateDistance, formatDistance } = useLocation();
  const [myDistance, setMyDistance] = useState<string | null>(null);

  // Calculer la distance entre ma position et celle partagée
  useEffect(() => {
    if (visible && locationShare) {
      calculateDistanceToLocation();
    }
  }, [visible, locationShare]);

  const calculateDistanceToLocation = async () => {
    if (!locationShare) return;

    try {
      const myLocation = await getCurrentPosition();
      if (myLocation) {
        const distance = calculateDistance(
          myLocation.coordinates.latitude,
          myLocation.coordinates.longitude,
          locationShare.location.coordinates.latitude,
          locationShare.location.coordinates.longitude
        );
        setMyDistance(formatDistance(distance));
      }
    } catch (error) {
      console.error('Error calculating distance:', error);
      // Ne pas afficher d'erreur, la distance n'est pas critique
    }
  };

  const handleOpenInMaps = async () => {
    if (!locationShare) return;

    try {
      await locationService.openInMaps(
        locationShare.location.coordinates.latitude,
        locationShare.location.coordinates.longitude,
        `Position de ${locationShare.fromUserName}`
      );
    } catch (error: any) {
      console.error('Error opening maps:', error);
      Alert.alert(
        'Erreur',
        'Impossible d\'ouvrir l\'application de cartes'
      );
    }
  };

  const handleCopyCoordinates = () => {
    if (!locationShare) return;

    const coordinates = `${locationShare.location.coordinates.latitude}, ${locationShare.location.coordinates.longitude}`;
    
    // TODO: Copier dans le presse-papiers
    Alert.alert(
      'Coordonnées',
      coordinates,
      [
        { text: 'Fermer', style: 'cancel' },
        { text: 'Copier', onPress: () => {
          // TODO: Implémenter la copie
          console.log('Coordinates copied:', coordinates);
        }}
      ]
    );
  };

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (date: Date): string => {
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) {
      return `Aujourd'hui à ${formatTime(date)}`;
    } else {
      return date.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  if (!locationShare) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        {isDark ? (
          <View style={[styles.backdrop, { backgroundColor: 'rgba(0, 0, 0, 0.7)' }]} />
        ) : (
          <BlurView intensity={20} style={styles.backdrop} />
        )}
        
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
          <View style={[styles.modal, { backgroundColor: colors.surface }]}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <View style={[styles.iconContainer, { backgroundColor: colors.success }]}>
                  <Ionicons name="checkmark" size={24} color="#ffffff" />
                </View>
                <Text style={[styles.headerTitle, { color: colors.text }]}>
                  Position reçue
                </Text>
              </View>
              <TouchableOpacity
                onPress={onClose}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color={colors.textLight} />
              </TouchableOpacity>
            </View>

            {/* Contenu principal */}
            <View style={styles.content}>
              {/* Informations utilisateur */}
              <View style={styles.userSection}>
                <Avatar
                  avatarData={undefined} // TODO: utiliser l'avatar réel
                  name={locationShare.fromUserName}
                  size="medium"
                />
                <View style={styles.userInfo}>
                  <Text style={[styles.userName, { color: colors.text }]}>
                    {locationShare.fromUserName}
                  </Text>
                  <Text style={[styles.shareTime, { color: colors.textLight }]}>
                    Partagé {formatDate(locationShare.sharedAt)}
                  </Text>
                </View>
              </View>

              {/* Informations de localisation */}
              <View style={[styles.locationCard, { backgroundColor: colors.background }]}>
                <View style={styles.locationHeader}>
                  <Ionicons name="location" size={20} color={colors.primary} />
                  <Text style={[styles.locationTitle, { color: colors.text }]}>
                    Position actuelle
                  </Text>
                </View>

                <View style={styles.locationDetails}>
                  <View style={styles.locationRow}>
                    <Ionicons name="navigate" size={16} color={colors.textLight} />
                    <Text style={[styles.coordinates, { color: colors.textLight }]}>
                      {locationShare.location.coordinates.latitude.toFixed(6)}, {locationShare.location.coordinates.longitude.toFixed(6)}
                    </Text>
                  </View>

                  {locationShare.location.address && (
                    <View style={styles.locationRow}>
                      <Ionicons name="location-outline" size={16} color={colors.textLight} />
                      <Text style={[styles.address, { color: colors.textLight }]}>
                        {locationShare.location.address}
                      </Text>
                    </View>
                  )}

                  {myDistance && (
                    <View style={styles.locationRow}>
                      <Ionicons name="walk" size={16} color={colors.textLight} />
                      <Text style={[styles.distance, { color: colors.textLight }]}>
                        À environ {myDistance} de vous
                      </Text>
                    </View>
                  )}

                  {locationShare.location.coordinates.accuracy && (
                    <View style={styles.locationRow}>
                      <Ionicons name="radio-button-on" size={16} color={colors.textLight} />
                      <Text style={[styles.accuracy, { color: colors.textLight }]}>
                        Précision: ±{Math.round(locationShare.location.coordinates.accuracy)}m
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </View>

            {/* Actions */}
            <View style={styles.actions}>
              <Button
                title="Coordonnées"
                onPress={handleCopyCoordinates}
                variant="ghost"
                icon={<Ionicons name="copy-outline" size={18} color={colors.textLight} />}
                style={styles.secondaryButton}
              />
              <Button
                title="Ouvrir dans Maps"
                onPress={handleOpenInMaps}
                variant="primary"
                icon={<Ionicons name="map" size={18} color="#ffffff" />}
                style={styles.primaryButton}
              />
            </View>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  container: {
    justifyContent: 'flex-end',
  },
  modal: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 24,
    minHeight: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    padding: 8,
  },
  content: {
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  shareTime: {
    fontSize: 14,
  },
  locationCard: {
    borderRadius: 12,
    padding: 16,
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  locationTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  locationDetails: {
    gap: 8,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  coordinates: {
    fontSize: 14,
    fontFamily: 'monospace',
  },
  address: {
    fontSize: 14,
    flex: 1,
  },
  distance: {
    fontSize: 14,
    fontWeight: '500',
  },
  accuracy: {
    fontSize: 12,
  },
  actions: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    gap: 12,
  },
  secondaryButton: {
    flex: 1,
  },
  primaryButton: {
    flex: 2,
  },
});