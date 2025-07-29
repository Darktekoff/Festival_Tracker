import { GROUP_LIMITS } from './constants';

export function generateGroupCode(): string {
  const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclure I, O, 0, 1 pour éviter confusion
  let code = '';
  
  for (let i = 0; i < GROUP_LIMITS.CODE_LENGTH; i++) {
    code += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  
  return code;
}

export function formatGroupCode(code: string): string {
  // Format: ABC-DEF
  if (code.length === 6) {
    return `${code.slice(0, 3)}-${code.slice(3)}`;
  }
  return code;
}

export function parseGroupCode(code: string): string {
  // Enlever tous les caractères non alphanumériques et mettre en majuscules
  return code.replace(/[^A-Z0-9]/gi, '').toUpperCase();
}

export function validateGroupCode(code: string): boolean {
  const parsed = parseGroupCode(code);
  return parsed.length === GROUP_LIMITS.CODE_LENGTH && /^[A-Z0-9]+$/.test(parsed);
}

export function validateGroupName(name: string): { isValid: boolean; error?: string } {
  if (!name || name.trim().length === 0) {
    return { isValid: false, error: "Le nom du groupe est requis" };
  }
  
  if (name.trim().length < 3) {
    return { isValid: false, error: "Le nom doit contenir au moins 3 caractères" };
  }
  
  if (name.length > GROUP_LIMITS.MAX_NAME_LENGTH) {
    return { isValid: false, error: `Le nom ne peut pas dépasser ${GROUP_LIMITS.MAX_NAME_LENGTH} caractères` };
  }
  
  return { isValid: true };
}

export function getMemberRole(userId: string, creatorId: string, admins?: string[]): 'creator' | 'admin' | 'member' {
  if (userId === creatorId) return 'creator';
  if (admins?.includes(userId)) return 'admin';
  return 'member';
}

export function canManageGroup(role: 'creator' | 'admin' | 'member'): boolean {
  return role === 'creator' || role === 'admin';
}

export function canInviteMembers(role: 'creator' | 'admin' | 'member', groupSettings: { allowInvites: boolean }): boolean {
  if (role === 'creator' || role === 'admin') return true;
  return groupSettings.allowInvites;
}

export function canRemoveMember(
  currentUserRole: 'creator' | 'admin' | 'member',
  targetUserRole: 'creator' | 'admin' | 'member'
): boolean {
  // Creator peut retirer tout le monde sauf lui-même
  if (currentUserRole === 'creator' && targetUserRole !== 'creator') return true;
  // Admin peut retirer les membres seulement
  if (currentUserRole === 'admin' && targetUserRole === 'member') return true;
  return false;
}

export function getGroupDuration(startDate: Date, endDate: Date): { days: number; nights: number } {
  const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
  const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const nights = days - 1;
  
  return { days, nights: Math.max(0, nights) };
}

export function isGroupActive(startDate: Date, endDate: Date): boolean {
  const now = new Date();
  return now >= startDate && now <= endDate;
}

export function getGroupProgress(startDate: Date, endDate: Date): number {
  const now = new Date();
  const total = endDate.getTime() - startDate.getTime();
  const elapsed = now.getTime() - startDate.getTime();
  
  if (elapsed <= 0) return 0;
  if (elapsed >= total) return 100;
  
  return Math.round((elapsed / total) * 100);
}