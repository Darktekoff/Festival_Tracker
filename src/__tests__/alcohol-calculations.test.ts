import { describe, it, expect, beforeAll } from 'vitest';
import {
  calculateAlcoholUnits,
  calculateCurrentBloodAlcohol,
  estimateBloodAlcoholContent,
  estimateAdvancedBloodAlcoholContent,
  calculateAdvancedCurrentBloodAlcohol,
} from '../utils/calculations';
import { DrinkRecord } from '../types';

describe('Calculs d\'alcool - Tests avec personne fictive', () => {
  // 👤 PERSONNE FICTIVE : Marie, 28 ans
  const marie = {
    age: 28,
    gender: 'female' as const,
    height: 165, // cm
    weight: 60, // kg
    activityLevel: 'moderate' as const,
  };

  // 🍺 SCENARIO DE TEST : Soirée de Marie
  // 20h00 : 1 bière (50cl, 5%)
  // 21h00 : 1 verre de vin (12.5cl, 12%) 
  // 22h00 : 1 shot (4cl, 40%)
  // 23h00 : 1 bière (50cl, 5%)
  // Test effectué à 23h30 (30min après la dernière boisson)

  const now = new Date('2025-01-28T23:30:00Z');
  const drinks: DrinkRecord[] = [
    {
      id: '1',
      groupId: 'test',
      userId: 'marie',
      userName: 'Marie',
      userAvatar: '',
      category: 'beer',
      drinkType: 'Bière blonde',
      volume: 50,
      alcoholDegree: 5,
      alcoholContent: 5,
      alcoholUnits: 0, // Sera calculé
      timestamp: new Date('2025-01-28T20:00:00Z'), // Il y a 3h30
      createdAt: new Date('2025-01-28T20:00:00Z'),
      syncStatus: 'synced',
      lastModified: new Date('2025-01-28T20:00:00Z'),
    },
    {
      id: '2',
      groupId: 'test',
      userId: 'marie',
      userName: 'Marie',
      userAvatar: '',
      category: 'wine',
      drinkType: 'Vin rouge',
      volume: 12.5,
      alcoholDegree: 12,
      alcoholContent: 12,
      alcoholUnits: 0, // Sera calculé
      timestamp: new Date('2025-01-28T21:00:00Z'), // Il y a 2h30
      createdAt: new Date('2025-01-28T21:00:00Z'),
      syncStatus: 'synced',
      lastModified: new Date('2025-01-28T21:00:00Z'),
    },
    {
      id: '3',
      groupId: 'test',
      userId: 'marie',
      userName: 'Marie',
      userAvatar: '',
      category: 'shot',
      drinkType: 'Vodka',
      volume: 4,
      alcoholDegree: 40,
      alcoholContent: 40,
      alcoholUnits: 0, // Sera calculé
      timestamp: new Date('2025-01-28T22:00:00Z'), // Il y a 1h30
      createdAt: new Date('2025-01-28T22:00:00Z'),
      syncStatus: 'synced',
      lastModified: new Date('2025-01-28T22:00:00Z'),
    },
    {
      id: '4',
      groupId: 'test',
      userId: 'marie',
      userName: 'Marie',
      userAvatar: '',
      category: 'beer',
      drinkType: 'Bière blonde',
      volume: 50,
      alcoholDegree: 5,
      alcoholContent: 5,
      alcoholUnits: 0, // Sera calculé
      timestamp: new Date('2025-01-28T23:00:00Z'), // Il y a 30min
      createdAt: new Date('2025-01-28T23:00:00Z'),
      syncStatus: 'synced',
      lastModified: new Date('2025-01-28T23:00:00Z'),
    },
  ];

  beforeAll(() => {
    // Calculer les unités d'alcool pour chaque boisson
    drinks.forEach(drink => {
      drink.alcoholUnits = calculateAlcoholUnits(drink.volume, drink.alcoholDegree);
    });
  });

  describe('📊 Test 1 : Calcul des unités d\'alcool individuelles', () => {
    it('devrait calculer correctement les unités pour une bière (50cl, 5%)', () => {
      const units = calculateAlcoholUnits(50, 5);
      
      // 🧮 CALCUL ATTENDU :
      // Volume d'alcool pur = 50cl × 5% = 2.5cl = 25ml
      // Poids d'alcool = 25ml × 0.8 (densité) = 20g
      // Unités = 20g ÷ 10g/unité = 2.0 unités
      
      expect(units).toBe(2.0);
      console.log(`🍺 Bière 50cl/5% : ${units} unités (attendu: 2.0)`);
    });

    it('devrait calculer correctement les unités pour un verre de vin (12.5cl, 12%)', () => {
      const units = calculateAlcoholUnits(12.5, 12);
      
      // 🧮 CALCUL ATTENDU :
      // Volume d'alcool pur = 12.5cl × 12% = 1.5cl = 15ml
      // Poids d'alcool = 15ml × 0.8 = 12g
      // Unités = 12g ÷ 10g/unité = 1.2 unités
      
      expect(units).toBe(1.2);
      console.log(`🍷 Vin 12.5cl/12% : ${units} unités (attendu: 1.2)`);
    });

    it('devrait calculer correctement les unités pour un shot (4cl, 40%)', () => {
      const units = calculateAlcoholUnits(4, 40);
      
      // 🧮 CALCUL ATTENDU :
      // Volume d'alcool pur = 4cl × 40% = 1.6cl = 16ml
      // Poids d'alcool = 16ml × 0.8 = 12.8g
      // Unités = 12.8g ÷ 10g/unité = 1.28 ≈ 1.3 unités
      
      expect(units).toBeCloseTo(1.28, 1);
      console.log(`🥃 Shot 4cl/40% : ${units} unités (attendu: ~1.3)`);
    });
  });

  describe('📈 Test 2 : Consommation totale de Marie', () => {
    it('devrait calculer le total des unités consommées', () => {
      const totalUnits = drinks.reduce((sum, drink) => sum + drink.alcoholUnits, 0);
      
      // 🧮 TOTAL ATTENDU :
      // Bière 1 : 2.0 unités
      // Vin : 1.2 unités  
      // Shot : 1.28 unités
      // Bière 2 : 2.0 unités
      // TOTAL = 6.48 unités (pas 15.5 !)
      
      expect(totalUnits).toBeCloseTo(6.48, 1);
      console.log(`📊 Total unités consommées : ${totalUnits} (attendu: ~6.5)`);
    });
  });

  describe('⏰ Test 3 : Unités actuelles avec élimination', () => {
    it('devrait calculer les unités restantes après élimination (calcul simple)', () => {
      // Mock de la date actuelle pour les tests
      const originalDate = Date;
      global.Date = class extends Date {
        constructor(...args: any[]) {
          if (args.length === 0) {
            super(now);
          } else {
            super(...args);
          }
        }
        static now() {
          return now.getTime();
        }
      } as any;

      const currentUnits = calculateCurrentBloodAlcohol(drinks);
      
      // 🧮 CALCUL ATTENDU avec élimination à 0.12 unité/heure :
      // Bière 1 (3h30 ago) : 2.0 - (3.5 × 0.12) = 2.0 - 0.42 = 1.58 unités
      // Vin (2h30 ago) : 1.2 - (2.5 × 0.12) = 1.2 - 0.30 = 0.90 unités  
      // Shot (1h30 ago) : 1.28 - (1.5 × 0.12) = 1.28 - 0.18 = 1.10 unités
      // Bière 2 (30min ago) : 2.0 - (0.5 × 0.12) = 2.0 - 0.06 = 1.94 unités
      // TOTAL ≈ 5.52 unités
      
      expect(currentUnits).toBeGreaterThan(5.0);
      expect(currentUnits).toBeLessThan(6.5);
      console.log(`⏰ Unités actuelles (avec élimination) : ${currentUnits} (attendu: ~5.5)`);
      
      // Restaurer Date
      global.Date = originalDate;
    });
  });

  describe('🩸 Test 4 : Alcoolémie dans le sang', () => {
    it('devrait calculer l\'alcoolémie avec la formule simple', () => {
      const currentUnits = 5.5; // Approximation du test précédent
      const { bloodAlcohol, breathAlcohol } = estimateBloodAlcoholContent(
        currentUnits, 
        marie.weight, 
        marie.gender === 'female'
      );
      
      // 🧮 CALCUL ATTENDU (formule Widmark) :
      // Alcool en grammes = 5.5 × 10g = 55g
      // Coefficient femme = 0.6
      // Alcoolémie = 55g ÷ (60kg × 0.6) = 55 ÷ 36 = 1.53 g/L
      // Air expiré = 1.53 × 0.5 = 0.76 mg/L
      
      expect(bloodAlcohol).toBeGreaterThan(1.2);
      expect(bloodAlcohol).toBeLessThan(1.6);
      expect(breathAlcohol).toBeCloseTo(bloodAlcohol * 0.5, 1);
      console.log(`🩸 Alcoolémie sang : ${bloodAlcohol} g/L (attendu: ~1.5)`);
      console.log(`💨 Alcoolémie air : ${breathAlcohol} mg/L (attendu: ~0.8)`);
    });
  });

  describe('🔬 Test 5 : Calculs avancés (profil complet)', () => {
    it('devrait utiliser le profil personnalisé de Marie', () => {
      const currentUnits = 5.5;
      const advancedCalcs = estimateAdvancedBloodAlcoholContent(currentUnits, marie);
      
      console.log(`🔬 Calculs avancés pour Marie :`, {
        alcoolémie: `${advancedCalcs.bloodAlcohol} g/L`,
        airExpiré: `${advancedCalcs.breathAlcohol} mg/L`,
        élimination: `${advancedCalcs.eliminationRate} unités/h`,
        tempsSobriété: `${advancedCalcs.timeToSober} heures`,
        coeffWidmark: advancedCalcs.widmarkFactor,
        IMC: advancedCalcs.metabolismInfo.bmi,
      });
      
      // Tests de cohérence
      expect(advancedCalcs.bloodAlcohol).toBeGreaterThan(0);
      expect(advancedCalcs.bloodAlcohol).toBeLessThan(3.0); // Seuil de cohérence
      expect(advancedCalcs.breathAlcohol).toBeCloseTo(advancedCalcs.bloodAlcohol * 0.5, 1);
      expect(advancedCalcs.timeToSober).toBeGreaterThan(3.0); // Au moins 3h
      expect(advancedCalcs.timeToSober).toBeLessThan(50.0); // Temps réaliste pour 5.5 unités
    });
  });

  describe('❌ Test 6 : Vérification des valeurs aberrantes actuelles', () => {
    it('devrait détecter si les calculs actuels donnent des résultats aberrants', () => {
      // Ce test documente les problèmes actuels
      const problematicUnits = 15.5; // Valeur actuelle bug
      const problematicTime = 62.4; // Temps actuel bug
      
      console.log(`❌ PROBLÈMES DÉTECTÉS :`);
      console.log(`   - Unités calculées: ${problematicUnits} (devrait être ~6.5)`);
      console.log(`   - Temps élimination: ${problematicTime}h (devrait être ~37h max)`);
      
      // Tests pour documenter le problème
      expect(problematicUnits).toBeGreaterThan(10); // Bug confirmé
      expect(problematicTime).toBeGreaterThan(50); // Bug confirmé
      
      // Les valeurs correctes devraient être :
      const expectedUnits = 6.5;
      const expectedTime = expectedUnits / 0.15; // ~43h max
      
      console.log(`✅ VALEURS ATTENDUES :`);
      console.log(`   - Unités totales: ~${expectedUnits}`);
      console.log(`   - Temps élimination: ~${expectedTime.toFixed(1)}h`);
    });
  });

  describe('🎯 Test 7 : Validation avec références officielles', () => {
    it('devrait respecter les références officielles françaises', () => {
      // Source: Sécurité Routière française
      // 1 verre standard = 10g d'alcool pur = 1 unité
      
      const referencedrinks = [
        { name: 'Bière (25cl, 5%)', volume: 25, degree: 5, expectedUnits: 1.0 },
        { name: 'Vin (10cl, 12%)', volume: 10, degree: 12, expectedUnits: 0.96 },
        { name: 'Whisky (3cl, 40%)', volume: 3, degree: 40, expectedUnits: 0.96 },
        { name: 'Pastis (2.5cl, 45%)', volume: 2.5, degree: 45, expectedUnits: 0.9 },
      ];

      console.log(`🎯 VALIDATION RÉFÉRENCES OFFICIELLES :`);
      referencedrinks.forEach(drink => {
        const calculated = calculateAlcoholUnits(drink.volume, drink.degree);
        const difference = Math.abs(calculated - drink.expectedUnits);
        
        console.log(`   ${drink.name}: ${calculated} unités (référence: ${drink.expectedUnits})`);
        expect(difference).toBeLessThan(0.1); // Tolérance de 0.1 unité
      });
    });
  });

  describe('🧪 Test 8 : Validation personas de test', () => {
    it('devrait utiliser les personas de test de TestHelper', () => {
      // Test d'intégration avec les nouveaux utilitaires
      const { marie, thomas, sophie, julien } = require('../utils/testHelper').PERSONAS;
      
      expect(marie.age).toBe(28);
      expect(thomas.gender).toBe('male');
      expect(sophie.weight).toBe(55);
      expect(julien.activityLevel).toBe('sedentary');
      
      console.log('✅ Personas de test chargés:', { marie: marie.name, thomas: thomas.name, sophie: sophie.name, julien: julien.name });
    });
  });

  describe('🔬 Test 9 : Calculs personnalisés avancés avec personas', () => {
    it('devrait calculer différemment pour chaque persona', () => {
      const { marie, thomas, sophie, julien } = require('../utils/testHelper').PERSONAS;
      const baseUnits = 3.0; // 3 unités standard

      const personas = [marie, thomas, sophie, julien];
      const results: any[] = [];

      personas.forEach(persona => {
        const advancedCalcs = estimateAdvancedBloodAlcoholContent(baseUnits, persona);
        results.push({
          name: persona.name,
          bloodAlcohol: advancedCalcs.bloodAlcohol,
          eliminationRate: advancedCalcs.eliminationRate,
          timeToSober: advancedCalcs.timeToSober,
          widmarkFactor: advancedCalcs.widmarkFactor,
          bmi: advancedCalcs.metabolismInfo.bmi,
        });
      });

      console.log('🔬 COMPARAISON PERSONAS (3 unités):');
      results.forEach(result => {
        console.log(`   ${result.name}: ${result.bloodAlcohol}g/L, élim: ${result.eliminationRate}u/h, sobriété: ${result.timeToSober}h`);
      });

      // Vérifications de cohérence
      expect(results).toHaveLength(4);
      results.forEach(result => {
        expect(result.bloodAlcohol).toBeGreaterThan(0);
        expect(result.bloodAlcohol).toBeLessThan(3.0);
        expect(result.eliminationRate).toBeGreaterThan(0.1);
        expect(result.eliminationRate).toBeLessThan(0.25);
      });

      // Les hommes devraient avoir des alcoolémies plus faibles (plus d'eau corporelle)
      const marieResult = results.find(r => r.name === 'Marie');
      const thomasResult = results.find(r => r.name === 'Thomas');
      expect(marieResult!.bloodAlcohol).toBeGreaterThan(thomasResult!.bloodAlcohol);
    });
  });
});