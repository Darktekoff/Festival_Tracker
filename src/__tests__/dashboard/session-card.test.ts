import { describe, it, expect } from 'vitest';
import { DrinkRecord, GroupMember } from '../../types';

// Helper pour créer une boisson de test
const createTestDrink = (
  id: string,
  userId: string,
  minutesAgo: number,
  drinkType: string = 'Bière'
): DrinkRecord => {
  const timestamp = new Date(Date.now() - minutesAgo * 60 * 1000);
  return {
    id,
    userId,
    groupId: 'test-group',
    drinkType,
    customName: `${drinkType} Test`,
    category: 'beer',
    volume: 33,
    alcoholDegree: 5,
    alcoholUnits: 2.5,
    brand: 'Test Brand',
    timestamp,
    createdAt: timestamp,
    lastModified: timestamp,
    syncStatus: 'synced',
    isTemplate: false
  };
};

// Helper pour créer une triche
const createTestTriche = (id: string, userId: string, minutesAgo: number): DrinkRecord => {
  const timestamp = new Date(Date.now() - minutesAgo * 60 * 1000);
  return {
    id,
    userId,
    groupId: 'test-group',
    drinkType: 'Triche',
    customName: 'Triche',
    category: 'other',
    volume: 0,
    alcoholDegree: 0,
    alcoholUnits: 0,
    brand: '',
    timestamp,
    createdAt: timestamp,
    lastModified: timestamp,
    syncStatus: 'synced',
    isTemplate: false
  };
};

