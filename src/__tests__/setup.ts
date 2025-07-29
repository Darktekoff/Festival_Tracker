// Configuration globale pour tous les tests
import { vi } from 'vitest';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock AsyncStorage
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
    getAllKeys: vi.fn(),
    multiGet: vi.fn(),
    multiSet: vi.fn(),
    multiRemove: vi.fn(),
  },
}));

// Mock React Native APIs
vi.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
    select: vi.fn((options) => options.ios || options.default),
  },
  Dimensions: {
    get: vi.fn(() => ({ width: 375, height: 812 })),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  },
  Alert: {
    alert: vi.fn(),
  },
  DeviceEventEmitter: {
    addListener: vi.fn(),
    removeListener: vi.fn(),
  },
  NativeEventEmitter: vi.fn(() => ({
    addListener: vi.fn(),
    removeListener: vi.fn(),
  })),
  NativeModules: {
    RNFBApp: {},
    RNFBAuth: {},
    RNFBFirestore: {},
  },
  StatusBar: {
    setBarStyle: vi.fn(),
    setBackgroundColor: vi.fn(),
  },
}));

// Mock Expo APIs
vi.mock('expo-sensors', () => ({
  Pedometer: {
    isAvailableAsync: vi.fn(() => Promise.resolve(true)),
    requestPermissionsAsync: vi.fn(() => Promise.resolve({ status: 'granted' })),
    watchStepCount: vi.fn(() => ({ remove: vi.fn() })),
    getStepCountAsync: vi.fn(() => Promise.resolve({ steps: 1000 })),
  },
  Accelerometer: {
    isAvailableAsync: vi.fn(() => Promise.resolve(true)),
    addListener: vi.fn(() => ({ remove: vi.fn() })),
  },
}));

vi.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: vi.fn(() => Promise.resolve({ status: 'granted' })),
  requestBackgroundPermissionsAsync: vi.fn(() => Promise.resolve({ status: 'granted' })),
  getCurrentPositionAsync: vi.fn(() => Promise.resolve({
    coords: {
      latitude: 45.7640,
      longitude: 4.8357,
      altitude: 200,
      accuracy: 5,
    },
  })),
  watchPositionAsync: vi.fn(() => Promise.resolve({ remove: vi.fn() })),
}));

vi.mock('expo-notifications', () => ({
  getPermissionsAsync: vi.fn(() => Promise.resolve({ status: 'granted' })),
  requestPermissionsAsync: vi.fn(() => Promise.resolve({ status: 'granted' })),
  scheduleNotificationAsync: vi.fn(() => Promise.resolve('notification-id')),
  cancelScheduledNotificationAsync: vi.fn(() => Promise.resolve()),
  setNotificationHandler: vi.fn(),
}));

// Mock Firebase
vi.mock('../config/firebase', () => ({
  auth: {
    currentUser: {
      uid: 'test-user-id',
      email: 'test@example.com',
      displayName: 'Test User',
    },
    signInWithEmailAndPassword: vi.fn(),
    createUserWithEmailAndPassword: vi.fn(),
    signOut: vi.fn(),
    onAuthStateChanged: vi.fn(),
  },
  db: {
    collection: vi.fn(() => ({
      doc: vi.fn(() => ({
        get: vi.fn(),
        set: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        onSnapshot: vi.fn(),
      })),
      add: vi.fn(),
      get: vi.fn(),
      where: vi.fn(() => ({
        get: vi.fn(),
        onSnapshot: vi.fn(),
      })),
      orderBy: vi.fn(() => ({
        get: vi.fn(),
        limit: vi.fn(() => ({
          get: vi.fn(),
        })),
      })),
    })),
  },
}));

// Mock Date pour les tests temporels
export const mockDate = (date: string | Date) => {
  const mockDate = new Date(date);
  vi.setSystemTime(mockDate);
  return mockDate;
};

// Restore date après les tests
export const restoreDate = () => {
  vi.useRealTimers();
};

// Helper pour les tests async
export const waitFor = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Console warnings à ignorer pendant les tests
const originalWarn = console.warn;
beforeAll(() => {
  console.warn = (...args) => {
    if (args[0]?.includes('Warning: ReactDOM.render is no longer supported')) {
      return;
    }
    originalWarn(...args);
  };
});

afterAll(() => {
  console.warn = originalWarn;
});