import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
  TouchableOpacity
} from 'react-native';
import MapView, { Marker, Circle, PROVIDER_GOOGLE } from 'react-native-maps';
import { useTheme } from '../../context/ThemeContext';
import { useAuthContext } from '../../context/AuthContext';
import { useGroupContext } from '../../context/GroupContext';
import { FestivalZone, ZONE_CONFIGS } from '../../types';
import { Ionicons } from '@expo/vector-icons';
import festivalLocationService from '../../services/festivalLocationService';
import festivalMapService from '../../services/festivalMapService';
import memberLocationService, { MemberPosition } from '../../services/memberLocationService';
import { Avatar } from '../../components/ui/Avatar';
import { parseAvatarString } from '../../utils/iconMappings';
import * as Location from 'expo-location';

export function MapScreen() {
  const { colors, theme } = useTheme();
  const { user } = useAuthContext();
  const { group } = useGroupContext();
  
  const [zones, setZones] = useState<FestivalZone[]>([]);
  const [currentLocation, setCurrentLocation] = useState<Location.LocationObject | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  const [currentZone, setCurrentZone] = useState<FestivalZone | null>(null);
  const [memberPositions, setMemberPositions] = useState<MemberPosition[]>([]);
  const [showMemberPositions, setShowMemberPositions] = useState(true);

  useEffect(() => {
    initializeMap();
    setupZonesListener();
    setupMemberLocationListener();
    
    // Activer le mode ACTIF temporairement à l'ouverture de la carte
    festivalLocationService.activateTemporaryActiveMode(60000); // 1 minute
    
    return () => {
      festivalMapService.cleanup();
      memberLocationService.cleanup();
    };
  }, [group?.id]);

  const initializeMap = async () => {
    try {
      setIsLoading(true);
      
      let loadedZones: FestivalZone[] = [];
      
      if (group?.id) {
        festivalMapService.setGroupId(group.id);
        loadedZones = await festivalMapService.getZones();
        setZones(loadedZones);
      }

      // Obtenir la position actuelle avec mise à jour forcée
      const hasPermission = await festivalLocationService.requestPermissions();
      if (hasPermission) {
        // Forcer une mise à jour immédiate pour avoir la position la plus récente
        const location = await festivalLocationService.forceLocationUpdate() || 
                         await festivalLocationService.getCurrentLocation();
        if (location) {
          setCurrentLocation(location);
          
          // Démarrer le suivi pour détecter la zone actuelle
          await startLocationTracking(loadedZones);
        }
      }
    } catch (error) {
      console.error('Error initializing map:', error);
      Alert.alert('Erreur', 'Impossible de charger la carte');
    } finally {
      setIsLoading(false);
    }
  };

  const setupZonesListener = () => {
    if (!group?.id) return;

    const unsubscribe = festivalMapService.onZonesUpdate((updatedZones) => {
      setZones(updatedZones);
      // Mettre à jour les zones dans le service de localisation
      festivalLocationService.updateZones(updatedZones);
    });

    return unsubscribe;
  };

  const setupMemberLocationListener = () => {
    if (!group?.id) return;

    // Initialiser le service et écouter les positions des membres
    memberLocationService.initialize(group.id);
    
    const unsubscribe = memberLocationService.onPositionsUpdate((positions) => {
      setMemberPositions(positions);
    });

    return unsubscribe;
  };

  const startLocationTracking = async (initialZones: FestivalZone[]) => {
    try {
      // S'abonner aux changements de zone
      festivalLocationService.onZoneChange((zone) => {
        setCurrentZone(zone);
      });

      // Démarrer le tracking léger (background seulement si nécessaire)
      if (initialZones.length > 0) {
        const userInfo = user ? { 
          name: user.name || 'Utilisateur', 
          avatar: user.avatar || '🙂' 
        } : undefined;
        
        // Initialiser le tracking des activités de zone
        if (group?.id) {
          await festivalLocationService.initializeZoneActivityTracking(group.id);
        }
        
        // Ne pas activer le background tracking sur la carte (économie batterie)
        await festivalLocationService.startTracking(initialZones, false, userInfo);
      }
    } catch (error) {
      console.error('Error starting location tracking:', error);
    }
  };

  const handleZonePress = (zone: FestivalZone) => {
    Alert.alert(
      zone.name,
      `Type: ${ZONE_CONFIGS[zone.type].label}\nRayon: ${zone.radius}m\nCréé par: ${zone.createdByName || 'Inconnu'}`,
      [
        { text: 'OK' }
      ]
    );
  };

  const centerOnUserLocation = () => {
    if (currentLocation && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 1000);
    }
  };

  const centerOnFestival = () => {
    if (zones.length > 0 && mapRef.current) {
      // Calculer le centre des zones
      const avgLat = zones.reduce((sum, zone) => sum + zone.position.latitude, 0) / zones.length;
      const avgLng = zones.reduce((sum, zone) => sum + zone.position.longitude, 0) / zones.length;
      
      mapRef.current.animateToRegion({
        latitude: avgLat,
        longitude: avgLng,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      }, 1000);
    }
  };

  const mapRef = React.useRef<MapView>(null);

  // Calculer la région initiale
  const getInitialRegion = () => {
    if (currentLocation) {
      return {
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
    }
    
    if (zones.length > 0) {
      const avgLat = zones.reduce((sum, zone) => sum + zone.position.latitude, 0) / zones.length;
      const avgLng = zones.reduce((sum, zone) => sum + zone.position.longitude, 0) / zones.length;
      return {
        latitude: avgLat,
        longitude: avgLng,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      };
    }

    // Région par défaut (Paris)
    return {
      latitude: 48.8566,
      longitude: 2.3522,
      latitudeDelta: 0.02,
      longitudeDelta: 0.02,
    };
  };

  if (!group) {
    return (
      <View style={[styles.container, styles.centerContent, { backgroundColor: colors.background }]}>
        <Ionicons name="map-outline" size={64} color={colors.textLight} />
        <Text style={[styles.noGroupText, { color: colors.textLight }]}>
          Rejoignez un groupe pour voir la carte du festival
        </Text>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centerContent, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textLight }]}>
          Chargement de la carte...
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header avec statut */}
      <View style={[styles.header, { backgroundColor: colors.surface }]}>
        <View style={styles.headerLeft}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Carte du Festival
          </Text>
          {currentZone && (
            <View style={styles.currentZoneContainer}>
              <Text style={styles.currentZoneEmoji}>
                {ZONE_CONFIGS[currentZone.type].emoji}
              </Text>
              <Text style={[styles.currentZoneText, { color: colors.primary }]}>
                {currentZone.name}
              </Text>
            </View>
          )}
        </View>
        
        <View style={styles.headerRight}>
          <TouchableOpacity 
            onPress={() => setShowMemberPositions(!showMemberPositions)} 
            style={[styles.mapButton, showMemberPositions && { backgroundColor: colors.primary + '20' }]}
          >
            <Ionicons 
              name="people" 
              size={20} 
              color={showMemberPositions ? colors.primary : colors.textLight} 
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={centerOnUserLocation} style={styles.mapButton}>
            <Ionicons name="locate" size={20} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={centerOnFestival} style={styles.mapButton}>
            <Ionicons name="map" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Carte */}
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={getInitialRegion()}
        showsUserLocation={true}
        showsMyLocationButton={false}
        onMapReady={() => setMapReady(true)}
        mapType="standard"
      >
        {/* Marqueurs des zones */}
        {zones.map((zone) => {
          const config = ZONE_CONFIGS[zone.type];
          return (
            <React.Fragment key={zone.id}>
              {/* Cercle de la zone */}
              <Circle
                center={zone.position}
                radius={zone.radius}
                strokeColor={config.color + '80'}
                fillColor={config.color + '20'}
                strokeWidth={2}
              />
              
              {/* Marqueur de la zone */}
              <Marker
                coordinate={zone.position}
                onPress={() => handleZonePress(zone)}
              >
                <View style={[styles.customMarker, { backgroundColor: config.color }]}>
                  <Text style={styles.markerEmoji}>{config.emoji}</Text>
                </View>
              </Marker>
            </React.Fragment>
          );
        })}

        {/* Positions des membres */}
        {showMemberPositions && memberPositions.map((memberPos) => (
          <Marker
            key={memberPos.userId}
            coordinate={memberPos.position}
            onPress={() => {
              Alert.alert(
                memberPos.userName,
                `Position: ${memberPos.currentZone?.name || 'Zone inconnue'}\nVu: ${memberLocationService.getTimeAgo(memberPos.lastUpdated)}`,
                [{ text: 'OK' }]
              );
            }}
          >
            <View style={styles.memberMarkerContainer}>
              <View style={[
                styles.memberMarker,
                { 
                  backgroundColor: colors.surface,
                  borderColor: memberPos.isOnline ? colors.success : colors.textLight,
                  borderWidth: 2
                }
              ]}>
                <Avatar 
                  avatarData={parseAvatarString(memberPos.userAvatar)}
                  name={memberPos.userName}
                  size="small"
                />
              </View>
              {memberPos.isOnline && (
                <View style={[styles.onlineIndicator, { backgroundColor: colors.success }]} />
              )}
            </View>
          </Marker>
        ))}
      </MapView>

      {/* Légende */}
      <View style={[styles.legend, { backgroundColor: colors.surface }]}>
        <View style={styles.legendHeader}>
          <Text style={[styles.legendTitle, { color: colors.text }]}>
            Zones mappées ({zones.length})
          </Text>
          {showMemberPositions && memberPositions.length > 0 && (
            <Text style={[styles.membersCount, { color: colors.primary }]}>
              {memberPositions.length} membre{memberPositions.length > 1 ? 's' : ''} visible{memberPositions.length > 1 ? 's' : ''}
            </Text>
          )}
        </View>
        <View style={styles.legendItems}>
          {Object.entries(
            zones.reduce((acc, zone) => {
              const type = zone.type;
              if (!acc[type]) {
                acc[type] = 0;
              }
              acc[type]++;
              return acc;
            }, {} as Record<string, number>)
          ).map(([type, count]) => {
            const config = ZONE_CONFIGS[type as keyof typeof ZONE_CONFIGS];
            return (
              <View key={type} style={styles.legendItem}>
                <Text style={styles.legendEmoji}>{config.emoji}</Text>
                <Text style={[styles.legendText, { color: colors.textLight }]}>
                  {count}
                </Text>
              </View>
            );
          })}
        </View>
        
        {zones.length === 0 && (
          <Text style={[styles.noZonesText, { color: colors.textLight }]}>
            Aucune zone mappée. Allez dans Paramètres → Cartographie pour commencer !
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32
  },
  noGroupText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16
  },
  loadingText: {
    fontSize: 16,
    marginTop: 16
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 56, // Pour la status bar
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2
  },
  headerLeft: {
    flex: 1
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600'
  },
  currentZoneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4
  },
  currentZoneEmoji: {
    fontSize: 16,
    marginRight: 6
  },
  currentZoneText: {
    fontSize: 14,
    fontWeight: '500'
  },
  headerRight: {
    flexDirection: 'row',
    gap: 8
  },
  mapButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2
  },
  map: {
    flex: 1
  },
  customMarker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3
  },
  markerEmoji: {
    fontSize: 16
  },
  legend: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -1 },
    shadowOpacity: 0.1,
    shadowRadius: 2
  },
  legendTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8
  },
  legendItems: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  legendEmoji: {
    fontSize: 16
  },
  legendText: {
    fontSize: 12
  },
  noZonesText: {
    fontSize: 12,
    fontStyle: 'italic',
    textAlign: 'center'
  },
  memberMarkerContainer: {
    alignItems: 'center',
    justifyContent: 'center'
  },
  memberMarker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3
  },
  onlineIndicator: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#ffffff'
  },
  legendHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  membersCount: {
    fontSize: 12,
    fontWeight: '500'
  }
});