import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Alert
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useTheme } from '../../context/ThemeContext';
import { useAuthContext } from '../../context/AuthContext';
import { NotificationPreferences } from '../../types/user';
import { Ionicons } from '@expo/vector-icons';
import { ALERT_THRESHOLDS } from '../../utils/constants';

interface NotificationSettingsScreenProps {
  navigation: any;
}

const defaultNotificationPrefs: NotificationPreferences = {
  // Messages & Social
  chatMessages: true,
  sharedPhotos: true,
  newMembers: true,
  groupActivities: true,
  
  // Sécurité & Alertes
  consumptionAlerts: true,
  membersInDanger: true,
  hydrationReminders: true,
  hydrationInterval: 2,
  sessionEnd: true,
  inactivityAlert: true,
  inactivityHours: 3,
  
  // Festival & Événements
  artistReminders: true,
  festivalZones: true,
  nearbyMembers: false,
  
  // Localisation
  locationRequests: true,
  locationShares: true,
};

export function NotificationSettingsScreen({ navigation }: NotificationSettingsScreenProps) {
  const { colors } = useTheme();
  const { user, updateUserProfile } = useAuthContext();
  const insets = useSafeAreaInsets();
  
  const [masterSwitch, setMasterSwitch] = useState(user?.preferences?.notifications ?? true);
  const [preferences, setPreferences] = useState<NotificationPreferences>(
    user?.preferences?.notificationDetails || defaultNotificationPrefs
  );
  const [hydrationInterval, setHydrationInterval] = useState(
    preferences.hydrationInterval.toString()
  );
  const [inactivityHours, setInactivityHours] = useState(
    preferences.inactivityHours.toString()
  );
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    try {
      setIsLoading(true);
      
      const hydrationInt = parseInt(hydrationInterval);
      const inactivityInt = parseInt(inactivityHours);
      
      if (isNaN(hydrationInt) || hydrationInt < 1 || hydrationInt > 6) {
        Alert.alert('Erreur', 'L\'intervalle d\'hydratation doit être entre 1 et 6 heures');
        return;
      }
      
      if (isNaN(inactivityInt) || inactivityInt < 1 || inactivityInt > 12) {
        Alert.alert('Erreur', 'Le délai d\'inactivité doit être entre 1 et 12 heures');
        return;
      }

      const updatedPrefs = {
        ...preferences,
        hydrationInterval: hydrationInt,
        inactivityHours: inactivityInt
      };

      await updateUserProfile({
        preferences: {
          ...user?.preferences,
          notifications: masterSwitch,
          notificationDetails: updatedPrefs
        }
      });

      Alert.alert('Succès', 'Préférences de notifications mises à jour');
      navigation.goBack();
    } catch (error) {
      console.error('Error saving notification settings:', error);
      Alert.alert('Erreur', 'Impossible de sauvegarder les préférences');
    } finally {
      setIsLoading(false);
    }
  };

  const togglePreference = (key: keyof NotificationPreferences) => {
    if (typeof preferences[key] === 'boolean') {
      setPreferences(prev => ({
        ...prev,
        [key]: !prev[key]
      }));
    }
  };

  const renderSection = (
    title: string,
    icon: any,
    items: Array<{
      key: keyof NotificationPreferences;
      label: string;
      subtitle?: string;
      customControl?: React.ReactNode;
    }>
  ) => (
    <Card style={styles.section}>
      <View style={styles.sectionHeader}>
        <Ionicons name={icon} size={24} color={colors.primary} />
        <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
      </View>
      
      {items.map((item, index) => (
        <View
          key={item.key}
          style={[
            styles.item,
            index < items.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }
          ]}
        >
          <View style={styles.itemLeft}>
            <Text style={[styles.itemLabel, { color: colors.text }]}>
              {item.label}
            </Text>
            {item.subtitle && (
              <Text style={[styles.itemSubtitle, { color: colors.textLight }]}>
                {item.subtitle}
              </Text>
            )}
          </View>
          
          {item.customControl || (
            <Switch
              value={preferences[item.key] as boolean}
              onValueChange={() => togglePreference(item.key)}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.surface}
              disabled={!masterSwitch}
            />
          )}
        </View>
      ))}
    </Card>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
      >
        
        {/* Switch principal */}
        <Card style={styles.masterCard}>
          <View style={styles.masterSwitch}>
            <View style={styles.masterLeft}>
              <Text style={[styles.masterTitle, { color: colors.text }]}>
                Notifications activées
              </Text>
              <Text style={[styles.masterSubtitle, { color: colors.textLight }]}>
                Active ou désactive toutes les notifications
              </Text>
            </View>
            <Switch
              value={masterSwitch}
              onValueChange={setMasterSwitch}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.surface}
            />
          </View>
        </Card>

        {!masterSwitch && (
          <View style={[styles.disabledMessage, { backgroundColor: colors.warning + '20' }]}>
            <Ionicons name="warning" size={20} color={colors.warning} />
            <Text style={[styles.disabledText, { color: colors.warning }]}>
              Les notifications sont désactivées
            </Text>
          </View>
        )}

        {/* Messages & Social */}
        {renderSection('Messages & Social', 'chatbubbles', [
          {
            key: 'chatMessages',
            label: 'Messages chat',
            subtitle: 'Nouveaux messages dans le groupe'
          },
          {
            key: 'sharedPhotos',
            label: 'Photos partagées',
            subtitle: 'Quand quelqu\'un partage une photo'
          },
          {
            key: 'newMembers',
            label: 'Nouveaux membres',
            subtitle: 'Quand quelqu\'un rejoint le groupe'
          },
          {
            key: 'groupActivities',
            label: 'Activités du groupe',
            subtitle: 'Milestones et événements notables'
          }
        ])}

        {/* Sécurité & Alertes */}
        {renderSection('Sécurité & Alertes', 'shield', [
          {
            key: 'consumptionAlerts',
            label: 'Alertes de consommation',
            subtitle: 'Quand vous atteignez un seuil'
          },
          {
            key: 'membersInDanger',
            label: 'Membres en danger',
            subtitle: 'Alerte si un membre dépasse le seuil critique'
          },
          {
            key: 'hydrationReminders',
            label: 'Rappels d\'hydratation',
            subtitle: `Toutes les ${hydrationInterval} heures`,
            customControl: preferences.hydrationReminders ? (
              <Input
                value={hydrationInterval}
                onChangeText={setHydrationInterval}
                keyboardType="numeric"
                placeholder="2"
                style={styles.intervalInput}
                maxLength={1}
                editable={masterSwitch}
              />
            ) : (
              <Switch
                value={preferences.hydrationReminders}
                onValueChange={() => togglePreference('hydrationReminders')}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.surface}
                disabled={!masterSwitch}
              />
            )
          },
          {
            key: 'sessionEnd',
            label: 'Fin de session',
            subtitle: 'Résumé après une période d\'inactivité'
          },
          {
            key: 'inactivityAlert',
            label: 'Alerte d\'inactivité',
            subtitle: `Si aucune boisson depuis ${inactivityHours}h`,
            customControl: preferences.inactivityAlert ? (
              <Input
                value={inactivityHours}
                onChangeText={setInactivityHours}
                keyboardType="numeric"
                placeholder="3"
                style={styles.intervalInput}
                maxLength={2}
                editable={masterSwitch}
              />
            ) : (
              <Switch
                value={preferences.inactivityAlert}
                onValueChange={() => togglePreference('inactivityAlert')}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.surface}
                disabled={!masterSwitch}
              />
            )
          }
        ])}

        {/* Festival & Événements */}
        {renderSection('Festival & Événements', 'musical-notes', [
          {
            key: 'artistReminders',
            label: 'Rappels d\'artistes',
            subtitle: 'Avant le début des concerts favoris'
          },
          {
            key: 'festivalZones',
            label: 'Zones du festival',
            subtitle: 'Activité dans les différentes zones'
          },
          {
            key: 'nearbyMembers',
            label: 'Membres à proximité',
            subtitle: 'Quand des membres sont près de vous'
          }
        ])}

        {/* Localisation */}
        {renderSection('Localisation', 'location', [
          {
            key: 'locationRequests',
            label: 'Demandes de position',
            subtitle: 'Quand quelqu\'un demande votre position'
          },
          {
            key: 'locationShares',
            label: 'Partages de position',
            subtitle: 'Quand quelqu\'un partage sa position'
          }
        ])}

        {/* Boutons d'action */}
        <View style={styles.actions}>
          <Button
            title="Annuler"
            onPress={() => navigation.goBack()}
            variant="ghost"
            style={styles.actionButton}
          />
          <Button
            title="Sauvegarder"
            onPress={handleSave}
            isLoading={isLoading}
            style={styles.actionButton}
          />
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  scrollView: {
    flex: 1,
    padding: 16
  },
  masterCard: {
    marginBottom: 16
  },
  masterSwitch: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  masterLeft: {
    flex: 1
  },
  masterTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4
  },
  masterSubtitle: {
    fontSize: 14
  },
  disabledMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 8,
    marginBottom: 16
  },
  disabledText: {
    fontSize: 14,
    flex: 1
  },
  section: {
    marginBottom: 16
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600'
  },
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12
  },
  itemLeft: {
    flex: 1,
    marginRight: 12
  },
  itemLabel: {
    fontSize: 16,
    marginBottom: 2
  },
  itemSubtitle: {
    fontSize: 14
  },
  intervalInput: {
    width: 60,
    textAlign: 'center'
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
    marginBottom: 32
  },
  actionButton: {
    flex: 1
  }
});