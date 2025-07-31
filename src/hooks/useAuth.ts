import { useState, useEffect } from 'react';
import { User } from '../types';
import authService from '../services/authService';
import expoPushService from '../services/expoPushService';

interface UseAuthReturn {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: Error | null;
  signIn: (email: string, password: string) => Promise<User | null>;
  register: (email: string, password: string) => Promise<User | null>;
  resetPassword: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<boolean>;
  updateUserProfile: (updates: Partial<User>) => Promise<boolean>;
  createUserProfile: (name: string, avatar: string, gender?: 'male' | 'female', weight?: number, age?: number, height?: number, activityLevel?: 'sedentary' | 'light' | 'moderate' | 'active') => Promise<User | null>;
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // Initialiser l'authentification
    const initAuth = async () => {
      try {
        setIsLoading(true);
        const currentUser = await authService.initializeAuth();
        setUser(currentUser);
      } catch (err) {
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();

    // Écouter les changements d'authentification
    const unsubscribe = authService.onAuthStateChange(async (newUser) => {
      setUser(newUser);
      
      // Enregistrer le token push si l'utilisateur est connecté
      if (newUser?.id) {
        await expoPushService.registerForPushNotifications(newUser.id);
      }
    });

    return unsubscribe;
  }, []);

  const signIn = async (email: string, password: string): Promise<User | null> => {
    try {
      setIsLoading(true);
      setError(null);
      const newUser = await authService.signIn(email, password);
      setUser(newUser);
      
      // Enregistrer le token push après connexion
      if (newUser?.id) {
        await expoPushService.registerForPushNotifications(newUser.id);
      }
      
      return newUser;
    } catch (err) {
      setError(err as Error);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (email: string, password: string): Promise<User | null> => {
    try {
      setIsLoading(true);
      setError(null);
      const newUser = await authService.register(email, password);
      setUser(newUser);
      return newUser;
    } catch (err) {
      setError(err as Error);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const resetPassword = async (email: string): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      await authService.resetPassword(email);
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Supprimer le token push avant déconnexion
      if (user?.id) {
        await expoPushService.removePushToken(user.id);
      }
      
      await authService.signOut();
      setUser(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateProfile = async (updates: Partial<User>): Promise<boolean> => {
    try {
      setError(null);
      const success = await authService.updateUserProfile(updates);
      if (success && user) {
        setUser({ ...user, ...updates });
      }
      return success;
    } catch (err) {
      setError(err as Error);
      return false;
    }
  };

  const createUserProfile = async (name: string, avatar: string, gender?: 'male' | 'female', weight?: number, age?: number, height?: number, activityLevel?: 'sedentary' | 'light' | 'moderate' | 'active'): Promise<User | null> => {
    try {
      setIsLoading(true);
      setError(null);
      const newUser = await authService.createUserProfile(name, avatar, gender, weight, age, height, activityLevel);
      setUser(newUser);
      return newUser;
    } catch (err) {
      setError(err as Error);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    error,
    signIn,
    register,
    resetPassword,
    signOut,
    updateProfile,
    updateUserProfile: updateProfile,
    createUserProfile
  };
}