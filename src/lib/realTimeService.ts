'use client';

interface Message {
  id: string;
  queryId: string;
  message: string;
  sender: string;
  senderRole: string;
  timestamp: string;
  team?: string;
}

interface Subscriber {
  queryId: string;
  callback: (message: Message) => void;
}

class RealTimeService {
  private subscribers: Map<string, Set<(message: Message) => void>> = new Map();
  private pollIntervals: Map<string, NodeJS.Timeout> = new Map();
  private lastMessageTimes: Map<string, string> = new Map();

  // Subscribe to real-time updates for a query
  subscribe(queryId: string, callback: (message: Message) => void): () => void {
    if (!this.subscribers.has(queryId)) {
      this.subscribers.set(queryId, new Set());
      this.startPolling(queryId);
    }
    
    this.subscribers.get(queryId)!.add(callback);
    
    // Return unsubscribe function
    return () => {
      const querySubscribers = this.subscribers.get(queryId);
      if (querySubscribers) {
        querySubscribers.delete(callback);
        if (querySubscribers.size === 0) {
          this.stopPolling(queryId);
          this.subscribers.delete(queryId);
        }
      }
    };
  }

  // Notify all subscribers of a new message
  private notifySubscribers(queryId: string, message: Message) {
    const querySubscribers = this.subscribers.get(queryId);
    if (querySubscribers) {
      querySubscribers.forEach(callback => {
        try {
          callback(message);
        } catch (error) {
          console.error('Error notifying subscriber:', error);
        }
      });
    }
  }

  // Start polling for new messages
  private startPolling(queryId: string) {
    if (this.pollIntervals.has(queryId)) {
      return; // Already polling
    }

    const interval = setInterval(async () => {
      try {
        await this.checkForNewMessages(queryId);
      } catch (error) {
        console.error('Error polling for messages:', error);
      }
    }, 2000); // Poll every 2 seconds

    this.pollIntervals.set(queryId, interval);
  }

  // Stop polling for a query
  private stopPolling(queryId: string) {
    const interval = this.pollIntervals.get(queryId);
    if (interval) {
      clearInterval(interval);
      this.pollIntervals.delete(queryId);
    }
  }

  // Check for new messages since last check
  private async checkForNewMessages(queryId: string) {
    try {
      const response = await fetch(`/api/queries/${queryId}/chat`);
      const result = await response.json();
      
      if (result.success && result.data) {
        const messages = result.data as Message[];
        const lastMessageTime = this.lastMessageTimes.get(queryId);
        
        // Find new messages
        const newMessages = messages.filter(message => {
          if (!lastMessageTime) return true;
          return new Date(message.timestamp) > new Date(lastMessageTime);
        });

        // Update last message time
        if (messages.length > 0) {
          const latestMessage = messages[messages.length - 1];
          this.lastMessageTimes.set(queryId, latestMessage.timestamp);
        }

        // Notify subscribers of new messages
        newMessages.forEach(message => {
          this.notifySubscribers(queryId, message);
        });
      }
    } catch (error) {
      console.error('Error checking for new messages:', error);
    }
  }

  // Manually trigger message broadcast (for when sending messages)
  broadcastMessage(queryId: string, message: Message) {
    this.lastMessageTimes.set(queryId, message.timestamp);
    this.notifySubscribers(queryId, message);
  }

  // Get connection status for a query
  isConnected(queryId: string): boolean {
    return this.pollIntervals.has(queryId);
  }

  // Get subscriber count for a query
  getSubscriberCount(queryId: string): number {
    return this.subscribers.get(queryId)?.size || 0;
  }

  // Clean up all subscriptions
  cleanup() {
    this.pollIntervals.forEach((interval) => {
      clearInterval(interval);
    });
    this.pollIntervals.clear();
    this.subscribers.clear();
    this.lastMessageTimes.clear();
  }
}

// Singleton instance
export const realTimeService = new RealTimeService();

// Auto-cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    realTimeService.cleanup();
  });
}