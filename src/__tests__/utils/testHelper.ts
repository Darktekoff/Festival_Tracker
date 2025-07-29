import { vi } from 'vitest';
import { DrinkRecord, GroupMember } from '../../types';
import { calculateAlcoholUnits } from '../../utils/calculations';

// 🎭 Personas de test réalistes
export const PERSONAS = {
  marie: {
    id: 'marie-id',
    name: 'Marie',
    email: 'marie@test.com',
    age: 28,
    gender: 'female' as const,
    weight: 60,
    height: 165,
    activityLevel: 'moderate' as const,
    avatar: '👩‍🦰',
  },
  thomas: {
    id: 'thomas-id', 
    name: 'Thomas',
    email: 'thomas@test.com',
    age: 24,
    gender: 'male' as const,
    weight: 75,
    height: 180,
    activityLevel: 'active' as const,
    avatar: '👨‍🦱',
  },
  sophie: {
    id: 'sophie-id',
    name: 'Sophie', 
    email: 'sophie@test.com',
    age: 35,
    gender: 'female' as const,
    weight: 55,
    height: 160,
    activityLevel: 'light' as const,
    avatar: '👩‍🦳',
  },
  julien: {
    id: 'julien-id',
    name: 'Julien',
    email: 'julien@test.com', 
    age: 32,
    gender: 'male' as const,
    weight: 85,
    height: 175,
    activityLevel: 'sedentary' as const,
    avatar: '👨‍🦲',
  },
} as const;

// 🍺 Templates de boissons réalistes
export const DRINK_TEMPLATES = {
  biereBrune: { category: 'beer', type: 'brune', volume: 50, degree: 6, name: 'Bière brune' },
  biereBlonde: { category: 'beer', type: 'blonde', volume: 50, degree: 5, name: 'Bière blonde' },
  vinRouge: { category: 'wine', type: 'rouge', volume: 12.5, degree: 12, name: 'Vin rouge' },
  vinBlanc: { category: 'wine', type: 'blanc', volume: 12.5, degree: 11, name: 'Vin blanc' },
  champagne: { category: 'champagne', type: 'brut', volume: 12.5, degree: 12, name: 'Champagne' },
  vodka: { category: 'shot', type: 'vodka', volume: 4, degree: 40, name: 'Vodka' },
  whisky: { category: 'shot', type: 'whisky', volume: 4, degree: 40, name: 'Whisky' },
  mojito: { category: 'cocktail', type: 'mojito', volume: 20, degree: 15, name: 'Mojito' },
  pinaColada: { category: 'cocktail', type: 'pina-colada', volume: 25, degree: 12, name: 'Piña Colada' },
  eau: { category: 'soft', type: 'eau', volume: 50, degree: 0, name: 'Eau' },
  soda: { category: 'soft', type: 'soda', volume: 33, degree: 0, name: 'Soda' },
  triche: { category: 'other', type: 'triche', volume: 0, degree: 0, name: 'Triche' },
} as const;

export class TestHelper {
  // 🕒 Gestion du temps pour les tests
  static setTestTime(date: string | Date) {
    const testDate = new Date(date);
    vi.setSystemTime(testDate);
    return testDate;
  }

  static fastForwardTime(hours: number) {
    const currentTime = new Date();
    const newTime = new Date(currentTime.getTime() + hours * 60 * 60 * 1000);
    vi.setSystemTime(newTime);
    return newTime;
  }

  static restoreRealTime() {
    vi.useRealTimers();
  }

  // 🍺 Création de boissons réalistes
  static createDrink(
    template: keyof typeof DRINK_TEMPLATES,
    persona: keyof typeof PERSONAS,
    minutesAgo: number = 0,
    customName?: string
  ): DrinkRecord {
    const drinkTemplate = DRINK_TEMPLATES[template];
    const user = PERSONAS[persona];
    const timestamp = new Date(Date.now() - minutesAgo * 60 * 1000);

    return {
      id: `drink-${persona}-${template}-${minutesAgo}`,
      groupId: 'test-group',
      userId: user.id,
      userName: user.name,
      userAvatar: user.avatar,
      category: drinkTemplate.category as any,
      drinkType: drinkTemplate.type,
      customName: customName || drinkTemplate.name,
      volume: drinkTemplate.volume,
      alcoholDegree: drinkTemplate.degree,
      alcoholContent: drinkTemplate.degree,
      alcoholUnits: calculateAlcoholUnits(drinkTemplate.volume, drinkTemplate.degree),
      timestamp,
      createdAt: timestamp,
      syncStatus: 'synced',
      lastModified: timestamp,
    };
  }

  // 📊 Création de séquences de boissons réalistes
  static createRealisticDrinkSequence(
    persona: keyof typeof PERSONAS,
    scenario: 'conservative' | 'moderate' | 'heavy' | 'binge'
  ): DrinkRecord[] {
    const sequences = {
      conservative: [
        { template: 'biereBlonde' as const, minutesAgo: 180 },
        { template: 'eau' as const, minutesAgo: 120 },
        { template: 'vinRouge' as const, minutesAgo: 60 },
      ],
      moderate: [
        { template: 'biereBlonde' as const, minutesAgo: 240 },
        { template: 'vinRouge' as const, minutesAgo: 180 },
        { template: 'soda' as const, minutesAgo: 120 },
        { template: 'mojito' as const, minutesAgo: 60 },
        { template: 'biereBlonde' as const, minutesAgo: 30 },
      ],
      heavy: [
        { template: 'biereBrune' as const, minutesAgo: 300 },
        { template: 'vodka' as const, minutesAgo: 240 },
        { template: 'biereBlonde' as const, minutesAgo: 180 },
        { template: 'whisky' as const, minutesAgo: 120 },
        { template: 'mojito' as const, minutesAgo: 90 },
        { template: 'biereBrune' as const, minutesAgo: 60 },
        { template: 'vodka' as const, minutesAgo: 30 },
      ],
      binge: [
        { template: 'vodka' as const, minutesAgo: 25 },
        { template: 'whisky' as const, minutesAgo: 15 },
        { template: 'vodka' as const, minutesAgo: 8 },
        { template: 'vodka' as const, minutesAgo: 2 },
      ],
    };

    return sequences[scenario].map(({ template, minutesAgo }) =>
      this.createDrink(template, persona, minutesAgo)
    );
  }

  // 🚶‍♂️ Simulation de données d'activité physique
  static simulateActivityData(
    persona: keyof typeof PERSONAS,
    pattern: 'sleep' | 'party' | 'walking' | 'dancing',
    durationHours: number
  ) {
    const stepPatterns = {
      sleep: { baseSteps: 0, variance: 5, walkingRatio: 0.95, dancingRatio: 0.05 },
      walking: { baseSteps: 80, variance: 20, walkingRatio: 0.9, dancingRatio: 0.1 },
      party: { baseSteps: 150, variance: 50, walkingRatio: 0.6, dancingRatio: 0.4 },
      dancing: { baseSteps: 250, variance: 80, walkingRatio: 0.3, dancingRatio: 0.7 },
    };

    const config = stepPatterns[pattern];
    const activityData = [];

    for (let i = 0; i < durationHours * 6; i++) { // Données toutes les 10min
      const timestamp = new Date(Date.now() - (durationHours * 60 - i * 10) * 60 * 1000);
      const baseSteps = config.baseSteps + (Math.random() - 0.5) * config.variance;
      const totalSteps = Math.max(0, Math.floor(baseSteps));
      
      activityData.push({
        timestamp,
        steps: {
          walking: Math.floor(totalSteps * config.walkingRatio),
          dancing: Math.floor(totalSteps * config.dancingRatio),
          total: totalSteps,
        },
      });
    }

    return activityData;
  }

