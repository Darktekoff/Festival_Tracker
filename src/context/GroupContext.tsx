import React, { createContext, useContext, ReactNode } from 'react';
import { FestivalGroup, GroupMember } from '../types';
import { useGroup } from '../hooks/useGroup';

interface GroupContextType {
  group: FestivalGroup | null;
  isLoading: boolean;
  error: Error | null;
  createGroup: (
    name: string,
    description: string,
    festivalDates: { start: Date; end: Date },
    maxMembers?: number
  ) => Promise<FestivalGroup | null>;
  joinGroup: (code: string) => Promise<FestivalGroup | null>;
  leaveGroup: () => Promise<boolean>;
  updateSettings: (settings: Partial<FestivalGroup['settings']>) => Promise<boolean>;
  refreshGroup: () => Promise<void>;
  isCreator: boolean;
  isAdmin: boolean;
  currentMember: GroupMember | null;
}

const GroupContext = createContext<GroupContextType | undefined>(undefined);

export function GroupProvider({ children }: { children: ReactNode }) {
  const group = useGroup();

  return (
    <GroupContext.Provider value={group}>
      {children}
    </GroupContext.Provider>
  );
}

export function useGroupContext() {
  const context = useContext(GroupContext);
  if (context === undefined) {
    throw new Error('useGroupContext must be used within a GroupProvider');
  }
  return context;
}