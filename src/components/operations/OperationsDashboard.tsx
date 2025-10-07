/**
 * OpsQuery - Real-time Query Management System
 * Copyright (c) 2024 OpsQuery Development Team
 * 
 * Licensed under the MIT License.
 * 
 * @fileoverview Operations Dashboard - Main interface for Operations team
 * @author OpsQuery Development Team
 * @version 2.0.0
 */

'use client';

import React, { useState, useEffect } from 'react';
import OperationsNavbar from './OperationsNavbar';
import OperationsSidebar from './OperationsSidebar';
import DashboardOverview from './DashboardOverview';
import TabNavigation from './TabNavigation';
import QueryRaised from './QueryRaised';
import QueryResolved from './QueryResolved';
import SanctionedCases from './SanctionedCases';
import AddQuery from './AddQuery';



export type TabType = 'dashboard' | 'query-raised' | 'query-resolved' | 'sanctioned-cases' | 'add-query';

export default function OperationsDashboard() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [newQueriesCount, setNewQueriesCount] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedAppNo, setSelectedAppNo] = useState<string>('');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Fetch query statistics for real-time updates
  const fetchQueryStats = async () => {
    try {
      const response = await fetch('/api/queries?stats=true');
      const result = await response.json();
      
      if (result.success) {
        setNewQueriesCount(result.data.pending || 0);
      }
    } catch (error) {
      console.error('Error fetching query stats:', error);
    }
  };

  // Initial load and real-time service initialization
  useEffect(() => {
    fetchQueryStats();
    
    // Initialize query update service for real-time updates
    if (typeof window !== 'undefined') {
      import('@/lib/queryUpdateService').then(({ queryUpdateService }) => {
        queryUpdateService.initialize();
        
        // Subscribe to all query updates for operations
        const unsubscribe = queryUpdateService.subscribe('operations', (update) => {
          console.log('📨 Operations Dashboard received query update:', update.appNo, update.action);
          
          // Refresh stats when we receive updates
          fetchQueryStats();
          
          // Force refresh of the active tab
          setRefreshTrigger(prev => prev + 1);
        });
        
        console.log('🌐 Operations Dashboard: Initialized real-time query update service');
        
        // Cleanup on unmount
        return () => {
          unsubscribe();
        };
      });
    }
    
    // Set up refresh interval for stats as fallback
    const statsInterval = setInterval(() => {
      fetchQueryStats();
    }, 50000); // Refresh every 50 seconds (staggered)
    
    return () => {
      clearInterval(statsInterval);
    };
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setRefreshTrigger(prev => prev + 1);
    setLastRefreshed(new Date());
    
    // Fetch latest stats
    await fetchQueryStats();
    
    // Small delay to show refresh state
    setTimeout(() => {
      setIsRefreshing(false);
    }, 500);
  };

  const handleRaiseQuery = (appNo: string) => {
    // Switch to add-query tab with the appNo pre-filled
    setSelectedAppNo(appNo);
    setActiveTab('add-query');
  };

  const handleTabChange = (tab: TabType) => {
    // Clear selectedAppNo when switching away from add-query tab
    if (tab !== 'add-query') {
      setSelectedAppNo('');
    }
    setActiveTab(tab);
  };

  const handleQuerySubmitted = () => {
    // Navigate to queries-raised tab after query submission
    setActiveTab('query-raised');
    // Trigger refresh to show the new query
    setRefreshTrigger(prev => prev + 1);
  };


  const renderActiveTab = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <div className="space-y-6">
            <DashboardOverview />
          </div>
        );
      case 'query-raised':
        return <QueryRaised key={refreshTrigger} />;
      case 'query-resolved':
        return <QueryResolved key={refreshTrigger} />;
      case 'sanctioned-cases':
        return <SanctionedCases key={refreshTrigger} onRaiseQuery={handleRaiseQuery} />;
      case 'add-query':
        return <AddQuery key={refreshTrigger} appNo={selectedAppNo} onQuerySubmitted={handleQuerySubmitted} />;

      default:
        return (
          <div className="space-y-6">
            <DashboardOverview />
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <OperationsNavbar />
      
      <div className="flex flex-col lg:flex-row">
        {/* Mobile Header & Navigation */}
        <div className="lg:hidden bg-white shadow-sm border-b sticky top-0 z-40">
          <div className="px-4 py-4">
            <div className="flex items-center justify-between mb-3">
              <h1 className="text-xl font-bold text-slate-800">Operations Dashboard</h1>
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors"
              >
                <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
            
            {/* Mobile Tab Navigation */}
            <div className="relative">
              <select
                value={activeTab}
                onChange={(e) => handleTabChange(e.target.value as TabType)}
                className="w-full p-3 text-base font-semibold text-slate-800 bg-white border-2 border-slate-200 rounded-xl appearance-none cursor-pointer hover:border-blue-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
              >
                <option value="dashboard">📊 Dashboard Overview</option>
                <option value="query-raised">📋 Queries Raised</option>
                <option value="query-resolved">✅ Queries Resolved</option>
                <option value="sanctioned-cases">🏛️ Sanctioned Cases</option>
                <option value="add-query">➕ Add Query</option>
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none">
                <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar for Desktop */}
        <div className="hidden lg:block">
          <OperationsSidebar activeTab={activeTab} onTabChangeAction={handleTabChange} />
        </div>

        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex">
            <div 
              className="fixed inset-0 bg-black bg-opacity-50" 
              onClick={() => setSidebarOpen(false)}
            />
            <div className="relative w-80 max-w-xs bg-white shadow-xl">
              <div className="flex items-center justify-between p-4 border-b">
                <h2 className="text-lg font-semibold text-slate-800">Navigation</h2>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200"
                >
                  <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="p-4 space-y-2">
                {[
                  { key: 'dashboard', label: '📊 Dashboard Overview', icon: '📊' },
                  { key: 'query-raised', label: '📋 Queries Raised', icon: '📋' },
                  { key: 'query-resolved', label: '✅ Queries Resolved', icon: '✅' },
                  { key: 'sanctioned-cases', label: '🏛️ Sanctioned Cases', icon: '🏛️' },
                  { key: 'add-query', label: '➕ Add Query', icon: '➕' }
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => {
                      handleTabChange(tab.key as TabType);
                      setSidebarOpen(false);
                    }}
                    className={`w-full flex items-center space-x-3 px-4 py-3 text-left rounded-xl transition-all ${
                      activeTab === tab.key
                        ? 'bg-blue-100 text-blue-700 font-semibold'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'
                    }`}
                  >
                    <span className="text-xl">{tab.icon}</span>
                    <span className="font-medium">{tab.label.replace(/^[^\s]+ /, '')}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
        
        {/* Main Content Area */}
        <div className="flex-1 lg:ml-0 min-h-screen">
          <div className="max-w-full px-4 lg:px-8 py-6 space-y-6">
            {/* Content Area with Enhanced Responsive Design */}
            <div className="w-full">
              {renderActiveTab()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
