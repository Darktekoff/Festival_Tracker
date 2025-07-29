import { auth, db } from '../config/firebase';
import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  fetchSignInMethodsForEmail,
  updateProfile,
  User as FirebaseUser,
  onAuthStateChanged,
  signOut as firebaseSignOut
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, serverTimestamp, collection, query, where, getDocs } from 'firebase/firestore';
import { User } from '../types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AVATARS, ALERT_THRESHOLDS } from '../utils/constants';

class AuthService {
  private currentUser: User | null = null;
  private authStateCallbacks: ((user: User | null) => void)[] = [];

  async initializeAuth(): Promise<User | null> {
    try {
      // Vérifier si un utilisateur existe déjà
      const currentFirebaseUser = auth.currentUser;
      if (currentFirebaseUser) {
        const userData = await this.getUserData(currentFirebaseUser.uid);
        if (userData) {
          this.currentUser = userData;
          return userData;
        }
      }

      // Si pas d'utilisateur, retourner null pour déclencher l'écran de création de profil
      return null;
    } catch (error) {
      console.error('Error initializing auth:', error);
      return null;
    }
  }

  async signIn(email: string, password: string): Promise<User | null> {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = result.user;
      
      // Récupérer les données utilisateur depuis Firestore
      const userData = await this.getUserData(firebaseUser.uid);
      if (userData) {
        this.currentUser = userData;
        await AsyncStorage.setItem('userId', firebaseUser.uid);
        return userData;
      }
      
      return null;
    } catch (error) {
      console.error('Error signing in:', error);
      throw error;
    }
  }

  async register(email: string, password: string): Promise<User | null> {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = result.user;
      
      // Créer un objet utilisateur minimal
      const newUser: User = {
        id: firebaseUser.uid,
        name: '',
        avatar: '',
        createdAt: new Date(),
        lastActive: new Date(),
        preferences: {
          theme: 'auto',
          notifications: true,
          alertThresholds: {
            moderate: ALERT_THRESHOLDS.MODERATE,
            high: ALERT_THRESHOLDS.HIGH,
            critical: ALERT_THRESHOLDS.CRITICAL
          }
        }
        // Pas de profile, ce qui forcera la redirection vers ProfileSetup
      };
      
      // Sauvegarder localement l'ID utilisateur
      await AsyncStorage.setItem('userId', firebaseUser.uid);
      
      // Notifier les callbacks pour mettre à jour l'état
      this.currentUser = newUser;
      this.authStateCallbacks.forEach(callback => callback(newUser));
      
      return newUser; // Retourner l'utilisateur pour mettre à jour le contexte
    } catch (error) {
      console.error('Error registering:', error);
      throw error;
    }
  }

  async resetPassword(email: string): Promise<void> {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      console.error('Error sending password reset email:', error);
      throw error;
    }
  }

  async checkEmailExists(email: string): Promise<boolean> {
    try {
      // Utiliser fetchSignInMethodsForEmail si disponible
      const methods = await fetchSignInMethodsForEmail(auth, email);
      return methods.length > 0;
    } catch (error: any) {
      // Si fetchSignInMethodsForEmail est désactivé (erreur auth/too-many-requests ou autre)
      // On ne peut pas vérifier en avance, on laissera Firebase gérer l'erreur à l'inscription
      console.log('Email enumeration protection is enabled, cannot check email availability');
      return false; // On assume que c'est disponible et on laissera Firebase gérer
    }
  }

  async createUserProfile(name: string, avatar: string, gender?: 'male' | 'female', weight?: number, age?: number, height?: number, activityLevel?: 'sedentary' | 'light' | 'moderate' | 'active'): Promise<User | null> {
    try {
      const firebaseUser = auth.currentUser;
      if (!firebaseUser) {
        throw new Error('Aucun utilisateur connecté');
      }

      const userId = auth.currentUser!.uid;

      const newUser: User = {
        id: userId,
        name,
        avatar,
        createdAt: new Date(),
        lastActive: new Date(),
        preferences: {
          theme: 'auto',
          notifications: true,
          alertThresholds: {
            moderate: ALERT_THRESHOLDS.MODERATE,
            high: ALERT_THRESHOLDS.HIGH,
            critical: ALERT_THRESHOLDS.CRITICAL
          }
        },
        profile: (gender || weight || age || height || activityLevel) ? {
          gender,
          weight,
          age,
          height,
          activityLevel
        } : undefined
      };

      // Sauvegarder dans Firestore
      await setDoc(doc(db, 'users', userId), {
        ...newUser,
        createdAt: serverTimestamp(),
        lastActive: serverTimestamp()
      });

      // Sauvegarder localement
      await AsyncStorage.setItem('userId', userId);
      
      this.currentUser = newUser;
      
      // Notifier les callbacks d'état d'authentification
      this.authStateCallbacks.forEach(callback => callback(newUser));
      
      return newUser;
    } catch (error) {
      console.error('Error creating user profile:', error);
      return null;
    }
  }

  async updateUserProfile(updates: Partial<User>): Promise<boolean> {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) return false;

      // Mettre à jour dans la collection users
      await updateDoc(doc(db, 'users', userId), {
        ...updates,
        lastActive: serverTimestamp()
      });

      // Mettre à jour le cache local
      if (this.currentUser) {
        this.currentUser = { ...this.currentUser, ...updates };
      }

      // Trouver et mettre à jour le membre dans tous les groupes
      const groupService = await import('./groupService');
      await groupService.default.updateMemberInAllGroups(userId, {
        name: updates.name,
        avatar: updates.avatar
      });

      return true;
    } catch (error) {
      console.error('Error updating user profile:', error);
      return false;
    }
  }

  async getUserData(userId: string): Promise<User | null> {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        const data = userDoc.data();
        
        const userData = {
          id: userId,
          name: data.name,
          avatar: data.avatar,
          email: data.email,
          createdAt: data.createdAt?.toDate() || new Date(),
          lastActive: data.lastActive?.toDate() || new Date(),
          profile: data.profile, // Ajout du champ profile manquant
          preferences: data.preferences || {
            theme: 'auto',
            notifications: true,
            alertThresholds: {
              moderate: ALERT_THRESHOLDS.MODERATE,
              high: ALERT_THRESHOLDS.HIGH,
              critical: ALERT_THRESHOLDS.CRITICAL
            }
          }
        };
        
        return userData;
      }
      return null;
    } catch (error) {
      console.error('Error getting user data:', error);
      return null;
    }
  }

  onAuthStateChange(callback: (user: User | null) => void): () => void {
    // Ajouter le callback à la liste
    this.authStateCallbacks.push(callback);
    
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userData = await this.getUserData(firebaseUser.uid);
        this.currentUser = userData;
        callback(userData);
      } else {
        this.currentUser = null;
        callback(null);
      }
    });

    return () => {
      // Supprimer le callback de la liste
      const index = this.authStateCallbacks.indexOf(callback);
      if (index > -1) {
        this.authStateCallbacks.splice(index, 1);
      }
      unsubscribe();
    };
  }

  async signOut(): Promise<void> {
    try {
      await firebaseSignOut(auth);
      await AsyncStorage.removeItem('userId');
      await AsyncStorage.removeItem('currentGroupId');
      this.currentUser = null;
    } catch (error) {
      console.error('Error signing out:', error);
    }
  }

  getCurrentUser(): User | null {
    return this.currentUser;
  }

  getCurrentUserId(): string | null {
    return auth.currentUser?.uid || null;
  }

  isAuthenticated(): boolean {
    return !!auth.currentUser;
  }

  async updateLastActive(): Promise<void> {
    try {
      const userId = auth.currentUser?.uid;
      if (userId) {
        await updateDoc(doc(db, 'users', userId), {
          lastActive: serverTimestamp()
        });
      }
    } catch (error) {
      console.error('Error updating last active:', error);
    }
  }
}

export default new AuthService();