/**
 * Enhanced Sync Service
 * Provides advanced real-time synchronization capabilities between Sales and Operations teams
 */

import { QuerySyncService, QuerySyncData } from './querySyncService';

export interface CrossTeamMessage {
  id: string;
  fromTeam: 'operations' | 'sales' | 'credit';
  toTeam: 'operations' | 'sales' | 'credit';
  type: 'notification' | 'query_update' | 'urgent_alert' | 'status_change';
  title: string;
  message: string;
  metadata?: {
    queryId?: string;
    appNo?: string;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    actionRequired?: boolean;
    deadline?: string;
  };
  timestamp: Date;
  read: boolean;
}

export interface TeamMetrics {
  team: string;
  activeUsers: number;
  pendingQueries: number;
  resolvedToday: number;
  avgResponseTime: number;
  systemHealth: 'excellent' | 'good' | 'warning' | 'critical';
  lastActivity: Date;
  productivity: {
    queriesPerHour: number;
    resolutionRate: number;
    escalationRate: number;
  };
}

export interface DashboardIntegrationData {
  crossTeamMessages: CrossTeamMessage[];
  teamMetrics: Record<string, TeamMetrics>;
  sharedQueries: QuerySyncData[];
  systemAlerts: Array<{
    id: string;
    type: 'system' | 'performance' | 'security' | 'maintenance';
    severity: 'info' | 'warning' | 'error' | 'critical';
    message: string;
    timestamp: Date;
    resolved: boolean;
  }>;
  integrationHealth: {
    salesOperationsSync: boolean;
    realTimeUpdates: boolean;
    crossTeamMessaging: boolean;
    dataConsistency: number; // percentage
    latency: number; // milliseconds
  };
}

export class EnhancedSyncService extends QuerySyncService {
  private static enhancedInstance: EnhancedSyncService;
  private crossTeamMessageListeners: Map<string, Array<(messages: CrossTeamMessage[]) => void>> = new Map();
  private metricsListeners: Map<string, Array<(metrics: TeamMetrics) => void>> = new Map();
  private integrationListeners: Array<(data: DashboardIntegrationData) => void> = [];
  private messageBuffer: CrossTeamMessage[] = [];
  private metricsCache: Record<string, TeamMetrics> = {};

  static getEnhancedInstance(): EnhancedSyncService {
    if (!EnhancedSyncService.enhancedInstance) {
      EnhancedSyncService.enhancedInstance = new EnhancedSyncService();
    }
    return EnhancedSyncService.enhancedInstance;
  }

  /**
   * Subscribe to cross-team messages
   */
  subscribeCrossTeamMessages(team: string, callback: (messages: CrossTeamMessage[]) => void) {
    if (!this.crossTeamMessageListeners.has(team)) {
      this.crossTeamMessageListeners.set(team, []);
    }
    this.crossTeamMessageListeners.get(team)!.push(callback);
    
    return () => {
      const callbacks = this.crossTeamMessageListeners.get(team);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
    };
  }

  /**
   * Subscribe to team metrics updates
   */
  subscribeTeamMetrics(team: string, callback: (metrics: TeamMetrics) => void) {
    if (!this.metricsListeners.has(team)) {
      this.metricsListeners.set(team, []);
    }
    this.metricsListeners.get(team)!.push(callback);
    
    return () => {
      const callbacks = this.metricsListeners.get(team);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
    };
  }

  /**
   * Subscribe to full integration dashboard data
   */
  subscribeIntegrationDashboard(callback: (data: DashboardIntegrationData) => void) {
    this.integrationListeners.push(callback);
    
    return () => {
      const index = this.integrationListeners.indexOf(callback);
      if (index > -1) {
        this.integrationListeners.splice(index, 1);
      }
    };
  }

  /**
   * Send a cross-team message
   */
  async sendCrossTeamMessage(message: Omit<CrossTeamMessage, 'id' | 'timestamp' | 'read'>): Promise<boolean> {
    try {
      const fullMessage: CrossTeamMessage = {
        ...message,
        id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(),
        read: false
      };

      // Add to buffer
      this.messageBuffer = [fullMessage, ...this.messageBuffer.slice(0, 49)]; // Keep last 50 messages

      // Notify listeners
      this.notifyCrossTeamMessages(message.toTeam, [fullMessage]);
      
      // In a real implementation, this would sync to backend
      // await this.syncMessageToBackend(fullMessage);

      return true;
    } catch (error) {
      console.error('Failed to send cross-team message:', error);
      return false;
    }
  }

