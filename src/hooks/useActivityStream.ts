import { useState, useEffect } from 'react';
import activityStreamService, { CombinedActivity } from '../services/activityStreamService';

export function useActivityStream(groupId: string | null) {
  const [activities, setActivities] = useState<CombinedActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!groupId) {
      setActivities([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    // Initialiser le service
    activityStreamService.initialize(groupId);

    // S'abonner aux mises à jour
    const unsubscribe = activityStreamService.onActivitiesUpdate((newActivities) => {
      setActivities(newActivities);
      setLoading(false);
    });

    return () => {
      unsubscribe();
      activityStreamService.cleanup();
    };
  }, [groupId]);

  return {
    activities,
    loading
  };
}