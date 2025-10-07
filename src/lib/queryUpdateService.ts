'use client';

interface QueryUpdate {
  id: string;
  appNo: string;
  customerName: string;
  branch: string;
  status: string;
  priority: string;
  team: string;
  markedForTeam: string;
  createdAt: string;
  submittedBy: string;
  action: 'created' | 'updated' | 'deleted' | 'approved' | 'rejected' | 'resolved' | 'deferred' | 'otc' | 'waived' | 'message_added' | 'sanctioned_case_removed';
  resolvedBy?: string;
  resolvedAt?: string;
  approverComment?: string;
  broadcast?: boolean;
  timestamp?: string;
  messageFrom?: string;
  newMessage?: {
    id: string;
    text: string;
    author: string;
    authorTeam: string;
    timestamp: string;
  };
}

interface QueryUpdateCallback {
  (update: QueryUpdate): void;
}

class QueryUpdateService {
  private subscribers: Map<string, Set<QueryUpdateCallback>> = new Map();
  private eventSource: EventSource | null = null;
  private fallbackInterval: NodeJS.Timeout | null = null;
  private lastUpdateTime: string = new Date().toISOString();
  private isConnected: boolean = false;

  // Initialize real-time connection
  initialize() {
    if (this.isConnected) {
      console.log('📡 QueryUpdateService: Already connected, skipping initialization');
      return;
    }

    console.log('🚀 QueryUpdateService: Starting initialization...');
    
    // Try to establish SSE connection first
    this.connectSSE();
    
    // Fallback to polling if SSE is not available
    this.startFallbackPolling();
    
    console.log('✅ QueryUpdateService: Initialization completed');
  }

  // Connect to Server-Sent Events
  private connectSSE() {
    try {
      console.log('🔌 Attempting to connect to SSE...');
      this.eventSource = new EventSource('/api/queries/events');
      
      this.eventSource.onopen = () => {
        console.log('✅ Connected to query update stream');
        this.isConnected = true;
        // Stop fallback polling when SSE is connected
        if (this.fallbackInterval) {
          clearInterval(this.fallbackInterval);
          this.fallbackInterval = null;
          console.log('🛑 Stopped fallback polling - SSE connected');
        }
      };

      this.eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          // Handle different message types
          if (data.type === 'query_update') {
            const update: QueryUpdate = {
              id: data.id,
              appNo: data.appNo,
              customerName: data.customerName,
              branch: data.branch,
              status: data.status,
              priority: data.priority,
              team: data.team,
              markedForTeam: data.markedForTeam,
              createdAt: data.createdAt,
              submittedBy: data.submittedBy,
              action: data.action,
              resolvedBy: data.resolvedBy,
              resolvedAt: data.resolvedAt,
              approverComment: data.approverComment
            };
            
            console.log('📨 Received query update via SSE:', {
              appNo: update.appNo,
              action: update.action,
              team: update.team,
              markedForTeam: update.markedForTeam
            });
            this.notifySubscribers(update);
          } else if (data.type === 'heartbeat') {
            console.log('💓 SSE Heartbeat received');
          } else if (data.type === 'connected') {
            console.log('🔗 SSE Connection established:', data.connectionId);
          } else {
            // Legacy format - assume it's a direct query update
            const update: QueryUpdate = data;
            console.log('📨 Received query update via SSE (legacy):', {
              appNo: update.appNo,
              action: update.action,
              team: update.team,
              markedForTeam: update.markedForTeam
            });
            this.notifySubscribers(update);
          }
        } catch (error) {
          console.error('Error parsing SSE data:', error);
        }
      };

