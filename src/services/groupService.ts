import { db } from '../config/firebase';
import {
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  getDocs,
  serverTimestamp,
  onSnapshot,
  Unsubscribe,
  runTransaction,
  increment,
  deleteField,
  orderBy,
  limit
} from 'firebase/firestore';
import { FestivalGroup, GroupMember, GroupActivity } from '../types';
import { generateGroupCode, parseGroupCode } from '../utils/groupUtils';
import AsyncStorage from '@react-native-async-storage/async-storage';
import authService from './authService';

class GroupService {
  private groupListeners: Map<string, Unsubscribe> = new Map();
  private activityListeners: Map<string, Unsubscribe> = new Map();

  async createGroup(
    name: string,
    description: string,
    festivalDates: { start: Date; end: Date },
    maxMembers: number = 10
  ): Promise<FestivalGroup | null> {
    try {
      const userId = authService.getCurrentUserId();
      const user = authService.getCurrentUser();
      if (!userId || !user) return null;

      // Générer un code unique
      let groupCode = generateGroupCode();
      let exists = await this.checkGroupCodeExists(groupCode);
      let attempts = 0;
      
      while (exists && attempts < 10) {
        groupCode = generateGroupCode();
        exists = await this.checkGroupCodeExists(groupCode);
        attempts++;
      }

      const newGroup: FestivalGroup = {
        id: groupCode,
        name,
        description,
        createdAt: new Date(),
        createdBy: userId,
        settings: {
          festivalDates,
          alertThresholds: {
            moderate: 3,
            high: 6,
            critical: 10
          },
          maxMembers,
          isPublic: false,
          allowInvites: true
        },
        members: {
          [userId]: {
            id: userId,
            name: user.name,
            avatar: user.avatar,
            role: 'creator',
            joinedAt: new Date(),
            lastActive: new Date(),
            isActive: true,
            totalContributions: 0
          }
        },
        stats: {
          totalMembers: 1,
          totalDrinks: 0,
          averagePerPerson: 0,
          mostActiveDay: ''
        }
      };

      // Sauvegarder le groupe
      await setDoc(doc(db, 'groups', groupCode), {
        ...newGroup,
        createdAt: serverTimestamp(),
        'settings.festivalDates.start': festivalDates.start,
        'settings.festivalDates.end': festivalDates.end,
        [`members.${userId}.joinedAt`]: serverTimestamp(),
        [`members.${userId}.lastActive`]: serverTimestamp()
      });

      // Sauvegarder l'ID du groupe localement
      await AsyncStorage.setItem('currentGroupId', groupCode);

      // Créer l'activité
      await this.addGroupActivity(
        groupCode,
        userId,
        'member_joined',
        `${user.name} a créé le groupe`
      );

      return newGroup;
    } catch (error) {
      console.error('Error creating group:', error);
      return null;
    }
  }

  async joinGroup(groupCode: string): Promise<FestivalGroup | null> {
    try {
      const userId = authService.getCurrentUserId();
      const user = authService.getCurrentUser();
      if (!userId || !user) return null;

      const parsedCode = parseGroupCode(groupCode);
      const groupRef = doc(db, 'groups', parsedCode);
      
      const group = await runTransaction(db, async (transaction) => {
        const groupDoc = await transaction.get(groupRef);
        
        if (!groupDoc.exists()) {
          throw new Error('GROUP_NOT_FOUND');
        }

        const groupData = groupDoc.data() as FestivalGroup;
        
        // Vérifier si l'utilisateur est déjà membre
        if (groupData.members[userId]) {
          return groupData;
        }

        // Vérifier si le groupe est plein
        if (Object.keys(groupData.members).length >= groupData.settings.maxMembers) {
          throw new Error('GROUP_FULL');
        }

        // Ajouter le membre
        const newMember: GroupMember = {
          id: userId,
          name: user.name,
          avatar: user.avatar,
          role: 'member',
          joinedAt: new Date(),
          lastActive: new Date(),
          isActive: true,
          totalContributions: 0
        };

        transaction.update(groupRef, {
          [`members.${userId}`]: newMember,
          'stats.totalMembers': increment(1)
        });

        groupData.members[userId] = newMember;
        groupData.stats.totalMembers++;
        
        return groupData;
      });

      if (group) {
        // Sauvegarder l'ID du groupe localement
        await AsyncStorage.setItem('currentGroupId', parsedCode);

        // Créer l'activité
        await this.addGroupActivity(
          parsedCode,
          userId,
          'member_joined',
          `${user.name} a rejoint le groupe`
        );
      }

      return group;
    } catch (error: any) {
      console.error('Error joining group:', error);
      if (error.message === 'GROUP_NOT_FOUND' || error.message === 'GROUP_FULL') {
        throw error;
      }
      return null;
    }
  }

