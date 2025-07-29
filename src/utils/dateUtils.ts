import { format, isToday, isYesterday, isSameDay, differenceInDays, startOfDay, endOfDay } from 'date-fns';
import { fr } from 'date-fns/locale';

export function formatDate(date: Date, formatStr: string = 'dd/MM/yyyy'): string {
  return format(date, formatStr, { locale: fr });
}

export function formatDateTime(date: Date): string {
  if (isToday(date)) {
    return `Aujourd'hui à ${format(date, 'HH:mm')}`;
  }
  if (isYesterday(date)) {
    return `Hier à ${format(date, 'HH:mm')}`;
  }
  return format(date, 'dd/MM à HH:mm', { locale: fr });
}

export function formatRelativeDate(date: Date): string {
  if (isToday(date)) return "Aujourd'hui";
  if (isYesterday(date)) return "Hier";
  
  const days = differenceInDays(new Date(), date);
  if (days < 7) return `Il y a ${days} jours`;
  if (days < 30) return `Il y a ${Math.floor(days / 7)} semaines`;
  
  return format(date, 'dd/MM/yyyy');
}

export function formatTime(date: Date): string {
  return format(date, 'HH:mm');
}

export function getDayPeriod(date: Date): 'morning' | 'afternoon' | 'evening' | 'night' {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 22) return 'evening';
  return 'night';
}

export function getDayPeriodLabel(period: 'morning' | 'afternoon' | 'evening' | 'night'): string {
  switch (period) {
    case 'morning': return 'Matin';
    case 'afternoon': return 'Après-midi';
    case 'evening': return 'Soirée';
    case 'night': return 'Nuit';
  }
}

export function groupByDay<T extends { timestamp: Date }>(items: T[]): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  
  items.forEach(item => {
    const dayKey = format(item.timestamp, 'yyyy-MM-dd');
    const dayItems = groups.get(dayKey) || [];
    dayItems.push(item);
    groups.set(dayKey, dayItems);
  });
  
  return groups;
}

export function getDateRange(startDate: Date, endDate: Date): Date[] {
  const dates: Date[] = [];
  const currentDate = new Date(startDate);
  
  while (currentDate <= endDate) {
    dates.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return dates;
}

export function isInDateRange(date: Date, startDate: Date, endDate: Date): boolean {
  return date >= startDate && date <= endDate;
}

export function getStartOfDay(date: Date = new Date()): Date {
  return startOfDay(date);
}

export function getEndOfDay(date: Date = new Date()): Date {
  return endOfDay(date);
}

export function getDaysUntil(date: Date): number {
  const today = startOfDay(new Date());
  const target = startOfDay(date);
  return differenceInDays(target, today);
}

export function formatDuration(startDate: Date, endDate: Date): string {
  const days = differenceInDays(endDate, startDate) + 1;
  if (days === 1) return '1 jour';
  return `${days} jours`;
}

export function getTimeSlots(interval: number = 30): string[] {
  const slots: string[] = [];
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  
  for (let i = 0; i < 24 * 60; i += interval) {
    const hours = Math.floor(i / 60);
    const minutes = i % 60;
    date.setHours(hours, minutes);
    slots.push(format(date, 'HH:mm'));
  }
  
  return slots;
}

export function getTimeAgo(date: Date): string {
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (seconds < 60) return "à l'instant";
  if (seconds < 3600) return `il y a ${Math.floor(seconds / 60)} min`;
  if (seconds < 86400) return `il y a ${Math.floor(seconds / 3600)}h`;
  if (seconds < 604800) return `il y a ${Math.floor(seconds / 86400)}j`;
  
  return format(date, 'dd/MM');
}