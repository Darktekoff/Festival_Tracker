import { db } from '../config/firebase';
import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  getDocs,
  writeBatch,
  serverTimestamp
} from 'firebase/firestore';
import { FestivalLineup, LineupEvent, LineupDay, CurrentlyPlaying } from '../types';
import { format, parseISO, isWithinInterval, addMinutes, addDays } from 'date-fns';

class LineupService {
  private readonly COLLECTION_NAME = 'lineups';

  // Récupérer la programmation complète d'un groupe
  async getLineup(groupId: string): Promise<FestivalLineup | null> {
    try {
      const lineupRef = doc(db, this.COLLECTION_NAME, groupId);
      const lineupSnap = await getDoc(lineupRef);
      
      if (!lineupSnap.exists()) {
        return null;
      }
      
      const data = lineupSnap.data();
      return {
        ...data,
        lastUpdated: data.lastUpdated?.toDate() || new Date(),
        days: data.days?.map((day: any) => ({
          ...day,
          events: day.events?.map((event: any) => ({
            ...event,
            startTime: event.startTime?.toDate() || new Date(),
            endTime: event.endTime?.toDate() || new Date()
          })) || []
        })) || []
      } as FestivalLineup;
    } catch (error) {
      console.error('Error fetching lineup:', error);
      throw error;
    }
  }

  // Créer ou mettre à jour la programmation
  async updateLineup(lineup: FestivalLineup): Promise<void> {
    try {
      const lineupRef = doc(db, this.COLLECTION_NAME, lineup.id);
      
      const lineupData = {
        ...lineup,
        lastUpdated: serverTimestamp(),
        days: lineup.days.map(day => ({
          ...day,
          events: day.events.map(event => {
            const cleanEvent: any = {
              id: event.id,
              artistName: event.artistName,
              stageName: event.stageName,
              startTime: event.startTime,
              endTime: event.endTime
            };
            
            // Ajouter seulement les champs définis
            if (event.genre && event.genre.trim()) {
              cleanEvent.genre = event.genre;
            }
            if (event.description && event.description.trim()) {
              cleanEvent.description = event.description;
            }
            
            return cleanEvent;
          })
        }))
      };
      
      await setDoc(lineupRef, lineupData);
    } catch (error) {
      console.error('Error updating lineup:', error);
      throw error;
    }
  }

  // Ajouter un événement à une journée spécifique
  async addEvent(groupId: string, date: string, event: Omit<LineupEvent, 'id'>): Promise<string> {
    try {
      const lineup = await this.getLineup(groupId);
      if (!lineup) {
        throw new Error('Lineup not found');
      }

      const eventId = `${groupId}_${date}_${Date.now()}`;
      const newEvent: LineupEvent = {
        ...event,
        id: eventId
      };

      // Trouver ou créer la journée
      let dayIndex = lineup.days.findIndex(day => day.date === date);
      if (dayIndex === -1) {
        lineup.days.push({ date, events: [] });
        dayIndex = lineup.days.length - 1;
      }

      lineup.days[dayIndex].events.push(newEvent);
      
      // Trier les événements par heure de début
      lineup.days[dayIndex].events.sort((a, b) => 
        this.getFestivalSortTime(a) - this.getFestivalSortTime(b)
      );

      await this.updateLineup(lineup);
      return eventId;
    } catch (error) {
      console.error('Error adding event:', error);
      throw error;
    }
  }

  // Supprimer un événement
  async deleteEvent(groupId: string, eventId: string): Promise<void> {
    try {
      const lineup = await this.getLineup(groupId);
      if (!lineup) {
        throw new Error('Lineup not found');
      }

      // Trouver et supprimer l'événement
      lineup.days = lineup.days.map(day => ({
        ...day,
        events: day.events.filter(event => event.id !== eventId)
      }));

      await this.updateLineup(lineup);
    } catch (error) {
      console.error('Error deleting event:', error);
      throw error;
    }
  }

  // Mettre à jour les scènes disponibles
  async updateStages(groupId: string, stages: string[], updatedBy: string): Promise<void> {
    try {
      const lineupRef = doc(db, this.COLLECTION_NAME, groupId);
      await updateDoc(lineupRef, {
        stages,
        lastUpdated: serverTimestamp(),
        updatedBy
      });
    } catch (error) {
      console.error('Error updating stages:', error);
      throw error;
    }
  }

