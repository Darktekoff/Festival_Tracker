import { describe, it, expect } from 'vitest';
import { analyzeConsumptionSpeed, estimateBloodAlcoholContent } from '../utils/calculations';
import { DrinkRecord } from '../types';

describe('Analyse de la vitesse de consommation', () => {
  // Helper pour créer des boissons avec timestamps
  const createDrink = (minutesAgo: number, units: number = 2.0): DrinkRecord => ({
    id: `drink-${minutesAgo}`,
    groupId: 'test',
    userId: 'user',
    userName: 'Test User',
    userAvatar: '',
    category: 'beer',
    drinkType: 'Bière',
    volume: 50,
    alcoholDegree: 5,
    alcoholContent: 5,
    alcoholUnits: units,
    timestamp: new Date(Date.now() - minutesAgo * 60 * 1000),
    createdAt: new Date(),
    syncStatus: 'synced',
    lastModified: new Date(),
  });

  describe('🐌 Consommation lente (>60min entre verres)', () => {
    it('devrait détecter un pattern lent et réduire l\'alcoolémie', () => {
      const drinks = [
        createDrink(120), // Il y a 2h
        createDrink(60),  // Il y a 1h  
        createDrink(0),   // Maintenant
      ];
      
      const analysis = analyzeConsumptionSpeed(drinks);
      
      expect(analysis.pattern).toBe('slow');
      expect(analysis.averageTimeBetweenDrinks).toBe(60);
      expect(analysis.speedFactor).toBe(0.85); // -15%
      
      console.log(`🐌 Pattern lent: ${analysis.averageTimeBetweenDrinks}min, facteur: ${analysis.speedFactor}`);
    });
  });

  describe('⚖️ Consommation modérée (30-60min)', () => {
    it('devrait détecter un pattern modéré avec facteur neutre', () => {
      const drinks = [
        createDrink(90),  // Il y a 1h30
        createDrink(45),  // Il y a 45min
        createDrink(0),   // Maintenant
      ];
      
      const analysis = analyzeConsumptionSpeed(drinks);
      
      expect(analysis.pattern).toBe('moderate');
      expect(analysis.averageTimeBetweenDrinks).toBe(45);
      expect(analysis.speedFactor).toBe(1.0); // Neutre
      
      console.log(`⚖️ Pattern modéré: ${analysis.averageTimeBetweenDrinks}min, facteur: ${analysis.speedFactor}`);
    });
  });

  describe('⚡ Consommation rapide (15-30min)', () => {
    it('devrait détecter un pattern rapide et augmenter l\'alcoolémie', () => {
      const drinks = [
        createDrink(50),  // Il y a 50min
        createDrink(25),  // Il y a 25min
        createDrink(0),   // Maintenant
      ];
      
      const analysis = analyzeConsumptionSpeed(drinks);
      
      expect(analysis.pattern).toBe('fast');
      expect(analysis.averageTimeBetweenDrinks).toBe(25);
      expect(analysis.speedFactor).toBe(1.2); // +20%
      
      console.log(`⚡ Pattern rapide: ${analysis.averageTimeBetweenDrinks}min, facteur: ${analysis.speedFactor}`);
    });
  });

  describe('🚨 Binge drinking (<15min)', () => {
    it('devrait détecter le binge drinking et fortement augmenter l\'alcoolémie', () => {
      const drinks = [
        createDrink(25),  // Il y a 25min
        createDrink(15),  // Il y a 15min
        createDrink(5),   // Il y a 5min
        createDrink(0),   // Maintenant
      ];
      
      const analysis = analyzeConsumptionSpeed(drinks);
      
      expect(analysis.pattern).toBe('binge');
      expect(analysis.averageTimeBetweenDrinks).toBeCloseTo(8.33, 0); // (10+10+5)/3
      expect(analysis.speedFactor).toBe(1.4); // +40%
      
      console.log(`🚨 Binge drinking: ${analysis.averageTimeBetweenDrinks}min, facteur: ${analysis.speedFactor}`);
    });
  });

  describe('📊 Impact sur l\'alcoolémie', () => {
    it('devrait calculer des alcoolémies différentes selon la vitesse', () => {
      const baseUnits = 4.0; // 4 unités d'alcool
      const weight = 70;
      const isMale = true;

      // Scénarios de vitesse
      const scenarios = [
        { name: 'Lent', speedFactor: 0.85 },
        { name: 'Modéré', speedFactor: 1.0 },
        { name: 'Rapide', speedFactor: 1.2 },
        { name: 'Binge', speedFactor: 1.4 },
      ];

      console.log('📊 IMPACT DE LA VITESSE SUR L\'ALCOOLÉMIE (4 unités, 70kg, homme):');
      
      scenarios.forEach(scenario => {
        const result = estimateBloodAlcoholContent(baseUnits, weight, isMale, scenario.speedFactor);
        console.log(`   ${scenario.name}: ${result.bloodAlcohol} g/L (${result.breathAlcohol} mg/L air)`);
        
        // Vérifications de cohérence
        expect(result.bloodAlcohol).toBeGreaterThan(0);
        expect(result.bloodAlcohol).toBeLessThan(2.0); // Seuil de sécurité
        expect(result.breathAlcohol).toBeCloseTo(result.bloodAlcohol * 0.5, 1);
      });

      // Vérifier que la vitesse a un impact significatif
      const slow = estimateBloodAlcoholContent(baseUnits, weight, isMale, 0.85);
      const binge = estimateBloodAlcoholContent(baseUnits, weight, isMale, 1.4);
      const difference = ((binge.bloodAlcohol - slow.bloodAlcohol) / slow.bloodAlcohol) * 100;
      
      console.log(`   📈 Différence lent vs binge: +${difference.toFixed(0)}%`);
      expect(difference).toBeGreaterThan(50); // Au moins 50% de différence
    });
  });

  describe('🎯 Cas réels d\'usage', () => {
    it('devrait analyser une soirée typique de festival', () => {
      // Scénario: Arrivée 18h, 4 bières jusqu'à 22h
      const drinks = [
        createDrink(240), // 18h00 - première bière
        createDrink(180), // 19h00 - deuxième bière (60min après)
        createDrink(90),  // 20h30 - troisième bière (90min après)
        createDrink(30),  // 21h30 - quatrième bière (60min après)
      ];
      
      const analysis = analyzeConsumptionSpeed(drinks);
      
      console.log('🎯 ANALYSE SOIRÉE FESTIVAL:');
      console.log(`   Rythme: ${analysis.pattern} (${analysis.averageTimeBetweenDrinks}min entre verres)`);
      console.log(`   Impact alcoolémie: ${analysis.speedFactor > 1 ? '+' : ''}${((analysis.speedFactor - 1) * 100).toFixed(0)}%`);
      
      expect(analysis.pattern).toBe('slow'); // 70min en moyenne = lent
      expect(analysis.speedFactor).toBe(0.85);
    });

    it('devrait analyser un pré-gaming intensif', () => {
      // Scénario: 3 shots en 20min avant de sortir
      const drinks = [
        createDrink(20, 1.3), // Shot 1
        createDrink(12, 1.3), // Shot 2 (8min après)
        createDrink(5, 1.3),  // Shot 3 (7min après)
      ];
      
      const analysis = analyzeConsumptionSpeed(drinks);
      
      console.log('🎯 ANALYSE PRÉ-GAMING:');
      console.log(`   Rythme: ${analysis.pattern} (${analysis.averageTimeBetweenDrinks}min entre shots)`);
      console.log(`   Impact alcoolémie: +${((analysis.speedFactor - 1) * 100).toFixed(0)}%`);
      
      expect(analysis.pattern).toBe('binge');
      expect(analysis.speedFactor).toBe(1.4); // +40% d'alcoolémie !
    });
  });
});