      this.eventSource.onerror = (error) => {
        console.warn('SSE connection error, falling back to polling:', error);
        this.isConnected = false;
        this.eventSource?.close();
        this.eventSource = null;
        
        // Restart fallback polling
        if (!this.fallbackInterval) {
          console.log('🔄 Starting fallback polling due to SSE error');
          this.startFallbackPolling();
        }
        
        // Attempt to reconnect after 10 seconds
        setTimeout(() => {
          if (!this.isConnected) {
            console.log('🔄 Attempting to reconnect SSE...');
            this.connectSSE();
          }
        }, 10000);
      };
    } catch (error) {
      console.warn('SSE not supported, using polling fallback:', error);
      this.startFallbackPolling();
    }
  }

  // Fallback polling mechanism
  private startFallbackPolling() {
    if (this.fallbackInterval) return;

    this.fallbackInterval = setInterval(async () => {
      if (this.isConnected) return; // Skip if SSE is working

      try {
        await this.checkForUpdates();
      } catch (error) {
        console.error('Error polling for query updates:', error);
      }
    }, 3000); // Poll every 3 seconds
  }

  // Check for new query updates
  private async checkForUpdates() {
    try {
      const response = await fetch(`/api/queries/updates?since=${encodeURIComponent(this.lastUpdateTime)}`);
      const result = await response.json();
      
      if (result.success && result.data) {
        const updates: QueryUpdate[] = result.data;
        
        updates.forEach(update => {
          console.log('📨 Received query update via polling:', update.appNo, update.action);
          this.notifySubscribers(update);
        });

        // Update last check time
        if (updates.length > 0) {
          this.lastUpdateTime = new Date().toISOString();
        }
      }
    } catch (error) {
      console.error('Error checking for query updates:', error);
    }
  }

  // Subscribe to query updates for a specific team
  subscribe(team: string, callback: QueryUpdateCallback): () => void {
    if (!this.subscribers.has(team)) {
      this.subscribers.set(team, new Set());
    }
    
    this.subscribers.get(team)!.add(callback);
    console.log(`🔔 Subscribed to query updates for team: ${team} (${this.subscribers.get(team)!.size} subscribers)`);
    
    // Initialize connection if this is the first subscriber
    if (this.getSubscriberCount() === 1) {
      console.log('🚀 Initializing real-time connection for first subscriber');
      this.initialize();
    }
    
    // Return unsubscribe function
    return () => {
      const teamSubscribers = this.subscribers.get(team);
      if (teamSubscribers) {
        teamSubscribers.delete(callback);
        console.log(`🔕 Unsubscribed from query updates for team: ${team} (${teamSubscribers.size} subscribers remaining)`);
        
        if (teamSubscribers.size === 0) {
          this.subscribers.delete(team);
        }
      }
      
      // Cleanup if no more subscribers
      if (this.getSubscriberCount() === 0) {
        console.log('🧹 No more subscribers, cleaning up connections');
        this.cleanup();
      }
    };
  }

  // Notify subscribers of query updates
  private notifySubscribers(update: QueryUpdate) {
    // Notify all teams that might be interested
    const interestedTeams = new Set(['operations']);
    
    console.log('🔔 Processing update for teams:', {
      markedForTeam: update.markedForTeam,
      team: update.team,
      appNo: update.appNo,
      action: update.action,
      broadcast: update.broadcast,
      customerName: update.customerName,
      branch: update.branch
    });
    

    
    // If this is a broadcast update, prioritize the explicitly marked team
    if (update.broadcast) {
      console.log(`🔊 This is a broadcast update - prioritizing marked team: ${update.markedForTeam}`);
      if (update.markedForTeam) {
        interestedTeams.add(update.markedForTeam.toLowerCase());
        console.log(`✅ Added target team from broadcast: ${update.markedForTeam.toLowerCase()}`);
      }
    } 
    // Otherwise process normally
    else {
      // Add the specific team marked for this query
      if (update.markedForTeam === 'both') {
        interestedTeams.add('sales');
        interestedTeams.add('credit');
        console.log('✅ Added both sales and credit teams');
      } else if (update.markedForTeam) {
        interestedTeams.add(update.markedForTeam.toLowerCase());
        console.log(`✅ Added marked team: ${update.markedForTeam.toLowerCase()}`);
      }
      
      // Add the team that owns this query
      if (update.team && update.team !== update.markedForTeam) {
        interestedTeams.add(update.team.toLowerCase());
        console.log(`✅ Added owner team: ${update.team.toLowerCase()}`);
      }
      
      // Handle legacy team formats
      if (update.team === 'both') {
        interestedTeams.add('sales');
        interestedTeams.add('credit');
        console.log('✅ Added legacy both teams');
      }
    }
    
    // Also notify 'all' subscribers
    interestedTeams.add('all');

    console.log('📋 Final interested teams:', Array.from(interestedTeams));

    interestedTeams.forEach(team => {
      const teamSubscribers = this.subscribers.get(team);
      if (teamSubscribers && teamSubscribers.size > 0) {
        teamSubscribers.forEach(callback => {
          try {
            callback(update);
          } catch (error) {
            console.error(`Error in query update callback for team ${team}:`, error);
          }
        });
        console.log(`📤 Notified ${teamSubscribers.size} subscribers for team: ${team}`);
      } else {
        console.log(`📭 No subscribers for team: ${team}`);
      }
    });
  }

  // Manually trigger update notification (for when creating queries)
  broadcastUpdate(update: QueryUpdate) {
    this.notifySubscribers(update);
  }

  // Get total subscriber count
  private getSubscriberCount(): number {
    let total = 0;
    this.subscribers.forEach(teamSet => {
      total += teamSet.size;
    });
    return total;
  }

  // Get connection status
  getConnectionStatus(): 'connected' | 'polling' | 'disconnected' {
    if (this.isConnected && this.eventSource) return 'connected';
    if (this.fallbackInterval) return 'polling';
    return 'disconnected';
  }

  // Clean up all connections and subscriptions
  cleanup() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    
    if (this.fallbackInterval) {
      clearInterval(this.fallbackInterval);
      this.fallbackInterval = null;
    }
    
    this.subscribers.clear();
    this.isConnected = false;
  }
}

// Singleton instance
export const queryUpdateService = new QueryUpdateService();

// Auto-cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    queryUpdateService.cleanup();
  });
}
