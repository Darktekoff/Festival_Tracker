import { useState, useEffect, useMemo } from 'react';
import { GroupMember, UserStats } from '../types';
import { useDrinks } from './useDrinks';
import { calculateDrinkStats } from '../utils/calculations';

interface UseMembersReturn {
  members: GroupMember[];
  memberStats: Map<string, UserStats>;
  onlineMembers: GroupMember[];
  offlineMembers: GroupMember[];
  getMemberStats: (memberId: string) => UserStats | undefined;
  sortedByActivity: GroupMember[];
  sortedByContribution: GroupMember[];
}

export function useMembers(
  groupMembers: { [key: string]: GroupMember } | undefined,
  groupId: string | null
): UseMembersReturn {
  const { drinks } = useDrinks(groupId);
  const [memberStats, setMemberStats] = useState<Map<string, UserStats>>(new Map());

  const members = useMemo(() => {
    try {
      if (!groupMembers || typeof groupMembers !== 'object') {
        console.log('useMembers - No groupMembers or invalid format, returning empty array');
        return [];
      }
      return Object.values(groupMembers);
    } catch (error) {
      console.error('useMembers - Error processing groupMembers:', error);
      return [];
    }
  }, [groupMembers]);

  const onlineMembers = useMemo(() => {
    try {
      return members.filter(member => member?.isActive === true);
    } catch (error) {
      console.error('useMembers - Error filtering online members:', error);
      return [];
    }
  }, [members]);

  const offlineMembers = useMemo(() => {
    try {
      return members.filter(member => member?.isActive === false);
    } catch (error) {
      console.error('useMembers - Error filtering offline members:', error);
      return [];
    }
  }, [members]);

  const sortedByActivity = useMemo(() => {
    try {
      return [...members].sort((a, b) => {
        const aTime = a?.lastActive?.getTime?.() || 0;
        const bTime = b?.lastActive?.getTime?.() || 0;
        return bTime - aTime;
      });
    } catch (error) {
      console.error('useMembers - Error sorting by activity:', error);
      return [];
    }
  }, [members]);

  const sortedByContribution = useMemo(() => {
    try {
      return [...members].sort((a, b) => 
        (b?.totalContributions || 0) - (a?.totalContributions || 0)
      );
    } catch (error) {
      console.error('useMembers - Error sorting by contribution:', error);
      return [];
    }
  }, [members]);

  // Calculer les stats pour chaque membre avec protection
  useEffect(() => {
    try {
      const stats = new Map<string, UserStats>();

      if (!members || members.length === 0) {
        console.log('useMembers - No members to calculate stats for');
        setMemberStats(stats);
        return;
      }

      members.forEach(member => {
        try {
          if (!member || !member.id) {
            console.error('useMembers - Invalid member object:', member);
            return;
          }

          const memberDrinks = drinks.filter(d => d?.userId === member.id);
          const drinkStats = calculateDrinkStats(memberDrinks);
          
          // Calculer le streak avec protection
          let currentStreak = 0;
          try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            for (let i = 0; i < 30; i++) {
              const date = new Date(today);
              date.setDate(date.getDate() - i);
              
              const dayDrinks = memberDrinks.filter(d => {
                try {
                  const drinkDate = new Date(d.timestamp);
                  drinkDate.setHours(0, 0, 0, 0);
                  return drinkDate.getTime() === date.getTime();
                } catch (error) {
                  console.error('useMembers - Error processing drink date:', error);
                  return false;
                }
              });
              
              const dayUnits = dayDrinks.reduce((sum, d) => sum + (d?.alcoholUnits || 0), 0);
              
              if (dayUnits === 0 || dayUnits > 10) { // 10 unités = seuil critique
                break;
              }
              
              currentStreak++;
            }
          } catch (error) {
            console.error('useMembers - Error calculating streak:', error);
            currentStreak = 0;
          }

          stats.set(member.id, {
            userId: member.id,
            totalDrinks: drinkStats.totalDrinks,
            totalUnits: drinkStats.totalUnits,
            averagePerDay: drinkStats.dailyAverage,
            lastDrink: memberDrinks[0]?.timestamp,
            isOnline: member.isActive,
            currentStreak
          });
        } catch (error) {
          console.error('useMembers - Error processing member stats:', error, member);
        }
      });

      setMemberStats(stats);
    } catch (error) {
      console.error('useMembers - Error in stats calculation effect:', error);
      setMemberStats(new Map());
    }
  }, [members, drinks]);

  const getMemberStats = (memberId: string): UserStats | undefined => {
    return memberStats.get(memberId);
  };

  return {
    members,
    memberStats,
    onlineMembers,
    offlineMembers,
    getMemberStats,
    sortedByActivity,
    sortedByContribution
  };
}