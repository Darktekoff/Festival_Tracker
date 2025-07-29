import { useState, useEffect } from 'react';
import { SyncState } from '../types';
import offlineService from '../services/offlineService';

interface UseOfflineReturn {
  isOnline: boolean;
  syncState: SyncState;
  sync: () => Promise<boolean>;
  hasPendingSync: boolean;
}

export function useOffline(): UseOfflineReturn {
  const [syncState, setSyncState] = useState<SyncState>(
    offlineService.getSyncState()
  );

  useEffect(() => {
    // S'abonner aux changements d'état de synchronisation
    const unsubscribe = offlineService.subscribeSyncState((newState) => {
      setSyncState(newState);
    });

    return unsubscribe;
  }, []);

  const sync = async (): Promise<boolean> => {
    return await offlineService.sync();
  };

  return {
    isOnline: syncState.isOnline,
    syncState,
    sync,
    hasPendingSync: syncState.pendingSync > 0
  };
}