import { DrinkRecord, GroupMember } from '../../types';
import { getSessionDrinks } from '../../utils/calculations';

// Helper pour créer une boisson de test
const createTestDrink = (
  id: string,
  userId: string,
  timestamp: Date,
  drinkType: string = 'Bière',
  isTemplate: boolean = false,
  alcoholUnits: number = 2.5
): DrinkRecord => ({
  id,
  userId,
  groupId: 'test-group',
  drinkType,
  customName: `${drinkType} Test`,
  category: 'beer',
  volume: 33,
  alcoholDegree: 5,
  alcoholUnits,
  brand: 'Test Brand',
  timestamp,
  createdAt: timestamp,
  lastModified: timestamp,
  syncStatus: 'synced',
  isTemplate
});

// Helper pour créer une triche de test
const createTestTriche = (
  id: string,
  userId: string,
  timestamp: Date
): DrinkRecord => ({
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
});

describe('Session Logic Diagnostic', () => {
  const userId = 'test-user-123';

  describe('Test de getSessionDrinks directement', () => {
    it('devrait compter correctement les boissons ajoutées récemment', () => {
      const now = new Date();
      const drinks: DrinkRecord[] = [
        createTestDrink('drink1', userId, new Date(now.getTime() - 30 * 60 * 1000)), // Il y a 30 min
        createTestDrink('drink2', userId, new Date(now.getTime() - 15 * 60 * 1000)), // Il y a 15 min
        createTestDrink('drink3', userId, new Date(now.getTime() - 5 * 60 * 1000)),  // Il y a 5 min
      ];

      const sessionDrinks = getSessionDrinks(drinks, userId);

      console.log('🧪 Test Results:');
      console.log('- Total drinks:', drinks.length);
      console.log('- Session drinks:', sessionDrinks.length);
      console.log('- Session drinks IDs:', sessionDrinks.map(d => d.id));

      // Toutes les boissons récentes devraient être dans la session
      expect(sessionDrinks.length).toBe(3);
    });

    it('devrait séparer les sessions après une pause de 4h+', () => {
      const now = new Date();
      const drinks: DrinkRecord[] = [
        // Ancienne session (il y a 6h)
        createTestDrink('old1', userId, new Date(now.getTime() - 6 * 60 * 60 * 1000)),
        createTestDrink('old2', userId, new Date(now.getTime() - 5.5 * 60 * 60 * 1000)),
        
        // Session actuelle (il y a 1h et 30min)
        createTestDrink('new1', userId, new Date(now.getTime() - 60 * 60 * 1000)),
        createTestDrink('new2', userId, new Date(now.getTime() - 30 * 60 * 1000)),
      ];

      const sessionDrinks = getSessionDrinks(drinks, userId);

      console.log('🧪 Test Session Separation:');
      console.log('- Total drinks:', drinks.length);
      console.log('- Session drinks:', sessionDrinks.length);
      console.log('- Session drinks timestamps:', sessionDrinks.map(d => `${d.id}: ${d.timestamp.toISOString()}`));

      // Seules les 2 boissons récentes devraient être dans la session actuelle
      expect(sessionDrinks.length).toBe(2);
      expect(sessionDrinks.every(d => d.id.startsWith('new'))).toBe(true);
    });

    it('devrait exclure les templates des sessions', () => {
      const now = new Date();
      const drinks: DrinkRecord[] = [
        createTestDrink('drink1', userId, new Date(now.getTime() - 30 * 60 * 1000), 'Bière', false), // Vraie boisson
        createTestDrink('template1', userId, new Date(now.getTime() - 20 * 60 * 1000), 'Bière', true), // Template
        createTestDrink('drink2', userId, new Date(now.getTime() - 10 * 60 * 1000), 'Vin', false), // Vraie boisson
      ];

      const { result } = renderHook(() => useStats(drinks, userId, groupMembers));

      console.log('🧪 Test Template Exclusion:');
      console.log('- sessionDrinks:', result.current.sessionDrinks);
      console.log('- drinks total:', drinks.length);

      // Seules les 2 vraies boissons devraient être comptées
      expect(result.current.sessionDrinks).toBe(2);
      expect(result.current.sessionUnits).toBe(5.0);
    });
  });

  describe('Comptage des triches', () => {
    it('devrait compter les triches séparément des boissons', () => {
      const now = new Date();
      const drinks: DrinkRecord[] = [
        createTestDrink('drink1', userId, new Date(now.getTime() - 30 * 60 * 1000)),
        createTestTriche('triche1', userId, new Date(now.getTime() - 20 * 60 * 1000)),
        createTestDrink('drink2', userId, new Date(now.getTime() - 10 * 60 * 1000)),
        createTestTriche('triche2', userId, new Date(now.getTime() - 5 * 60 * 1000)),
      ];

      const { result } = renderHook(() => useStats(drinks, userId, groupMembers));

      console.log('🧪 Test Triches Counting:');
      console.log('- sessionDrinks:', result.current.sessionDrinks);
      console.log('- sessionTriches:', result.current.sessionTriches);
      console.log('- todayTriches:', result.current.todayTriches);
      console.log('- totalTriches:', result.current.totalTriches);

      // Les triches ne doivent pas affecter le comptage des boissons
      expect(result.current.sessionDrinks).toBe(2); // Seulement les vraies boissons
      expect(result.current.sessionTriches).toBe(2); // Toutes les triches d'aujourd'hui
      expect(result.current.todayTriches).toBe(2);
      expect(result.current.totalTriches).toBe(2);
    });

    it('devrait compter les triches d\'aujourd\'hui même si elles sont "anciennes"', () => {
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      const drinks: DrinkRecord[] = [
        // Triche de ce matin (il y a 10h)
        createTestTriche('triche1', userId, new Date(startOfToday.getTime() + 8 * 60 * 60 * 1000)),
        // Boisson récente (il y a 1h) 
        createTestDrink('drink1', userId, new Date(now.getTime() - 60 * 60 * 1000)),
        // Triche récente (il y a 30min)
        createTestTriche('triche2', userId, new Date(now.getTime() - 30 * 60 * 1000)),
      ];

      const { result } = renderHook(() => useStats(drinks, userId, groupMembers));

      console.log('🧪 Test Triches Daily Count:');
      console.log('- sessionDrinks:', result.current.sessionDrinks);
      console.log('- sessionTriches:', result.current.sessionTriches);

      // Les triches suivent la logique quotidienne, pas de session
      expect(result.current.sessionDrinks).toBe(1); // 1 seule boisson récente
      expect(result.current.sessionTriches).toBe(2); // Toutes les triches du jour
    });
  });

  describe('Scénario de reproduction du bug', () => {
    it('devrait reproduire le scénario où le compteur reste bloqué', () => {
      console.log('🐛 === REPRODUCTION DU BUG ===');
      
      const now = new Date();
      
      // Étape 1: Ajout de la première boisson
      let drinks: DrinkRecord[] = [
        createTestDrink('drink1', userId, new Date(now.getTime() - 10 * 60 * 1000))
      ];

      let { result, rerender } = renderHook(
        ({ drinks }) => useStats(drinks, userId, groupMembers),
        { initialProps: { drinks } }
      );

      console.log('🔍 Après 1 boisson:');
      console.log('- sessionDrinks:', result.current.sessionDrinks);
      console.log('- sessionUnits:', result.current.sessionUnits);

      expect(result.current.sessionDrinks).toBe(1);

      // Étape 2: Ajout d'une deuxième boisson
      drinks = [
        ...drinks,
        createTestDrink('drink2', userId, new Date(now.getTime() - 5 * 60 * 1000))
      ];

      rerender({ drinks });

      console.log('🔍 Après 2 boissons:');
      console.log('- sessionDrinks:', result.current.sessionDrinks);
      console.log('- sessionUnits:', result.current.sessionUnits);

      expect(result.current.sessionDrinks).toBe(2);

      // Étape 3: Ajout d'une troisième boisson
      drinks = [
        ...drinks,
        createTestDrink('drink3', userId, new Date(now.getTime() - 1 * 60 * 1000))
      ];

      rerender({ drinks });

      console.log('🔍 Après 3 boissons:');
      console.log('- sessionDrinks:', result.current.sessionDrinks);
      console.log('- sessionUnits:', result.current.sessionUnits);

      expect(result.current.sessionDrinks).toBe(3);

      // Étape 4: Ajout d'une triche
      drinks = [
        ...drinks,
        createTestTriche('triche1', userId, new Date(now.getTime() - 30 * 1000))
      ];

      rerender({ drinks });

      console.log('🔍 Après ajout triche:');
      console.log('- sessionDrinks:', result.current.sessionDrinks);
      console.log('- sessionTriches:', result.current.sessionTriches);

      expect(result.current.sessionDrinks).toBe(3); // Ne doit pas changer
      expect(result.current.sessionTriches).toBe(1);
    });
  });
});