import { useState, useEffect, useCallback } from 'react';
import { UserFavorite } from '../types';
import favoriteService from '../services/favoriteService';
import { useGroupContext } from '../context/GroupContext';

interface EventSocialData {
  eventId: string;
  favorites: UserFavorite[];
  count: number;
  userIds: string[];
  names: string[];
  avatars: string[];
}

export function useSocialFavorites() {
  const { group } = useGroupContext();
  const members = group ? Object.values(group.members || {}) : [];
  const [eventSocialData, setEventSocialData] = useState<Map<string, EventSocialData>>(new Map());
  const [isLoading, setIsLoading] = useState(false);

  // Récupérer les données sociales pour un événement spécifique
  const getEventSocialData = useCallback(async (eventId: string): Promise<EventSocialData> => {
    if (!group?.id) {
      return { eventId, favorites: [], count: 0, userIds: [], names: [], avatars: [] };
    }

    // Vérifier le cache
    const cached = eventSocialData.get(eventId);
    if (cached) {
      return cached;
    }

    try {
      const favorites = await favoriteService.getEventFavorites(group.id, eventId);
      
      // Récupérer les noms et avatars des membres
      const names: string[] = [];
      const avatars: string[] = [];
      
      favorites.forEach(fav => {
        const member = members.find(m => m.id === fav.userId);
        if (member) {
          names.push(member.name);
          avatars.push(member.avatar || '');
        }
      });
      
      const socialData: EventSocialData = {
        eventId,
        favorites,
        count: favorites.length,
        userIds: favorites.map(fav => fav.userId),
        names,
        avatars
      };

      // Mettre en cache
      setEventSocialData(prev => new Map(prev).set(eventId, socialData));
      
      return socialData;
    } catch (error) {
      console.error('Error fetching event social data:', error);
      return { eventId, favorites: [], count: 0, userIds: [], names: [], avatars: [] };
    }
  }, [group?.id, members]);

  // Récupérer les données sociales pour plusieurs événements
  const getMultipleEventsSocialData = useCallback(async (eventIds: string[]): Promise<Map<string, EventSocialData>> => {
    if (!group?.id) return new Map();

    // Filtrer les événements déjà en cache
    const uncachedEventIds = eventIds.filter(eventId => !eventSocialData.has(eventId));
    
    if (uncachedEventIds.length === 0) {
      return eventSocialData;
    }

    setIsLoading(true);
    const socialDataMap = new Map<string, EventSocialData>();

    try {
      // Traiter les événements par batch pour éviter trop de requêtes simultanées
      const batchSize = 5;
      for (let i = 0; i < uncachedEventIds.length; i += batchSize) {
        const batch = uncachedEventIds.slice(i, i + batchSize);
        
        const batchPromises = batch.map(async (eventId) => {
          try {
            const favorites = await favoriteService.getEventFavorites(group.id!, eventId);
            
            // Récupérer les noms et avatars des membres
            const names: string[] = [];
            const avatars: string[] = [];
            
            favorites.forEach(fav => {
              const member = members.find(m => m.id === fav.userId);
              if (member) {
                names.push(member.name);
                avatars.push(member.avatar || '');
              }
            });
            
            const socialData: EventSocialData = {
              eventId,
              favorites,
              count: favorites.length,
              userIds: favorites.map(fav => fav.userId),
              names,
              avatars
            };
            return [eventId, socialData] as [string, EventSocialData];
          } catch (error) {
            console.error(`Error fetching social data for event ${eventId}:`, error);
            return [eventId, { eventId, favorites: [], count: 0, userIds: [], names: [], avatars: [] }] as [string, EventSocialData];
          }
        });

        const batchResults = await Promise.all(batchPromises);
        batchResults.forEach(([eventId, socialData]) => {
          socialDataMap.set(eventId, socialData);
        });
      }

      setEventSocialData(prev => new Map([...prev, ...socialDataMap]));
      return new Map([...eventSocialData, ...socialDataMap]);
    } catch (error) {
      console.error('Error fetching multiple events social data:', error);
      return eventSocialData;
    } finally {
      setIsLoading(false);
    }
  }, [group?.id]);

  // Obtenir les utilisateurs qui ont mis un événement en favori (avec infos complètes)
  const getEventFavoriteUsers = useCallback((eventId: string) => {
    const socialData = eventSocialData.get(eventId);
    if (!socialData || !members) return [];

    return socialData.favorites
      .map(favorite => {
        const member = members.find(m => m.id === favorite.userId);
        return member ? {
          id: member.id,
          name: member.name,
          avatar: member.avatar
        } : null;
      })
      .filter(user => user !== null);
  }, [eventSocialData, members]);

  // Invalider le cache pour un événement (après ajout/suppression de favori)
  const invalidateEventCache = useCallback((eventId: string) => {
    setEventSocialData(prev => {
      const newMap = new Map(prev);
      newMap.delete(eventId);
      return newMap;
    });
  }, []);

  // Vider tout le cache
  const clearCache = useCallback(() => {
    setEventSocialData(new Map());
  }, []);

  return {
    getEventSocialData,
    getMultipleEventsSocialData,
    getEventFavoriteUsers,
    invalidateEventCache,
    clearCache,
    isLoading
  };
}