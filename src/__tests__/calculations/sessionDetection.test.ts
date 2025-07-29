import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { 
  getSessionDrinks, 
  getSessionDrinksWithActivity, 
  detectSleepPeriod,
  calculateSessionGroupAverage 
} from '../../utils/calculations';
import TestHelper, { PERSONAS } from '../utils/testHelper';
import DataGenerator from '../utils/dataGenerator';

describe('🏕️ Détection de Sessions Festival - Tests Complets', () => {
  beforeEach(() => {
    TestHelper.setTestTime('2025-07-25T14:00:00Z'); // Début festival 14h
  });

  afterEach(() => {
    TestHelper.restoreRealTime();
  });

  describe('⏰ Détection de Session de Base (Temps Uniquement)', () => {
    it('devrait détecter une session continue sans pause 4h+', () => {
      const drinks = TestHelper.createRealisticDrinkSequence('marie', 'moderate');
      
      const sessionDrinks = getSessionDrinks(drinks, PERSONAS.marie.id);
      
      expect(sessionDrinks).toHaveLength(drinks.length);
      expect(sessionDrinks[0].timestamp).toEqual(drinks[0].timestamp);
      
      console.log(`✅ Session continue: ${sessionDrinks.length} boissons sur ${drinks.length}`);
    });

    it('devrait détecter 2 sessions avec pause sommeil de 8h', () => {
      // Session 1: Soirée jusqu'à 2h du matin
      const session1 = [
        TestHelper.createDrink('biereBlonde', 'marie', 14 * 60), // 18h hier
        TestHelper.createDrink('mojito', 'marie', 12 * 60),      // 20h hier
        TestHelper.createDrink('biereBrune', 'marie', 10 * 60),  // 22h hier
        TestHelper.createDrink('vodka', 'marie', 8 * 60),        // 00h
        TestHelper.createDrink('whisky', 'marie', 6 * 60),       // 02h
      ];

      // 8h de pause (sommeil) - pas de boissons

      // Session 2: Lendemain après-midi
      const session2 = [
        TestHelper.createDrink('eau', 'marie', 120),    // 12h
        TestHelper.createDrink('biereBlonde', 'marie', 60), // 13h  
        TestHelper.createDrink('mojito', 'marie', 0),       // 14h (maintenant)
      ];

      const allDrinks = [...session1, ...session2];
      const sessionDrinks = getSessionDrinks(allDrinks, PERSONAS.marie.id);

      // Devrait ne retourner que la session actuelle (session2)
      expect(sessionDrinks).toHaveLength(session2.length);
      expect(sessionDrinks.map(d => d.drinkType)).toEqual(['Eau', 'Bière blonde', 'Mojito']);
      
      console.log(`✅ Session après pause 8h: ${sessionDrinks.length} boissons (attendu: ${session2.length})`);
    });

    it('devrait gérer les cas limite de pause exactement 4h', () => {
      const drinks = [
        TestHelper.createDrink('biereBlonde', 'marie', 5 * 60), // 09h
        TestHelper.createDrink('mojito', 'marie', 4 * 60 + 1),  // 10h (3h59 après)
        TestHelper.createDrink('vodka', 'marie', 60),           // 13h (4h01 après)
        TestHelper.createDrink('whisky', 'marie', 0),           // 14h
      ];

      const sessionDrinks = getSessionDrinks(drinks, PERSONAS.marie.id);
      
      // Pause de 4h01 → nouvelle session
      expect(sessionDrinks).toHaveLength(2); // Dernières 2 boissons
      expect(sessionDrinks.map(d => d.drinkType)).toEqual(['Vodka', 'Whisky']);
      
      console.log(`✅ Pause exacte 4h: session de ${sessionDrinks.length} boissons`);
    });
  });

  describe('🚶‍♂️ Détection de Session Avancée (Temps + Activité)', () => {
    it('devrait détecter le sommeil avec inactivité physique', () => {
      // Simulation: 8h de sommeil avec très peu de mouvement
      const sleepActivity = TestHelper.simulateActivityData('marie', 'sleep', 8);
      
      const sleepAnalysis = detectSleepPeriod(sleepActivity, 3);
      
      expect(sleepAnalysis.isSleeping).toBe(true);
      expect(sleepAnalysis.inactivityDuration).toBeGreaterThanOrEqual(3);
      
      console.log(`😴 Sommeil détecté: ${sleepAnalysis.inactivityDuration}h d'inactivité`);
    });

    it('devrait ne PAS détecter le sommeil pendant une fête active', () => {
      // Simulation: 4h de fête intensive
      const partyActivity = TestHelper.simulateActivityData('marie', 'dancing', 4);
      
      const sleepAnalysis = detectSleepPeriod(partyActivity, 3);
      
      expect(sleepAnalysis.isSleeping).toBe(false);
      expect(sleepAnalysis.inactivityDuration).toBeLessThan(3);
      
      console.log(`🎉 Fête active: ${sleepAnalysis.inactivityDuration}h inactivité (pas de sommeil)`);
    });

    it('devrait détecter une nouvelle session avec pause 3h + sommeil', () => {
      // Session 1: Soirée active
      const session1 = [
        TestHelper.createDrink('biereBlonde', 'marie', 8 * 60), // 06h
        TestHelper.createDrink('mojito', 'marie', 6 * 60),      // 08h
        TestHelper.createDrink('vodka', 'marie', 5 * 60),       // 09h
      ];

      // 3h de pause AVEC sommeil détecté
      const sleepActivity = TestHelper.simulateActivityData('marie', 'sleep', 3);

      // Session 2: Réveil et nouvelle consommation
      const session2 = [
        TestHelper.createDrink('eau', 'marie', 60),  // 13h
        TestHelper.createDrink('biereBlonde', 'marie', 0), // 14h
      ];

      const allDrinks = [...session1, ...session2];
      const sessionDrinks = getSessionDrinksWithActivity(
        allDrinks, 
        sleepActivity, 
        PERSONAS.marie.id
      );

      // Devrait détecter nouvelle session grâce au sommeil + 3h
      expect(sessionDrinks).toHaveLength(session2.length);
      expect(sessionDrinks.map(d => d.drinkType)).toEqual(['Eau', 'Bière blonde']);
      
      console.log(`✅ Session avec sommeil: ${sessionDrinks.length} boissons après pause 3h+sommeil`);
    });

    it('devrait continuer la session si pause 3h SANS sommeil', () => {
      // Session continue avec pause 3h mais activité
      const drinks = [
        TestHelper.createDrink('biereBlonde', 'marie', 4 * 60), // 10h
        TestHelper.createDrink('mojito', 'marie', 3 * 60 + 30), // 10h30
        // Pause 3h mais avec activité physique
        TestHelper.createDrink('vodka', 'marie', 30),           // 13h30
        TestHelper.createDrink('whisky', 'marie', 0),           // 14h
      ];

      // Activité continue (pas de sommeil)
      const activeActivity = TestHelper.simulateActivityData('marie', 'walking', 4);

      const sessionDrinks = getSessionDrinksWithActivity(
        drinks, 
        activeActivity, 
        PERSONAS.marie.id
      );

      // Devrait garder toute la session (pas de sommeil détecté)
      expect(sessionDrinks).toHaveLength(drinks.length);
      
      console.log(`✅ Session continue malgré pause 3h: ${sessionDrinks.length} boissons (activité détectée)`);
    });
  });

  describe('👥 Calcul de Moyennes de Groupe', () => {
    it('devrait calculer correctement la moyenne du groupe pour une session', () => {
      const group = TestHelper.createTestGroup(['marie', 'thomas', 'sophie']);
      const members = Object.values(group.members);

      // Boissons de chaque membre pour la session
      const marieDrinks = TestHelper.createRealisticDrinkSequence('marie', 'moderate');
      const thomasDrinks = TestHelper.createRealisticDrinkSequence('thomas', 'heavy');
      const sophieDrinks = TestHelper.createRealisticDrinkSequence('sophie', 'conservative');

      const allDrinks = [...marieDrinks, ...thomasDrinks, ...sophieDrinks];
      
      const groupStats = calculateSessionGroupAverage(allDrinks, members);
      
      const totalUnits = allDrinks.reduce((sum, d) => sum + d.alcoholUnits, 0);
      const expectedAverage = totalUnits / members.length;
      
      TestHelper.expectAlcoholLevelInRange(
        groupStats.sessionGroupAverage,
        expectedAverage,
        2 // 2% de tolérance
      );
      
      expect(groupStats.sessionMemberStats.size).toBe(3);
      expect(groupStats.sessionStartTime).toBeDefined();
      
      console.log(`👥 Moyenne groupe: ${groupStats.sessionGroupAverage} unités (attendu: ${expectedAverage.toFixed(2)})`);
      console.log(`📊 Stats membres:`, Array.from(groupStats.sessionMemberStats.entries()));
    });

    it('devrait gérer un groupe avec des patterns de consommation différents', () => {
      const group = TestHelper.createTestGroup(['marie', 'thomas', 'sophie', 'julien']);
      const members = Object.values(group.members);

      // Patterns différents par membre
      const drinks = [
        ...TestHelper.createRealisticDrinkSequence('marie', 'conservative'),   // 3 boissons
        ...TestHelper.createRealisticDrinkSequence('thomas', 'heavy'),         // 7 boissons  
        ...TestHelper.createRealisticDrinkSequence('sophie', 'moderate'),      // 5 boissons
        // Julien ne boit pas (0 boissons)
      ];

      const groupStats = calculateSessionGroupAverage(drinks, members);
      
      // Vérifications cohérence
      expect(groupStats.sessionMemberStats.get(PERSONAS.marie.id)?.drinks).toBeGreaterThan(0);
      expect(groupStats.sessionMemberStats.get(PERSONAS.thomas.id)?.drinks).toBeGreaterThan(
        groupStats.sessionMemberStats.get(PERSONAS.marie.id)?.drinks || 0
      );
      expect(groupStats.sessionMemberStats.has(PERSONAS.julien.id)).toBe(false); // Pas de boissons
      
      console.log(`👥 Groupe diversifié:`, {
        moyenne: groupStats.sessionGroupAverage,
        marie: groupStats.sessionMemberStats.get(PERSONAS.marie.id)?.drinks || 0,
        thomas: groupStats.sessionMemberStats.get(PERSONAS.thomas.id)?.drinks || 0,
        sophie: groupStats.sessionMemberStats.get(PERSONAS.sophie.id)?.drinks || 0,
        julien: groupStats.sessionMemberStats.get(PERSONAS.julien.id)?.drinks || 0,
      });
    });
  });

  describe('🎯 Scénarios Réalistes de Festival', () => {
    it('devrait simuler un weekend festival complet avec sessions multiples', () => {
      TestHelper.setTestTime('2025-07-25T18:00:00Z'); // Vendredi 18h

      // VENDREDI SOIR: Arrivée et première soirée
      const vendrediSoir = [
        TestHelper.createDrink('biereBlonde', 'marie', 4 * 60),  // 14h
        TestHelper.createDrink('mojito', 'marie', 3 * 60),       // 15h
        TestHelper.createDrink('biereBrune', 'marie', 2 * 60),   // 16h
        TestHelper.createDrink('vodka', 'marie', 60),            // 17h
        TestHelper.createDrink('whisky', 'marie', 0),            // 18h
      ];

      // PAUSE SOMMEIL: 8h (18h → 02h du samedi)
      TestHelper.fastForwardTime(8);
      TestHelper.setTestTime('2025-07-26T02:00:00Z'); // Samedi 02h

      // SAMEDI MATIN/APREM: Réveil et nouvelle session  
      const samediAprem = [
        TestHelper.createDrink('eau', 'marie', 6 * 60),         // 20h vendredi (dans le passé)
        TestHelper.createDrink('soda', 'marie', 4 * 60),        // 22h vendredi
        TestHelper.createDrink('biereBlonde', 'marie', 2 * 60), // 00h samedi
        TestHelper.createDrink('mojito', 'marie', 0),           // 02h samedi (maintenant)
      ];

      const allDrinks = [...vendrediSoir, ...samediAprem];
      const sessionDrinks = getSessionDrinks(allDrinks, PERSONAS.marie.id);

      // Devrait détecter la session actuelle uniquement (après le sommeil)
      expect(sessionDrinks.length).toBeGreaterThan(0);
      expect(sessionDrinks.length).toBeLessThan(allDrinks.length); // Pas toutes les boissons
      
      console.log(`🎪 Weekend festival:`, {
        totalBoissons: allDrinks.length,
        sessionActuelle: sessionDrinks.length,
        détectionCorrecte: sessionDrinks.length < allDrinks.length,
      });
    });

    it('devrait gérer un pré-gaming suivi d\'une soirée normale', () => {
      // PRÉ-GAMING: 3 shots en 20min
      const preGaming = TestHelper.createRealisticDrinkSequence('marie', 'binge');
      
      // PAUSE: 2h de transport/attente
      TestHelper.fastForwardTime(2);
      
      // SOIRÉE NORMALE: Consommation modérée
      const soireeNormale = TestHelper.createRealisticDrinkSequence('marie', 'moderate');
      
      const allDrinks = [...preGaming, ...soireeNormale];
      const sessionDrinks = getSessionDrinks(allDrinks, PERSONAS.marie.id);
      
      // Devrait être une seule session (pause < 4h)
      expect(sessionDrinks).toHaveLength(allDrinks.length);
      
      // Vérifier que le calcul d'alcoolémie tient compte du binge
      const totalUnits = sessionDrinks.reduce((sum, d) => sum + d.alcoholUnits, 0);
      expect(totalUnits).toBeGreaterThan(5); // Au moins 5 unités
      
      console.log(`🍻 Pré-gaming + soirée:`, {
        totalBoissons: sessionDrinks.length,
        unitésTotales: totalUnits.toFixed(2),
        uneSeuleSession: sessionDrinks.length === allDrinks.length,
      });
    });
  });

  describe('⚠️ Cas Limites et Gestion d\'Erreurs', () => {
    it('devrait gérer une liste de boissons vide', () => {
      const sessionDrinks = getSessionDrinks([], PERSONAS.marie.id);
      expect(sessionDrinks).toHaveLength(0);
      
      const groupStats = calculateSessionGroupAverage([], []);
      expect(groupStats.sessionGroupAverage).toBe(0);
      expect(groupStats.sessionMemberStats.size).toBe(0);
    });

    it('devrait gérer des données d\'activité manquantes', () => {
      const drinks = TestHelper.createRealisticDrinkSequence('marie', 'moderate');
      
      // Pas de données d'activité → fallback sur méthode de base
      const sessionDrinks = getSessionDrinksWithActivity(drinks, [], PERSONAS.marie.id);
      const basicSessionDrinks = getSessionDrinks(drinks, PERSONAS.marie.id);
      
      expect(sessionDrinks).toEqual(basicSessionDrinks);
    });

    it('devrait gérer des timestamps incohérents', () => {
      const drinks = [
        TestHelper.createDrink('biereBlonde', 'marie', -60), // Future (erreur)
        TestHelper.createDrink('mojito', 'marie', 60),       // Passé normal
        TestHelper.createDrink('vodka', 'marie', 0),         // Maintenant
      ];

      // Ne devrait pas planter malgré les timestamps incohérents
      expect(() => {
        const sessionDrinks = getSessionDrinks(drinks, PERSONAS.marie.id);
        expect(sessionDrinks.length).toBeGreaterThanOrEqual(0);
      }).not.toThrow();
    });
  });
});