/**
 * Query Sync Service
 * Handles synchronization between Operations, Sales, and Credit teams
 */

export interface QuerySyncData {
  id: number;
  appNo: string;
  customerName: string;
  status: 'pending' | 'approved' | 'deferred' | 'otc' | 'waived' | 'resolved' | 'request-approved' | 'request-deferral' | 'request-otc' | 'pending-approval';
  markedForTeam: string;
  lastUpdated: string;
  queries: Array<{
    id: string;
    text: string;
    status: string;
    timestamp: string;
  }>;
}

export class QuerySyncService {
  private static instance: QuerySyncService;
  private listeners: Map<string, Array<(data: QuerySyncData[]) => void>> = new Map();
  private lastSyncTime: Map<string, Date> = new Map();

  static getInstance(): QuerySyncService {
    if (!QuerySyncService.instance) {
      QuerySyncService.instance = new QuerySyncService();
    }
    return QuerySyncService.instance;
  }

  /**
   * Subscribe to query updates for a specific team
   */
  subscribe(team: string, callback: (data: QuerySyncData[]) => void) {
    if (!this.listeners.has(team)) {
      this.listeners.set(team, []);
    }
    this.listeners.get(team)!.push(callback);
    
    // Return unsubscribe function
    return () => {
      const callbacks = this.listeners.get(team);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
    };
  }

  /**
   * Notify all subscribers of a team about updates
   */
  private notify(team: string, data: QuerySyncData[]) {
    const callbacks = this.listeners.get(team);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in query sync callback for team ${team}:`, error);
        }
      });
    }
  }

  /**
   * Fetch queries for a specific team
   */
  async fetchQueriesForTeam(team: string, status?: string): Promise<QuerySyncData[]> {
    try {
      const params = new URLSearchParams();
      params.append('team', team);
      if (status) params.append('status', status);

      const response = await fetch(`/api/queries?${params.toString()}`);
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to fetch queries');
      }

      const queries = Array.isArray(result.data) ? result.data.map((item: any) => ({
        id: item.id,
        appNo: item.appNo,
        customerName: item.customerName,
        status: item.status,
        markedForTeam: item.markedForTeam,
        lastUpdated: item.lastUpdated || item.submittedAt,
        queries: item.queries || []
      })) : [];

      this.lastSyncTime.set(team, new Date());
      this.notify(team, queries);
      
      return queries;
    } catch (error) {
      console.error(`Error fetching queries for team ${team}:`, error);
      throw error;
    }
  }

  /**
   * Submit a query response from sales/credit back to operations
   */
  async submitResponse(queryId: number, response: string, team: string, action: string): Promise<boolean> {
    try {
      const payload = {
        type: 'action',
        queryId,
        action,
        responseText: response,
        team,
        actionBy: `${team} Team`,
        timestamp: new Date().toISOString()
      };

      const apiResponse = await fetch('/api/query-actions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      const result = await apiResponse.json();

      if (!apiResponse.ok || !result.success) {
        throw new Error(result.error || 'Failed to submit response');
      }

      // Refresh queries for all teams to ensure sync
      setTimeout(() => {
        this.fetchQueriesForTeam('operations');
        this.fetchQueriesForTeam('sales');
        this.fetchQueriesForTeam('credit');
      }, 1000);

      return true;
    } catch (error) {
      console.error('Error submitting response:', error);
      return false;
    }
  }

  /**
   * Add a message to a query thread
   */
  async addMessage(queryId: number, message: string, team: string): Promise<boolean> {
    try {
      const payload = {
        type: 'message',
        queryId,
        message,
        addedBy: `${team} Team`,
        team: team.charAt(0).toUpperCase() + team.slice(1)
      };

      const response = await fetch('/api/query-actions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to add message');
      }

      // Refresh queries for all teams
      setTimeout(() => {
        this.fetchQueriesForTeam('operations');
        this.fetchQueriesForTeam('sales');
        this.fetchQueriesForTeam('credit');
      }, 1000);

      return true;
    } catch (error) {
      console.error('Error adding message:', error);
      return false;
    }
  }

  /**
   * Get the last sync time for a team
   */
  getLastSyncTime(team: string): Date | null {
    return this.lastSyncTime.get(team) || null;
  }

  /**
   * Check if queries are stale and need refresh
   */
  isStale(team: string, maxAgeMinutes: number = 5): boolean {
    const lastSync = this.getLastSyncTime(team);
    if (!lastSync) return true;
    
    const now = new Date();
    const ageMinutes = (now.getTime() - lastSync.getTime()) / (1000 * 60);
    return ageMinutes > maxAgeMinutes;
  }

  /**
   * Start auto-sync for a team
   */
  startAutoSync(team: string, intervalMinutes: number = 1) {
    return setInterval(() => {
      if (this.isStale(team, intervalMinutes)) {
        this.fetchQueriesForTeam(team).catch(error => {
          console.error(`Auto-sync failed for team ${team}:`, error);
        });
      }
    }, intervalMinutes * 60 * 1000);
  }

  /**
   * Get connection health status
   */
  async getConnectionHealth(team: string): Promise<{
    connected: boolean;
    latency: number;
    lastSync: Date | null;
    error?: string;
  }> {
    const startTime = Date.now();
    
    try {
      const response = await fetch(`/api/queries?team=${team}&stats=true`);
      const latency = Date.now() - startTime;
      
      if (response.ok) {
        const result = await response.json();
        return {
          connected: result.success,
          latency,
          lastSync: this.getLastSyncTime(team),
          error: result.success ? undefined : result.error
        };
      } else {
        return {
          connected: false,
          latency,
          lastSync: this.getLastSyncTime(team),
          error: `HTTP ${response.status}: ${response.statusText}`
        };
      }
    } catch (error: any) {
      return {
        connected: false,
        latency: Date.now() - startTime,
        lastSync: this.getLastSyncTime(team),
        error: error.message
      };
    }
  }
}

// Export singleton instance
export const querySyncService = QuerySyncService.getInstance();
