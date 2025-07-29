import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator
} from 'react-native';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { ZoneMappingModal } from '../../components/festival/ZoneMappingModal';
import { useTheme } from '../../context/ThemeContext';
import { useAuthContext } from '../../context/AuthContext';
import { useGroupContext } from '../../context/GroupContext';
import { FestivalZone, ZONE_CONFIGS } from '../../types';
import { Ionicons } from '@expo/vector-icons';
import festivalLocationService from '../../services/festivalLocationService';
import festivalMapService from '../../services/festivalMapService';
import { useNavigation } from '@react-navigation/native';

export function MappingScreen() {
  const { colors, theme } = useTheme();
  const { user } = useAuthContext();
  const { group } = useGroupContext();
  const navigation = useNavigation();
  
  const [zones, setZones] = useState<FestivalZone[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMappingModalVisible, setIsMappingModalVisible] = useState(false);
  const [currentPosition, setCurrentPosition] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  const isAdmin = group?.createdBy === user?.id;

  useEffect(() => {
    loadZones();
    setupZonesListener();

    return () => {
      festivalMapService.cleanup();
    };
  }, [group?.id]);

  const loadZones = async () => {
    try {
      setIsLoading(true);
      if (group?.id) {
        festivalMapService.setGroupId(group.id);
        const loadedZones = await festivalMapService.getZones();
        setZones(loadedZones);
      }
    } catch (error) {
      console.error('Error loading zones:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const setupZonesListener = () => {
    if (!group?.id) return;

    const unsubscribe = festivalMapService.onZonesUpdate((updatedZones) => {
      setZones(updatedZones);
    });

    return unsubscribe;
  };

  const handleMapPosition = async () => {
    try {
      setIsGettingLocation(true);
      
      // Demander les permissions et obtenir la position
      const hasPermission = await festivalLocationService.requestPermissions();
      if (!hasPermission) {
        Alert.alert(
          'Permission refusée',
          'L\'accès à votre position est nécessaire pour mapper les zones du festival.',
          [{ text: 'OK' }]
        );
        return;
      }

      const location = await festivalLocationService.getCurrentLocation();
      if (location) {
        setCurrentPosition({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude
        });
        setIsMappingModalVisible(true);
      } else {
        Alert.alert(
          'Erreur',
          'Impossible d\'obtenir votre position actuelle.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert(
        'Erreur',
        'Une erreur est survenue lors de la récupération de votre position.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsGettingLocation(false);
    }
  };

  const handleCreateZone = async (name: string, type: any, radius: number) => {
    if (!currentPosition) return;

    const zone = await festivalMapService.createZone(
      name,
      type,
      currentPosition,
      radius
    );

    if (zone) {
      Alert.alert(
        'Zone créée',
        `"${name}" a été ajoutée avec succès !`,
        [{ text: 'OK' }]
      );
    } else {
      Alert.alert(
        'Erreur',
        'Impossible de créer la zone.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleDeleteZone = (zone: FestivalZone) => {
    Alert.alert(
      'Supprimer la zone',
      `Êtes-vous sûr de vouloir supprimer "${zone.name}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            const success = await festivalMapService.deleteZone(zone.id);
            if (success) {
              Alert.alert('Succès', 'Zone supprimée');
            } else {
              Alert.alert('Erreur', 'Impossible de supprimer la zone');
            }
          }
        }
      ]
    );
  };

  const canDeleteZone = (zone: FestivalZone) => {
    return isAdmin || zone.createdBy === user?.id;
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centerContent, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>
            Cartographie du Festival
          </Text>
        </View>

        <Card style={styles.infoCard}>
          <View style={styles.infoContent}>
            <Ionicons name="information-circle" size={24} color={colors.info} />
            <Text style={[styles.infoText, { color: colors.text }]}>
              Rendez-vous à chaque endroit important du festival et mappez-le pour activer le suivi d'activité intelligent.
            </Text>
          </View>
        </Card>

        <View style={styles.mapButtonContainer}>
          <Button
            title={isGettingLocation ? "Localisation..." : "📍 Mapper cette position"}
            onPress={handleMapPosition}
            variant="primary"
            size="large"
            fullWidth
            disabled={isGettingLocation}
            icon={isGettingLocation ? <ActivityIndicator size="small" color="#ffffff" /> : undefined}
          />
        </View>

        {zones.length > 0 ? (
          <View style={styles.zonesSection}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Zones du festival ({zones.length})
            </Text>

            {zones.map((zone) => {
              const config = ZONE_CONFIGS[zone.type];
              return (
                <Card key={zone.id} style={styles.zoneCard}>
                  <View style={styles.zoneContent}>
                    <View style={[styles.zoneIcon, { backgroundColor: config.color + '20' }]}>
                      <Text style={styles.zoneEmoji}>{config.emoji}</Text>
                    </View>
                    <View style={styles.zoneInfo}>
                      <Text style={[styles.zoneName, { color: colors.text }]}>
                        {zone.name}
                      </Text>
                      <Text style={[styles.zoneDetails, { color: colors.textLight }]}>
                        {config.label} • {zone.radius}m • par {zone.createdByName || 'Inconnu'}
                      </Text>
                    </View>
                    {canDeleteZone(zone) && (
                      <TouchableOpacity onPress={() => handleDeleteZone(zone)}>
                        <Ionicons name="trash-outline" size={20} color={colors.danger} />
                      </TouchableOpacity>
                    )}
                  </View>
                </Card>
              );
            })}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="map-outline" size={64} color={colors.textLight} />
            <Text style={[styles.emptyText, { color: colors.textLight }]}>
              Aucune zone mappée pour le moment
            </Text>
            <Text style={[styles.emptySubtext, { color: colors.textLight }]}>
              Commencez par mapper votre première zone !
            </Text>
          </View>
        )}

        <View style={styles.footer}>
          <Button
            title="Terminer le mapping"
            onPress={() => navigation.goBack()}
            variant="secondary"
            fullWidth
            disabled={zones.length === 0}
          />
        </View>
      </ScrollView>

      <ZoneMappingModal
        visible={isMappingModalVisible}
        onClose={() => setIsMappingModalVisible(false)}
        onConfirm={handleCreateZone}
        currentPosition={currentPosition || undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center'
  },
  scrollView: {
    flex: 1
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8
  },
  backButton: {
    marginRight: 16
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    flex: 1
  },
  infoCard: {
    margin: 16,
    backgroundColor: 'transparent'
  },
  infoContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20
  },
  mapButtonContainer: {
    paddingHorizontal: 16,
    marginBottom: 24
  },
  zonesSection: {
    paddingHorizontal: 16
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16
  },
  zoneCard: {
    marginBottom: 12
  },
  zoneContent: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  zoneIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  zoneEmoji: {
    fontSize: 24
  },
  zoneInfo: {
    flex: 1
  },
  zoneName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4
  },
  zoneDetails: {
    fontSize: 14
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 32
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
    marginTop: 16,
    marginBottom: 8
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center'
  },
  footer: {
    padding: 16,
    paddingBottom: 32
  }
});