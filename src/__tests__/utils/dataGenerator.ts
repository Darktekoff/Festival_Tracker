import { LineupEvent, FestivalZone } from '../../types';
import { PERSONAS, DRINK_TEMPLATES } from './testHelper';

export class DataGenerator {
  // 🎵 Génération de lineup de festival réaliste
  static generateFestivalLineup(days: number = 3, artistsPerDay: number = 15): LineupEvent[] {
    const artists = [
      'Daft Punk', 'David Guetta', 'Martin Garrix', 'Calvin Harris', 'Tiësto',
      'Armin van Buuren', 'Deadmau5', 'Skrillex', 'Diplo', 'Marshmello',
      'The Chainsmokers', 'Zedd', 'Avicii', 'Swedish House Mafia', 'Disclosure',
      'Flume', 'ODESZA', 'Porter Robinson', 'Madeon', 'Justice',
      'Moderat', 'Bicep', 'Lane 8', 'Yotto', 'Ben Böhmer',
      'Artbat', 'Tale Of Us', 'Solomun', 'Maceo Plex', 'Carl Cox',
      'Charlotte de Witte', 'Amelie Lens', 'Boris Brejcha', 'Stephan Bodzin', 'Nina Kraviz',
      'Peggy Gou', 'I Hate Models', 'Indira Paganotto', 'Alignment', 'Klangkuenstler',
      'Âme', 'Dixon', 'Rødhåd', 'Ben Klock', 'Marcel Dettmann',
    ];

    const genres = [
      'House', 'Techno', 'Progressive', 'Trance', 'Electro',
      'Deep House', 'Tech House', 'Minimal', 'Ambient', 'Breakbeat'
    ];

    const stages = [
      { name: 'Main Stage', id: 'main' },
      { name: 'Techno Temple', id: 'techno' },
      { name: 'House Garden', id: 'house' },
      { name: 'Underground', id: 'underground' },
      { name: 'Chill Zone', id: 'chill' },
    ];

    const events: LineupEvent[] = [];
    let eventId = 1;

    for (let day = 0; day < days; day++) {
      const baseDate = new Date('2025-07-25');
      baseDate.setDate(baseDate.getDate() + day);

      for (let i = 0; i < artistsPerDay; i++) {
        const stage = stages[Math.floor(Math.random() * stages.length)];
        const artist = artists[Math.floor(Math.random() * artists.length)];
        const genre = genres[Math.floor(Math.random() * genres.length)];
        
        // Horaires réalistes : 14h à 6h du matin
        const startHour = 14 + (i * 10) / artistsPerDay + Math.random() * 2;
        const adjustedStartHour = startHour > 24 ? startHour - 24 : startHour;
        
        const startTime = new Date(baseDate);
        if (adjustedStartHour < 14 && day > 0) {
          startTime.setDate(startTime.getDate() + 1);
        }
        startTime.setHours(Math.floor(adjustedStartHour), Math.floor((adjustedStartHour % 1) * 60));
        
        const endTime = new Date(startTime);
        endTime.setMinutes(endTime.getMinutes() + 60 + Math.random() * 60); // 60-120min sets

        events.push({
          id: `event-${eventId++}`,
          festivalId: 'test-festival',
          artistName: artist,
          stageName: stage.name,
          stageId: stage.id,
          startTime,
          endTime,
          genre,
          description: `${artist} live au ${stage.name}`,
          imageUrl: `https://example.com/artists/${artist.toLowerCase().replace(' ', '-')}.jpg`,
          spotifyUrl: `https://spotify.com/artist/${artist.toLowerCase().replace(' ', '-')}`,
          tags: [genre, stage.name.toLowerCase()],
          isHeadliner: Math.random() > 0.8,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    }

    return events.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
  }

  // 🗺️ Génération de zones de festival
  static generateFestivalZones(): FestivalZone[] {
    return [
      {
        id: 'main-stage',
        name: 'Main Stage',
        type: 'stage',
        coordinates: [
          { latitude: 45.7640, longitude: 4.8357 },
          { latitude: 45.7645, longitude: 4.8357 },
          { latitude: 45.7645, longitude: 4.8365 },
          { latitude: 45.7640, longitude: 4.8365 },
        ],
        radius: 50,
        description: 'Scène principale du festival',
        amenities: ['bar', 'toilets', 'food'],
      },
      {
        id: 'techno-temple',
        name: 'Techno Temple',
        type: 'stage',
        coordinates: [
          { latitude: 45.7650, longitude: 4.8370 },
          { latitude: 45.7655, longitude: 4.8370 },
          { latitude: 45.7655, longitude: 4.8378 },
          { latitude: 45.7650, longitude: 4.8378 },
        ],
        radius: 30,
        description: 'Temple de la techno',
        amenities: ['bar'],
      },
      {
        id: 'food-court',
        name: 'Food Court',
        type: 'food',
        coordinates: [
          { latitude: 45.7630, longitude: 4.8360 },
          { latitude: 45.7635, longitude: 4.8360 },
          { latitude: 45.7635, longitude: 4.8368 },
          { latitude: 45.7630, longitude: 4.8368 },
        ],
        radius: 25,
        description: 'Zone restauration',
        amenities: ['food', 'seating'],
      },
      {
        id: 'chill-zone',
        name: 'Chill Zone',
        type: 'chill',
        coordinates: [
          { latitude: 45.7620, longitude: 4.8340 },
          { latitude: 45.7625, longitude: 4.8340 },
          { latitude: 45.7625, longitude: 4.8348 },
          { latitude: 45.7620, longitude: 4.8348 },
        ],
        radius: 40,
        description: 'Zone de détente',
        amenities: ['seating', 'shade'],
      },
      {
        id: 'camping',
        name: 'Camping',
        type: 'camping',
        coordinates: [
          { latitude: 45.7600, longitude: 4.8320 },
          { latitude: 45.7610, longitude: 4.8320 },
          { latitude: 45.7610, longitude: 4.8340 },
          { latitude: 45.7600, longitude: 4.8340 },
        ],
        radius: 100,
        description: 'Zone de camping',
        amenities: ['toilets', 'showers', 'security'],
      },
    ];
  }

  // 🍺 Génération de patterns de consommation réalistes
  static generateDrinkPattern(
    type: 'conservative' | 'moderate' | 'heavy' | 'party-animal',
    durationHours: number = 8
  ) {
    const patterns = {
      conservative: {
        drinksPerHour: 0.5,
        alcoholRatio: 0.7,
        waterBreaks: 0.3,
        preferredDrinks: ['biereBlonde', 'vinRouge', 'eau'],
      },
      moderate: {
        drinksPerHour: 1.0,
        alcoholRatio: 0.8,
        waterBreaks: 0.2,
        preferredDrinks: ['biereBlonde', 'mojito', 'vinRouge', 'soda'],
      },
      heavy: {
        drinksPerHour: 1.5,
        alcoholRatio: 0.9,
        waterBreaks: 0.1,
        preferredDrinks: ['biereBrune', 'vodka', 'whisky', 'mojito'],
      },
      'party-animal': {
        drinksPerHour: 2.0,
        alcoholRatio: 0.95,
        waterBreaks: 0.05,
        preferredDrinks: ['vodka', 'whisky', 'biereBrune', 'champagne'],
      },
    };

    const config = patterns[type];
    const totalDrinks = Math.floor(durationHours * config.drinksPerHour);
    const drinkTimes: number[] = [];

    // Génération des timestamps réalistes (pas uniformes)
    for (let i = 0; i < totalDrinks; i++) {
      const baseTime = (i / totalDrinks) * durationHours * 60; // En minutes
      const variation = (Math.random() - 0.5) * 30; // ±15min variation
      drinkTimes.push(Math.max(0, baseTime + variation));
    }

    return drinkTimes.map((minutesAgo, index) => {
      const isAlcoholic = Math.random() < config.alcoholRatio;
      const shouldTakeWaterBreak = Math.random() < config.waterBreaks;
      
      let drinkType: keyof typeof DRINK_TEMPLATES;
      
      if (shouldTakeWaterBreak || !isAlcoholic) {
        drinkType = Math.random() > 0.5 ? 'eau' : 'soda';
      } else {
        const alcoholicDrinks = config.preferredDrinks.filter(
          drink => DRINK_TEMPLATES[drink as keyof typeof DRINK_TEMPLATES].degree > 0
        );
        drinkType = alcoholicDrinks[
          Math.floor(Math.random() * alcoholicDrinks.length)
        ] as keyof typeof DRINK_TEMPLATES;
      }

      return {
        drinkType,
        minutesAgo: Math.floor(durationHours * 60 - minutesAgo),
        index,
      };
    });
  }

  // 👥 Génération de groupes diversifiés
  static generateGroupMembers(
    count: number = 4,
    diversity: boolean = true
  ) {
    const allPersonas = Object.keys(PERSONAS) as (keyof typeof PERSONAS)[];
    
    if (!diversity || count <= allPersonas.length) {
      return allPersonas.slice(0, count);
    }

    // Si on a besoin de plus de personas que disponibles, on les duplique avec variations
    const members: (keyof typeof PERSONAS)[] = [];
    for (let i = 0; i < count; i++) {
      members.push(allPersonas[i % allPersonas.length]);
    }
    
    return members;
  }

  // 🚶‍♂️ Génération de patterns d'activité physique complexes
  static generateActivityPattern(
    scenario: 'festival-day' | 'party-night' | 'rest-day' | 'mixed',
    durationHours: number = 24
  ) {
    const scenarios = {
      'festival-day': [
        { pattern: 'sleep', hours: 8 },      // 0h-8h : sommeil
        { pattern: 'walking', hours: 4 },    // 8h-12h : marche vers festival
        { pattern: 'party', hours: 8 },      // 12h-20h : festival actif
        { pattern: 'dancing', hours: 4 },    // 20h-24h : soirée danse
      ],
      'party-night': [
        { pattern: 'party', hours: 6 },      // 18h-24h : début soirée
        { pattern: 'dancing', hours: 6 },    // 0h-6h : nuit de fête
        { pattern: 'sleep', hours: 12 },     // 6h-18h : récupération
      ],
      'rest-day': [
        { pattern: 'sleep', hours: 12 },     // Récupération
        { pattern: 'walking', hours: 6 },    // Activité légère
        { pattern: 'sleep', hours: 6 },      // Sieste
      ],
      'mixed': [
        { pattern: 'walking', hours: 6 },
        { pattern: 'party', hours: 8 },
        { pattern: 'dancing', hours: 4 },
        { pattern: 'sleep', hours: 6 },
      ],
    };

    const config = scenarios[scenario];
    let currentHour = 0;
    const activities: Array<{
      startHour: number;
      endHour: number;
      pattern: 'sleep' | 'walking' | 'party' | 'dancing';
      expectedSteps: number;
    }> = [];

    config.forEach(({ pattern, hours }) => {
      const startHour = currentHour;
      const endHour = Math.min(currentHour + hours, durationHours);
      
      const stepRanges = {
        sleep: { min: 0, max: 50 },
        walking: { min: 1500, max: 3000 },
        party: { min: 3000, max: 6000 },
        dancing: { min: 6000, max: 12000 },
      };

      const range = stepRanges[pattern];
      const expectedSteps = Math.floor(
        range.min + Math.random() * (range.max - range.min)
      );

      activities.push({
        startHour,
        endHour,
        pattern,
        expectedSteps,
      });

      currentHour = endHour;
    });

    return activities;
  }

  // 🎯 Génération de scénarios de test complets
  static generateCompleteTestScenario(
    name: string,
    personas: (keyof typeof PERSONAS)[],
    durationHours: number = 24
  ) {
    const lineup = this.generateFestivalLineup(1, 10);
    const zones = this.generateFestivalZones();
    
    const scenario = {
      name,
      duration: durationHours,
      personas: personas.map(p => PERSONAS[p]),
      lineup,
      zones,
      drinkPatterns: personas.map(persona => ({
        persona,
        pattern: this.generateDrinkPattern('moderate', durationHours),
      })),
      activityPatterns: personas.map(persona => ({
        persona,
        activities: this.generateActivityPattern('festival-day', durationHours),
      })),
      expectedOutcomes: {
        totalSessions: 1, // Pas de pause 4h+ dans une journée
        avgAlcoholLevel: 0.8, // Estimation basée sur consommation modérée
        detectedSleepPeriods: personas.length, // Une période de sommeil par personne
      },
    };

    return scenario;
  }
}

export default DataGenerator;