  /**
   * Get team metrics with enhanced calculations
   */
  async getEnhancedTeamMetrics(team: string): Promise<TeamMetrics> {
    try {
      const queries = await this.fetchQueriesForTeam(team);
      const health = await this.getConnectionHealth(team);
      
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      const pendingQueries = queries.filter(q => q.status === 'pending').length;
      const resolvedToday = queries.filter(q => {
        const queryDate = new Date(q.lastUpdated);
        return q.status === 'resolved' && queryDate >= todayStart;
      }).length;

      // Calculate productivity metrics
      const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const recentQueries = queries.filter(q => new Date(q.lastUpdated) > hourAgo);
      
      const metrics: TeamMetrics = {
        team,
        activeUsers: Math.floor(Math.random() * 10) + 1, // Mock data - would come from session tracking
        pendingQueries,
        resolvedToday,
        avgResponseTime: this.calculateAvgResponseTime(queries),
        systemHealth: health.connected ? (health.latency < 500 ? 'excellent' : 'good') : 'critical',
        lastActivity: new Date(),
        productivity: {
          queriesPerHour: recentQueries.length,
          resolutionRate: queries.length > 0 ? (queries.filter(q => q.status === 'resolved').length / queries.length) * 100 : 0,
          escalationRate: Math.random() * 5 // Mock data
        }
      };

      this.metricsCache[team] = metrics;
      this.notifyMetricsListeners(team, metrics);
      
      return metrics;
    } catch (error) {
      console.error(`Failed to get enhanced metrics for ${team}:`, error);
      
      // Return cached data or default
      return this.metricsCache[team] || {
        team,
        activeUsers: 0,
        pendingQueries: 0,
        resolvedToday: 0,
        avgResponseTime: 0,
        systemHealth: 'critical',
        lastActivity: new Date(),
        productivity: {
          queriesPerHour: 0,
          resolutionRate: 0,
          escalationRate: 0
        }
      };
    }
  }

  /**
   * Get comprehensive dashboard integration data
   */
  async getDashboardIntegrationData(): Promise<DashboardIntegrationData> {
    try {
      const teams = ['operations', 'sales', 'credit'];
      const teamMetrics: Record<string, TeamMetrics> = {};
      
      // Fetch metrics for all teams
      for (const team of teams) {
        teamMetrics[team] = await this.getEnhancedTeamMetrics(team);
      }

      // Calculate integration health
      const healthChecks = await Promise.all(teams.map(team => this.getConnectionHealth(team)));
      const connectedTeams = healthChecks.filter(h => h.connected).length;
      const avgLatency = healthChecks.reduce((sum, h) => sum + h.latency, 0) / healthChecks.length;

      const integrationData: DashboardIntegrationData = {
        crossTeamMessages: this.messageBuffer.slice(0, 20), // Last 20 messages
        teamMetrics,
        sharedQueries: [], // Would be populated with shared/escalated queries
        systemAlerts: [], // Would be populated with system-level alerts
        integrationHealth: {
          salesOperationsSync: teamMetrics.sales?.systemHealth !== 'critical' && teamMetrics.operations?.systemHealth !== 'critical',
          realTimeUpdates: connectedTeams === teams.length,
          crossTeamMessaging: true, // Always true for this implementation
          dataConsistency: (connectedTeams / teams.length) * 100,
          latency: avgLatency
        }
      };

      // Notify integration listeners
      this.integrationListeners.forEach(listener => {
        try {
          listener(integrationData);
        } catch (error) {
          console.error('Error in integration dashboard callback:', error);
        }
      });

      return integrationData;
    } catch (error) {
      console.error('Failed to get dashboard integration data:', error);
      throw error;
    }
  }

  /**
   * Start enhanced real-time monitoring
   */
  startEnhancedMonitoring(intervalSeconds: number = 30) {
    // Monitor team metrics
    const metricsInterval = setInterval(async () => {
      const teams = ['operations', 'sales', 'credit'];
      for (const team of teams) {
        try {
          await this.getEnhancedTeamMetrics(team);
        } catch (error) {
          console.error(`Failed to update metrics for ${team}:`, error);
        }
      }
    }, intervalSeconds * 1000);

    // Monitor integration health
    const integrationInterval = setInterval(async () => {
      try {
        await this.getDashboardIntegrationData();
      } catch (error) {
        console.error('Failed to update integration data:', error);
      }
    }, (intervalSeconds * 2) * 1000); // Less frequent for integration data

    return () => {
      clearInterval(metricsInterval);
      clearInterval(integrationInterval);
    };
  }

  private calculateAvgResponseTime(queries: QuerySyncData[]): number {
    const resolvedQueries = queries.filter(q => q.status === 'resolved');
    if (resolvedQueries.length === 0) return 0;

    // Mock calculation - in real implementation would calculate from actual timestamps
    return Math.round(Math.random() * 8 + 2); // 2-10 hours
  }

  private notifyCrossTeamMessages(team: string, messages: CrossTeamMessage[]) {
    const callbacks = this.crossTeamMessageListeners.get(team);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(messages);
        } catch (error) {
          console.error(`Error in cross-team message callback for ${team}:`, error);
        }
      });
    }
  }

  private notifyMetricsListeners(team: string, metrics: TeamMetrics) {
    const callbacks = this.metricsListeners.get(team);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(metrics);
        } catch (error) {
          console.error(`Error in metrics callback for ${team}:`, error);
        }
      });
    }
  }

  /**
   * Mark cross-team message as read
   */
  markMessageAsRead(messageId: string): void {
    this.messageBuffer = this.messageBuffer.map(msg => 
      msg.id === messageId ? { ...msg, read: true } : msg
    );
  }

  /**
   * Get unread message count for a team
   */
  getUnreadMessageCount(team: string): number {
    return this.messageBuffer.filter(msg => msg.toTeam === team && !msg.read).length;
  }
}

// Export enhanced singleton instance
export const enhancedSyncService = EnhancedSyncService.getEnhancedInstance();