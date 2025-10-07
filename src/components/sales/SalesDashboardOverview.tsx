'use client';

import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  CheckCircle,
  Clock,
  AlertTriangle
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface QueryStats {
  total: number;
  pending: number;
  resolved: number;
  urgent: number;
  todaysQueries: number;
  responseRate: number;
  avgResolutionTime: string;
}

interface SalesDashboardOverviewProps {
  operationsUpdates?: any[];
}

export default function SalesDashboardOverview({ operationsUpdates = [] }: SalesDashboardOverviewProps) {
  const [stats, setStats] = useState<QueryStats>({
    total: 0,
    pending: 0,
    resolved: 0,
    urgent: 0,
    todaysQueries: 0,
    responseRate: 0,
    avgResolutionTime: '0h'
  });
  const [isLoading, setIsLoading] = useState(true);
  const [recentQueries, setRecentQueries] = useState<any[]>([]);

  const { user } = useAuth();

  // Helper function to get user's assigned branches
  const getUserBranches = (user: any) => {
    if (!user) return [];
    
    // Priority: assignedBranches > branch > branchCode
    if (user.assignedBranches && user.assignedBranches.length > 0) {
      return user.assignedBranches;
    }
    
    const branches = [];
    if (user.branch) branches.push(user.branch);
    if (user.branchCode && user.branchCode !== user.branch) branches.push(user.branchCode);
    
    return branches.filter(Boolean);
  };

  useEffect(() => {
    fetchDashboardStats();
    fetchRecentQueries();
    
    // Set up real-time updates
    if (typeof window !== 'undefined') {
      import('@/lib/queryUpdateService').then(({ queryUpdateService }) => {
        // Subscribe to real-time updates for sales team
        const unsubscribe = queryUpdateService.subscribe('sales', (update) => {
          console.log('📨 Sales Dashboard Overview received query update:', update.appNo, update.action);
          
          // Refresh data when we receive updates
          fetchDashboardStats();
          fetchRecentQueries();
        });
        
        console.log('🌐 Sales Dashboard Overview: Subscribed to real-time updates');
        
        // Cleanup on unmount
        return () => {
          unsubscribe();
        };
      });
    }
    
    // Set up polling as fallback every 30 seconds
    const interval = setInterval(() => {
      fetchDashboardStats();
      fetchRecentQueries();
    }, 42000); // Every 42 seconds (staggered)
    
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const userBranches = getUserBranches(user);
      const branchParam = userBranches.length > 0 ? `&branches=${userBranches.join(',')}` : '';
      
      const response = await fetch(`/api/queries?team=sales&status=all&includeBoth=true${branchParam}`);
      const result = await response.json();
      
      if (result.success) {
        // Filter to ensure we only count queries relevant to sales team
        const salesQueries = result.data.filter((query: any) => 
          query.markedForTeam === 'sales' || 
          query.markedForTeam === 'both' || 
          query.team === 'sales'
        );
        
        const today = new Date().toDateString();
        
        const calculatedStats: QueryStats = {
          total: salesQueries.length,
          pending: salesQueries.filter((q: any) => q.status === 'pending').length,
          resolved: salesQueries.filter((q: any) => q.status === 'resolved').length,
          urgent: salesQueries.filter((q: any) => q.priority === 'high').length,
          todaysQueries: salesQueries.filter((q: any) => 
            new Date(q.createdAt).toDateString() === today
          ).length,
          responseRate: salesQueries.length > 0 ? 
            Math.round((salesQueries.filter((q: any) => q.status === 'resolved').length / salesQueries.length) * 100) : 0,
          avgResolutionTime: '2.5h' // Mock data for now
        };
        
        setStats(calculatedStats);
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRecentQueries = async () => {
    try {
      const userBranches = getUserBranches(user);
      const branchParam = userBranches.length > 0 ? `&branches=${userBranches.join(',')}` : '';
      
      const response = await fetch(`/api/queries?team=sales&limit=5&includeBoth=true${branchParam}`);
      const result = await response.json();
      
      if (result.success) {
        // Filter to ensure we only show queries relevant to sales team
        const salesQueries = result.data.filter((query: any) => 
          query.markedForTeam === 'sales' || 
          query.markedForTeam === 'both' || 
          query.team === 'sales'
        );
        setRecentQueries(salesQueries.slice(0, 5));
      }
    } catch (error) {
      console.error('Error fetching recent queries:', error);
    }
  };

  const statCards = [
    {
      title: 'Total Queries',
      value: stats.total,
      icon: MessageSquare,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'Pending',
      value: stats.pending,
      icon: Clock,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
    },
    {
      title: 'Resolved',
      value: stats.resolved,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: 'Urgent',
      value: stats.urgent,
      icon: AlertTriangle,
      color: 'text-red-600',
      bgColor: 'bg-red-100',
    }
  ];


  if (isLoading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Sales Dashboard</h1>
        <p className="text-gray-600">Monitor and manage sales queries in real-time</p>
      </div>

      {/* Query Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-2 rounded-lg ${card.bgColor}`}>
                  <Icon className={`h-6 w-6 ${card.color}`} />
                </div>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 mb-1">
                  {card.value}
                </p>
                <p className="text-sm text-gray-600">{card.title}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Operations Team Updates */}
      {operationsUpdates && operationsUpdates.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Operations Team Updates</h3>
          </div>
          <div className="divide-y divide-gray-200">
            {operationsUpdates.map((update, index) => (
              <div key={index} className="px-6 py-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                        {update.type}
                      </span>
                      <span className="text-sm text-gray-500">from {update.team}</span>
                    </div>
                    <p className="text-sm text-gray-700">{update.message}</p>
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(update.timestamp).toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: true
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Queries */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Recent Sales Queries</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {recentQueries.length > 0 ? (
            recentQueries.map((query, index) => (
              <div key={index} className="px-6 py-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        query.status === 'pending' 
                          ? 'bg-orange-100 text-orange-800'
                          : query.status === 'resolved'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {query.status}
                      </span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        query.priority === 'high'
                          ? 'bg-red-100 text-red-800'
                          : query.priority === 'medium'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {query.priority}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-gray-900 mt-1 truncate">
                      {query.title || `Query for ${query.appNo}`}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      {query.customerName} • {query.branch} • App: {query.appNo}
                    </p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="text-sm text-gray-500">
                      {new Date(query.createdAt).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true
                      })}
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="px-6 py-8 text-center">
              <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No recent queries found</p>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}