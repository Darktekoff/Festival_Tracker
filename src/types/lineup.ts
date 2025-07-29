export interface LineupEvent {
  id: string;
  artistName: string;
  stageName: string;
  startTime: Date;
  endTime: Date;
  description?: string;
  genre?: string;
  imageUrl?: string;
}

export interface LineupDay {
  date: string; // YYYY-MM-DD format
  events: LineupEvent[];
}

export interface FestivalLineup {
  id: string; // groupId
  stages: string[]; // ["Main Stage", "Second Stage", "Tent", ...]
  days: LineupDay[];
  lastUpdated: Date;
  updatedBy: string; // userId who last updated
}

export interface LineupEventInput {
  artistName: string;
  stageName: string;
  startTime: string; // HH:MM format
  endTime: string; // HH:MM format
  description?: string;
  genre?: string;
}

export interface CurrentlyPlaying {
  event: LineupEvent | null;
  isLive: boolean;
  nextEvent: LineupEvent | null;
  timeUntilNext?: number; // minutes
}