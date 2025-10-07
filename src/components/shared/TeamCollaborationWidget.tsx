'use client';

import React, { useState, useEffect } from 'react';
import { 
  FaExchangeAlt, 
  FaUsers, 
  FaChartLine, 
  FaBell, 
  FaSync,
  FaCheckCircle,
  FaExclamationTriangle,
  FaClock,
  FaArrowRight,
  FaEye
} from 'react-icons/fa';
import { querySyncService } from '@/lib/querySyncService';
import { useAuth } from '@/contexts/AuthContext';

interface TeamCollaborationWidgetProps {
  currentTeam: 'sales' | 'operations' | 'credit';
  onTeamSwitch?: (team: string) => void;
  className?: string;
}

interface TeamActivity {
  team: string;
  activeQueries: number;
  resolvedToday: number;
  avgResponseTime: number;
  lastActivity: Date;
  health: 'good' | 'warning' | 'error';
  recentActions: Array<{
    id: string;
    action: string;
    timestamp: Date;
    priority: 'low' | 'medium' | 'high';
  }>;
}

const TeamCollaborationWidget: React.FC<TeamCollaborationWidgetProps> = ({
  currentTeam,
  onTeamSwitch,
  className = ''
}) => {
  const { user } = useAuth();
  const [teamActivities, setTeamActivities] = useState<Record<string, TeamActivity>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(false);
  const [crossTeamMessages, setCrossTeamMessages] = useState<Array<{
    id: string;
    from: string;
    to: string;
    message: string;
    timestamp: Date;
    priority: 'low' | 'medium' | 'high';
    read: boolean;
  }>>([]);

  useEffect(() => {
    loadTeamActivities();
    
    // Set up real-time monitoring
    const interval = setInterval(loadTeamActivities, 40000); // Every 40 seconds (staggered)
    
    return () => clearInterval(interval);
  }, []);

  const loadTeamActivities = async () => {
    try {
      setIsLoading(true);
      const teams = ['operations', 'sales', 'credit'];
      const activities: Record<string, TeamActivity> = {};

      for (const team of teams) {
        try {
          const queries = await querySyncService.fetchQueriesForTeam(team);
          const health = await querySyncService.getConnectionHealth(team);
          
          const activeQueries = queries.filter(q => q.status === 'pending').length;
          const resolvedToday = queries.filter(q => {
            const today = new Date().toDateString();
            const queryDate = new Date(q.lastUpdated).toDateString();
            return q.status === 'resolved' && queryDate === today;
          }).length;

          activities[team] = {
            team,
            activeQueries,
            resolvedToday,
            avgResponseTime: Math.round(Math.random() * 6 + 2), // Mock calculation
            lastActivity: new Date(),
            health: health.connected ? 'good' : 'error',
            recentActions: queries.slice(0, 3).map((q, i) => ({
              id: `${q.id}-${i}`,
              action: `Query ${q.status} for ${q.customerName}`,
              timestamp: new Date(q.lastUpdated),
              priority: q.status === 'pending' ? 'high' : 'medium'
            }))
          };
        } catch (error) {
          activities[team] = {
            team,
            activeQueries: 0,
            resolvedToday: 0,
            avgResponseTime: 0,
            lastActivity: new Date(),
            health: 'error',
            recentActions: []
          };
        }
      }

      setTeamActivities(activities);
    } catch (error) {
      console.error('Failed to load team activities:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getTeamColor = (team: string) => {
    switch (team) {
      case 'operations': return 'blue';
      case 'sales': return 'green';
      case 'credit': return 'purple';
      default: return 'gray';
    }
  };

  const getHealthIcon = (health: string) => {
    switch (health) {
      case 'good': return <FaCheckCircle className="w-4 h-4 text-green-500" />;
      case 'warning': return <FaExclamationTriangle className="w-4 h-4 text-yellow-500" />;
      case 'error': return <FaExclamationTriangle className="w-4 h-4 text-red-500" />;
      default: return <FaClock className="w-4 h-4 text-gray-500" />;
    }
  };

  const sendCrossTeamMessage = async (toTeam: string, message: string, priority: 'low' | 'medium' | 'high' = 'medium') => {
    const newMessage = {
      id: `msg-${Date.now()}`,
      from: currentTeam,
      to: toTeam,
      message,
      timestamp: new Date(),
      priority,
      read: false
    };
    
    setCrossTeamMessages(prev => [newMessage, ...prev.slice(0, 9)]);
    
    // In a real implementation, this would send via the sync service
    // await querySyncService.sendCrossTeamMessage(newMessage);
  };

  if (isLoading) {
    return (
      <div className={`bg-white rounded-xl shadow-sm border border-gray-100 p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <FaUsers className="w-6 h-6 text-blue-600" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Team Collaboration</h3>
              <p className="text-sm text-gray-600">Cross-team activity and integration</p>
            </div>
          </div>
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg transition-all duration-200 text-sm"
          >
            <FaEye className="w-4 h-4" />
            <span>{showDetails ? 'Hide' : 'Details'}</span>
          </button>
        </div>
      </div>

      {/* Team Activity Overview */}
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {Object.entries(teamActivities).map(([teamName, activity]) => {
            const color = getTeamColor(teamName);
            const isCurrentTeam = teamName === currentTeam;
            
            return (
              <div
                key={teamName}
                className={`relative p-4 rounded-lg border-2 transition-all duration-300 cursor-pointer hover:shadow-md ${
                  isCurrentTeam 
                    ? `border-${color}-500 bg-${color}-50` 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => onTeamSwitch?.(teamName)}
              >
                {isCurrentTeam && (
                  <div className={`absolute top-2 right-2 w-3 h-3 bg-${color}-500 rounded-full animate-pulse`}></div>
                )}
                
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    {getHealthIcon(activity.health)}
                    <h4 className="font-semibold text-gray-900 capitalize">{teamName}</h4>
                  </div>
                  {!isCurrentTeam && (
                    <FaArrowRight className="w-4 h-4 text-gray-400" />
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="text-center">
                    <div className={`text-xl font-bold text-${color}-600`}>{activity.activeQueries}</div>
                    <div className="text-gray-600">Active</div>
                  </div>
                  <div className="text-center">
                    <div className={`text-xl font-bold text-${color}-600`}>{activity.resolvedToday}</div>
                    <div className="text-gray-600">Resolved</div>
                  </div>
                </div>
                
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>Response Time</span>
                    <span>{activity.avgResponseTime}h avg</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Enhanced Details View */}
        {showDetails && (
          <div className="space-y-6">
            {/* Recent Cross-Team Activity */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                <FaExchangeAlt className="w-4 h-4 mr-2 text-blue-600" />
                Recent Cross-Team Activity
              </h4>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {Object.entries(teamActivities).map(([teamName, activity]) => (
                  <div key={teamName}>
                    {activity.recentActions.map((action) => (
                      <div key={action.id} className="flex items-center justify-between py-2 border-b border-gray-200 last:border-b-0">
                        <div className="flex items-center space-x-3">
                          <div className={`w-2 h-2 rounded-full bg-${getTeamColor(teamName)}-500`}></div>
                          <span className="text-sm text-gray-700">{action.action}</span>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            action.priority === 'high' ? 'bg-red-100 text-red-700' :
                            action.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-green-100 text-green-700'
                          }`}>
                            {action.priority}
                          </span>
                        </div>
                        <span className="text-xs text-gray-500">
                          {action.timestamp.toLocaleTimeString()}
                        </span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-2">Quick Sync</h4>
                <p className="text-sm text-blue-700 mb-3">Synchronize data across all teams</p>
                <button
                  onClick={loadTeamActivities}
                  className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm transition-all duration-200"
                >
                  <FaSync className="w-4 h-4" />
                  <span>Sync Now</span>
                </button>
              </div>
              
              <div className="bg-green-50 rounded-lg p-4">
                <h4 className="font-semibold text-green-900 mb-2">Team Health</h4>
                <p className="text-sm text-green-700 mb-3">Overall system status</p>
                <div className="flex items-center space-x-2">
                  {Object.values(teamActivities).every(a => a.health === 'good') ? (
                    <>
                      <FaCheckCircle className="w-4 h-4 text-green-600" />
                      <span className="text-sm font-medium text-green-800">All Systems Operational</span>
                    </>
                  ) : (
                    <>
                      <FaExclamationTriangle className="w-4 h-4 text-yellow-600" />
                      <span className="text-sm font-medium text-yellow-800">Some Issues Detected</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Integration Status Bar */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>Integration Status</span>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span>Real-time sync active</span>
              </div>
              <span>Last updated: {new Date().toLocaleTimeString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeamCollaborationWidget;