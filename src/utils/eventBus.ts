type EventListener = (...args: any[]) => void;

class EventBus {
  private static instance: EventBus;
  private events: Map<string, EventListener[]> = new Map();

  static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  on(event: string, listener: EventListener): void {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event)!.push(listener);
  }

  off(event: string, listener: EventListener): void {
    const listeners = this.events.get(event);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  emit(event: string, ...args: any[]): void {
    const listeners = this.events.get(event);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(...args);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  removeAllListeners(event?: string): void {
    if (event) {
      this.events.delete(event);
    } else {
      this.events.clear();
    }
  }
}

export const eventBus = EventBus.getInstance();

export const EVENTS = {
  DRINK_ADDED: 'drink_added',
  DRINKS_UPDATED: 'drinks_updated',
  GROUP_CHANGED: 'group_changed',
  // Événements de géolocalisation
  LOCATION_REQUEST_SENT: 'location_request_sent',
  LOCATION_REQUEST_RECEIVED: 'location_request_received',
  LOCATION_REQUEST_RESPONDED: 'location_request_responded',
  LOCATION_SHARED: 'location_shared',
  LOCATION_REQUEST_EXPIRED: 'location_request_expired',
  LOCATION_REQUEST_CANCELLED: 'location_request_cancelled'
} as const;