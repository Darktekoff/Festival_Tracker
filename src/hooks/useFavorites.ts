import { useState, useEffect, useCallback } from 'react';
import { UserFavorite, FavoriteInput } from '../types';
import favoriteService from '../services/favoriteService';
import { useNotifications } from './useNotifications';

export function useFavorites(userId: string | null, groupId: string | null) {
  const [favorites, setFavorites] = useState<UserFavorite[]>([]);
  const [favoriteEventIds, setFavoriteEventIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { scheduleForFavorite, cancelForFavorite } = useNotifications();

  // Charger les favoris de l'utilisateur
  const loadFavorites = useCallback(async () => {
    if (!userId || !groupId) return;

    try {
      setIsLoading(true);
      setError(null);
      
      const userFavorites = await favoriteService.getUserFavorites(userId, groupId);
      setFavorites(userFavorites);
      
      // Créer un Set pour un accès rapide
      const eventIds = new Set(userFavorites.map(fav => fav.eventId));
      setFavoriteEventIds(eventIds);
      
    } catch (err) {
      console.error('Error loading favorites:', err);
      setError('Impossible de charger les favoris');
    } finally {
      setIsLoading(false);
    }
  }, [userId, groupId]);

  // Vérifier si un événement est favori
  const isFavorite = useCallback((eventId: string): boolean => {
    return favoriteEventIds.has(eventId);
  }, [favoriteEventIds]);

  // Ajouter un favori
  const addFavorite = useCallback(async (favoriteInput: FavoriteInput): Promise<boolean> => {
    if (!userId || !groupId) return false;

    try {
      setError(null);
      
      await favoriteService.addFavorite(userId, groupId, favoriteInput);
      
      // Mettre à jour l'état local
      setFavoriteEventIds(prev => new Set([...prev, favoriteInput.eventId]));
      
      // Recharger pour avoir les données complètes
      await loadFavorites();
      
      return true;
    } catch (err) {
      console.error('Error adding favorite:', err);
      setError('Impossible d\'ajouter aux favoris');
      return false;
    }
  }, [userId, groupId, loadFavorites]);

  // Retirer un favori
  const removeFavorite = useCallback(async (eventId: string): Promise<boolean> => {
    if (!userId) return false;

    try {
      setError(null);
      
      await favoriteService.removeFavorite(userId, eventId);
      
      // Mettre à jour l'état local
      setFavoriteEventIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(eventId);
        return newSet;
      });
      
      setFavorites(prev => prev.filter(fav => fav.eventId !== eventId));
      
      return true;
    } catch (err) {
      console.error('Error removing favorite:', err);
      setError('Impossible de retirer des favoris');
      return false;
    }
  }, [userId]);

  // Toggle favori
  const toggleFavorite = useCallback(async (eventId: string, reminderMinutes: number = 15): Promise<boolean> => {
    if (isFavorite(eventId)) {
      return await removeFavorite(eventId);
    } else {
      return await addFavorite({ eventId, reminderMinutes });
    }
  }, [isFavorite, addFavorite, removeFavorite]);

  // Mettre à jour le délai de rappel
  const updateReminderMinutes = useCallback(async (eventId: string, reminderMinutes: number): Promise<boolean> => {
    if (!userId) return false;

    try {
      setError(null);
      
      await favoriteService.updateReminderMinutes(userId, eventId, reminderMinutes);
      
      // Mettre à jour l'état local
      setFavorites(prev => prev.map(fav => 
        fav.eventId === eventId 
          ? { ...fav, reminderMinutes }
          : fav
      ));
      
      return true;
    } catch (err) {
      console.error('Error updating reminder:', err);
      setError('Impossible de mettre à jour le rappel');
      return false;
    }
  }, [userId]);

  // Récupérer un favori spécifique
  const getFavorite = useCallback((eventId: string): UserFavorite | null => {
    return favorites.find(fav => fav.eventId === eventId) || null;
  }, [favorites]);

  // Effet pour charger les favoris au montage
  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  return {
    favorites,
    favoriteEventIds,
    isLoading,
    error,
    isFavorite,
    addFavorite,
    removeFavorite,
    toggleFavorite,
    updateReminderMinutes,
    getFavorite,
    refresh: loadFavorites
  };
}