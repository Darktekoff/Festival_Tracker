import { useEffect, useRef } from 'react';
import { AlertLevel } from '../types';
import notificationService from '../services/notificationService';
import * as Haptics from 'expo-haptics';

interface UseAlertsProps {
  currentUnits: number;
  userName: string;
  groupId: string | null;
  enabled?: boolean;
}

interface UseAlertsReturn {
  checkAlertThreshold: (units: number) => void;
  sendCustomAlert: (title: string, body: string, level: AlertLevel) => Promise<void>;
}

export function useAlerts({
  currentUnits,
  userName,
  groupId,
  enabled = true
}: UseAlertsProps): UseAlertsReturn {
  const previousUnitsRef = useRef(currentUnits);
  const lastAlertLevelRef = useRef<AlertLevel>('safe');

  useEffect(() => {
    if (!enabled || !groupId) return;

    const previousUnits = previousUnitsRef.current;
    const currentLevel = getAlertLevel(currentUnits);
    const previousLevel = getAlertLevel(previousUnits);

    // Si on passe un seuil
    if (currentLevel !== previousLevel && currentUnits > previousUnits) {
      handleAlertChange(currentLevel, userName, groupId);
      lastAlertLevelRef.current = currentLevel;
    }

    previousUnitsRef.current = currentUnits;
  }, [currentUnits, userName, groupId, enabled]);

  const handleAlertChange = async (
    level: AlertLevel,
    userName: string,
    groupId: string
  ) => {
    let title = '';
    let body = '';

    switch (level) {
      case 'moderate':
        title = '⚠️ Seuil modéré atteint';
        body = `${userName} a atteint ${currentUnits.toFixed(1)} unités d'alcool`;
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        break;
      
      case 'high':
        title = '🚨 Seuil élevé atteint';
        body = `${userName} a atteint ${currentUnits.toFixed(1)} unités d'alcool. Pensez à ralentir!`;
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        break;
      
      case 'critical':
        title = '🚨🚨 SEUIL CRITIQUE!';
        body = `${userName} a atteint ${currentUnits.toFixed(1)} unités d'alcool. Il est temps de s'arrêter!`;
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        break;
    }

    if (title && body) {
      await notificationService.sendAlertNotification(
        title,
        body,
        level,
        { groupId, userName, units: currentUnits }
      );
    }
  };

  const checkAlertThreshold = (units: number) => {
    const level = getAlertLevel(units);
    if (level !== lastAlertLevelRef.current && groupId) {
      handleAlertChange(level, userName, groupId);
      lastAlertLevelRef.current = level;
    }
  };

  const sendCustomAlert = async (
    title: string,
    body: string,
    level: AlertLevel
  ) => {
    if (!groupId) return;

    await notificationService.sendAlertNotification(
      title,
      body,
      level,
      { groupId, userName }
    );

    // Haptic feedback selon le niveau
    switch (level) {
      case 'moderate':
      case 'high':
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        break;
      case 'critical':
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        break;
      default:
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  return {
    checkAlertThreshold,
    sendCustomAlert
  };
}

function getAlertLevel(units: number): AlertLevel {
  if (units >= 10) return 'critical';
  if (units >= 6) return 'high';
  if (units >= 3) return 'moderate';
  return 'safe';
}