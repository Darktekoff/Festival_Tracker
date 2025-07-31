import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Avatar } from '../../components/ui/Avatar';
import { useTheme } from '../../context/ThemeContext';
import { useAuthContext } from '../../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { parseAvatarString } from '../../utils/iconMappings';
import groupService from '../../services/groupService';
import authService from '../../services/authService';
import { FestivalGroup } from '../../types';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface GroupSelectionScreenProps {
  navigation: any;
  onCreateGroup: () => void;
  onJoinGroup: () => void;
}

export function GroupSelectionScreen({ navigation, onCreateGroup, onJoinGroup }: GroupSelectionScreenProps) {
  const { colors, theme } = useTheme();
  const { user, signOut } = useAuthContext();
  const [userGroups, setUserGroups] = useState<FestivalGroup[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [selectingGroup, setSelectingGroup] = useState(false);

  useEffect(() => {
    loadUserGroups();
  }, []);

  const loadUserGroups = async () => {
    try {
      setLoadingGroups(true);
      const userId = authService.getCurrentUserId();
      if (userId) {
        const groups = await groupService.getUserGroups(userId);
        setUserGroups(groups);
      }
    } catch (error) {
      console.error('Error loading user groups:', error);
    } finally {
      setLoadingGroups(false);
    }
  };

  const handleSelectGroup = async (groupId: string) => {
    try {
      setSelectingGroup(true);
      
      // Sélectionner le groupe
      await groupService.selectGroup(groupId);
      
      // Forcer une navigation en rechargeant l'application
      // Cela forcera AppNavigator à vérifier le nouveau groupe
      if (navigation.replace) {
        navigation.replace('Welcome');
      } else {
        navigation.navigate('Welcome');
      }
    } catch (error) {
      console.error('Error selecting group:', error);
      Alert.alert('Erreur', 'Impossible de sélectionner le groupe');
    } finally {
      setSelectingGroup(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      // La navigation sera gérée automatiquement par AppNavigator
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (!user) return null;

  const avatarData = parseAvatarString(user.avatar);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header avec profil utilisateur */}
        <View style={styles.header}>
          <View style={styles.profileSection}>
            <Avatar
              avatarData={avatarData}
              name={user.name}
              size="large"
            />
            <View style={styles.profileInfo}>
              <Text style={[styles.greeting, { color: colors.text }]}>
                Salut {user.name} ! 👋
              </Text>
              <Text style={[styles.subtitle, { color: colors.textLight }]}>
                Il est temps de créer un groupe ou d'en rejoindre un pour commencer à tracker avec tes amis !
              </Text>
            </View>
          </View>

          {/* Bouton déconnexion */}
          <TouchableOpacity
            style={styles.signOutButton}
            onPress={handleSignOut}
          >
            <Ionicons name="log-out-outline" size={20} color={colors.textLight} />
          </TouchableOpacity>
        </View>

        {/* Vos groupes existants */}
        {loadingGroups ? (
          <View style={styles.loadingSection}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : userGroups.length > 0 ? (
          <View style={styles.existingGroups}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Vos groupes</Text>
            {userGroups.map((group) => {
              const memberData = group.members[user.id];
              const isAdmin = memberData?.role === 'admin' || memberData?.role === 'creator';
              const memberCount = Object.keys(group.members).length;
              
              return (
                <TouchableOpacity
                  key={group.id}
                  onPress={() => handleSelectGroup(group.id)}
                  activeOpacity={0.7}
                  disabled={selectingGroup}
                >
                  <Card style={styles.groupCard}>
                    <View style={styles.groupHeader}>
                      <View style={styles.groupInfo}>
                        <Text style={[styles.groupName, { color: colors.text }]}>
                          {group.name}
                        </Text>
                        <View style={styles.groupMeta}>
                          {isAdmin && (
                            <View style={[styles.adminBadge, { backgroundColor: colors.primary }]}>
                              <Ionicons name="shield" size={12} color="#ffffff" />
                              <Text style={styles.adminText}>Admin</Text>
                            </View>
                          )}
                          <Text style={[styles.groupMembers, { color: colors.textLight }]}>
                            <Ionicons name="people" size={14} color={colors.textLight} /> {memberCount} membre{memberCount > 1 ? 's' : ''}
                          </Text>
                        </View>
                      </View>
                      <Ionicons name="chevron-forward" size={24} color={colors.textLight} />
                    </View>
                    {group.description && (
                      <Text style={[styles.groupDescription, { color: colors.textLight }]} numberOfLines={2}>
                        {group.description}
                      </Text>
                    )}
                    <Text style={[styles.groupDates, { color: colors.textLight }]}>
                      <Ionicons name="calendar" size={14} color={colors.textLight} /> 
                      {format(group.festivalDates.start, 'dd MMM', { locale: fr })} - {format(group.festivalDates.end, 'dd MMM yyyy', { locale: fr })}
                    </Text>
                  </Card>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : null}

        {/* Divider */}
        {userGroups.length > 0 && (
          <View style={[styles.divider, { borderBottomColor: colors.border }]}>
            <Text style={[styles.dividerText, { color: colors.textLight, backgroundColor: colors.background }]}>ou</Text>
          </View>
        )}

        {/* Options de groupe */}
        <View style={styles.options}>
          <Card style={[styles.optionCard, { borderColor: colors.primary }]}>
            <View style={styles.optionHeader}>
              <View style={[styles.optionIcon, { backgroundColor: colors.primary }]}>
                <Ionicons name="add" size={24} color="#ffffff" />
              </View>
              <Text style={[styles.optionTitle, { color: colors.text }]}>
                Créer un nouveau groupe
              </Text>
            </View>
            <Text style={[styles.optionDescription, { color: colors.textLight }]}>
              Lance un nouveau groupe de festival et invite tes amis à te rejoindre
            </Text>
            <Button
              title="Créer un groupe"
              onPress={onCreateGroup}
              variant="primary"
              size="large"
              fullWidth
              icon={<Ionicons name="add" size={20} color="#ffffff" />}
              style={styles.optionButton}
            />
          </Card>

          <Card style={styles.optionCard}>
            <View style={styles.optionHeader}>
              <View style={[styles.optionIcon, { backgroundColor: colors.success }]}>
                <Ionicons name="enter" size={24} color="#ffffff" />
              </View>
              <Text style={[styles.optionTitle, { color: colors.text }]}>
                Rejoindre un groupe
              </Text>
            </View>
            <Text style={[styles.optionDescription, { color: colors.textLight }]}>
              Utilise un code d'invitation pour rejoindre le groupe de tes amis
            </Text>
            <Button
              title="Rejoindre un groupe"
              onPress={onJoinGroup}
              variant="secondary"
              size="large"
              fullWidth
              icon={<Ionicons name="enter" size={20} color={colors.primary} />}
              style={styles.optionButton}
            />
          </Card>
        </View>

        {/* Informations supplémentaires */}
        <View style={styles.infoSection}>
          <View style={styles.infoItem}>
            <Ionicons name="shield-checkmark" size={20} color={colors.success} />
            <Text style={[styles.infoText, { color: colors.textLight }]}>
              Tes données sont sécurisées et privées
            </Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="people" size={20} color={colors.primary} />
            <Text style={[styles.infoText, { color: colors.textLight }]}>
              Partage en temps réel avec ton groupe
            </Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="analytics" size={20} color={colors.warning} />
            <Text style={[styles.infoText, { color: colors.textLight }]}>
              Statistiques détaillées et conseils de sécurité
            </Text>
          </View>
        </View>
      </ScrollView>
      
      {/* Loading overlay lors de la sélection */}
      {selectingGroup && (
        <View style={styles.loadingOverlay}>
          <View style={[styles.loadingContainer, { backgroundColor: colors.surface }]}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.text }]}>
              Chargement du groupe...
            </Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  content: {
    flexGrow: 1,
    padding: 24
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 32
  },
  profileSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16
  },
  profileInfo: {
    flex: 1
  },
  greeting: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 8
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24
  },
  signOutButton: {
    padding: 8,
    marginLeft: 16
  },
  options: {
    gap: 24,
    marginBottom: 32
  },
  optionCard: {
    padding: 24
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 16
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center'
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1
  },
  optionDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20
  },
  optionButton: {
    marginTop: 8
  },
  infoSection: {
    gap: 16,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0'
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  infoText: {
    fontSize: 14,
    flex: 1
  },
  loadingSection: {
    paddingVertical: 32,
    alignItems: 'center'
  },
  existingGroups: {
    marginBottom: 24
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16
  },
  groupCard: {
    padding: 16,
    marginBottom: 12
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  groupInfo: {
    flex: 1
  },
  groupName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4
  },
  groupMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    gap: 4
  },
  adminText: {
    fontSize: 11,
    color: '#ffffff',
    fontWeight: '600'
  },
  groupMembers: {
    fontSize: 13
  },
  groupDescription: {
    fontSize: 14,
    marginTop: 8,
    marginBottom: 4,
    lineHeight: 20
  },
  groupDates: {
    fontSize: 13,
    marginTop: 4
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
    borderBottomWidth: 1
  },
  dividerText: {
    position: 'absolute',
    alignSelf: 'center',
    paddingHorizontal: 16,
    fontSize: 14
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingContainer: {
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16
  }
});