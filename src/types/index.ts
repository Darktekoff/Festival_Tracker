// Export all types
export * from './user';
export * from './group';
export * from './drink';
export * from './chat';
export * from './lineup';
export * from './favorite';
export * from './festival';

// Common types
export type AlertLevel = 'safe' | 'moderate' | 'high' | 'critical';

export interface ErrorResponse {
  code: string;
  message: string;
  details?: any;
}

export interface LoadingState {
  isLoading: boolean;
  error: ErrorResponse | null;
}

export interface PaginatedResponse<T> {
  data: T[];
  hasMore: boolean;
  nextCursor?: string;
}

export interface SyncState {
  lastSync: Date | null;
  pendingSync: number;
  isOnline: boolean;
  isSyncing: boolean;
}