  async getGroup(groupId: string): Promise<FestivalGroup | null> {
    try {
      const groupDoc = await getDoc(doc(db, 'groups', groupId));
      if (groupDoc.exists()) {
        const data = groupDoc.data();
        return {
          ...data,
          id: groupId,
          createdAt: data.createdAt?.toDate() || new Date(),
          settings: {
            ...data.settings,
            festivalDates: {
              start: data.settings.festivalDates.start?.toDate() || new Date(),
              end: data.settings.festivalDates.end?.toDate() || new Date()
            }
          }
        } as FestivalGroup;
      }
      return null;
    } catch (error) {
      console.error('Error getting group:', error);
      return null;
    }
  }

  async updateGroupSettings(
    groupId: string,
    updates: Partial<FestivalGroup['settings']>
  ): Promise<boolean> {
    try {
      const updateData: any = {};
      
      if (updates.festivalDates) {
        updateData['settings.festivalDates.start'] = updates.festivalDates.start;
        updateData['settings.festivalDates.end'] = updates.festivalDates.end;
      }
      
      if (updates.alertThresholds) {
        updateData['settings.alertThresholds'] = updates.alertThresholds;
      }
      
      if (typeof updates.allowInvites !== 'undefined') {
        updateData['settings.allowInvites'] = updates.allowInvites;
      }

      await updateDoc(doc(db, 'groups', groupId), updateData);
      return true;
    } catch (error) {
      console.error('Error updating group settings:', error);
      return false;
    }
  }

  async leaveGroup(groupId: string): Promise<boolean> {
    try {
      const userId = authService.getCurrentUserId();
      if (!userId) return false;

      await updateDoc(doc(db, 'groups', groupId), {
        [`members.${userId}`]: deleteField(),
        'stats.totalMembers': increment(-1)
      });

      await AsyncStorage.removeItem('currentGroupId');
      return true;
    } catch (error) {
      console.error('Error leaving group:', error);
      return false;
    }
  }

  async removeMember(groupId: string, memberId: string): Promise<boolean> {
    try {
      await updateDoc(doc(db, 'groups', groupId), {
        [`members.${memberId}`]: deleteField(),
        'stats.totalMembers': increment(-1)
      });

      return true;
    } catch (error) {
      console.error('Error removing member:', error);
      return false;
    }
  }

  async updateMemberInAllGroups(userId: string, updates: { name?: string; avatar?: string }): Promise<void> {
    try {
      // Récupérer le groupe actuel de l'utilisateur
      const currentGroupId = await AsyncStorage.getItem('currentGroupId');
      if (!currentGroupId) return;

      // Mettre à jour le membre dans le groupe actuel
      const memberUpdates: any = {};
      if (updates.name) memberUpdates[`members.${userId}.name`] = updates.name;
      if (updates.avatar) memberUpdates[`members.${userId}.avatar`] = updates.avatar;
      memberUpdates[`members.${userId}.lastActive`] = serverTimestamp();

      await updateDoc(doc(db, 'groups', currentGroupId), memberUpdates);
    } catch (error) {
      console.error('Error updating member in groups:', error);
    }
  }