  // Obtenir l'événement en cours de diffusion
  getCurrentlyPlaying(lineup: FestivalLineup): CurrentlyPlaying {
    const now = new Date();
    const today = format(now, 'yyyy-MM-dd');
    
    const todayEvents = lineup.days
      .find(day => day.date === today)
      ?.events || [];

    // Trouver l'événement en cours
    const currentEvent = todayEvents.find(event => 
      isWithinInterval(now, { start: event.startTime, end: event.endTime })
    );

    // Trouver le prochain événement
    const futureEvents = todayEvents
      .filter(event => event.startTime > now)
      .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
    
    const nextEvent = futureEvents[0] || null;
    
    const timeUntilNext = nextEvent 
      ? Math.floor((nextEvent.startTime.getTime() - now.getTime()) / (1000 * 60))
      : undefined;

    return {
      event: currentEvent || null,
      isLive: !!currentEvent,
      nextEvent,
      timeUntilNext
    };
  }

  // Initialiser une programmation vide pour un nouveau groupe
  async initializeLineup(groupId: string, stages: string[] = ['Main Stage'], createdBy: string): Promise<void> {
    try {
      const lineup: FestivalLineup = {
        id: groupId,
        stages,
        days: [],
        lastUpdated: new Date(),
        updatedBy: createdBy
      };

      await this.updateLineup(lineup);
    } catch (error) {
      console.error('Error initializing lineup:', error);
      throw error;
    }
  }

  // Obtenir les événements d'une journée spécifique
  getDayEvents(lineup: FestivalLineup, date: string): LineupEvent[] {
    const day = lineup.days.find(d => d.date === date);
    return day ? day.events.sort((a, b) => this.getFestivalSortTime(a) - this.getFestivalSortTime(b)) : [];
  }

  // Obtenir toutes les dates disponibles
  getAvailableDates(lineup: FestivalLineup): string[] {
    return lineup.days
      .map(day => day.date)
      .sort();
  }

  // Importer une programmation depuis un CSV
  async importFromCSV(groupId: string, csvContent: string, updatedBy: string): Promise<void> {
    try {
      const events = this.parseCSV(csvContent);
      
      if (events.length === 0) {
        throw new Error('Aucun événement valide trouvé dans le fichier CSV');
      }

      // Calculer les heures de fin basées sur le prochain événement
      const eventsWithCalculatedEndTimes = this.calculateEndTimes(events);

      // Grouper les événements par date
      const eventsByDate = new Map<string, LineupEvent[]>();
      const stages = new Set<string>();

      eventsWithCalculatedEndTimes.forEach(event => {
        // Utiliser la date originale du CSV, pas la date calculée de startTime
        const dateStr = (event as any).originalDate || format(event.startTime, 'yyyy-MM-dd');
        
        if (!eventsByDate.has(dateStr)) {
          eventsByDate.set(dateStr, []);
        }
        
        eventsByDate.get(dateStr)!.push(event);
        stages.add(event.stageName);
      });

      // Créer la programmation
      const lineup: FestivalLineup = {
        id: groupId,
        stages: Array.from(stages),
        days: Array.from(eventsByDate.entries()).map(([date, events]) => ({
          date,
          events: events.sort((a, b) => this.getFestivalSortTime(a) - this.getFestivalSortTime(b))
        })),
        lastUpdated: new Date(),
        updatedBy
      };

      await this.updateLineup(lineup);
    } catch (error) {
      console.error('Error importing CSV:', error);
      throw error;
    }
  }

  // Calculer les heures de fin basées sur le prochain événement de la même scène
  private calculateEndTimes(events: LineupEvent[]): LineupEvent[] {
    // Trier tous les événements par scène puis par heure de début
    const eventsByStage = events.reduce((acc, event) => {
      if (!acc[event.stageName]) {
        acc[event.stageName] = [];
      }
      acc[event.stageName].push(event);
      return acc;
    }, {} as Record<string, LineupEvent[]>);

    // Pour chaque scène, calculer les heures de fin
    Object.keys(eventsByStage).forEach(stageName => {
      const stageEvents = eventsByStage[stageName].sort((a, b) => 
        this.getFestivalSortTime(a) - this.getFestivalSortTime(b)
      );

      for (let i = 0; i < stageEvents.length; i++) {
        const currentEvent = stageEvents[i];
        const nextEvent = stageEvents[i + 1];

        if (nextEvent) {
          // L'heure de fin = heure de début du prochain événement
          currentEvent.endTime = new Date(nextEvent.startTime);
        } else {
          // Dernier événement de la scène : durée par défaut de 1h30 (plus long pour le closing)
          currentEvent.endTime = addMinutes(currentEvent.startTime, 90);
        }
      }
    });

    return events;
  }

  // Parser le contenu CSV
  private parseCSV(csvContent: string): LineupEvent[] {
    const lines = csvContent.split('\n').filter(line => line.trim());
    const events: LineupEvent[] = [];
    
    // Ignorer la première ligne si c'est un header
    const startIndex = this.isHeaderLine(lines[0]) ? 1 : 0;
    
    for (let i = startIndex; i < lines.length; i++) {
      try {
        const event = this.parseCSVLine(lines[i], i + 1);
        if (event) {
          events.push(event);
        }
      } catch (error) {
        console.warn(`Error parsing line ${i + 1}:`, error);
        // Continuer avec les autres lignes
      }
    }
    
    return events;
  }

  // Vérifier si la première ligne est un header
  private isHeaderLine(line: string): boolean {
    const lowerLine = line.toLowerCase();
    return lowerLine.includes('artiste') || 
           lowerLine.includes('artist') || 
           lowerLine.includes('scene') || 
           lowerLine.includes('stage') ||
           lowerLine.includes('heure') ||
           lowerLine.includes('time') ||
           lowerLine.includes('jour') ||
           lowerLine.includes('date');
  }

