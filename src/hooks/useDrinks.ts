import { useState, useEffect, useCallback } from 'react';
import { DrinkRecord, DrinkFormData } from '../types';
import drinkService from '../services/drinkService';
import { DocumentData, QueryDocumentSnapshot } from 'firebase/firestore';
import { useAuthContext } from '../context/AuthContext';

interface UseDrinksReturn {
  drinks: DrinkRecord[];
  isLoading: boolean;
  isAddingDrink: boolean;
  error: Error | null;
  hasMore: boolean;
  addDrink: (drinkData: DrinkFormData) => Promise<DrinkRecord | null>;
  consumeTemplate: (templateDrink: DrinkRecord) => Promise<DrinkRecord | null>;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  getUserDrinks: (userId: string) => DrinkRecord[];
  getTodayDrinks: () => DrinkRecord[];
}

export function useDrinks(groupId: string | null): UseDrinksReturn {
  const { user } = useAuthContext();
  const [drinks, setDrinks] = useState<DrinkRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingDrink, setIsAddingDrink] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | undefined>();

  // Charger les boissons initiales avec protection
  const loadDrinks = useCallback(async (reset: boolean = false) => {
    if (!groupId || typeof groupId !== 'string') {
      console.log('useDrinks - No valid groupId, clearing drinks');
      setDrinks([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      console.log('useDrinks - Loading drinks for group:', groupId);
      const result = await drinkService.getDrinks(
        groupId,
        50,
        reset ? undefined : lastDoc
      );

      if (reset) {
        setDrinks(result.drinks);
      } else {
        setDrinks(prev => [...prev, ...result.drinks]);
      }

      setLastDoc(result.lastDoc);
      setHasMore(result.drinks.length === 50);
    } catch (err) {
      console.error('useDrinks - Error loading drinks:', err);
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [groupId, lastDoc]);

  // S'abonner aux mises à jour en temps réel avec protection
  useEffect(() => {
    if (!groupId || typeof groupId !== 'string') {
      console.log('useDrinks - No valid groupId, skipping subscription');
      setDrinks([]);
      setError(null);
      setIsLoading(false);
      return;
    }

    console.log('useDrinks - Setting up subscription for group:', groupId);
    let unsubscribe: (() => void) | null = null;

    const initializeSubscription = async () => {
      try {
        unsubscribe = drinkService.subscribeToDrinks(
          groupId,
          (updatedDrinks) => {
            setDrinks(updatedDrinks);
            setError(null);
          },
          (err) => {
            console.error('useDrinks - Listener error:', err);
            setError(err);
          }
        );

        // Charger les boissons initiales une seule fois
        await loadDrinks(true);
      } catch (error) {
        console.error('useDrinks - Error setting up subscription:', error);
        setError(error as Error);
      }
    };

    initializeSubscription();

    return () => {
      if (unsubscribe) {
        console.log('useDrinks - Cleaning up subscription for group:', groupId);
        try {
          unsubscribe();
        } catch (error) {
          console.error('useDrinks - Error cleaning up subscription:', error);
        }
      }
    };
  }, [groupId]); // Retirer loadDrinks des dépendances pour éviter la boucle infinie

  const addDrink = async (drinkData: DrinkFormData): Promise<DrinkRecord | null> => {
    if (!groupId || typeof groupId !== 'string') {
      console.error('useDrinks - Cannot add drink: invalid groupId');
      return null;
    }

    try {
      setIsAddingDrink(true);
      setError(null);


      // Calculer le nombre de boissons d'aujourd'hui pour l'utilisateur actuel (pour le message fun)
      const todayDrinks = getTodayDrinks();
      // CORRECTION: Filtrer les templates ET les triches pour le calcul todayCount
      const userTodayDrinks = todayDrinks.filter(drink => 
        drink.userId === user?.id && 
        !drink.isTemplate && 
        drink.drinkType !== 'Triche'
      );
      const todayCount = userTodayDrinks.length + 1; // +1 pour la boisson qu'on va ajouter


      const newDrink = await drinkService.addDrink(groupId, drinkData, todayCount);
      
      // Ne pas faire de mise à jour optimiste - laisser le listener temps réel gérer
      // pour éviter les conflits et doublons

      return newDrink;
    } catch (err) {
      console.error('useDrinks - Error in addDrink:', err);
      setError(err as Error);
      return null;
    } finally {
      setIsAddingDrink(false);
    }
  };

  const consumeTemplate = async (templateDrink: DrinkRecord): Promise<DrinkRecord | null> => {
    if (!groupId || typeof groupId !== 'string') {
      console.error('useDrinks - Cannot consume template: invalid groupId');
      return null;
    }

    try {
      setIsAddingDrink(true);
      setError(null);

      console.log('useDrinks - Consuming template for group:', groupId);

      const newDrink = await drinkService.consumeTemplate(groupId, templateDrink);
      console.log('useDrinks - Template consumed successfully:', newDrink?.id);
      
      return newDrink;
    } catch (err) {
      console.error('useDrinks - Error in consumeTemplate:', err);
      setError(err as Error);
      return null;
    } finally {
      setIsAddingDrink(false);
    }
  };

  const loadMore = async (): Promise<void> => {
    if (!hasMore || isLoading || !groupId) return;
    try {
      await loadDrinks(false);
    } catch (error) {
      console.error('useDrinks - Error in loadMore:', error);
    }
  };

  const refresh = async (): Promise<void> => {
    if (!groupId) {
      console.log('useDrinks - Cannot refresh: no groupId');
      return;
    }
    
    try {
      setLastDoc(undefined);
      await loadDrinks(true);
    } catch (error) {
      console.error('useDrinks - Error in refresh:', error);
    }
  };

  const getUserDrinks = (userId: string): DrinkRecord[] => {
    return drinks.filter(drink => drink.userId === userId);
  };

  const getTodayDrinks = (): DrinkRecord[] => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return drinks.filter(drink => {
      const drinkDate = new Date(drink.timestamp);
      drinkDate.setHours(0, 0, 0, 0);
      return drinkDate.getTime() === today.getTime();
    });
  };

  return {
    drinks,
    isLoading,
    isAddingDrink,
    error,
    hasMore,
    addDrink,
    consumeTemplate,
    loadMore,
    refresh,
    getUserDrinks,
    getTodayDrinks
  };
}