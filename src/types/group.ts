export interface FestivalGroup {
  id: string; // Code partageable
  name: string;
  description?: string;
  createdAt: Date;
  createdBy: string;
  
  settings: {
    festivalDates: {
      start: Date;
      end: Date;
    };
    alertThresholds: {
      moderate: number;
      high: number;
      critical: number;
    };
    maxMembers: number;
    isPublic: boolean;
    allowInvites: boolean;
  };
  
  members: {
    [userId: string]: GroupMember;
  };
  
  stats: {
    totalMembers: number;
    totalDrinks: number;
    averagePerPerson: number;
    mostActiveDay: string;
  };

  // Programmation du festival
  lineup?: {
    stages: string[];
    lastUpdated?: Date;
    updatedBy?: string;
  };
}

export interface GroupMember {
  id: string;
  name: string;
  avatar: string;
  role: 'creator' | 'admin' | 'member';
  joinedAt: Date;
  lastActive: Date;
  isActive: boolean;
  totalContributions: number;
}

export interface GroupActivity {
  id: string;
  groupId: string;
  userId: string;
  userName: string;
  userAvatar: string;
  type: 'drink_added' | 'member_joined' | 'member_left' | 'alert_triggered' | 'milestone_reached' | 'zone_entered' | 'zone_left';
  message: string;
  timestamp: Date;
  metadata?: any;
}

export interface GroupInvite {
  groupId: string;
  groupName: string;
  invitedBy: string;
  inviteCode: string;
  expiresAt: Date;
}