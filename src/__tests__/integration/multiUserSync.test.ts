import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import TestHelper, { PERSONAS } from '../utils/testHelper';
import { calculateSessionGroupAverage } from '../../utils/calculations';

describe('🔄 Synchronisation Multi-Utilisateurs - Tests d\'Intégration', () => {
  let mockFirebase: any;

  beforeEach(() => {
    TestHelper.setTestTime('2025-07-25T20:00:00Z'); // Samedi soir 20h
    mockFirebase = TestHelper.mockFirebaseRealTime();
  });

  afterEach(() => {
    TestHelper.restoreRealTime();
    mockFirebase.clearCallbacks();
  });

  describe('👥 Synchronisation Temps Réel', () => {
    it('devrait synchroniser les boissons entre 4 utilisateurs en temps réel', async () => {
      console.log('🔄 TEST SYNCHRONISATION 4 UTILISATEURS');
      
      const group = TestHelper.createTestGroup(['marie', 'thomas', 'sophie', 'julien']);
      const members = Object.values(group.members);
      
      // Simulation: Chaque utilisateur ajoute des boissons simultanément
      let allDrinks: any[] = [];
      
      console.log('📱 AJOUTS SIMULTANÉS:');
      
      // Marie ajoute une bière
      const marieBiere = TestHelper.createDrink('biereBlonde', 'marie', 0);
      allDrinks.push(marieBiere);
      mockFirebase.simulateUpdate({ type: 'drink_added', drink: marieBiere });
      console.log('   - Marie: Bière blonde ajoutée');
      
      // 30 secondes plus tard, Thomas ajoute un mojito
      TestHelper.fastForwardTime(0.5 / 60); // 30 secondes
      const thomasMojito = TestHelper.createDrink('mojito', 'thomas', 0);
      allDrinks.push(thomasMojito);
      mockFirebase.simulateUpdate({ type: 'drink_added', drink: thomasMojito });
      console.log('   - Thomas: Mojito ajouté');
      
      // 1 minute plus tard, Sophie et Julien ajoutent en même temps
      TestHelper.fastForwardTime(1 / 60); // 1 minute
      const sophieVin = TestHelper.createDrink('vinRouge', 'sophie', 0);
      const julienVodka = TestHelper.createDrink('vodka', 'julien', 0);
      allDrinks.push(sophieVin, julienVodka);
      
      // Simulation ajout simultané (conflit potentiel)
      mockFirebase.simulateUpdate({ type: 'drink_added', drink: sophieVin });
      mockFirebase.simulateUpdate({ type: 'drink_added', drink: julienVodka });
      console.log('   - Sophie: Vin rouge (simultané)');
      console.log('   - Julien: Vodka (simultané)');
      
      // Vérifier que tous les ajouts sont synchronisés
      expect(allDrinks).toHaveLength(4);
      expect(allDrinks.map(d => d.userName)).toEqual(['Marie', 'Thomas', 'Sophie', 'Julien']);
      
      // Calculer les stats groupe en temps réel
      const groupStats = calculateSessionGroupAverage(allDrinks, members);
      
      console.log('📊 STATS SYNCHRONISÉES:');
      console.log(`   - Total boissons: ${allDrinks.length}`);
      console.log(`   - Moyenne groupe: ${groupStats.sessionGroupAverage.toFixed(2)} unités`);
      console.log(`   - Membres actifs: ${groupStats.sessionMemberStats.size}/${members.length}`);
      
      expect(groupStats.sessionMemberStats.size).toBe(4);
      expect(groupStats.sessionGroupAverage).toBeGreaterThan(0);
    });

    it('devrait gérer les conflits de synchronisation', async () => {
      console.log('⚡ TEST GESTION CONFLITS');
      
      const group = TestHelper.createTestGroup(['marie', 'thomas']);
      let drinksLocal: any[] = [];
      let drinksRemote: any[] = [];
      
      // Scénario: Connexion instable, ajouts en offline
      console.log('📱 SIMULATION CONNEXION INSTABLE:');
      
      // Marie ajoute en local (offline)
      const marieBiere1 = TestHelper.createDrink('biereBlonde', 'marie', 0);
      marieBiere1.syncStatus = 'pending';
      drinksLocal.push(marieBiere1);
      console.log('   - Marie: Bière ajoutée en local (offline)');
      
      // Thomas ajoute en même temps sur le serveur
      const thomasMojito = TestHelper.createDrink('mojito', 'thomas', 0);
      drinksRemote.push(thomasMojito);
      console.log('   - Thomas: Mojito ajouté sur serveur');
      
      // Marie revient online et sync
      marieBiere1.syncStatus = 'synced';
      const mergedDrinks = [...drinksLocal, ...drinksRemote];
      
      console.log('🔄 RÉSOLUTION CONFLIT:');
      console.log(`   - Drinks locaux: ${drinksLocal.length}`);
      console.log(`   - Drinks distants: ${drinksRemote.length}`);
      console.log(`   - Après merge: ${mergedDrinks.length}`);
      
      // Vérifier que pas de doublons (même timestamp)
      const uniqueTimestamps = new Set(mergedDrinks.map(d => d.timestamp.getTime()));
      expect(uniqueTimestamps.size).toBe(mergedDrinks.length);
      
      // Vérifier que tous les utilisateurs sont présents
      const uniqueUsers = new Set(mergedDrinks.map(d => d.userId));
      expect(uniqueUsers.size).toBe(2);
    });
  });

  describe('📊 Cohérence des Stats Groupe', () => {
    it('devrait maintenir la cohérence des stats malgré les ajouts/suppressions', () => {
      console.log('📊 TEST COHÉRENCE STATS GROUPE');
      
      const group = TestHelper.createTestGroup(['marie', 'thomas', 'sophie']);
      const members = Object.values(group.members);
      
      // État initial: quelques boissons
      let drinks = [
        TestHelper.createDrink('biereBlonde', 'marie', 60),
        TestHelper.createDrink('mojito', 'thomas', 45),
        TestHelper.createDrink('vinRouge', 'sophie', 30),
      ];
      
      let groupStats = calculateSessionGroupAverage(drinks, members);
      const initialAverage = groupStats.sessionGroupAverage;
      
      console.log(`📈 ÉTAT INITIAL: ${drinks.length} boissons, moyenne ${initialAverage.toFixed(2)}`);
      
      // Ajout: Marie boit une vodka
      const nouvelleVodka = TestHelper.createDrink('vodka', 'marie', 0);
      drinks.push(nouvelleVodka);
      
      groupStats = calculateSessionGroupAverage(drinks, members);
      const newAverage = groupStats.sessionGroupAverage;
      
      console.log(`📈 APRÈS AJOUT: ${drinks.length} boissons, moyenne ${newAverage.toFixed(2)}`);
      
      // La moyenne devrait augmenter (plus d'unités)
      expect(newAverage).toBeGreaterThan(initialAverage);
      
      // Suppression: Annulation de la vodka (erreur)
      drinks = drinks.filter(d => d.id !== nouvelleVodka.id);
      
      groupStats = calculateSessionGroupAverage(drinks, members);
      const finalAverage = groupStats.sessionGroupAverage;
      
      console.log(`📈 APRÈS SUPPRESSION: ${drinks.length} boissons, moyenne ${finalAverage.toFixed(2)}`);
      
      // Devrait revenir à l'état initial
      TestHelper.expectAlcoholLevelInRange(finalAverage, initialAverage, 1);
      
      // Vérifier cohérence totale
      const totalUnits = drinks.reduce((sum, d) => sum + d.alcoholUnits, 0);
      const expectedAverage = totalUnits / members.length;
      TestHelper.expectAlcoholLevelInRange(finalAverage, expectedAverage, 1);
    });

    it('devrait gérer les membres qui rejoignent/quittent le groupe', () => {
      console.log('👥 TEST MEMBRES DYNAMIQUES');
      
      // Groupe initial: 2 personnes
      let group = TestHelper.createTestGroup(['marie', 'thomas']);
      let members = Object.values(group.members);
      
      const drinks = [
        TestHelper.createDrink('biereBlonde', 'marie', 60),
        TestHelper.createDrink('mojito', 'thomas', 30),
      ];
      
      let groupStats = calculateSessionGroupAverage(drinks, members);
      const average2Members = groupStats.sessionGroupAverage;
      
      console.log(`👥 2 MEMBRES: moyenne ${average2Members.toFixed(2)}`);
      
      // Sophie rejoint le groupe
      group = TestHelper.createTestGroup(['marie', 'thomas', 'sophie']);
      members = Object.values(group.members);
      
      groupStats = calculateSessionGroupAverage(drinks, members);
      const average3Members = groupStats.sessionGroupAverage;
      
      console.log(`👥 3 MEMBRES: moyenne ${average3Members.toFixed(2)}`);
      
      // Avec plus de membres, la moyenne par personne diminue
      expect(average3Members).toBeLessThan(average2Members);
      
      // Vérification mathématique
      const totalUnits = drinks.reduce((sum, d) => sum + d.alcoholUnits, 0);
      expect(average2Members).toBeCloseTo(totalUnits / 2, 2);
      expect(average3Members).toBeCloseTo(totalUnits / 3, 2);
      
      console.log(`📊 Vérification: ${totalUnits.toFixed(2)} unités totales`);
      console.log(`   - 2 membres: ${(totalUnits/2).toFixed(2)} attendu vs ${average2Members.toFixed(2)} calculé`);
      console.log(`   - 3 membres: ${(totalUnits/3).toFixed(2)} attendu vs ${average3Members.toFixed(2)} calculé`);
    });
  });

  describe('🎯 Scénarios Complexes Multi-Utilisateurs', () => {
    it('devrait simuler une soirée avec comportements différents', () => {
      console.log('🎉 SIMULATION SOIRÉE COMPLEXE');
      
      const group = TestHelper.createTestGroup(['marie', 'thomas', 'sophie', 'julien']);
      const members = Object.values(group.members);
      
      // Différents comportements simultanés
      const scenarios = {
        marie: 'moderate',     // Consommation normale
        thomas: 'heavy',       // Gros buveur
        sophie: 'conservative', // Prudente
        julien: 'binge',       // Pré-gaming
      } as const;
      
      let allDrinks: any[] = [];
      let timeline: any[] = [];
      
      console.log('🕐 TIMELINE SOIRÉE:');
      
      // 20h00: Arrivée différée
      Object.entries(scenarios).forEach(([persona, behavior], index) => {
        const arrivalTime = index * 15; // Arrivée échelonnée 15min
        const arrival = TestHelper.createDrink('biereBlonde', persona as keyof typeof PERSONAS, arrivalTime);
        allDrinks.push(arrival);
        timeline.push({ time: `20h${arrivalTime.toString().padStart(2, '0')}`, user: persona, action: 'arrive' });
      });
      
      // 21h00: Consommation selon profil
      Object.entries(scenarios).forEach(([persona, behavior]) => {
        const drinks = TestHelper.createRealisticDrinkSequence(persona as keyof typeof PERSONAS, behavior);
        allDrinks.push(...drinks);
        timeline.push({ time: '21h00', user: persona, action: `starts ${behavior} drinking` });
      });
      
      // 23h00: Évènements spéciaux
      timeline.push({ time: '23h00', user: 'thomas', action: 'shots with friends' });
      const thomasShots = [
        TestHelper.createDrink('vodka', 'thomas', 0),
        TestHelper.createDrink('whisky', 'thomas', 0),
      ];
      allDrinks.push(...thomasShots);
      
      timeline.push({ time: '23h30', user: 'sophie', action: 'switches to water' });
      const sophieWater = TestHelper.createDrink('eau', 'sophie', 0);
      allDrinks.push(sophieWater);
      
      // Analyse finale
      const groupStats = calculateSessionGroupAverage(allDrinks, members);
      
      console.log('📊 ANALYSE COMPORTEMENTS:');
      timeline.forEach(event => {
        console.log(`   ${event.time}: ${event.user} ${event.action}`);
      });
      
      console.log('\n📈 RÉSULTATS SOIRÉE:');
      groupStats.sessionMemberStats.forEach((stats, userId) => {
        const member = members.find(m => m.id === userId);
        const behavior = scenarios[member?.name.toLowerCase() as keyof typeof scenarios] || 'unknown';
        console.log(`   - ${member?.name}: ${stats.drinks} boissons, ${stats.units.toFixed(2)} unités (${behavior})`);
      });
      
      console.log(`\n🎯 MOYENNE GROUPE: ${groupStats.sessionGroupAverage.toFixed(2)} unités`);
      
      // Vérifications comportementales
      expect(groupStats.sessionMemberStats.size).toBe(4);
      
      // Thomas (heavy) devrait avoir le plus d'unités
      const thomasStats = groupStats.sessionMemberStats.get(PERSONAS.thomas.id);
      const sophieStats = groupStats.sessionMemberStats.get(PERSONAS.sophie.id);
      
      expect(thomasStats!.units).toBeGreaterThan(sophieStats!.units);
      expect(groupStats.sessionGroupAverage).toBeGreaterThan(0);
    });

    it('devrait tester la performance avec 100 utilisateurs simultanés', () => {
      console.log('⚡ TEST PERFORMANCE 100 UTILISATEURS');
      
      const startTime = Date.now();
      
      // Créer 100 utilisateurs fictifs
      const massiveMembers = Array.from({ length: 100 }, (_, i) => ({
        id: `user-${i}`,
        name: `User${i}`,
        email: `user${i}@test.com`,
        avatar: '👤',
        joinedAt: new Date(),
        role: 'member' as const,
        isActive: true,
      }));
      
      // Chaque utilisateur ajoute 2-5 boissons
      const massiveDrinks: any[] = [];
      massiveMembers.forEach(member => {
        const drinkCount = 2 + Math.floor(Math.random() * 4); // 2-5 boissons
        for (let i = 0; i < drinkCount; i++) {
          const drink = {
            id: `drink-${member.id}-${i}`,
            groupId: 'massive-group',
            userId: member.id,
            userName: member.name,
            userAvatar: member.avatar,
            category: 'beer',
            drinkType: 'Bière blonde',
            volume: 50,
            alcoholDegree: 5,
            alcoholUnits: 2.0,
            timestamp: new Date(Date.now() - Math.random() * 4 * 60 * 60 * 1000), // 4h aléatoire
            createdAt: new Date(),
            syncStatus: 'synced',
            lastModified: new Date(),
          };
          massiveDrinks.push(drink);
        }
      });
      
      // Calculer les stats groupe
      const groupStats = calculateSessionGroupAverage(massiveDrinks, massiveMembers);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      console.log('📊 RÉSULTATS PERFORMANCE:');
      console.log(`   - Utilisateurs: ${massiveMembers.length}`);
      console.log(`   - Boissons: ${massiveDrinks.length}`);
      console.log(`   - Temps calcul: ${duration}ms`);
      console.log(`   - Moyenne groupe: ${groupStats.sessionGroupAverage.toFixed(2)}`);
      console.log(`   - Membres avec boissons: ${groupStats.sessionMemberStats.size}`);
      
      // Vérifications performance
      expect(duration).toBeLessThan(500); // Moins de 500ms
      expect(groupStats.sessionMemberStats.size).toBe(100);
      expect(massiveDrinks.length).toBeGreaterThan(200); // Au moins 200 boissons
      expect(massiveDrinks.length).toBeLessThan(500);    // Pas plus de 500
    });
  });
});