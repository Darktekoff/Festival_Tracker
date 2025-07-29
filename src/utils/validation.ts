import { DrinkFormData, User } from '../types';
import { GROUP_LIMITS } from './constants';

export interface ValidationResult {
  isValid: boolean;
  errors: { [key: string]: string };
}

export function validateDrinkForm(data: DrinkFormData): ValidationResult {
  const errors: { [key: string]: string } = {};
  
  if (!data.category) {
    errors.category = "Veuillez sélectionner une catégorie";
  }
  
  if (!data.drinkType) {
    errors.drinkType = "Veuillez sélectionner un type de boisson";
  }
  
  if (data.volume <= 0 || data.volume > 200) {
    errors.volume = "Le volume doit être entre 1 et 200 cl";
  }
  
  if (data.alcoholDegree < 0 || data.alcoholDegree > 100) {
    errors.alcoholDegree = "Le degré d'alcool doit être entre 0 et 100%";
  }
  
  if (data.customName && data.customName.length > 50) {
    errors.customName = "Le nom ne peut pas dépasser 50 caractères";
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

export function validateUserName(name: string): { isValid: boolean; error?: string } {
  if (!name || name.trim().length === 0) {
    return { isValid: false, error: "Le nom est requis" };
  }
  
  if (name.trim().length < 2) {
    return { isValid: false, error: "Le nom doit contenir au moins 2 caractères" };
  }
  
  if (name.length > 30) {
    return { isValid: false, error: "Le nom ne peut pas dépasser 30 caractères" };
  }
  
  if (!/^[a-zA-ZÀ-ÿ\s-']+$/.test(name)) {
    return { isValid: false, error: "Le nom contient des caractères non autorisés" };
  }
  
  return { isValid: true };
}

export function validateEmail(email: string): { isValid: boolean; error?: string } {
  if (!email) {
    return { isValid: true }; // Email est optionnel
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { isValid: false, error: "Format d'email invalide" };
  }
  
  return { isValid: true };
}

export function validateGroupSettings(settings: {
  festivalDates: { start: Date; end: Date };
  maxMembers: number;
}): ValidationResult {
  const errors: { [key: string]: string } = {};
  
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  
  if (settings.festivalDates.start < now) {
    errors.startDate = "La date de début ne peut pas être dans le passé";
  }
  
  if (settings.festivalDates.end < settings.festivalDates.start) {
    errors.endDate = "La date de fin doit être après la date de début";
  }
  
  const daysDiff = Math.ceil(
    (settings.festivalDates.end.getTime() - settings.festivalDates.start.getTime()) / 
    (1000 * 60 * 60 * 24)
  );
  
  if (daysDiff > 30) {
    errors.duration = "La durée du festival ne peut pas dépasser 30 jours";
  }
  
  if (settings.maxMembers < 2 || settings.maxMembers > GROUP_LIMITS.MAX_MEMBERS) {
    errors.maxMembers = `Le nombre de membres doit être entre 2 et ${GROUP_LIMITS.MAX_MEMBERS}`;
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

export function validateAlertThresholds(thresholds: {
  moderate: number;
  high: number;
  critical: number;
}): ValidationResult {
  const errors: { [key: string]: string } = {};
  
  if (thresholds.moderate <= 0 || thresholds.moderate >= 20) {
    errors.moderate = "Le seuil modéré doit être entre 1 et 20 unités";
  }
  
  if (thresholds.high <= thresholds.moderate || thresholds.high >= 30) {
    errors.high = "Le seuil élevé doit être supérieur au seuil modéré et inférieur à 30";
  }
  
  if (thresholds.critical <= thresholds.high || thresholds.critical >= 50) {
    errors.critical = "Le seuil critique doit être supérieur au seuil élevé et inférieur à 50";
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

export function sanitizeInput(input: string): string {
  return input.trim().replace(/[<>]/g, '');
}

export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}