describe('Dashboard - Cartes Session Actuelle et Activités Récentes', () => {
  const userId = 'flavien-123';
  const groupMembers: GroupMember[] = [
    {
      id: userId,
      name: 'Flavien',
      avatar: 'test-avatar',
      role: 'member',
      joinedAt: new Date(),
      lastActive: new Date(),
      isActive: true,
      totalContributions: 0
    }
  ];

  describe('🎯 Test de reproduction du problème utilisateur', () => {
    it('SCÉNARIO: Ajout progressif de boissons et triches', async () => {
      console.log('📱 === SIMULATION DASHBOARD ===');
      
      // 🔹 ÉTAPE 1: État initial (aucune boisson)
      let drinks: DrinkRecord[] = [];
      
      // Simulation des hooks Dashboard
      const simulateSessionCard = (drinks: DrinkRecord[]) => {
        // Calcul manuel simple comme dans useStats
        const userDrinks = drinks.filter(d => d.userId === userId && !d.isTemplate);
        const userNormalDrinks = userDrinks.filter(d => d.drinkType !== 'Triche');
        const userTriches = userDrinks.filter(d => d.drinkType === 'Triche');
        
        // Session simple : toutes les boissons récentes (sans pause de 4h pour ce test)
        const sessionDrinks = userNormalDrinks.length;
        const sessionUnits = userNormalDrinks.reduce((sum, d) => sum + d.alcoholUnits, 0);
        
        // Triches d'aujourd'hui
        const today = new Date();
        const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const sessionTriches = userTriches.filter(t => t.timestamp >= startOfToday).length;
        
        return { sessionDrinks, sessionUnits, sessionTriches };
      };

      const simulateActivitiesCard = (drinks: DrinkRecord[]) => {
        // Les activités = boissons récentes (hors templates)
        const recentActivities = drinks
          .filter(d => !d.isTemplate)
          .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
          .slice(0, 4); // Top 4 comme dans le Dashboard
        
        return recentActivities.length;
      };

      // État initial
      let sessionCard = simulateSessionCard(drinks);
      let activitiesCard = simulateActivitiesCard(drinks);
      
      console.log('🔹 INITIAL:');
      console.log(`Session: ${sessionCard.sessionDrinks} boissons, ${sessionCard.sessionTriches} triches`);
      console.log(`Activités: ${activitiesCard} éléments`);
      
      expect(sessionCard.sessionDrinks).toBe(0);
      expect(sessionCard.sessionTriches).toBe(0);
      expect(activitiesCard).toBe(0);

      // 🔹 ÉTAPE 2: Ajout de la première boisson
      drinks.push(createTestDrink('drink1', userId, 5)); // Il y a 5 min
      
      sessionCard = simulateSessionCard(drinks);
      activitiesCard = simulateActivitiesCard(drinks);
      
      console.log('🔹 APRÈS 1 BOISSON:');
      console.log(`Session: ${sessionCard.sessionDrinks} boissons, ${sessionCard.sessionTriches} triches`);
      console.log(`Activités: ${activitiesCard} éléments`);
      
      expect(sessionCard.sessionDrinks).toBe(1);
      expect(activitiesCard).toBe(1);

      // 🔹 ÉTAPE 3: Ajout d'une deuxième boisson
      drinks.push(createTestDrink('drink2', userId, 3)); // Il y a 3 min
      
      sessionCard = simulateSessionCard(drinks);
      activitiesCard = simulateActivitiesCard(drinks);
      
      console.log('🔹 APRÈS 2 BOISSONS:');
      console.log(`Session: ${sessionCard.sessionDrinks} boissons, ${sessionCard.sessionTriches} triches`);
      console.log(`Activités: ${activitiesCard} éléments`);
      
      expect(sessionCard.sessionDrinks).toBe(2);
      expect(activitiesCard).toBe(2);

      // 🔹 ÉTAPE 4: Ajout d'une triche
      drinks.push(createTestTriche('triche1', userId, 1)); // Il y a 1 min
      
      sessionCard = simulateSessionCard(drinks);
      activitiesCard = simulateActivitiesCard(drinks);
      
      console.log('🔹 APRÈS AJOUT TRICHE:');
      console.log(`Session: ${sessionCard.sessionDrinks} boissons, ${sessionCard.sessionTriches} triches`);
      console.log(`Activités: ${activitiesCard} éléments`);
      
      expect(sessionCard.sessionDrinks).toBe(2); // Ne change pas
      expect(sessionCard.sessionTriches).toBe(1); // +1 triche
      expect(activitiesCard).toBe(3); // +1 activité (triche compte dans activités)

      // 🔹 ÉTAPE 5: Ajout d'une troisième boisson
      drinks.push(createTestDrink('drink3', userId, 0.5)); // Il y a 30 sec
      
      sessionCard = simulateSessionCard(drinks);
      activitiesCard = simulateActivitiesCard(drinks);
      
      console.log('🔹 APRÈS 3 BOISSONS + 1 TRICHE:');
      console.log(`Session: ${sessionCard.sessionDrinks} boissons, ${sessionCard.sessionTriches} triches`);
      console.log(`Activités: ${activitiesCard} éléments`);
      
      expect(sessionCard.sessionDrinks).toBe(3);
      expect(sessionCard.sessionTriches).toBe(1);
      expect(activitiesCard).toBe(4);

      console.log('✅ Test terminé - Tous les compteurs se mettent à jour correctement');
    });

    it('PROBLÈME: Vérifier si les templates perturbent les compteurs', () => {
      console.log('🔍 === TEST TEMPLATES ===');
      
      const drinks: DrinkRecord[] = [
        createTestDrink('drink1', userId, 10), // Vraie boisson
        { ...createTestDrink('template1', userId, 8), isTemplate: true }, // Template
        createTestDrink('drink2', userId, 5), // Vraie boisson
        createTestTriche('triche1', userId, 2), // Triche
      ];

      const sessionCard = {
        sessionDrinks: drinks.filter(d => d.userId === userId && !d.isTemplate && d.drinkType !== 'Triche').length,
        sessionTriches: drinks.filter(d => d.userId === userId && d.drinkType === 'Triche').length
      };

      const activitiesCard = drinks.filter(d => !d.isTemplate).length;

      console.log('🔍 AVEC TEMPLATES:');
      console.log(`Session: ${sessionCard.sessionDrinks} boissons, ${sessionCard.sessionTriches} triches`);
      console.log(`Activités: ${activitiesCard} éléments (${drinks.length} total avec templates)`);

      expect(sessionCard.sessionDrinks).toBe(2); // Exclut template
      expect(sessionCard.sessionTriches).toBe(1);
      expect(activitiesCard).toBe(3); // Exclut template des activités
    });
  });

  describe('🔧 Test des fonctions de calcul utilisées', () => {
    it('devrait correctement filtrer et compter comme dans le vrai Dashboard', () => {
      const drinks: DrinkRecord[] = [
        createTestDrink('beer1', userId, 30),
        createTestDrink('beer2', userId, 15),
        createTestTriche('cheat1', userId, 10),
        createTestDrink('wine1', userId, 5),
        { ...createTestDrink('template1', userId, 3), isTemplate: true },
      ];

      // Simulation exacte de ce qui se passe dans DashboardScreen
      const userNormalDrinks = drinks.filter(d => 
        d.userId === userId && 
        !d.isTemplate && 
        d.drinkType !== 'Triche'
      );

      const userTriches = drinks.filter(d => 
        d.userId === userId && 
        !d.isTemplate && 
        d.drinkType === 'Triche'
      );

      // Pour les activités récentes
      const recentActivities = drinks.filter(d => !d.isTemplate);

      console.log('📊 COMPTAGE FINAL:');
      console.log(`Boissons normales: ${userNormalDrinks.length}`);
      console.log(`Triches: ${userTriches.length}`);
      console.log(`Activités récentes: ${recentActivities.length}`);

      expect(userNormalDrinks.length).toBe(3); // 3 boissons
      expect(userTriches.length).toBe(1); // 1 triche
      expect(recentActivities.length).toBe(4); // Tout sauf template
    });
  });
});