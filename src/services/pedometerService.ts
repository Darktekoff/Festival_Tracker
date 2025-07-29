import { Pedometer } from 'expo-sensors';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STEPS_STORAGE_KEY = '@festival_steps';
const DAILY_STEPS_KEY = '@festival_daily_steps';

interface StepsData {
  walking: number;
  dancing: number;
  total: number;
  lastUpdate: Date;
}

interface DailySteps {
  date: string;
  steps: StepsData;
}

class PedometerService {
  private subscription: any = null;
  private currentSteps: StepsData = {
    walking: 0,
    dancing: 0,
    total: 0,
    lastUpdate: new Date()
  };
  private isDancing: boolean = false;
  private stepsCallbacks: ((steps: StepsData) => void)[] = [];
  private lastStepCount: number = 0;

  async checkAvailability(): Promise<boolean> {
    try {
      const isAvailable = await Pedometer.isAvailableAsync();
      return isAvailable;
    } catch (error) {
      console.error('Error checking pedometer availability:', error);
      return false;
    }
  }

  async requestPermissions(): Promise<boolean> {
    try {
      if (Platform.OS === 'android') {
        const { status } = await Pedometer.requestPermissionsAsync();
        return status === 'granted';
      }
      // iOS demande automatiquement les permissions
      return true;
    } catch (error) {
      console.error('Error requesting pedometer permissions:', error);
      return false;
    }
  }

  async startTracking(): Promise<void> {
    try {
      const isAvailable = await this.checkAvailability();
      if (!isAvailable) {
        throw new Error('Pedometer not available on this device');
      }

      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        throw new Error('Pedometer permissions not granted');
      }

      // Charger les pas sauvegardés
      await this.loadSavedSteps();

      // S'abonner aux mises à jour du podomètre
      this.subscription = Pedometer.watchStepCount(result => {
        this.handleStepUpdate(result.steps);
      });

    } catch (error) {
      console.error('Error starting pedometer tracking:', error);
      throw error;
    }
  }

  async stopTracking(): Promise<void> {
    try {
      if (this.subscription) {
        this.subscription.remove();
        this.subscription = null;
      }
      await this.saveSteps();
    } catch (error) {
      console.error('Error stopping pedometer tracking:', error);
    }
  }

  private handleStepUpdate(newStepCount: number): void {
    // Calculer les pas depuis la dernière mise à jour
    const stepsDiff = newStepCount - this.lastStepCount;
    
    if (stepsDiff > 0) {
      if (this.isDancing) {
        this.currentSteps.dancing += stepsDiff;
      } else {
        this.currentSteps.walking += stepsDiff;
      }
      this.currentSteps.total += stepsDiff;
      this.currentSteps.lastUpdate = new Date();

      this.lastStepCount = newStepCount;

      // Notifier les callbacks
      this.stepsCallbacks.forEach(callback => callback(this.currentSteps));

      // Sauvegarder périodiquement
      this.saveSteps();
    }
  }

  setDancingMode(isDancing: boolean): void {
    this.isDancing = isDancing;
  }

  getSteps(): StepsData {
    return { ...this.currentSteps };
  }

  async getStepsInTimeRange(start: Date, end: Date): Promise<number> {
    try {
      if (Platform.OS === 'ios') {
        const result = await Pedometer.getStepCountAsync(start, end);
        return result.steps;
      } else {
        // Android ne supporte pas l'historique, retourner les pas actuels
        return this.currentSteps.total;
      }
    } catch (error) {
      console.error('Error getting steps in time range:', error);
      return 0;
    }
  }

  onStepsUpdate(callback: (steps: StepsData) => void): () => void {
    this.stepsCallbacks.push(callback);
    return () => {
      const index = this.stepsCallbacks.indexOf(callback);
      if (index > -1) {
        this.stepsCallbacks.splice(index, 1);
      }
    };
  }

  private async loadSavedSteps(): Promise<void> {
    try {
      const savedData = await AsyncStorage.getItem(STEPS_STORAGE_KEY);
      if (savedData) {
        const parsed = JSON.parse(savedData);
        this.currentSteps = {
          ...parsed,
          lastUpdate: new Date(parsed.lastUpdate)
        };
      }

      // Vérifier si c'est un nouveau jour
      await this.checkNewDay();
    } catch (error) {
      console.error('Error loading saved steps:', error);
    }
  }

  private async saveSteps(): Promise<void> {
    try {
      await AsyncStorage.setItem(STEPS_STORAGE_KEY, JSON.stringify(this.currentSteps));
    } catch (error) {
      console.error('Error saving steps:', error);
    }
  }

  private async checkNewDay(): Promise<void> {
    try {
      const today = new Date().toDateString();
      const dailyData = await AsyncStorage.getItem(DAILY_STEPS_KEY);
      
      if (dailyData) {
        const parsed: DailySteps = JSON.parse(dailyData);
        
        if (parsed.date !== today) {
          // Nouveau jour, réinitialiser les compteurs
          this.currentSteps = {
            walking: 0,
            dancing: 0,
            total: 0,
            lastUpdate: new Date()
          };
          
          // Sauvegarder le nouveau jour
          const newDailyData: DailySteps = {
            date: today,
            steps: this.currentSteps
          };
          await AsyncStorage.setItem(DAILY_STEPS_KEY, JSON.stringify(newDailyData));
        }
      } else {
        // Première utilisation
        const newDailyData: DailySteps = {
          date: today,
          steps: this.currentSteps
        };
        await AsyncStorage.setItem(DAILY_STEPS_KEY, JSON.stringify(newDailyData));
      }
    } catch (error) {
      console.error('Error checking new day:', error);
    }
  }

  async resetSteps(): Promise<void> {
    this.currentSteps = {
      walking: 0,
      dancing: 0,
      total: 0,
      lastUpdate: new Date()
    };
    await this.saveSteps();
    
    // Notifier les callbacks
    this.stepsCallbacks.forEach(callback => callback(this.currentSteps));
  }

  calculateDistance(steps: number, strideLength: number = 0.75): number {
    // Distance en mètres (longueur de pas moyenne de 0.75m)
    return steps * strideLength;
  }

  calculateCalories(steps: number, weight: number = 70): number {
    // Estimation approximative : 0.04 calories par pas par kg
    return Math.round(steps * weight * 0.04);
  }
}

export default new PedometerService();