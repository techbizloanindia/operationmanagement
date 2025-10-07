/**
 * Dashboard Synchronization Utilities
 * Provides utilities for real-time dashboard updates across components
 */

export interface QueryUpdateEvent {
  type: 'added' | 'updated' | 'resolved' | 'reverted';
  queryId?: string | number;
  appNo?: string;
  action?: string;
  count?: number;
  timestamp: string;
}

/**
 * Broadcasts a query update event to notify the dashboard
 * @param event - The query update event details
 */
export const broadcastQueryUpdate = (event: QueryUpdateEvent) => {
  if (typeof window === 'undefined') return;
  
  console.log(`📡 Broadcasting ${event.type} query event for dashboard update...`, event);
  
  // Dispatch custom event for same-tab communication
  window.dispatchEvent(new CustomEvent('queryUpdated', {
    detail: event
  }));
  
  // Use localStorage for cross-tab synchronization
  localStorage.setItem('queryUpdate', JSON.stringify(event));
  
  // Clean up localStorage after a short delay
  setTimeout(() => {
    try {
      const currentValue = localStorage.getItem('queryUpdate');
      if (currentValue === JSON.stringify(event)) {
        localStorage.removeItem('queryUpdate');
      }
    } catch (error) {
      // Ignore cleanup errors
      console.warn('Error cleaning up localStorage:', error);
    }
  }, 100);
};

/**
 * Sets up listeners for query update events
 * @param onUpdate - Callback function to handle updates
 * @returns Cleanup function to remove listeners
 */
export const setupQueryUpdateListeners = (onUpdate: (event: QueryUpdateEvent) => void) => {
  if (typeof window === 'undefined') return () => {};
  
  // Handle custom events (same tab)
  const handleCustomEvent = (event: Event) => {
    const customEvent = event as CustomEvent;
    if (customEvent.detail) {
      onUpdate(customEvent.detail);
    }
  };
  
  // Handle storage events (cross-tab)
  const handleStorageEvent = (event: StorageEvent) => {
    if (event.key === 'queryUpdate' && event.newValue) {
      try {
        const updateEvent = JSON.parse(event.newValue);
        onUpdate(updateEvent);
      } catch (error) {
        console.warn('Error parsing storage event:', error);
      }
    }
  };
  
  // Add event listeners
  window.addEventListener('queryUpdated', handleCustomEvent);
  window.addEventListener('queryAdded', handleCustomEvent);
  window.addEventListener('queryResolved', handleCustomEvent);
  window.addEventListener('storage', handleStorageEvent);
  
  // Return cleanup function
  return () => {
    window.removeEventListener('queryUpdated', handleCustomEvent);
    window.removeEventListener('queryAdded', handleCustomEvent);
    window.removeEventListener('queryResolved', handleCustomEvent);
    window.removeEventListener('storage', handleStorageEvent);
  };
};

/**
 * Triggers an immediate dashboard refresh
 */
export const triggerDashboardRefresh = () => {
  broadcastQueryUpdate({
    type: 'updated',
    timestamp: new Date().toISOString()
  });
};
