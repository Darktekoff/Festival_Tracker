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
import { useTheme } from '../../context/ThemeContext';
import { useGroupContext } from '../../context/GroupContext';
import { Ionicons } from '@expo/vector-icons';
import groupService from '../../services/groupService';
import authService from '../../services/authService';
import { FestivalGroup } from '../../types';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface ChangeGroupScreenProps {
  navigation: any;
}

export function ChangeGroupScreen({ navigation }: ChangeGroupScreenProps) {
  const { colors, theme } = useTheme();
  const { group: currentGroup, refreshGroup } = useGroupContext();
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
    if (groupId === currentGroup?.id) {
      // Déjà dans ce groupe
      navigation.goBack();
      return;
    }

    try {
      setSelectingGroup(true);
      
      // Sélectionner le nouveau groupe
      await groupService.selectGroup(groupId);
      
      // Recharger le groupe dans le contexte
      await refreshGroup();
      
      // Retourner à l'écran précédent
      navigation.goBack();
    } catch (error) {
      console.error('Error selecting group:', error);
      Alert.alert('Erreur', 'Impossible de sélectionner le groupe');
    } finally {
      setSelectingGroup(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Changer de groupe</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {loadingGroups ? (
          <View style={styles.loadingSection}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : userGroups.length > 0 ? (
          <View style={styles.groupsList}>
            {userGroups.map((group) => {
              const userId = authService.getCurrentUserId();
              const memberData = userId ? group.members[userId] : null;
              const isAdmin = memberData?.role === 'admin' || memberData?.role === 'creator';
              const memberCount = Object.keys(group.members).length;
              const isCurrent = group.id === currentGroup?.id;
              
              return (
                <TouchableOpacity
                  key={group.id}
                  onPress={() => handleSelectGroup(group.id)}
                  activeOpacity={0.7}
                  disabled={selectingGroup || isCurrent}
                >
                  <Card style={[
                    styles.groupCard,
                    isCurrent && { borderColor: colors.primary, borderWidth: 2 }
                  ]}>
                    <View style={styles.groupHeader}>
                      <View style={styles.groupInfo}>
                        <View style={styles.groupTitleRow}>
                          <Text style={[styles.groupName, { color: colors.text }]}>
                            {group.name}
                          </Text>
                          {isCurrent && (
                            <View style={[styles.currentBadge, { backgroundColor: colors.primary }]}>
                              <Text style={styles.currentText}>Actuel</Text>
                            </View>
                          )}
                        </View>
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
                      {!isCurrent && (
                        <Ionicons name="chevron-forward" size={24} color={colors.textLight} />
                      )}
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
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={64} color={colors.textLight} />
            <Text style={[styles.emptyText, { color: colors.textLight }]}>
              Vous n'êtes membre d'aucun groupe
            </Text>
          </View>
        )}
      </ScrollView>
      
      {/* Loading overlay lors de la sélection */}
      {selectingGroup && (
        <View style={styles.loadingOverlay}>
          <View style={[styles.loadingContainer, { backgroundColor: colors.surface }]}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.text }]}>
              Changement de groupe...
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0'
  },
  backButton: {
    padding: 8
  },
  title: {
    fontSize: 18,
    fontWeight: '600'
  },
  placeholder: {
    width: 40
  },
  content: {
    flexGrow: 1,
    padding: 16
  },
  loadingSection: {
    paddingVertical: 32,
    alignItems: 'center'
  },
  groupsList: {
    gap: 12
  },
  groupCard: {
    padding: 16
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  groupInfo: {
    flex: 1
  },
  groupTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4
  },
  groupName: {
    fontSize: 16,
    fontWeight: '600'
  },
  currentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12
  },
  currentText: {
    fontSize: 11,
    color: '#ffffff',
    fontWeight: '600'
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
  emptyState: {
    alignItems: 'center',
    paddingVertical: 64
  },
  emptyText: {
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center'
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