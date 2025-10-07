'use client';

import React, { useState } from 'react';
import { RefreshCw, Bell, User, ChevronDown, Building2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import NotificationCenter from '@/components/shared/NotificationCenter';

interface SalesNavbarProps {
  assignedBranches: string[];
  allBranches?: any[];
  onRefresh: () => void;
  isRefreshing: boolean;
  lastRefreshed: Date;
  searchAppNo?: string;
  onAppNoSearch?: (appNo: string) => void;
  onClearFilter?: () => void;
}

export default function SalesNavbar({ 
  assignedBranches, 
  allBranches = [],
  onRefresh, 
  isRefreshing, 
  lastRefreshed,
  searchAppNo = '',
  onAppNoSearch,
  onClearFilter
}: SalesNavbarProps) {
  const { user, logout } = useAuth();
  const [showBranchDropdown, setShowBranchDropdown] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [localSearchTerm, setLocalSearchTerm] = useState(searchAppNo);

  const formatLastRefreshed = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const handleLogout = () => {
    logout();
    // Redirect to login page
    window.location.href = '/login';
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onAppNoSearch) {
      onAppNoSearch(localSearchTerm.trim());
    }
  };

  const handleClearSearch = () => {
    setLocalSearchTerm('');
    if (onClearFilter) {
      onClearFilter();
    }
  };

  return (
    <nav className="navbar sales-navbar bg-white shadow-lg border-b border-gray-200 sticky top-0 z-50">
      <div className="mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Left side - Logo and Title */}
          <div className="flex items-center space-x-2 lg:space-x-4 min-w-0 flex-1">
            <div className="flex items-center space-x-2 lg:space-x-3">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-sm">
                  <span className="text-white font-bold text-lg">📊</span>
                </div>
              </div>
              <div className="hidden sm:block min-w-0">
                <h1 className="text-lg lg:text-xl font-bold text-blue-600 truncate">BizLoan Sales</h1>
                <p className="text-xs lg:text-sm text-gray-600 truncate">Sales Dashboard</p>
              </div>
              <div className="sm:hidden">
                <h1 className="text-lg font-bold text-blue-600">Sales</h1>
              </div>
            </div>
            
            {/* Refresh button - Always visible */}
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className={`flex-shrink-0 inline-flex items-center px-2 lg:px-3 py-2 border border-transparent text-xs lg:text-sm font-medium rounded-lg text-blue-700 bg-blue-50 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 ${
                isRefreshing ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              title="Refresh Dashboard"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''} lg:mr-1`} />
              <span className="hidden lg:inline">Refresh</span>
            </button>

            {/* Last refreshed indicator - Hidden on mobile */}
            <span className="hidden md:inline-block text-xs text-gray-500 whitespace-nowrap">
              Updated: {formatLastRefreshed(lastRefreshed)}
            </span>
          </div>

          {/* Center - App Number Search */}
          <div className="hidden lg:flex items-center flex-1 max-w-md mx-4">
            <form onSubmit={handleSearchSubmit} className="w-full">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  value={localSearchTerm}
                  onChange={(e) => setLocalSearchTerm(e.target.value)}
                  placeholder="Search by Application Number..."
                  className="w-full pl-10 pr-10 py-2 text-sm text-gray-900 bg-gray-50 border border-gray-200 rounded-lg placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-colors"
                />
                {localSearchTerm && (
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                    title="Clear search"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Mobile search button */}
          <div className="lg:hidden flex-shrink-0">
            <button
              type="button"
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title="Search"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
          </div>

          {/* Right side - Branches, Notifications, Profile */}
          <div className="flex items-center space-x-4">
            {/* Enhanced Branches Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowBranchDropdown(!showBranchDropdown)}
                className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
              >
                <Building2 className="h-4 w-4" />
                <span>Branches ({assignedBranches.length}/{allBranches.length})</span>
                <ChevronDown className="h-4 w-4" />
              </button>
              
              {showBranchDropdown && (
                <div className="absolute right-0 mt-2 w-96 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-50 max-h-96 overflow-hidden">
                  {/* Header */}
                  <div className="py-3 px-4 border-b border-gray-200 bg-gray-50">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-gray-900">Branch Access Overview</h3>
                      <div className="text-xs text-gray-500">
                        {assignedBranches.length} assigned / {allBranches.length} total
                      </div>
                    </div>
                  </div>

                  {/* Assigned Branches Section */}
                  {assignedBranches.length > 0 && (
                    <div className="border-b border-gray-200">
                      <div className="py-2 px-4 bg-blue-50">
                        <h4 className="text-xs font-medium text-blue-800 uppercase tracking-wide">
                          Your Assigned Branches ({assignedBranches.length})
                        </h4>
                      </div>
                      <div className="py-1 max-h-32 overflow-y-auto">
                        {assignedBranches.map((branch, index) => {
                          const branchData = allBranches.find(b => 
                            b.name === branch || b.code === branch
                          );
                          return (
                            <div
                              key={index}
                              className="px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 flex items-center justify-between"
                            >
                              <div className="flex items-center space-x-2">
                                <Building2 className="h-3 w-3 text-blue-500" />
                                <span className="font-medium">{branch}</span>
                                {branchData && (
                                  <span className="text-xs text-gray-500">({branchData.code})</span>
                                )}
                              </div>
                              {branchData?.stats && (
                                <div className="flex items-center space-x-2 text-xs">
                                  <span className="bg-orange-100 text-orange-800 px-1.5 py-0.5 rounded">
                                    {branchData.stats.pendingQueries} pending
                                  </span>
                                  <span className="bg-green-100 text-green-800 px-1.5 py-0.5 rounded">
                                    {branchData.stats.totalSanctioned} sanctioned
                                  </span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* All Branches Section */}
                  <div>
                    <div className="py-2 px-4 bg-gray-50">
                      <h4 className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                        All Branches ({allBranches.length})
                      </h4>
                    </div>
                    <div className="py-1 max-h-48 overflow-y-auto">
                      {/* North Region */}
                      {allBranches.filter(b => b.region === 'North').length > 0 && (
                        <>
                          <div className="px-4 py-1 bg-gray-100">
                            <span className="text-xs font-medium text-gray-600">
                              North Region ({allBranches.filter(b => b.region === 'North').length})
                            </span>
                          </div>
                          {allBranches
                            .filter(b => b.region === 'North')
                            .sort((a, b) => a.name.localeCompare(b.name))
                            .map((branch, index) => {
                              const isAssigned = assignedBranches.includes(branch.name) || assignedBranches.includes(branch.code);
                              return (
                                <div
                                  key={`north-${index}`}
                                  className={`px-4 py-2 text-sm hover:bg-gray-50 flex items-center justify-between ${
                                    isAssigned ? 'bg-blue-50 border-l-2 border-blue-400' : ''
                                  }`}
                                >
                                  <div className="flex items-center space-x-2">
                                    <Building2 className={`h-3 w-3 ${isAssigned ? 'text-blue-500' : 'text-gray-400'}`} />
                                    <span className={isAssigned ? 'font-medium text-blue-900' : 'text-gray-700'}>
                                      {branch.name}
                                    </span>
                                    <span className="text-xs text-gray-500">({branch.code})</span>
                                  </div>
                                  {branch.stats && (
                                    <div className="flex items-center space-x-1 text-xs">
                                      {branch.stats.pendingQueries > 0 && (
                                        <span className="bg-orange-100 text-orange-700 px-1 py-0.5 rounded text-xs">
                                          {branch.stats.pendingQueries}
                                        </span>
                                      )}
                                      {branch.stats.totalSanctioned > 0 && (
                                        <span className="bg-green-100 text-green-700 px-1 py-0.5 rounded text-xs">
                                          {branch.stats.totalSanctioned}
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                        </>
                      )}

                      {/* South Region */}
                      {allBranches.filter(b => b.region === 'South').length > 0 && (
                        <>
                          <div className="px-4 py-1 bg-gray-100">
                            <span className="text-xs font-medium text-gray-600">
                              South Region ({allBranches.filter(b => b.region === 'South').length})
                            </span>
                          </div>
                          {allBranches
                            .filter(b => b.region === 'South')
                            .sort((a, b) => a.name.localeCompare(b.name))
                            .map((branch, index) => {
                              const isAssigned = assignedBranches.includes(branch.name) || assignedBranches.includes(branch.code);
                              return (
                                <div
                                  key={`south-${index}`}
                                  className={`px-4 py-2 text-sm hover:bg-gray-50 flex items-center justify-between ${
                                    isAssigned ? 'bg-blue-50 border-l-2 border-blue-400' : ''
                                  }`}
                                >
                                  <div className="flex items-center space-x-2">
                                    <Building2 className={`h-3 w-3 ${isAssigned ? 'text-blue-500' : 'text-gray-400'}`} />
                                    <span className={isAssigned ? 'font-medium text-blue-900' : 'text-gray-700'}>
                                      {branch.name}
                                    </span>
                                    <span className="text-xs text-gray-500">({branch.code})</span>
                                  </div>
                                  {branch.stats && (
                                    <div className="flex items-center space-x-1 text-xs">
                                      {branch.stats.pendingQueries > 0 && (
                                        <span className="bg-orange-100 text-orange-700 px-1 py-0.5 rounded text-xs">
                                          {branch.stats.pendingQueries}
                                        </span>
                                      )}
                                      {branch.stats.totalSanctioned > 0 && (
                                        <span className="bg-green-100 text-green-700 px-1 py-0.5 rounded text-xs">
                                          {branch.stats.totalSanctioned}
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="py-2 px-4 border-t border-gray-200 bg-gray-50">
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>Real-time branch statistics</span>
                      <span>🔄 Auto-refresh: 15s</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Notifications */}
            <NotificationCenter team="sales" />


            {/* Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <User className="h-5 w-5" />
                {user && (
                  <span className="text-sm font-medium text-gray-700">
                    {user.name}
                  </span>
                )}
                <ChevronDown className="h-4 w-4" />
              </button>
              
              {showProfileDropdown && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-50">
                  {user && (
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-sm font-medium text-gray-900">{user.name}</p>
                      <p className="text-xs text-gray-500">{user.role}</p>
                      {user.branch && (
                        <p className="text-xs text-gray-500">{user.branch}</p>
                      )}
                    </div>
                  )}
                  <div className="py-1">
                    <button
                      onClick={handleLogout}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Click outside to close dropdowns */}
      {(showBranchDropdown || showProfileDropdown) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setShowBranchDropdown(false);
            setShowProfileDropdown(false);
          }}
        />
      )}
    </nav>
  );
}