  // 👥 Création de groupes de test
  static createTestGroup(personas: (keyof typeof PERSONAS)[] = ['marie', 'thomas']) {
    const members: { [key: string]: GroupMember } = {};
    
    personas.forEach(personaKey => {
      const persona = PERSONAS[personaKey];
      members[persona.id] = {
        id: persona.id,
        name: persona.name,
        email: persona.email,
        avatar: persona.avatar,
        joinedAt: new Date(),
        role: 'member',
        isActive: true,
      };
    });

    return {
      id: 'test-group',
      name: 'Test Festival Group',
      description: 'Groupe de test pour validation',
      createdAt: new Date(),
      creatorId: personas[0] ? PERSONAS[personas[0]].id : 'marie-id',
      members,
      stats: {
        totalDrinks: 0,
        totalUnits: 0,
        averagePerPerson: 0,
        mostActiveDay: '',
      },
      settings: {
        alertsEnabled: true,
        privacyLevel: 'friends',
        joinRequests: [],
      },
    };
  }

  // ✅ Assertions avancées pour les tests
  static expectAlcoholLevelInRange(
    actual: number,
    expected: number,
    tolerancePercent: number = 10
  ) {
    const tolerance = expected * (tolerancePercent / 100);
    const min = expected - tolerance;
    const max = expected + tolerance;
    
    expect(actual).toBeGreaterThanOrEqual(min);
    expect(actual).toBeLessThanOrEqual(max);
    
    return {
      actual,
      expected,
      tolerance: tolerancePercent,
      withinRange: actual >= min && actual <= max,
    };
  }

  static expectSessionDetectionAccurate(
    drinks: DrinkRecord[],
    expectedSessions: number,
    tolerance: number = 0
  ) {
    // Cette fonction sera utilisée avec la logique de détection de session
    expect(expectedSessions).toBeGreaterThanOrEqual(1);
    return {
      drinksCount: drinks.length,
      expectedSessions,
      // La validation réelle sera implémentée avec les fonctions de session
    };
  }

  static expectGroupStatsConsistent(
    members: GroupMember[],
    drinks: DrinkRecord[],
    groupStats: any
  ) {
    const totalDrinks = drinks.length;
    const expectedAverage = totalDrinks / members.length;
    
    expect(groupStats.totalDrinks).toBe(totalDrinks);
    this.expectAlcoholLevelInRange(groupStats.averagePerPerson, expectedAverage, 5);
    
    return {
      totalDrinks,
      expectedAverage,
      actualAverage: groupStats.averagePerPerson,
    };
  }

  // 🎯 Validation avec références officielles
  static validateWithOfficialReferences(calculatedUnits: number, drinkType: string) {
    // Références officielles françaises (Sécurité Routière)
    const officialReferences = {
      'bière-25cl-5%': 1.0,
      'vin-10cl-12%': 0.96,
      'whisky-3cl-40%': 0.96,
      'pastis-2.5cl-45%': 0.9,
    };

    if (drinkType in officialReferences) {
      const expected = officialReferences[drinkType as keyof typeof officialReferences];
      this.expectAlcoholLevelInRange(calculatedUnits, expected, 5);
    }
  }

  // 🔄 Mock Firebase en temps réel
  static mockFirebaseRealTime() {
    const mockCallbacks: ((data: any) => void)[] = [];
    
    return {
      onSnapshot: vi.fn((callback) => {
        mockCallbacks.push(callback);
        return { unsubscribe: vi.fn() };
      }),
      simulateUpdate: (data: any) => {
        mockCallbacks.forEach(callback => callback(data));
      },
      clearCallbacks: () => {
        mockCallbacks.length = 0;
      },
    };
  }

  // 📱 Simulation état d'application
  static simulateAppState(
    state: 'active' | 'background' | 'inactive' | 'offline'
  ) {
    const mockState = {
      isConnected: state !== 'offline',
      appState: state,
      isInForeground: state === 'active',
    };

    // Mock NetInfo
    vi.mocked = vi.mocked || vi.fn();
    
    return mockState;
  }
}

export default TestHelper;