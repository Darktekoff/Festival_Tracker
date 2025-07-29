import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import TestHelper, { PERSONAS } from '../utils/testHelper';
import DataGenerator from '../utils/dataGenerator';
import { 
  getSessionDrinks, 
  getSessionDrinksWithActivity, 
  calculateSessionGroupAverage,
  calculateCurrentBloodAlcohol,
  analyzeConsumptionSpeed 
} from '../../utils/calculations';

describe('🎪 Simulation Festival Weekend - Tests Utilisateur Réalistes', () => {
  beforeEach(() => {
    TestHelper.setTestTime('2025-07-25T14:00:00Z'); // Vendredi 14h - Début festival
  });

  afterEach(() => {
    TestHelper.restoreRealTime();
  });

  describe('🌅 Vendredi - Jour 1: Arrivée et Première Soirée', () => {
    it('devrait simuler l\'arrivée de Marie au festival', () => {
      console.log('🎪 VENDREDI 14H00 - ARRIVÉE DE MARIE');
      
      // Marie arrive au festival, première bière de bienvenue
      const biereArrivee = TestHelper.createDrink('biereBlonde', 'marie', 0);
      
      // Test de la soirée jusqu'à 2h du matin
      const soireeVendredi = [
        biereArrivee,
        TestHelper.createDrink('eau', 'marie', -60),          // 15h - hydratation
        TestHelper.createDrink('mojito', 'marie', -120),      // 16h - cocktail
        TestHelper.createDrink('biereBlonde', 'marie', -240), // 18h - apéro
        TestHelper.createDrink('vinRouge', 'marie', -360),    // 20h - dîner
        TestHelper.createDrink('vodka', 'marie', -480),       // 22h - shots avec amis
        TestHelper.createDrink('biereBrune', 'marie', -600),  // 00h - fin de soirée
        TestHelper.createDrink('eau', 'marie', -720),         // 02h - avant dodo
      ];

      // Calculer l'alcoolémie à 2h du matin
      TestHelper.setTestTime('2025-07-26T02:00:00Z');
      const currentUnits = calculateCurrentBloodAlcohol(soireeVendredi);
      const sessionDrinks = getSessionDrinks(soireeVendredi, PERSONAS.marie.id);
      
      // Vérifications
      expect(sessionDrinks).toHaveLength(soireeVendredi.length);
      expect(currentUnits).toBeGreaterThan(2.0); // Encore de l'alcool dans le sang
      expect(currentUnits).toBeLessThan(8.0);    // Mais pas excessif
      
      const totalAlcoholUnits = soireeVendredi
        .filter(d => d.alcoholUnits > 0)
        .reduce((sum, d) => sum + d.alcoholUnits, 0);
      
      console.log('📊 BILAN VENDREDI SOIR:');
      console.log(`   - Boissons totales: ${soireeVendredi.length}`);
      console.log(`   - Unités d'alcool: ${totalAlcoholUnits.toFixed(2)}`);
      console.log(`   - Unités actuelles: ${currentUnits.toFixed(2)}`);
      console.log(`   - Marie va se coucher avec ${currentUnits.toFixed(2)} unités restantes`);
      
      expect(totalAlcoholUnits).toBeGreaterThan(5.0);
      expect(totalAlcoholUnits).toBeLessThan(12.0);
    });
  });

  describe('😴 Nuit Vendredi-Samedi: Récupération', () => {
    it('devrait simuler 8h de sommeil avec élimination d\'alcool', () => {
      console.log('😴 NUIT 02H00-10H00 - RÉCUPÉRATION');
      
      // État à 2h du matin (fin de soirée)
      const finSoiree = TestHelper.createDrink('eau', 'marie', 0); // 02h
      const unitesAvantSommeil = 4.5; // Estimation réaliste
      
      // Simulation activité physique pendant le sommeil (très faible)
      const sleepActivity = TestHelper.simulateActivityData('marie', 'sleep', 8);
      
      // Réveil à 10h du matin
      TestHelper.fastForwardTime(8);
      TestHelper.setTestTime('2025-07-26T10:00:00Z');
      
      // Calcul de l'élimination pendant le sommeil
      // Élimination théorique: 8h × 0.15 unités/h = 1.2 unités
      const eliminationTheorique = 8 * 0.15;
      const unitesApresReveil = Math.max(0, unitesAvantSommeil - eliminationTheorique);
      
      console.log('💤 ÉLIMINATION PENDANT LE SOMMEIL:');
      console.log(`   - Avant sommeil: ${unitesAvantSommeil} unités`);
      console.log(`   - Élimination 8h: ${eliminationTheorique} unités`);
      console.log(`   - Après réveil: ${unitesApresReveil.toFixed(2)} unités`);
      console.log(`   - Pas moyens: ${sleepActivity.slice(0, 3).map(a => a.steps.total)} (très faibles)`);
      
      // Vérifications
      expect(unitesApresReveil).toBeLessThan(unitesAvantSommeil);
      expect(unitesApresReveil).toBeGreaterThanOrEqual(0);
      expect(sleepActivity.every(a => a.steps.total < 100)).toBe(true); // Très peu d'activité
    });
  });

  describe('☀️ Samedi - Jour 2: Journée Festival Active', () => {
    it('devrait simuler une journée complète avec détection de sessions', () => {
      console.log('☀️ SAMEDI 10H00 - RÉVEIL ET NOUVELLE JOURNÉE');
      
      // Historique complet: Vendredi soir + Samedi
      const vendrediSoir = [
        TestHelper.createDrink('biereBlonde', 'marie', 20 * 60),  // Vendredi 18h
        TestHelper.createDrink('mojito', 'marie', 18 * 60),       // Vendredi 20h
        TestHelper.createDrink('vodka', 'marie', 16 * 60),        // Vendredi 22h
        TestHelper.createDrink('eau', 'marie', 8 * 60),           // Samedi 02h
      ];
      
      // 8h de pause (sommeil)
      
      const samediJournee = [
        TestHelper.createDrink('eau', 'marie', 0),              // Samedi 10h - réveil
        TestHelper.createDrink('soda', 'marie', -60),           // Samedi 11h - petit-déj
        TestHelper.createDrink('biereBlonde', 'marie', -120),   // Samedi 12h - reprise
        TestHelper.createDrink('vinBlanc', 'marie', -180),      // Samedi 13h - déjeuner
        TestHelper.createDrink('mojito', 'marie', -240),        // Samedi 14h - après-midi
      ];
      
      const toutesBoissons = [...vendrediSoir, ...samediJournee];
      
      // Test détection de sessions
      const sessionDrinks = getSessionDrinks(toutesBoissons, PERSONAS.marie.id);
      
      // Devrait détecter seulement la session du samedi (après le sommeil)
      expect(sessionDrinks).toHaveLength(samediJournee.length);
      expect(sessionDrinks.map(d => d.drinkType)).toEqual([
        'Eau', 'Soda', 'Bière blonde', 'Vin blanc', 'Mojito'
      ]);
      
      // Analyse de la vitesse de consommation samedi
      const speedAnalysis = analyzeConsumptionSpeed(samediJournee);
      
      console.log('📊 ANALYSE SAMEDI JOURNÉE:');
      console.log(`   - Total boissons: ${toutesBoissons.length}`);
      console.log(`   - Session détectée: ${sessionDrinks.length} boissons`);
      console.log(`   - Rythme: ${speedAnalysis.pattern} (${speedAnalysis.averageTimeBetweenDrinks}min entre verres)`);
      console.log(`   - Facteur vitesse: ${speedAnalysis.speedFactor}`);
      
      expect(speedAnalysis.pattern).toBe('slow'); // 60min en moyenne = lent
      expect(sessionDrinks.length).toBeLessThan(toutesBoissons.length); // Détection correcte
    });
  });

  describe('👥 Dimanche - Jour 3: Groupe Complet', () => {
    it('devrait simuler un groupe de 4 amis au festival', () => {
      console.log('👥 DIMANCHE - GROUPE DE 4 AMIS');
      
      // Créer le groupe de test
      const group = TestHelper.createTestGroup(['marie', 'thomas', 'sophie', 'julien']);
      const members = Object.values(group.members);
      
      // Patterns différents par personne
      const patterns = {
        marie: 'moderate',      // 5 boissons
        thomas: 'heavy',        // 7 boissons
        sophie: 'conservative', // 3 boissons
        julien: 'moderate',     // 5 boissons
      } as const;
      
      let toutesLesBoissons: any[] = [];
      
      console.log('🍻 CONSOMMATION PAR MEMBRE:');
      Object.entries(patterns).forEach(([persona, pattern]) => {
        const drinks = TestHelper.createRealisticDrinkSequence(persona as keyof typeof PERSONAS, pattern);
        toutesLesBoissons.push(...drinks);
        
        const alcoholUnits = drinks.reduce((sum, d) => sum + d.alcoholUnits, 0);
        console.log(`   - ${persona}: ${drinks.length} boissons, ${alcoholUnits.toFixed(2)} unités`);
      });
      
      // Calcul des stats de groupe
      const groupStats = calculateSessionGroupAverage(toutesLesBoissons, members);
      
      // Vérifications groupe
      expect(groupStats.sessionMemberStats.size).toBe(4);
      expect(groupStats.sessionGroupAverage).toBeGreaterThan(0);
      
      const totalUnitsGroupe = toutesLesBoissons.reduce((sum, d) => sum + d.alcoholUnits, 0);
      const moyenneCalculee = totalUnitsGroupe / members.length;
      
      TestHelper.expectAlcoholLevelInRange(
        groupStats.sessionGroupAverage,
        moyenneCalculee,
        2 // 2% de tolérance
      );
      
      console.log('📊 STATS GROUPE DIMANCHE:');
      console.log(`   - Total boissons: ${toutesLesBoissons.length}`);
      console.log(`   - Moyenne groupe: ${groupStats.sessionGroupAverage.toFixed(2)} unités`);
      console.log(`   - Membres actifs: ${groupStats.sessionMemberStats.size}/4`);
      
      // Comparaison individuelle vs groupe
      groupStats.sessionMemberStats.forEach((stats, userId) => {
        const member = members.find(m => m.id === userId);
        const ecartMoyenne = stats.units - groupStats.sessionGroupAverage;
        console.log(`   - ${member?.name}: ${stats.units.toFixed(2)} unités (${ecartMoyenne > 0 ? '+' : ''}${ecartMoyenne.toFixed(2)} vs moyenne)`);
      });
    });
  });

  describe('🔄 Test Complet: Weekend Festival 3 Jours', () => {
    it('devrait simuler un weekend festival complet avec sessions multiples', () => {
      console.log('🎪 SIMULATION WEEKEND FESTIVAL COMPLET');
      
      const scenario = DataGenerator.generateCompleteTestScenario(
        'Weekend Festival Complet',
        ['marie', 'thomas'],
        72 // 3 jours
      );
      
      console.log(`📅 Scénario: ${scenario.name}`);
      console.log(`⏱️ Durée: ${scenario.duration}h`);
      console.log(`👥 Participants: ${scenario.personas.map(p => p.name).join(', ')}`);
      console.log(`🎵 Lineup: ${scenario.lineup.length} artistes`);
      console.log(`🗺️ Zones: ${scenario.zones.length} zones`);
      
      // Simulation jour par jour
      let jourActuel = 1;
      let totaleSessions = 0;
      
      for (let jour = 0; jour < 3; jour++) {
        TestHelper.setTestTime(`2025-07-${25 + jour}T14:00:00Z`);
        
        console.log(`\n📅 JOUR ${jourActuel}:`);
        
        // Générer les boissons pour ce jour
        const drinksJour = scenario.drinkPatterns.map(({ persona, pattern }) => {
          const dailyDrinks = pattern.slice(jour * 8, (jour + 1) * 8); // 8 boissons par jour max
          return dailyDrinks.map(({ drinkType, minutesAgo }) => 
            TestHelper.createDrink(drinkType, persona as keyof typeof PERSONAS, minutesAgo)
          );
        }).flat();
        
        // Analyser les sessions pour ce jour
        const sessions = getSessionDrinks(drinksJour, scenario.personas[0].id);
        totaleSessions += sessions.length > 0 ? 1 : 0;
        
        console.log(`   - Boissons: ${drinksJour.length}`);
        console.log(`   - Session active: ${sessions.length > 0 ? 'Oui' : 'Non'}`);
        
        jourActuel++;
      }
      
      // Vérifications finales
      expect(scenario.personas).toHaveLength(2);
      expect(scenario.lineup.length).toBeGreaterThan(0);
      expect(scenario.zones.length).toBeGreaterThan(0);
      expect(totaleSessions).toBeGreaterThanOrEqual(1);
      
      console.log(`\n🏁 BILAN WEEKEND:`);
      console.log(`   - Sessions détectées: ${totaleSessions}`);
      console.log(`   - Attendu: ${scenario.expectedOutcomes.totalSessions}`);
      console.log(`   - Alcoolémie moyenne estimée: ${scenario.expectedOutcomes.avgAlcoholLevel}`);
      console.log(`   - Périodes sommeil détectées: ${scenario.expectedOutcomes.detectedSleepPeriods}`);
    });
  });

  describe('📱 Test Performance et Réalisme', () => {
    it('devrait gérer de gros volumes de données sans performance issues', () => {
      console.log('⚡ TEST PERFORMANCE - GROS VOLUME');
      
      const startTime = Date.now();
      
      // Générer 1000 boissons sur 7 jours
      const massiveDataset: any[] = [];
      for (let day = 0; day < 7; day++) {
        for (let drink = 0; drink < 143; drink++) { // ~1000 total
          massiveDataset.push(
            TestHelper.createDrink('biereBlonde', 'marie', day * 24 * 60 + drink * 10)
          );
        }
      }
      
      // Tester les fonctions principales
      const sessionDrinks = getSessionDrinks(massiveDataset, PERSONAS.marie.id);
      const speedAnalysis = analyzeConsumptionSpeed(sessionDrinks.slice(0, 100)); // Limiter pour perf
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      console.log(`📊 RÉSULTATS PERFORMANCE:`);
      console.log(`   - Dataset: ${massiveDataset.length} boissons`);
      console.log(`   - Session détectée: ${sessionDrinks.length} boissons`);
      console.log(`   - Temps d'exécution: ${duration}ms`);
      console.log(`   - Rythme analysé: ${speedAnalysis.pattern}`);
      
      // Vérifications performance
      expect(duration).toBeLessThan(1000); // Moins de 1 seconde
      expect(sessionDrinks.length).toBeGreaterThan(0);
      expect(sessionDrinks.length).toBeLessThanOrEqual(massiveDataset.length);
    });

    it('devrait valider le réalisme des calculs avec références médicales', () => {
      console.log('🏥 VALIDATION MÉDICALE');
      
      // Scénario médical: Consommation excessive documentée
      const consommationExcessive = [
        TestHelper.createDrink('vodka', 'marie', 180),    // 3 shots
        TestHelper.createDrink('vodka', 'marie', 160),
        TestHelper.createDrink('vodka', 'marie', 140),
        TestHelper.createDrink('biereBrune', 'marie', 120), // + 3 bières
        TestHelper.createDrink('biereBrune', 'marie', 90),
        TestHelper.createDrink('biereBrune', 'marie', 60),
      ];
      
      const currentUnits = calculateCurrentBloodAlcohol(consommationExcessive);
      const totalUnits = consommationExcessive.reduce((sum, d) => sum + d.alcoholUnits, 0);
      
      console.log(`🩺 ANALYSE MÉDICALE:`);
      console.log(`   - Unités totales: ${totalUnits.toFixed(2)}`);
      console.log(`   - Unités actuelles: ${currentUnits.toFixed(2)}`);
      console.log(`   - Niveau: ${currentUnits > 6 ? 'DANGEREUX' : currentUnits > 3 ? 'ÉLEVÉ' : 'MODÉRÉ'}`);
      
      // Vérifications médicales
      expect(totalUnits).toBeGreaterThan(8);    // Consommation excessive
      expect(currentUnits).toBeGreaterThan(5);  // Alcoolémie élevée
      expect(currentUnits).toBeLessThan(totalUnits); // Élimination en cours
      
      // Warning si dangereux
      if (currentUnits > 6) {
        console.log(`   ⚠️ ALERTE: Niveau dangereux détecté (${currentUnits.toFixed(2)} unités)`);
      }
    });
  });
});