import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SyncState } from '../types';
import drinkService from './drinkService';
import groupService from './groupService';
import authService from './authService';

class OfflineService {
  private isOnline: boolean = true;
  private syncState: SyncState = {
    lastSync: null,
    pendingSync: 0,
    isOnline: true,
    isSyncing: false
  };
  private listeners: Set<(state: SyncState) => void> = new Set();
  private unsubscribeNetInfo: (() => void) | null = null;

  async initialize(): Promise<void> {
    try {
      // Charger l'état de synchronisation sauvegardé
      const savedState = await AsyncStorage.getItem('syncState');
      if (savedState) {
        const parsed = JSON.parse(savedState);
        this.syncState = {
          ...parsed,
          lastSync: parsed.lastSync ? new Date(parsed.lastSync) : null,
          isSyncing: false
        };
      }

      // Charger les données en attente
      await drinkService.loadPendingDrinks();

      // Écouter les changements de connectivité
      this.unsubscribeNetInfo = NetInfo.addEventListener(state => {
        this.handleConnectivityChange(state.isConnected ?? false);
      });

      // Vérifier l'état initial
      const netInfo = await NetInfo.fetch();
      this.isOnline = netInfo.isConnected ?? false;
      this.updateSyncState({ isOnline: this.isOnline });

      // Si en ligne, synchroniser
      if (this.isOnline) {
        await this.sync();
      }
    } catch (error) {
      console.error('Error initializing offline service:', error);
    }
  }

  private async handleConnectivityChange(isConnected: boolean): Promise<void> {
    const wasOffline = !this.isOnline;
    this.isOnline = isConnected;
    
    this.updateSyncState({ isOnline: isConnected });

    // Si on revient en ligne, synchroniser
    if (wasOffline && isConnected) {
      console.log('Connexion rétablie, synchronisation...');
      await this.sync();
    }
  }

  async sync(): Promise<boolean> {
    if (!this.isOnline || this.syncState.isSyncing) {
      return false;
    }

    this.updateSyncState({ isSyncing: true });

    try {
      // Synchroniser les boissons en attente
      await drinkService.syncPendingDrinks();

      // Mettre à jour l'activité du membre
      const groupId = await groupService.getCurrentGroupId();
      const userId = authService.getCurrentUserId();
      if (groupId && userId) {
        await groupService.updateMemberActivity(groupId, userId);
      }

      // Succès
      this.updateSyncState({
        lastSync: new Date(),
        pendingSync: 0,
        isSyncing: false
      });

      await this.saveSyncState();
      return true;
    } catch (error) {
      console.error('Error during sync:', error);
      this.updateSyncState({ isSyncing: false });
      return false;
    }
  }

  private updateSyncState(updates: Partial<SyncState>): void {
    this.syncState = { ...this.syncState, ...updates };
    this.notifyListeners();
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.syncState));
  }

  subscribeSyncState(listener: (state: SyncState) => void): () => void {
    this.listeners.add(listener);
    // Envoyer l'état initial
    listener(this.syncState);
    
    return () => {
      this.listeners.delete(listener);
    };
  }

  getSyncState(): SyncState {
    return { ...this.syncState };
  }

  isConnected(): boolean {
    return this.isOnline;
  }

  async incrementPendingSync(): Promise<void> {
    this.updateSyncState({
      pendingSync: this.syncState.pendingSync + 1
    });
    await this.saveSyncState();
  }

  async decrementPendingSync(): Promise<void> {
    this.updateSyncState({
      pendingSync: Math.max(0, this.syncState.pendingSync - 1)
    });
    await this.saveSyncState();
  }

  private async saveSyncState(): Promise<void> {
    try {
      await AsyncStorage.setItem('syncState', JSON.stringify({
        lastSync: this.syncState.lastSync?.toISOString(),
        pendingSync: this.syncState.pendingSync,
        isOnline: this.syncState.isOnline
      }));
    } catch (error) {
      console.error('Error saving sync state:', error);
    }
  }

  async clearOfflineData(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        'syncState',
        'pendingDrinks'
      ]);
      
      this.syncState = {
        lastSync: null,
        pendingSync: 0,
        isOnline: this.isOnline,
        isSyncing: false
      };
      
      this.notifyListeners();
    } catch (error) {
      console.error('Error clearing offline data:', error);
    }
  }

  cleanup(): void {
    if (this.unsubscribeNetInfo) {
      this.unsubscribeNetInfo();
      this.unsubscribeNetInfo = null;
    }
    this.listeners.clear();
  }
}

export default new OfflineService();