  // Parser une ligne CSV
  private parseCSVLine(line: string, lineNumber: number): LineupEvent | null {
    // Parser CSV simple (peut être amélioré pour gérer les guillemets, etc.)
    const columns = line.split(',').map(col => col.trim().replace(/"/g, ''));
    
    if (columns.length < 3) {
      throw new Error(`Ligne ${lineNumber}: Pas assez de colonnes (minimum 3 requis)`);
    }

    // Détecter le format : soit [Date,Stage,Heure_debut,Heure_fin,Artiste...] soit [Jour,Stage,Heure,Artiste]
    let dateStr: string, stageName: string, timeStr: string, artistName: string;
    let genre: string | undefined, description: string | undefined;
    let endTimeStr: string | undefined;

    if (columns.length === 4 && !this.isTimeFormat(columns[3])) {
      // Format Eskape : Jour,Stage,Heure,Artiste
      [dateStr, stageName, timeStr, artistName] = columns;
    } else if (columns.length >= 5 && this.isTimeFormat(columns[3])) {
      // Format avec heure de fin : Date,Stage,Heure_debut,Heure_fin,Artiste,Genre,Description
      [dateStr, stageName, timeStr, endTimeStr, artistName] = columns;
      genre = columns[5];
      description = columns[6];
    } else {
      // Format standard : Date,Stage,Heure,Artiste,Genre,Description
      [dateStr, stageName, timeStr, artistName] = columns;
      genre = columns[4];
      description = columns[5];
    }
    
    if (!dateStr || !stageName || !timeStr || !artistName) {
      throw new Error(`Ligne ${lineNumber}: Champs obligatoires manquants`);
    }

    // Parser la date (gère maintenant le format français)
    const eventDate = this.parseDate(dateStr);
    if (!eventDate) {
      throw new Error(`Ligne ${lineNumber}: Format de date invalide "${dateStr}"`);
    }

    // Parser l'heure
    const startTime = this.parseTime(eventDate, timeStr);
    if (!startTime) {
      throw new Error(`Ligne ${lineNumber}: Format d'heure invalide "${timeStr}"`);
    }

    // EndTime temporaire - sera recalculé par calculateEndTimes()
    let endTime: Date;
    if (endTimeStr && this.isTimeFormat(endTimeStr)) {
      // Si une heure de fin est explicitement fournie, la garder
      endTime = this.parseTime(eventDate, endTimeStr);
      if (endTime <= startTime) {
        endTime = addDays(endTime, 1);
      }
    } else {
      // Sinon, endTime temporaire - sera ajustée par calculateEndTimes()
      endTime = addMinutes(startTime, 60);
    }

    const event: LineupEvent = {
      id: `csv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      artistName,
      stageName,
      startTime,
      endTime
    };

    // Ajouter seulement les champs définis et non vides
    if (genre && genre.trim()) {
      event.genre = genre.trim();
    }
    if (description && description.trim()) {
      event.description = description.trim();
    }

    // Stocker la date originale pour le groupement (format YYYY-MM-DD)
    (event as any).originalDate = format(eventDate, 'yyyy-MM-dd');

    return event;
  }

  // Parser une date au format DD/MM/YYYY, YYYY-MM-DD ou format français
  private parseDate(dateStr: string): Date | null {
    try {
      // Essayer DD/MM/YYYY
      if (dateStr.includes('/')) {
        const [day, month, year] = dateStr.split('/').map(Number);
        if (day && month && year) {
          return new Date(year, month - 1, day);
        }
      }
      
      // Essayer YYYY-MM-DD
      if (dateStr.includes('-')) {
        const date = parseISO(dateStr);
        if (!isNaN(date.getTime())) {
          return date;
        }
      }

      // Essayer format français "Vendredi 01 Août"
      if (dateStr.includes(' ')) {
        const parts = dateStr.split(' ');
        if (parts.length >= 3) {
          const day = parseInt(parts[1]);
          const monthName = parts[2].toLowerCase();
          
          const monthMap: { [key: string]: number } = {
            'janvier': 0, 'février': 1, 'mars': 2, 'avril': 3,
            'mai': 4, 'juin': 5, 'juillet': 6, 'août': 7,
            'septembre': 8, 'octobre': 9, 'novembre': 10, 'décembre': 11
          };
          
          const month = monthMap[monthName];
          if (day && month !== undefined) {
            // Année par défaut 2025 pour Eskape Festival
            return new Date(2025, month, day);
          }
        }
      }
      
      return null;
    } catch {
      return null;
    }
  }

  // Parser une heure au format HH:MM ou HHhMM
  private parseTime(baseDate: Date, timeStr: string): Date | null {
    try {
      let hours: number, minutes: number;
      
      if (timeStr.includes(':')) {
        // Format HH:MM
        [hours, minutes] = timeStr.split(':').map(Number);
      } else if (timeStr.includes('h')) {
        // Format français HHhMM
        const parts = timeStr.split('h');
        hours = parseInt(parts[0]);
        minutes = parts[1] ? parseInt(parts[1]) : 0;
      } else {
        return null;
      }
      
      if (isNaN(hours) || isNaN(minutes)) {
        return null;
      }
      
      const time = new Date(baseDate);
      time.setHours(hours, minutes, 0, 0);
      return time;
    } catch {
      return null;
    }
  }

  // Vérifier si une chaîne est au format heure
  private isTimeFormat(str: string): boolean {
    return /^\d{1,2}:\d{2}$/.test(str) || /^\d{1,2}h\d{0,2}$/.test(str);
  }

  // Fonction de tri pour les événements de festival (00h-06h = fin de soirée)
  private getFestivalSortTime(event: LineupEvent): number {
    const hours = event.startTime.getHours();
    const minutes = event.startTime.getMinutes();
    
    // Les heures 00h-06h sont considérées comme 24h-30h pour le tri
    if (hours >= 0 && hours < 6) {
      return (hours + 24) * 60 + minutes;
    }
    
    return hours * 60 + minutes;
  }

  // Générer un exemple de CSV
  generateCSVTemplate(): string {
    return `Date,Scene,Heure_debut,Heure_fin,Artiste,Genre,Description
15/07/2024,Main Stage,14:00,15:00,Example Artist,Rock,Description optionnelle
15/07/2024,Second Stage,15:30,16:30,Another Artist,Electronic,
16/07/2024,Main Stage,20:00,21:30,Headliner,Pop,Concert principal`;
  }
}

export default new LineupService();