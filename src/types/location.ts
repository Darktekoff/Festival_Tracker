export interface LocationCoordinates {
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number;
  altitudeAccuracy?: number;
  heading?: number;
  speed?: number;
}

export interface LocationData {
  coordinates: LocationCoordinates;
  timestamp: Date;
  address?: string; // Adresse readable (optionnel)
}

export type LocationPermissionStatus = 
  | 'undetermined'
  | 'denied' 
  | 'granted'
  | 'restricted';

export type LocationRequestStatus = 
  | 'pending'
  | 'accepted'
  | 'declined'
  | 'expired'
  | 'cancelled';

export interface LocationRequest {
  id: string;
  fromUserId: string;
  fromUserName: string;
  toUserId: string;
  toUserName: string;
  groupId: string;
  message?: string;
  status: LocationRequestStatus;
  createdAt: Date;
  expiresAt: Date;
  respondedAt?: Date;
}

export interface LocationResponse {
  requestId: string;
  status: 'accepted' | 'declined';
  location?: LocationData; // Seulement si accepté
  message?: string; // Message optionnel de réponse
  respondedAt: Date;
}

export interface LocationShare {
  id: string;
  fromUserId: string;
  fromUserName: string;
  toUserId: string;
  groupId: string;
  location: LocationData;
  sharedAt: Date;
  expiresAt?: Date; // Optionnel : expiration du partage
  viewed: boolean;
}

// Types pour les erreurs de géolocalisation
export type LocationError = 
  | 'permission_denied'
  | 'location_unavailable'
  | 'timeout'
  | 'unknown_error'
  | 'network_error';

export interface LocationErrorInfo {
  type: LocationError;
  message: string;
  details?: string;
}

// Configuration pour les demandes de géolocalisation
export interface LocationOptions {
  accuracy?: 'low' | 'balanced' | 'high' | 'highest';
  timeout?: number; // en millisecondes
  maximumAge?: number; // en millisecondes
  enableHighAccuracy?: boolean;
}

// État du service de géolocalisation
export interface LocationServiceState {
  permissionStatus: LocationPermissionStatus;
  isLoading: boolean;
  error?: LocationErrorInfo;
  lastKnownLocation?: LocationData;
}

// Événements pour l'EventBus
export type LocationEventType = 
  | 'LOCATION_REQUEST_RECEIVED'
  | 'LOCATION_REQUEST_RESPONDED'
  | 'LOCATION_SHARED'
  | 'LOCATION_REQUEST_EXPIRED'
  | 'LOCATION_REQUEST_CANCELLED';

export interface LocationEvent {
  type: LocationEventType;
  data: LocationRequest | LocationResponse | LocationShare;
  timestamp: Date;
}