'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { FaCircle, FaSync } from 'react-icons/fa';
import { setupQueryUpdateListeners, QueryUpdateEvent } from '@/lib/dashboardSyncUtils';

export default function DashboardOverview() {
  const { user } = useAuth();
  const [isLoadingBranches, setIsLoadingBranches] = useState(true);
  const [isLoadingQueries, setIsLoadingQueries] = useState(true);
  const [isLoadingApplications, setIsLoadingApplications] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'error'>('connecting');
  const [statistics, setStatistics] = useState({
    totalSanctionedCases: 1356,
    queriesRaised: 150,
    pendingQueries: 58,
    resolvedQueries: 44,
    totalBranches: 0,
    activeBranches: 0
  });

  // Extract functions outside useEffect to prevent recreating them on each render
  const fetchQueryStatistics = React.useCallback(async () => {
    try {
      setIsLoadingQueries(true);
      const response = await fetch('/api/queries?stats=true');
      const result = await response.json();

      if (result.success) {
        setStatistics(prev => ({
          ...prev,
          queriesRaised: result.data.total || 0,
          pendingQueries: result.data.pending || 0,
          resolvedQueries: result.data.resolved || 0
        }));
      }
    } catch (error) {
      console.error('Error fetching query statistics:', error);
      setConnectionStatus('error');
    } finally {
      setIsLoadingQueries(false);
    }
  }, []);

  const fetchApplicationStatistics = React.useCallback(async () => {
    try {
      setIsLoadingApplications(true);
      const response = await fetch('/api/get-sanctioned');
      const result = await response.json();

      if (result.success) {
        setStatistics(prev => ({
          ...prev,
          totalSanctionedCases: result.count || 0
        }));
      }
    } catch (error) {
      console.error('Error fetching application statistics:', error);
      setConnectionStatus('error');
    } finally {
      setIsLoadingApplications(false);
    }
  }, []);

  const fetchBranchStatistics = React.useCallback(async () => {
    try {
      setIsLoadingBranches(true);
      const response = await fetch('/api/branches');
      const result = await response.json();

      if (result.success) {
        const totalBranches = result.data.length;
        const activeBranches = result.data.filter((branch: any) => branch.isActive).length;

        setStatistics(prev => ({
          ...prev,
          totalBranches,
          activeBranches
        }));
      }
    } catch (error) {
      console.error('Error fetching branch statistics:', error);
      setConnectionStatus('error');
    } finally {
      setIsLoadingBranches(false);
    }
  }, []);

  

  const fetchAllStatistics = React.useCallback(async () => {
    setConnectionStatus('connecting');
    try {
      await Promise.all([
        fetchQueryStatistics(),
        fetchApplicationStatistics(),
        fetchBranchStatistics()
      ]);
      setConnectionStatus('connected');
      setLastUpdated(new Date());
    } catch (error) {
      setConnectionStatus('error');
    }
  }, [fetchQueryStatistics, fetchApplicationStatistics, fetchBranchStatistics]);

  useEffect(() => {
    // Set up real-time updates using queryUpdateService
    if (typeof window !== 'undefined') {
      import('@/lib/queryUpdateService').then(({ queryUpdateService }) => {
        // Subscribe to all query updates for operations
        const unsubscribe = queryUpdateService.subscribe('operations', (update) => {
          console.log('📨 Operations Dashboard Overview received query update:', update.appNo, update.action);

          // Update statistics in real-time based on action type
          setStatistics(prev => {
            const newStats = { ...prev };
            
            // Handle query creation
            if (update.action === 'created') {
              newStats.queriesRaised += 1;
              newStats.pendingQueries += 1;
              console.log('📝 New query created - Updated counts');
            }
            
            // Handle query resolution (approved, deferred, otc, waived, resolved)
            else if (['approved', 'deferred', 'otc', 'waived', 'resolved'].includes(update.action)) {
              if (newStats.pendingQueries > 0) {
                newStats.pendingQueries -= 1;
              }
              newStats.resolvedQueries += 1;
              console.log('✅ Query resolved - Updated counts');
              
              // Trigger a full refresh after resolution to ensure accurate sub-query counts
              setTimeout(() => {
                fetchQueryStatistics();
              }, 500);
            }
            
            // Handle sanctioned case removal
            else if (update.action === 'sanctioned_case_removed') {
              if (newStats.totalSanctionedCases > 0) {
                newStats.totalSanctionedCases -= 1;
              }
              console.log('🗑️ Sanctioned case removed - Updated count');
            }
            
            return newStats;
          });
          
          // Mark as connected and update timestamp
          setConnectionStatus('connected');
          setLastUpdated(new Date());
        });

        console.log('🌐 Operations Dashboard Overview: Subscribed to real-time updates');

        // Add cleanup for real-time subscription
        window.addEventListener('beforeunload', unsubscribe);

        return () => {
          unsubscribe();
          window.removeEventListener('beforeunload', unsubscribe);
        };
      });
    }

    // Listen for custom events when queries are added/updated (legacy support)
    const handleQueryUpdate = (event: Event) => {
      const customEvent = event as CustomEvent;
      console.log('🔄 Query update detected, refreshing statistics...', customEvent?.detail);
      fetchQueryStatistics();
    };

    // Listen for localStorage changes (cross-tab synchronization)
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'queryUpdate') {
        console.log('🔄 Storage-based query update detected, refreshing statistics...');
        fetchQueryStatistics();
      }
    };

    // Listen for both query creation and updates
    window.addEventListener('queryAdded', handleQueryUpdate);
    window.addEventListener('queryUpdated', handleQueryUpdate);
    window.addEventListener('queryResolved', handleQueryUpdate);
    window.addEventListener('storage', handleStorageChange);

    // Fetch all statistics on mount
    fetchAllStatistics();

    // Set up real-time updates every 35 seconds
    const interval = setInterval(fetchAllStatistics, 35000);

    return () => {
      clearInterval(interval);
      // Clean up event listeners
      window.removeEventListener('queryAdded', handleQueryUpdate);
      window.removeEventListener('queryUpdated', handleQueryUpdate);
      window.removeEventListener('queryResolved', handleQueryUpdate);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [fetchQueryStatistics, fetchAllStatistics]);

  const refreshAllData = async () => {
    setIsRefreshing(true);
    setConnectionStatus('connecting');
    
    try {
      // Fetch all data concurrently
      const [queriesResponse, applicationsResponse, branchesResponse] = await Promise.all([
        fetch('/api/queries?stats=true'),
        fetch('/api/get-sanctioned'),
        fetch('/api/branches')
      ]);

      const [queriesResult, applicationsResult, branchesResult] = await Promise.all([
        queriesResponse.json(),
        applicationsResponse.json(),
        branchesResponse.json()
      ]);

      // Update all statistics
      let updatedStats = { ...statistics };

      if (queriesResult.success) {
        updatedStats = {
          ...updatedStats,
          queriesRaised: queriesResult.data.total || 0,
          pendingQueries: queriesResult.data.pending || 0,
          resolvedQueries: queriesResult.data.resolved || 0
        };
      }

      if (applicationsResult.success) {
        updatedStats = {
          ...updatedStats,
          totalSanctionedCases: applicationsResult.count || 0
        };
      }

      if (branchesResult.success) {
        const totalBranches = branchesResult.data.length;
        const activeBranches = branchesResult.data.filter((branch: any) => branch.isActive).length;
        updatedStats = {
          ...updatedStats,
          totalBranches,
          activeBranches
        };
      }
      
      setStatistics(updatedStats);
      setLastUpdated(new Date());
      setConnectionStatus('connected');
      
    } catch (error) {
      console.error('Error refreshing data:', error);
      setConnectionStatus('error');
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="p-4 lg:p-6">

      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-4 lg:p-6 mb-4 lg:mb-6 text-white">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center space-y-4 lg:space-y-0">
          <div>
            <h1 className="text-xl lg:text-2xl font-bold mb-2">Welcome back, {user?.name || 'Nitish'}!</h1>
            <div className="space-y-1 text-blue-100">
              <p className="text-sm lg:text-base">Role: <span className="font-semibold">operations</span> | Employee ID: <span className="font-semibold">{user?.employeeId || 'CONS0130'}</span></p>
              <p className="text-sm lg:text-base">Department:</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={refreshAllData}
              disabled={isRefreshing}
              className="bg-blue-700 hover:bg-blue-800 px-3 lg:px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors text-sm lg:text-base disabled:opacity-50"
            >
              <FaSync className={isRefreshing ? 'animate-spin' : ''} />
              <span>{isRefreshing ? 'REFRESHING...' : 'REFRESH ALL'}</span>
            </button>
          </div>
        </div>
        
        <div className="mt-4 flex flex-col sm:flex-row gap-2 sm:items-center">
          <div className="inline-block bg-blue-500 px-3 lg:px-4 py-2 rounded-lg">
            <span className="font-medium text-sm lg:text-base flex items-center gap-2">
              🏢 Access to {isLoadingBranches ? '...' : statistics.activeBranches} Active Branches 
              {!isLoadingBranches && `(${statistics.totalBranches} Total)`}
              {isLoadingBranches && <FaSync className="animate-spin w-3 h-3" />}
            </span>
          </div>
          <div className="text-blue-100 text-xs flex items-center gap-1">
            <FaCircle className={`w-2 h-2 ${
              connectionStatus === 'connecting' ? 'text-yellow-300 animate-pulse' :
              connectionStatus === 'connected' ? 'text-green-300' : 'text-red-300'
            }`} />
            <span>
              {connectionStatus === 'connecting' ? 'Syncing...' :
               connectionStatus === 'connected' ? `Updated ${lastUpdated.toLocaleTimeString()}` :
               'Connection Error'}
            </span>
          </div>
        </div>
        
        <div className="mt-4 flex items-center space-x-2 text-blue-100">
          <FaCircle className={`w-2 h-2 ${
            connectionStatus === 'connecting' ? 'text-yellow-300 animate-pulse' :
            connectionStatus === 'connected' ? 'text-green-300 animate-pulse' : 'text-red-300'
          }`} />
          <span className="text-xs lg:text-sm font-semibold">
            {connectionStatus === 'connecting' ? 'Loading real-time data...' :
             connectionStatus === 'connected' ? '🔴 LIVE - Real-time updates active' :
             'Real-time data unavailable'}
          </span>
        </div>
      </div>

      {/* Real-time Status Header */}
      <div className="bg-white rounded-lg p-4 mb-4 lg:mb-6 shadow-sm border">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center space-y-2 lg:space-y-0">
          <div className="flex items-center space-x-3">
            <div className={`w-3 h-3 rounded-full ${
              connectionStatus === 'connected' ? 'bg-green-500 animate-pulse' :
              connectionStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' :
              'bg-red-500'
            }`}></div>
            <h2 className="text-lg font-semibold text-gray-800">
              Real-time Operations Dashboard
            </h2>
          </div>
          <div className="flex items-center space-x-4 text-sm text-gray-800 font-medium">
            <span>Status: {
              connectionStatus === 'connected' ? '🟢 Connected' :
              connectionStatus === 'connecting' ? '🟡 Syncing' :
              '🔴 Offline'
            }</span>
            <span className="font-bold">•</span>
            <span>Last Updated: {lastUpdated.toLocaleTimeString()}</span>
            <span className="font-bold">•</span>
            <span>Auto-refresh: 35 sec</span>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 lg:gap-6">
        <div className="bg-white rounded-lg p-4 lg:p-6 shadow-sm border">
          <div className="text-center">
            <div className="text-2xl lg:text-3xl font-bold text-purple-500 mb-2 flex items-center justify-center">
              {isLoadingApplications ? (
                <FaSync className="animate-spin" />
              ) : (
                statistics.totalSanctionedCases.toLocaleString()
              )}
            </div>
            <div className="text-gray-800 text-xs lg:text-sm font-bold">📋 SANCTIONED CASES</div>
            <div className="flex items-center justify-center mt-1">
              <FaCircle className={`w-1.5 h-1.5 ${
                isLoadingApplications ? 'text-yellow-400 animate-pulse' : 'text-green-400 animate-pulse'
              }`} />
              <span className="text-xs text-green-600 ml-1 font-semibold">
                {isLoadingApplications ? 'Loading...' : 'Live'}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 lg:p-6 shadow-sm border">
          <div className="text-center">
            <div className="text-2xl lg:text-3xl font-bold text-green-500 mb-2 flex items-center justify-center">
              {isLoadingBranches ? (
                <FaSync className="animate-spin" />
              ) : (
                statistics.activeBranches
              )}
            </div>
            <div className="text-gray-800 text-xs lg:text-sm font-bold">🏢 ACTIVE BRANCHES</div>
            {!isLoadingBranches && (
              <div className="text-xs text-gray-700 mt-1 font-medium">of {statistics.totalBranches} total</div>
            )}
            <div className="flex items-center justify-center mt-1">
              <FaCircle className={`w-1 h-1 ${
                isLoadingBranches ? 'text-yellow-400 animate-pulse' : 'text-green-400'
              }`} />
              <span className="text-xs text-gray-600 ml-1 font-medium">
                {isLoadingBranches ? 'Loading...' : 'Live'}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 lg:p-6 shadow-sm border">
          <div className="text-center">
            <div className="text-2xl lg:text-3xl font-bold text-blue-500 mb-2 flex items-center justify-center">
              {isLoadingQueries ? (
                <FaSync className="animate-spin" />
              ) : (
                statistics.queriesRaised
              )}
            </div>
            <div className="text-gray-800 text-xs lg:text-sm font-bold">📝 QUERIES RAISED</div>
            <div className="flex items-center justify-center mt-1">
              <FaCircle className={`w-1.5 h-1.5 ${
                isLoadingQueries ? 'text-yellow-400 animate-pulse' : 'text-green-400 animate-pulse'
              }`} />
              <span className="text-xs text-green-600 ml-1 font-semibold">
                {isLoadingQueries ? 'Loading...' : 'Live'}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 lg:p-6 shadow-sm border">
          <div className="text-center">
            <div className="text-2xl lg:text-3xl font-bold text-orange-500 mb-2 flex items-center justify-center">
              {isLoadingQueries ? (
                <FaSync className="animate-spin" />
              ) : (
                statistics.pendingQueries
              )}
            </div>
            <div className="text-gray-800 text-xs lg:text-sm font-bold">⏳ PENDING QUERIES</div>
            <div className="flex items-center justify-center mt-1">
              <FaCircle className={`w-1.5 h-1.5 ${
                isLoadingQueries ? 'text-yellow-400 animate-pulse' : 'text-green-400 animate-pulse'
              }`} />
              <span className="text-xs text-green-600 ml-1 font-semibold">
                {isLoadingQueries ? 'Loading...' : 'Live'}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 lg:p-6 shadow-sm border">
          <div className="text-center">
            <div className="text-2xl lg:text-3xl font-bold text-green-500 mb-2 flex items-center justify-center">
              {isLoadingQueries ? (
                <FaSync className="animate-spin" />
              ) : (
                statistics.resolvedQueries
              )}
            </div>
            <div className="text-gray-800 text-xs lg:text-sm font-bold">✅ RESOLVED QUERIES</div>
            <div className="flex items-center justify-center mt-1">
              <FaCircle className={`w-1.5 h-1.5 ${
                isLoadingQueries ? 'text-yellow-400 animate-pulse' : 'text-green-400 animate-pulse'
              }`} />
              <span className="text-xs text-green-600 ml-1 font-semibold">
                {isLoadingQueries ? 'Loading...' : 'Live'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Real-time Data Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6 mt-6">
        <div className="bg-white rounded-lg p-4 lg:p-6 shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            🏢 Branch Management
            <FaCircle className={`w-2 h-2 ml-2 ${
              isLoadingBranches ? 'text-yellow-400 animate-pulse' : 'text-green-400'
            }`} />
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-800 font-medium">Total Branches:</span>
              <span className="font-bold text-gray-900">{isLoadingBranches ? '...' : statistics.totalBranches}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-800 font-medium">Active Branches:</span>
              <span className="font-bold text-green-700">{isLoadingBranches ? '...' : statistics.activeBranches}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-800 font-medium">Inactive Branches:</span>
              <span className="font-bold text-red-700">
                {isLoadingBranches ? '...' : (statistics.totalBranches - statistics.activeBranches)}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
              <div 
                className="bg-green-500 h-2 rounded-full transition-all duration-500"
                style={{ 
                  width: statistics.totalBranches > 0 ? 
                    `${(statistics.activeBranches / statistics.totalBranches) * 100}%` : '0%' 
                }}
              ></div>
            </div>
            <div className="text-xs text-gray-700 text-center font-medium">
              {statistics.totalBranches > 0 ? 
                `${Math.round((statistics.activeBranches / statistics.totalBranches) * 100)}% Active` : 
                'No data'
              }
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 lg:p-6 shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            📝 Query Management
            <FaCircle className={`w-2 h-2 ml-2 ${
              isLoadingQueries ? 'text-yellow-400 animate-pulse' : 'text-green-400'
            }`} />
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-800 font-medium">Total Queries:</span>
              <span className="font-bold text-gray-900">{isLoadingQueries ? '...' : statistics.queriesRaised}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-800 font-medium">Pending:</span>
              <span className="font-bold text-orange-700">{isLoadingQueries ? '...' : statistics.pendingQueries}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-800 font-medium">Resolved:</span>
              <span className="font-bold text-green-700">{isLoadingQueries ? '...' : statistics.resolvedQueries}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
              <div 
                className="bg-green-500 h-2 rounded-full transition-all duration-500"
                style={{ 
                  width: statistics.queriesRaised > 0 ? 
                    `${(statistics.resolvedQueries / statistics.queriesRaised) * 100}%` : '0%' 
                }}
              ></div>
            </div>
            <div className="text-xs text-gray-700 text-center font-medium">
              {statistics.queriesRaised > 0 ? 
                `${Math.round((statistics.resolvedQueries / statistics.queriesRaised) * 100)}% Resolved` : 
                'No queries'
              }
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 lg:p-6 shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            📋 Applications Status
            <FaCircle className={`w-2 h-2 ml-2 ${
              isLoadingApplications ? 'text-yellow-400 animate-pulse' : 'text-green-400'
            }`} />
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Total Cases:</span>
              <span className="font-semibold">{isLoadingApplications ? '...' : statistics.totalSanctionedCases.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">With Queries:</span>
              <span className="font-semibold text-blue-600">{isLoadingQueries ? '...' : statistics.queriesRaised}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Query Rate:</span>
              <span className="font-semibold text-purple-600">
                {(isLoadingApplications || isLoadingQueries) ? '...' : 
                  statistics.totalSanctionedCases > 0 ? 
                    `${((statistics.queriesRaised / statistics.totalSanctionedCases) * 100).toFixed(1)}%` : 
                    '0%'
                }
              </span>
            </div>
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <div className="text-sm text-blue-800 font-medium">System Performance</div>
              <div className="text-xs text-blue-600 mt-1">
                {connectionStatus === 'connected' ? 
                  '✅ All systems operational' :
                  connectionStatus === 'connecting' ?
                  '🔄 Syncing data...' :
                  '⚠️ Connection issues detected'
                }
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
