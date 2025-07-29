import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { initializeAuth, connectAuthEmulator, getReactNativePersistence } from 'firebase/auth';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

// Configuration Firebase - À remplacer avec vos propres clés
const firebaseConfig = {
  apiKey: "AIzaSyDqhPU5OxzG367ytrLRD_k5AmrS3eFi8Vs",
  authDomain: "festivaltra-23d23.firebaseapp.com",
  projectId: "festivaltra-23d23",
  storageBucket: "festivaltra-23d23.firebasestorage.app",
  messagingSenderId: "976034596147",
  appId: "1:976034596147:web:590aced7b0ba52e1a22a46"
};

// Initialiser Firebase
const app = initializeApp(firebaseConfig);

// Initialiser les services  
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});
export const db = getFirestore(app);
export const storage = getStorage(app);

// Pour le développement local (optionnel)
if (__DEV__) {
  // Décommenter pour utiliser les émulateurs Firebase en local
  // connectAuthEmulator(auth, 'http://localhost:9099');
  // connectFirestoreEmulator(db, 'localhost', 8080);
  // connectStorageEmulator(storage, 'localhost', 9199);
}

export default app;