  async updateMemberActivity(groupId: string, userId: string): Promise<void> {
    try {
      await updateDoc(doc(db, 'groups', groupId), {
        [`members.${userId}.lastActive`]: serverTimestamp(),
        [`members.${userId}.isActive`]: true
      });
    } catch (error) {
      console.error('Error updating member activity:', error);
    }
  }

  subscribeToGroup(
    groupId: string,
    onUpdate: (group: FestivalGroup) => void,
    onError?: (error: Error) => void
  ): () => void {
    // Nettoyer l'ancien listener s'il existe
    this.unsubscribeFromGroup(groupId);

    const unsubscribe = onSnapshot(
      doc(db, 'groups', groupId),
      (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          const group: FestivalGroup = {
            ...data,
            id: groupId,
            createdAt: data.createdAt?.toDate() || new Date(),
            settings: {
              ...data.settings,
              festivalDates: {
                start: data.settings.festivalDates.start?.toDate() || new Date(),
                end: data.settings.festivalDates.end?.toDate() || new Date()
              }
            }
          } as FestivalGroup;
          onUpdate(group);
        }
      },
      (error) => {
        console.error('Error in group subscription:', error);
        onError?.(error);
      }
    );

    this.groupListeners.set(groupId, unsubscribe);
    return () => this.unsubscribeFromGroup(groupId);
  }

  unsubscribeFromGroup(groupId: string): void {
    const unsubscribe = this.groupListeners.get(groupId);
    if (unsubscribe) {
      unsubscribe();
      this.groupListeners.delete(groupId);
    }
  }

  async addGroupActivity(
    groupId: string,
    userId: string,
    type: GroupActivity['type'],
    message: string,
    metadata?: any
  ): Promise<void> {
    try {
      const user = authService.getCurrentUser();
      if (!user) return;

      const activity: Omit<GroupActivity, 'id'> = {
        groupId,
        userId,
        userName: user.name,
        userAvatar: user.avatar,
        type,
        message,
        timestamp: new Date(),
        ...(metadata && { metadata })
      };

      await setDoc(doc(collection(db, 'groups', groupId, 'activity')), {
        ...activity,
        timestamp: serverTimestamp()
      });
    } catch (error) {
      console.error('Error adding group activity:', error);
    }
  }

  async getCurrentGroupId(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem('currentGroupId');
    } catch (error) {
      console.error('Error getting current group ID:', error);
      return null;
    }
  }

  onGroupActivitiesUpdate(
    groupId: string,
    onUpdate: (activities: GroupActivity[]) => void,
    onError?: (error: Error) => void
  ): () => void {
    // Nettoyer l'ancien listener s'il existe
    this.unsubscribeFromActivities(groupId);

    const activitiesRef = collection(db, 'groups', groupId, 'activity');
    const q = query(activitiesRef, orderBy('timestamp', 'desc'), limit(50));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const activities: GroupActivity[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          activities.push({
            id: doc.id,
            groupId: data.groupId,
            userId: data.userId,
            userName: data.userName,
            userAvatar: data.userAvatar,
            type: data.type,
            message: data.message,
            timestamp: data.timestamp?.toDate() || new Date(),
            metadata: data.metadata
          });
        });
        onUpdate(activities);
      },
      (error) => {
        console.error('Error in activities subscription:', error);
        onError?.(error);
      }
    );

    this.activityListeners.set(groupId, unsubscribe);
    return () => this.unsubscribeFromActivities(groupId);
  }

  unsubscribeFromActivities(groupId: string): void {
    const unsubscribe = this.activityListeners.get(groupId);
    if (unsubscribe) {
      unsubscribe();
      this.activityListeners.delete(groupId);
    }
  }

  private async checkGroupCodeExists(code: string): Promise<boolean> {
    try {
      const groupDoc = await getDoc(doc(db, 'groups', code));
      return groupDoc.exists();
    } catch (error) {
      console.error('Error checking group code:', error);
      return false;
    }
  }
}

export default new GroupService();