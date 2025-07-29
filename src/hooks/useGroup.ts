import { useState, useEffect, useCallback } from 'react';
import { FestivalGroup, GroupMember } from '../types';
import groupService from '../services/groupService';
import authService from '../services/authService';

interface UseGroupReturn {
  group: FestivalGroup | null;
  isLoading: boolean;
  error: Error | null;
  createGroup: (
    name: string,
    description: string,
    festivalDates: { start: Date; end: Date },
    maxMembers?: number
  ) => Promise<FestivalGroup | null>;
  joinGroup: (code: string) => Promise<FestivalGroup | null>;
  leaveGroup: () => Promise<boolean>;
  updateSettings: (settings: Partial<FestivalGroup['settings']>) => Promise<boolean>;
  refreshGroup: () => Promise<void>;
  isCreator: boolean;
  isAdmin: boolean;
  currentMember: GroupMember | null;
}

export function useGroup(): UseGroupReturn {
  const [group, setGroup] = useState<FestivalGroup | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const userId = authService.getCurrentUserId();
  const currentMember = group && userId ? group.members[userId] : null;
  const isCreator = currentMember?.role === 'creator';
  const isAdmin = currentMember?.role === 'admin' || isCreator;

  const loadGroup = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const groupId = await groupService.getCurrentGroupId();
      if (groupId) {
        const groupData = await groupService.getGroup(groupId);
        setGroup(groupData);

        // S'abonner aux mises à jour
        if (groupData) {
          const unsubscribe = groupService.subscribeToGroup(
            groupId,
            (updatedGroup) => setGroup(updatedGroup),
            (err) => setError(err)
          );
          return unsubscribe;
        }
      } else {
        setGroup(null);
      }
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const initGroup = async () => {
      unsubscribe = await loadGroup();
    };

    initGroup();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [loadGroup]);

  const createGroup = async (
    name: string,
    description: string,
    festivalDates: { start: Date; end: Date },
    maxMembers: number = 10
  ): Promise<FestivalGroup | null> => {
    try {
      setIsLoading(true);
      setError(null);

      const newGroup = await groupService.createGroup(
        name,
        description,
        festivalDates,
        maxMembers
      );

      if (newGroup) {
        setGroup(newGroup);
        // S'abonner aux mises à jour
        groupService.subscribeToGroup(
          newGroup.id,
          (updatedGroup) => setGroup(updatedGroup),
          (err) => setError(err)
        );
      }

      return newGroup;
    } catch (err) {
      setError(err as Error);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const joinGroup = async (code: string): Promise<FestivalGroup | null> => {
    try {
      setIsLoading(true);
      setError(null);

      const joinedGroup = await groupService.joinGroup(code);

      if (joinedGroup) {
        setGroup(joinedGroup);
        // S'abonner aux mises à jour
        groupService.subscribeToGroup(
          joinedGroup.id,
          (updatedGroup) => setGroup(updatedGroup),
          (err) => setError(err)
        );
      }

      return joinedGroup;
    } catch (err) {
      setError(err as Error);
      throw err; // Re-throw pour gérer les erreurs spécifiques
    } finally {
      setIsLoading(false);
    }
  };

  const leaveGroup = async (): Promise<boolean> => {
    try {
      setError(null);

      if (!group) return false;

      const success = await groupService.leaveGroup(group.id);
      if (success) {
        groupService.unsubscribeFromGroup(group.id);
        setGroup(null);
      }

      return success;
    } catch (err) {
      setError(err as Error);
      return false;
    }
  };

  const updateSettings = async (
    settings: Partial<FestivalGroup['settings']>
  ): Promise<boolean> => {
    try {
      setError(null);

      if (!group || !isAdmin) return false;

      const success = await groupService.updateGroupSettings(group.id, settings);
      return success;
    } catch (err) {
      setError(err as Error);
      return false;
    }
  };

  const refreshGroup = async (): Promise<void> => {
    if (group) {
      const updated = await groupService.getGroup(group.id);
      if (updated) {
        setGroup(updated);
      }
    }
  };

  return {
    group,
    isLoading,
    error,
    createGroup,
    joinGroup,
    leaveGroup,
    updateSettings,
    refreshGroup,
    isCreator,
    isAdmin,
    currentMember
  };
}