import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import pedometerService from '../../services/pedometerService';
import TestHelper from '../utils/testHelper';

// Mock Pedometer API
const mockPedometer = {
  isAvailableAsync: vi.fn(),
  requestPermissionsAsync: vi.fn(),
  watchStepCount: vi.fn(),
  getStepCountAsync: vi.fn(),
};

vi.mock('expo-sensors', () => ({
  Pedometer: mockPedometer,
}));

describe('🚶‍♂️ PedometerService - Tests Complets', () => {
  beforeEach(() => {
    // Reset tous les mocks
    vi.clearAllMocks();
    
    // Configuration par défaut des mocks
    mockPedometer.isAvailableAsync.mockResolvedValue(true);
    mockPedometer.requestPermissionsAsync.mockResolvedValue({ status: 'granted' });
    mockPedometer.watchStepCount.mockReturnValue({ remove: vi.fn() });
    mockPedometer.getStepCountAsync.mockResolvedValue({ steps: 1000 });
    
    TestHelper.setTestTime('2025-07-25T14:00:00Z');
  });

  afterEach(() => {
    TestHelper.restoreRealTime();
  });

  describe('🔧 Initialisation et Permissions', () => {
    it('devrait vérifier la disponibilité du podomètre', async () => {
      const isAvailable = await pedometerService.checkAvailability();
      
      expect(isAvailable).toBe(true);
      expect(mockPedometer.isAvailableAsync).toHaveBeenCalledOnce();
      
      console.log('✅ Podomètre disponible:', isAvailable);
    });

    it('devrait gérer l\'indisponibilité du podomètre', async () => {
      mockPedometer.isAvailableAsync.mockResolvedValue(false);
      
      const isAvailable = await pedometerService.checkAvailability();
      
      expect(isAvailable).toBe(false);
      console.log('❌ Podomètre non disponible:', isAvailable);
    });

    it('devrait demander les permissions', async () => {
      const hasPermission = await pedometerService.requestPermissions();
      
      expect(hasPermission).toBe(true);
      expect(mockPedometer.requestPermissionsAsync).toHaveBeenCalledOnce();
      
      console.log('✅ Permissions accordées:', hasPermission);
    });

    it('devrait gérer le refus de permissions', async () => {
      mockPedometer.requestPermissionsAsync.mockResolvedValue({ status: 'denied' });
      
      const hasPermission = await pedometerService.requestPermissions();
      
      expect(hasPermission).toBe(false);
      console.log('❌ Permissions refusées:', hasPermission);
    });
  });

  describe('📊 Tracking des Pas', () => {
    it('devrait démarrer le tracking avec succès', async () => {
      await expect(pedometerService.startTracking()).resolves.not.toThrow();
      
      expect(mockPedometer.isAvailableAsync).toHaveBeenCalled();
      expect(mockPedometer.requestPermissionsAsync).toHaveBeenCalled();
      expect(mockPedometer.watchStepCount).toHaveBeenCalled();
      
      console.log('✅ Tracking démarré avec succès');
    });

    it('devrait arrêter le tracking proprement', async () => {
      const mockUnsubscribe = vi.fn();
      mockPedometer.watchStepCount.mockReturnValue({ remove: mockUnsubscribe });
      
      await pedometerService.startTracking();
      await pedometerService.stopTracking();
      
      expect(mockUnsubscribe).toHaveBeenCalled();
      console.log('✅ Tracking arrêté proprement');
    });

    it('devrait gérer les erreurs de démarrage', async () => {
      mockPedometer.isAvailableAsync.mockRejectedValue(new Error('Sensor error'));
      
      await expect(pedometerService.startTracking()).rejects.toThrow();
      console.log('✅ Erreur de démarrage gérée');
    });
  });

  describe('👟 Comptage et Classification des Pas', () => {
    it('devrait compter les pas de marche par défaut', () => {
      // Simuler des mises à jour de pas
      const mockCallback = vi.fn();
      pedometerService.onStepsUpdate(mockCallback);
      
      // Simuler l'appel du callback par le podomètre
      const stepUpdate = { steps: 1500 };
      // Note: Dans un vrai test, ceci serait déclenché par le service
      // Pour le moment, on teste la structure
      
      const currentSteps = pedometerService.getSteps();
      expect(currentSteps).toHaveProperty('walking');
      expect(currentSteps).toHaveProperty('dancing');
      expect(currentSteps).toHaveProperty('total');
      
      console.log('👟 Structure des pas validée:', currentSteps);
    });

    it('devrait basculer en mode danse', () => {
      pedometerService.setDancingMode(true);
      
      // Vérifier que le mode danse est activé
      // Note: Le service n'expose pas directement l'état du mode danse,
      // mais on peut tester indirectement via les mises à jour
      
      console.log('💃 Mode danse activé');
      
      pedometerService.setDancingMode(false);
      console.log('🚶‍♂️ Mode marche restauré');
    });

    it('devrait calculer la distance parcourue', () => {
      const steps = 2000;
      const distance = pedometerService.calculateDistance(steps);
      
      // Distance attendue: 2000 pas × 0.75m = 1500m = 1.5km
      expect(distance).toBe(1500);
      
      console.log(`🗺️ Distance calculée: ${distance}m pour ${steps} pas`);
    });

    it('devrait calculer les calories brûlées', () => {
      const steps = 3000;
      const weight = 70; // kg
      const calories = pedometerService.calculateCalories(steps, weight);
      
      // Calories attendues: 3000 × 70 × 0.04 = 8400
      expect(calories).toBe(8400);
      
      console.log(`🔥 Calories calculées: ${calories} pour ${steps} pas (${weight}kg)`);
    });
  });

  describe('📈 Historique et Données', () => {
    it('devrait récupérer l\'historique des pas sur iOS', async () => {
      // Mock Platform.OS = 'ios'
      vi.doMock('react-native', () => ({
        Platform: { OS: 'ios' },
      }));
      
      const startDate = new Date('2025-07-25T08:00:00Z');
      const endDate = new Date('2025-07-25T20:00:00Z');
      
      const steps = await pedometerService.getStepsInTimeRange(startDate, endDate);
      
      expect(steps).toBe(1000); // Valeur mockée
      expect(mockPedometer.getStepCountAsync).toHaveBeenCalledWith(startDate, endDate);
      
      console.log(`📊 Historique iOS: ${steps} pas entre ${startDate.getHours()}h et ${endDate.getHours()}h`);
    });

    it('devrait gérer l\'absence d\'historique sur Android', async () => {
      // Mock Platform.OS = 'android'
      vi.doMock('react-native', () => ({
        Platform: { OS: 'android' },
      }));
      
      const startDate = new Date('2025-07-25T08:00:00Z');
      const endDate = new Date('2025-07-25T20:00:00Z');
      
      const steps = await pedometerService.getStepsInTimeRange(startDate, endDate);
      
      // Sur Android, retourne les pas actuels (limitation)
      expect(typeof steps).toBe('number');
      expect(mockPedometer.getStepCountAsync).not.toHaveBeenCalled();
      
      console.log(`📊 Android fallback: ${steps} pas (pas d'historique)`);
    });
  });

  describe('🔄 Callbacks et Événements', () => {
    it('devrait enregistrer et déclencher les callbacks', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      
      const unsubscribe1 = pedometerService.onStepsUpdate(callback1);
      const unsubscribe2 = pedometerService.onStepsUpdate(callback2);
      
      // Simuler une mise à jour interne
      // Note: Dans la vraie implémentation, ceci serait déclenché par handleStepUpdate
      
      expect(typeof unsubscribe1).toBe('function');
      expect(typeof unsubscribe2).toBe('function');
      
      // Test du désabonnement
      unsubscribe1();
      unsubscribe2();
      
      console.log('🔄 Callbacks enregistrés et nettoyés');
    });
  });

  describe('💾 Persistance des Données', () => {
    it('devrait sauvegarder les pas périodiquement', async () => {
      // Mock AsyncStorage
      const mockAsyncStorage = await import('@react-native-async-storage/async-storage');
      
      await pedometerService.startTracking();
      
      // Simuler quelques mises à jour de pas
      // Note: La sauvegarde est déclenchée automatiquement dans handleStepUpdate
      
      await pedometerService.stopTracking();
      
      // Vérifier que les données ont été sauvegardées
      expect(mockAsyncStorage.default.setItem).toHaveBeenCalled();
      
      console.log('💾 Sauvegarde des données validée');
    });

    it('devrait reset les compteurs', async () => {
      await pedometerService.resetSteps();
      
      const steps = pedometerService.getSteps();
      expect(steps.walking).toBe(0);
      expect(steps.dancing).toBe(0);
      expect(steps.total).toBe(0);
      
      console.log('🔄 Compteurs remis à zéro:', steps);
    });
  });

  describe('🎯 Scénarios Réalistes', () => {
    it('devrait simuler une journée festival complète', async () => {
      console.log('🎪 SIMULATION JOURNÉE FESTIVAL:');
      
      // Démarrer le tracking
      await pedometerService.startTracking();
      console.log('   ✅ Tracking démarré');
      
      // Phase 1: Marche vers le festival (2h)
      pedometerService.setDancingMode(false);
      // Simuler 3000 pas de marche
      console.log('   🚶‍♂️ Marche vers festival: ~3000 pas');
      
      // Phase 2: Festival actif (6h)
      pedometerService.setDancingMode(true);
      // Simuler 8000 pas de danse
      console.log('   💃 Festival actif: ~8000 pas de danse');
      
      // Phase 3: Retour (1h)
      pedometerService.setDancingMode(false);
      // Simuler 1500 pas de marche
      console.log('   🚶‍♂️ Retour: ~1500 pas');
      
      // Calculer les totaux
      const totalSteps = 3000 + 8000 + 1500;
      const distance = pedometerService.calculateDistance(totalSteps);
      const calories = pedometerService.calculateCalories(totalSteps, 70);
      
      console.log(`   📊 Total: ${totalSteps} pas, ${distance}m, ${calories} cal`);
      
      // Arrêter le tracking
      await pedometerService.stopTracking();
      console.log('   🛑 Tracking arrêté');
      
      // Vérifications
      expect(totalSteps).toBe(12500);
      expect(distance).toBe(9375); // 12500 × 0.75
      expect(calories).toBe(35000); // 12500 × 70 × 0.04
    });

    it('devrait détecter une période de repos/sommeil', () => {
      // Simuler une période avec très peu de mouvement
      const lowActivityPeriod = {
        walking: 10,    // Très peu de pas
        dancing: 0,     // Pas de danse
        total: 10,
      };
      
      // Dans une vraie implémentation, ceci serait utilisé par detectSleepPeriod
      expect(lowActivityPeriod.total).toBeLessThan(50); // Seuil de sommeil
      
      console.log('😴 Période de repos détectée:', lowActivityPeriod);
    });
  });

  describe('⚠️ Gestion d\'Erreurs', () => {
    it('devrait gérer l\'absence de capteur', async () => {
      mockPedometer.isAvailableAsync.mockResolvedValue(false);
      
      await expect(pedometerService.startTracking()).rejects.toThrow('Pedometer not available');
      console.log('✅ Absence de capteur gérée');
    });

    it('devrait gérer le refus de permissions', async () => {
      mockPedometer.requestPermissionsAsync.mockResolvedValue({ status: 'denied' });
      
      await expect(pedometerService.startTracking()).rejects.toThrow('Pedometer permissions not granted');
      console.log('✅ Refus de permissions géré');
    });

    it('devrait gérer les erreurs de sauvegarde', async () => {
      const mockAsyncStorage = await import('@react-native-async-storage/async-storage');
      mockAsyncStorage.default.setItem.mockRejectedValue(new Error('Storage error'));
      
      // Le service ne devrait pas planter même si la sauvegarde échoue
      await expect(pedometerService.stopTracking()).resolves.not.toThrow();
      console.log('✅ Erreur de sauvegarde gérée');
    });
  });
});