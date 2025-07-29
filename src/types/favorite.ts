export interface UserFavorite {
  id: string;
  userId: string;
  eventId: string;
  groupId: string;
  reminderMinutes: number; // 5, 15, 30, etc.
  isActive: boolean;
  createdAt: Date;
  notificationId?: string; // ID de la notification programmée
}

export interface FavoriteInput {
  eventId: string;
  reminderMinutes: number;
}

export interface ReminderOption {
  label: string;
  value: number;
  icon: string;
}