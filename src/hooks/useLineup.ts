import { useState, useEffect, useCallback } from 'react';
import { FestivalLineup, CurrentlyPlaying } from '../types';
import lineupService from '../services/lineupService';

export function useLineup(groupId: string | null) {
  const [lineup, setLineup] = useState<FestivalLineup | null>(null);
  const [currentlyPlaying, setCurrentlyPlaying] = useState<CurrentlyPlaying>({
    event: null,
    isLive: false,
    nextEvent: null
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Charger la programmation
  const loadLineup = useCallback(async () => {
    if (!groupId) return;

    try {
      setIsLoading(true);
      setError(null);
      const fetchedLineup = await lineupService.getLineup(groupId);
      setLineup(fetchedLineup);
      
      // Calculer l'événement en cours si on a des données
      if (fetchedLineup) {
        const playing = lineupService.getCurrentlyPlaying(fetchedLineup);
        setCurrentlyPlaying(playing);
      }
    } catch (err) {
      console.error('Error loading lineup:', err);
      setError('Impossible de charger la programmation');
    } finally {
      setIsLoading(false);
    }
  }, [groupId]);

  // Mettre à jour l'événement en cours (appelé périodiquement)
  const updateCurrentlyPlaying = useCallback(() => {
    if (lineup) {
      const playing = lineupService.getCurrentlyPlaying(lineup);
      setCurrentlyPlaying(playing);
    }
  }, [lineup]);

  // Rafraîchir la programmation
  const refresh = useCallback(() => {
    loadLineup();
  }, [loadLineup]);

  // Ajouter un événement
  const addEvent = useCallback(async (date: string, event: Omit<import('../types').LineupEvent, 'id'>) => {
    if (!groupId) return;

    try {
      setError(null);
      await lineupService.addEvent(groupId, date, event);
      await loadLineup(); // Recharger après ajout
    } catch (err) {
      console.error('Error adding event:', err);
      setError('Impossible d\'ajouter l\'événement');
      throw err;
    }
  }, [groupId, loadLineup]);

  // Supprimer un événement
  const deleteEvent = useCallback(async (eventId: string) => {
    if (!groupId) return;

    try {
      setError(null);
      await lineupService.deleteEvent(groupId, eventId);
      await loadLineup(); // Recharger après suppression
    } catch (err) {
      console.error('Error deleting event:', err);
      setError('Impossible de supprimer l\'événement');
      throw err;
    }
  }, [groupId, loadLineup]);

  // Mettre à jour les scènes
  const updateStages = useCallback(async (stages: string[], updatedBy: string) => {
    if (!groupId) return;

    try {
      setError(null);
      await lineupService.updateStages(groupId, stages, updatedBy);
      await loadLineup(); // Recharger après mise à jour
    } catch (err) {
      console.error('Error updating stages:', err);
      setError('Impossible de mettre à jour les scènes');
      throw err;
    }
  }, [groupId, loadLineup]);

  // Initialiser la programmation pour un nouveau groupe
  const initializeLineup = useCallback(async (stages: string[], createdBy: string) => {
    if (!groupId) return;

    try {
      setError(null);
      await lineupService.initializeLineup(groupId, stages, createdBy);
      await loadLineup();
    } catch (err) {
      console.error('Error initializing lineup:', err);
      setError('Impossible d\'initialiser la programmation');
      throw err;
    }
  }, [groupId, loadLineup]);

  // Effet pour charger la programmation au montage
  useEffect(() => {
    loadLineup();
  }, [loadLineup]);

  // Effet pour mettre à jour périodiquement l'événement en cours
  useEffect(() => {
    const interval = setInterval(updateCurrentlyPlaying, 60000); // Toutes les minutes
    return () => clearInterval(interval);
  }, [updateCurrentlyPlaying]);

  return {
    lineup,
    currentlyPlaying,
    isLoading,
    error,
    refresh,
    addEvent,
    deleteEvent,
    updateStages,
    initializeLineup,
    // Utilitaires
    getDayEvents: (date: string) => lineup ? lineupService.getDayEvents(lineup, date) : [],
    getAvailableDates: () => lineup ? lineupService.getAvailableDates(lineup) : [],
    hasLineup: !!lineup
  };
}