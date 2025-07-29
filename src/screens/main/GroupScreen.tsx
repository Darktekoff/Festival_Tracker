import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { MembersList } from '../../components/group/MembersList';
import { GroupInvite } from '../../components/group/GroupInvite';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Card } from '../../components/ui/Card';
import { useTheme } from '../../context/ThemeContext';
import { useAuthContext } from '../../context/AuthContext';
import { useGroupContext } from '../../context/GroupContext';
import { useDrinks } from '../../hooks/useDrinks';
import { useMembers } from '../../hooks/useMembers';
import { formatGroupCode } from '../../utils/groupUtils';
import { Ionicons } from '@expo/vector-icons';

interface GroupScreenProps {
  navigation: any;
}

export function GroupScreen({ navigation }: GroupScreenProps) {
  const { colors, theme } = useTheme();
  const { user } = useAuthContext();
  const { group, leaveGroup, isAdmin } = useGroupContext();
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'members' | 'settings'>('members');
  const [showInviteModal, setShowInviteModal] = useState(false);

  // Protection contre les crashes : ne pas initialiser les hooks si pas de données
  const groupId = group?.id || null;
  const groupMembers = group?.members;
  
  const { refresh } = useDrinks(groupId);
  const { members, memberStats } = useMembers(groupMembers, groupId);

  const handleRefresh = async () => {
    // Protection : ne pas refresh si pas de groupe
    if (!group) return;
    
    setRefreshing(true);
    try {
      await refresh();
    } catch (error) {
      console.error('GroupScreen - Error during refresh:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleLeaveGroup = () => {
    Alert.alert(
      'Quitter le groupe',
      'Êtes-vous sûr de vouloir quitter ce groupe ? Cette action est irréversible.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Quitter',
          style: 'destructive',
          onPress: async () => {
            const success = await leaveGroup();
            if (success) {
              navigation.navigate('Welcome');
            }
          }
        }
      ]
    );
  };

  const handleRemoveMember = (memberId: string) => {
    // Implementation would be added to GroupService and useGroupContext
    console.log('Remove member:', memberId);
  };

  const handleMemberPress = (memberId: string) => {
    navigation.navigate('MemberProfile', { memberId });
  };

  // Auto-refresh quand on navigue vers cet onglet avec protections
  useFocusEffect(
    useCallback(() => {
      // Protection : ne pas faire de refresh si pas de groupe
      if (!group || !user || !groupId) {
        console.log('GroupScreen - Focus gained but no group/user, skipping refresh');
        return;
      }
      
      console.log('GroupScreen - Focus gained, refreshing data...');
      const timeoutId = setTimeout(() => {
        if (refresh) {
          refresh().catch(error => {
            console.error('GroupScreen - Focus refresh error:', error);
          });
        }
      }, 100);
      
      return () => clearTimeout(timeoutId);
    }, [groupId, user?.id]) // Utiliser seulement les IDs stables
  );

  const renderTabContent = () => {
    if (!group) return null;

    switch (activeTab) {
      case 'members':
        // Protection : vérifier que les données sont disponibles
        if (!user) {
          return (
            <View style={styles.loadingContainer}>
              <Text style={[styles.loadingText, { color: colors.textLight }]}>
                Chargement des données...
              </Text>
            </View>
          );
        }
        
        return (
          <MembersList
            members={members}
            memberStats={memberStats}
            currentUserId={user.id}
            isAdmin={isAdmin}
            onRemoveMember={handleRemoveMember}
            onMemberPress={handleMemberPress}
          />
        );
      
      case 'settings':
        return (
          <ScrollView style={styles.settingsContent}>
            <Card style={styles.settingsCard}>
              <Text style={[styles.settingsTitle, { color: colors.text }]}>
                Informations du groupe
              </Text>
              
              <View style={styles.settingsItem}>
                <Text style={[styles.settingsLabel, { color: colors.textLight }]}>
                  Nom du groupe
                </Text>
                <Text style={[styles.settingsValue, { color: colors.text }]}>
                  {group.name}
                </Text>
              </View>
              
              <View style={styles.settingsItem}>
                <Text style={[styles.settingsLabel, { color: colors.textLight }]}>
                  Code du groupe
                </Text>
                <Text style={[styles.settingsValue, { color: colors.text }]}>
                  {formatGroupCode(group.id)}
                </Text>
              </View>
              
              {group.description && (
                <View style={styles.settingsItem}>
                  <Text style={[styles.settingsLabel, { color: colors.textLight }]}>
                    Description
                  </Text>
                  <Text style={[styles.settingsValue, { color: colors.text }]}>
                    {group.description}
                  </Text>
                </View>
              )}
            </Card>

            <Card style={styles.settingsCard}>
              <Text style={[styles.settingsTitle, { color: colors.text }]}>
                Actions
              </Text>
              
              <Button
                title="Inviter des amis"
                onPress={() => setShowInviteModal(true)}
                variant="ghost"
                icon={<Ionicons name="share" size={18} color={colors.primary} />}
                fullWidth
                style={styles.actionButton}
              />
              
              <Button
                title="Quitter le groupe"
                onPress={handleLeaveGroup}
                variant="ghost"
                icon={<Ionicons name="exit" size={18} color={colors.danger} />}
                fullWidth
                style={[styles.actionButton, { borderColor: colors.danger }]}
              />
            </Card>
          </ScrollView>
        );
      
      default:
        return null;
    }
  };

  if (!group) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color={colors.danger} />
          <Text style={[styles.errorText, { color: colors.text }]}>
            Aucun groupe trouvé
          </Text>
          <Button
            title="Retour"
            onPress={() => navigation.goBack()}
            variant="ghost"
          />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>
          {group.name}
        </Text>
        <Text style={[styles.subtitle, { color: colors.textLight }]}>
          {formatGroupCode(group.id)}
        </Text>
      </View>

      <View style={styles.tabs}>
        <Button
          title="Membres"
          onPress={() => setActiveTab('members')}
          variant={activeTab === 'members' ? 'primary' : 'ghost'}
          style={styles.tabButton}
        />
        <Button
          title="Paramètres"
          onPress={() => setActiveTab('settings')}
          variant={activeTab === 'settings' ? 'primary' : 'ghost'}
          style={styles.tabButton}
        />
      </View>

      <View style={styles.content}>
        {renderTabContent()}
      </View>

      <Modal
        visible={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        title="Inviter des amis"
        size="large"
        scrollable
      >
        <GroupInvite
          groupId={group.id}
          groupName={group.name}
          onClose={() => setShowInviteModal(false)}
        />
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0'
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 4
  },
  subtitle: {
    fontSize: 14
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8
  },
  tabButton: {
    flex: 1
  },
  content: {
    flex: 1
  },
  settingsContent: {
    flex: 1,
    padding: 16
  },
  settingsCard: {
    marginBottom: 16
  },
  settingsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16
  },
  settingsItem: {
    marginBottom: 12
  },
  settingsLabel: {
    fontSize: 14,
    marginBottom: 4
  },
  settingsValue: {
    fontSize: 16
  },
  actionButton: {
    marginBottom: 8
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24
  },
  errorText: {
    fontSize: 18,
    fontWeight: '500',
    marginVertical: 16
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24
  },
  loadingText: {
    fontSize: 16,
    textAlign: 'center'
  }
});