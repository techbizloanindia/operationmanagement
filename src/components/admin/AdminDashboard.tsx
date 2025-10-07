'use client';

import React, { useState, lazy, Suspense, useMemo, useCallback } from 'react';
import AdminNavbar from './AdminNavbar';

// Lazy load tab components for better performance
const UserCreationTab = lazy(() => import('./UserCreationTab'));
const BulkUploadTab = lazy(() => import('./BulkUploadTab'));
const BranchManagementTab = lazy(() => import('./BranchManagementTab'));
const SanctionedCasesTab = lazy(() => import('./SanctionedCasesTab'));

type TabType = 'user-management' | 'bulk-upload' | 'branch-management' | 'sanctioned-cases';

const AdminDashboard = React.memo(() => {
  const [activeTab, setActiveTab] = useState<TabType>('user-management');

  // Memoize tabs array to prevent unnecessary re-renders
  const tabs = useMemo(() => [
    { id: 'user-management', label: 'User Management', icon: '👤' },
    { id: 'bulk-upload', label: 'Bulk Upload', icon: '📄' },
    { id: 'branch-management', label: 'Branch Management', icon: '🏢' },
    { id: 'sanctioned-cases', label: 'Sanctioned Cases', icon: '📋' },
  ], []);

  // Memoize tab change handler
  const handleTabChange = useCallback((tabId: TabType) => {
    setActiveTab(tabId);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
      <AdminNavbar />
      
      {/* Simplified Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Static gradient orbs - removed animations for performance */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full opacity-10 blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full opacity-8 blur-3xl"></div>
        
        {/* Simplified grid pattern */}
        <div 
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.1) 1px, transparent 0)`,
            backgroundSize: '60px 60px'
          }}
        ></div>
      </div>
      
      <div className="relative z-10 w-full max-w-7xl mx-auto my-4 sm:my-8 px-4">
        {/* Simplified Header Card */}
        <div className="bg-slate-800/80 border border-slate-700 rounded-2xl shadow-xl mb-8 overflow-hidden">
          <div className="p-6 sm:p-8">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-4 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                    <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">
                        Administrative Control Center
                      </h1>
                    <p className="text-slate-300">
                      System management and data operations
                    </p>
                  </div>
                </div>
                
                {/* Simplified Stats */}
                <div className="flex flex-wrap gap-4 mt-4">
                  <div className="flex items-center space-x-2 px-3 py-1 rounded-lg bg-green-500/20 border border-green-500/30">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    <span className="text-sm text-green-200">System Active</span>
                  </div>
                  <div className="flex items-center space-x-2 px-3 py-1 rounded-lg bg-blue-500/20 border border-blue-500/30">
                    <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                    </svg>
                    <span className="text-sm text-blue-200">Multi-User Access</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Enhanced Tab Navigation with Modern Design */}
          <div className="px-8 sm:px-10 pt-6 pb-4">
            <nav className="flex space-x-2 overflow-x-auto" aria-label="Tabs">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id as TabType)}
                  className={`whitespace-nowrap px-4 py-3 rounded-lg font-medium text-sm transition-colors duration-200 ${
                    activeTab === tab.id
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">{tab.icon}</span>
                    <span className="hidden sm:inline">{tab.label}</span>
                  </div>
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Simplified Main Content Area */}
        <div className="bg-slate-800/60 border border-slate-700 rounded-2xl shadow-xl overflow-hidden">
          <div className="p-6 sm:p-8 min-h-[600px]">
            {/* Lazy loaded content with loading fallback */}
            <Suspense fallback={
              <div className="flex items-center justify-center h-96">
                <div className="flex flex-col items-center space-y-4">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
                  <p className="text-slate-300">Loading...</p>
                </div>
          </div>
            }>
              {activeTab === 'user-management' && <UserCreationTab />}
              {activeTab === 'bulk-upload' && <BulkUploadTab />}
              {activeTab === 'branch-management' && <BranchManagementTab />}
              {activeTab === 'sanctioned-cases' && <SanctionedCasesTab />}
            </Suspense>
          </div>
        </div>
      </div>

      <style jsx>{`
        /* Simplified scrollbar for tab navigation */
        nav::-webkit-scrollbar {
          height: 3px;
        }
        
        nav::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 5px;
        }
        
        nav::-webkit-scrollbar-thumb {
          background: #3b82f6;
          border-radius: 5px;
        }
      `}</style>
    </div>
  );
});

AdminDashboard.displayName = 'AdminDashboard';

export default AdminDashboard; 