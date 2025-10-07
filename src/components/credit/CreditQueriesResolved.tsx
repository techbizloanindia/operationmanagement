'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { querySyncService } from '@/lib/querySyncService';
import { queryUpdateService } from '@/lib/queryUpdateService';
import {
  CheckCircle,
  Calendar,
  User,
  Building,
  Clock,
  FileText,
  Download,
  RefreshCw
} from 'lucide-react';

// Local getUserBranches to handle the User type difference
const getUserBranches = (user: any): string[] => {
  if (!user) return [];
  
  // Handle different branch field types
  if (Array.isArray(user.assignedBranches)) {
    return user.assignedBranches.filter(Boolean);
  }
  
  const branches: string[] = [];
  if (user.branch) branches.push(user.branch);
  if (user.branchCode && user.branchCode !== user.branch) branches.push(user.branchCode);
  
  return branches.filter(Boolean);
};

interface ResolvedQuery {
  id: string;
  appNo: string;
  title: string;
  customerName: string;
  branch: string;
  branchCode?: string;
  priority: 'high' | 'medium' | 'low';
  resolvedAt: string;
  resolvedBy: string;
  resolutionReason?: string;
  createdAt: string;
  sanctionedAmount?: number;
  loanType?: string;
  creditExec?: string;
  isSanctioned?: boolean;
  isIndividualQuery?: boolean;
  queryText?: string;
  queryId?: string;
  messages: Array<{
    sender: string;
    text: string;
    timestamp: string;
    isSent: boolean;
  }>;
}

interface CreditQueriesResolvedProps {
  searchAppNo?: string;
}

export default function CreditQueriesResolved({ searchAppNo }: CreditQueriesResolvedProps = {}) {
  const { user } = useAuth();
  const [resolvedQueries, setResolvedQueries] = useState<ResolvedQuery[]>([]);
  const [filteredQueries, setFilteredQueries] = useState<ResolvedQuery[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [selectedQuery, setSelectedQuery] = useState<ResolvedQuery | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [operationsUpdates, setOperationsUpdates] = useState<any[]>([]);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

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
    fetchResolvedQueries();
    
    // Set up real-time updates
    const unsubscribe = queryUpdateService.subscribe('credit', (update) => {
      console.log('📊 CreditQueriesResolved: Received query update:', update);
      
      // Check if this is a resolved query that's relevant to Credit team (with specific OTC, Deferral, and Waiver support)
  const isResolvedQuery = update.action === 'resolved' || 
             update.action === 'updated' || 
             update.action === 'waived' ||
             ['resolved', 'approved', 'deferred', 'otc', 'waiver', 'waived'].includes(update.status);
      
      const isRelevantToCredit = update.markedForTeam === 'credit' || 
                               update.markedForTeam === 'both' || 
                               update.team === 'credit' || 
                               update.broadcast;
      
      if (isResolvedQuery && isRelevantToCredit) {
        console.log(`🆕 New resolved query for Credit: ${update.appNo}`);
        console.log(`👤 Resolved by: ${update.resolvedBy || 'Unknown'}`);
        console.log(`🎯 Resolution type: ${update.action || update.status}`);
        console.log(`📱 Broadcast: ${update.broadcast ? 'Yes' : 'No'}`);
        console.log(`🔄 Update triggered by Operations/Approval`);
        
        // Set the last update time
        setLastUpdateTime(new Date());
        
        // Immediately refresh the queries
        fetchResolvedQueries();
      }
    });
    
    // Set up more frequent polling for real-time updates (every 5 seconds)
    const interval = setInterval(fetchResolvedQueries, 5000);
    
    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    filterQueries();
  }, [resolvedQueries, searchTerm, dateFilter, priorityFilter, searchAppNo]);

  const fetchResolvedQueries = async () => {
    try {
      setIsRefreshing(true);
      const userBranches = getUserBranches(user);
      const branchParam = userBranches.length > 0 ? `&branches=${userBranches.join(',')}` : '';
      
      // Fetch resolved queries specifically for Credit team - using resolved=true for better performance
      const response = await fetch(`/api/queries?team=credit&resolved=true${branchParam}`);
      const result = await response.json();
      
      if (result.success) {
        // Transform data to show individual resolved queries (not just groups)
        const expandedResolvedQueries: any[] = [];
        
        result.data.forEach((query: any) => {
          // Since we're using resolved=true in API, all returned queries should be resolved already
          // Just need to expand sub-queries and apply any additional formatting
          
          const resolvedStatuses = ['resolved', 'approved', 'deferred', 'otc', 'waived', 'request-approved', 'request-deferral', 'request-otc'];
          
          // Check if the entire group is resolved
          if (resolvedStatuses.includes(query.status)) {
            expandedResolvedQueries.push({
              ...query,
              resolvedByTeam: query.resolvedByTeam || 'Credit',
              resolvedBy: query.resolvedBy || query.approvedBy || 'Credit Team',
              resolvedAt: query.resolvedAt || query.approvedAt || query.lastUpdated,
              resolutionReason: query.resolutionReason || query.status
            });
          } 
          // Check for individual resolved sub-queries and create separate entries for them
          else if (query.queries && query.queries.length > 0) {
            query.queries.forEach((subQuery: any, index: number) => {
              if (resolvedStatuses.includes(subQuery.status)) {
                // Create a new query object for this resolved sub-query
                expandedResolvedQueries.push({
                  ...query,
                  id: `${query.id}-resolved-${subQuery.id}`,
                  title: `Query ${index + 1} - ${query.appNo}`,
                  status: subQuery.status,
                  resolvedAt: subQuery.resolvedAt || subQuery.approvedAt || query.resolvedAt || query.lastUpdated,
                  resolvedBy: subQuery.resolvedBy || subQuery.approvedBy || query.resolvedBy || 'Credit Team',
                  resolvedByTeam: subQuery.resolvedByTeam || query.resolvedByTeam || 'Credit',
                  resolutionReason: subQuery.resolutionReason || subQuery.status,
                  queryText: subQuery.text,
                  queryId: subQuery.id,
                  isIndividualQuery: true,
                  // Preserve original queries array but mark which one is resolved
                  queries: [subQuery]
                });
              }
            });
          }
        });
        
        console.log(`📊 CreditQueriesResolved: Found ${expandedResolvedQueries.length} resolved queries for Credit team`);
        setResolvedQueries(expandedResolvedQueries);
        setLastUpdateTime(new Date());
      }
    } catch (error) {
      console.error('Error fetching resolved queries:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const filterQueries = () => {
    let filtered = resolvedQueries;

    // App number search from props (priority search)
    if (searchAppNo) {
      filtered = filtered.filter(query =>
        query.appNo.toLowerCase().includes(searchAppNo.toLowerCase())
      );
    }

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(query =>
        query.appNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        query.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        query.branch.toLowerCase().includes(searchTerm.toLowerCase()) ||
        query.resolvedBy?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Date filter
    if (dateFilter !== 'all') {
      const now = new Date();
      const filterDate = new Date();
      
      switch (dateFilter) {
        case 'today':
          filterDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          filterDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          filterDate.setMonth(now.getMonth() - 1);
          break;
      }

      filtered = filtered.filter(query => 
        new Date(query.resolvedAt) >= filterDate
      );
    }

    // Priority filter
    if (priorityFilter !== 'all') {
      filtered = filtered.filter(query => query.priority === priorityFilter);
    }

    setFilteredQueries(filtered);
  };

  // Group resolved queries by branch
  const groupedByBranch = React.useMemo(() => {
    const grouped = new Map<string, ResolvedQuery[]>();
    
    filteredQueries.forEach(query => {
      const branchKey = query.branch || 'Unknown Branch';
      if (!grouped.has(branchKey)) {
        grouped.set(branchKey, []);
      }
      grouped.get(branchKey)!.push(query);
    });
    
    // Sort branches by number of queries (descending)
    const sortedBranches = Array.from(grouped.entries())
      .sort(([, a], [, b]) => b.length - a.length);
    
    return new Map(sortedBranches);
  }, [filteredQueries]);

  // Get filtered branches based on search
  const filteredBranches = React.useMemo(() => {
    if (!searchTerm) {
      return Array.from(groupedByBranch.keys());
    }
    
    return Array.from(groupedByBranch.keys()).filter(branch =>
      branch.toLowerCase().includes(searchTerm.toLowerCase()) ||
      groupedByBranch.get(branch)?.some(query =>
        query.appNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        query.customerName.toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  }, [groupedByBranch, searchTerm]);

  const handleQueryClick = (query: ResolvedQuery) => {
    setSelectedQuery(query);
    setShowModal(true);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const calculateResolutionTime = (createdAt: string, resolvedAt: string) => {
    const created = new Date(createdAt);
    const resolved = new Date(resolvedAt);
    const diffInHours = Math.floor((resolved.getTime() - created.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 24) {
      return `${diffInHours}h`;
    } else {
      const days = Math.floor(diffInHours / 24);
      const hours = diffInHours % 24;
      return `${days}d ${hours}h`;
    }
  };

  const exportToCSV = () => {
    const csvData = filteredQueries.map(query => ({
      'App No': query.appNo,
      'Customer Name': query.customerName,
      'Branch': query.branch,
      'Priority': query.priority,
      'Created At': new Date(query.createdAt).toLocaleString(),
      'Resolved At': new Date(query.resolvedAt).toLocaleString(),
      'Resolved By': query.resolvedBy || 'N/A',
      'Approver Name': (query as any).approverName || 'N/A',
      'Resolution Time': calculateResolutionTime(query.createdAt, query.resolvedAt),
      'Remarks': query.resolutionReason || 'N/A',
      'Sanctioned Amount': query.sanctionedAmount ? `₹${query.sanctionedAmount.toLocaleString()}` : 'N/A',
      'Loan Type': query.loanType || 'N/A',
      'Credit Executive': query.creditExec || 'N/A',
      'Is Sanctioned': query.isSanctioned ? 'Yes' : 'No'
    }));

    const headers = Object.keys(csvData[0] || {}).join(',');
    const rows = csvData.map(row => Object.values(row).join(','));
    const csvContent = [headers, ...rows].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', `credit_resolved_queries_${new Date().toISOString().split('T')[0]}.csv`);
    a.click();
  };

  if (isLoading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl">
      {/* Enhanced Header with Real-time Status */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-gray-900">Query Resolved</h1>
              {isRefreshing && (
                <div className="flex items-center text-green-600">
                  <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                  <span className="text-sm font-medium">Updating...</span>
                </div>
              )}
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <p className="text-lg text-gray-700 font-medium">
                {filteredQueries.length} resolved queries by Credit team
              </p>
              {lastUpdateTime && (
                <div className="flex items-center text-sm text-green-600 bg-green-50 px-3 py-1 rounded-full">
                  <Clock className="h-4 w-4 mr-1" />
                  Live Data • Updated: {lastUpdateTime.toLocaleTimeString()}
                </div>
              )}
            </div>
          </div>
          <div className="flex space-x-3 mt-4 sm:mt-0">
            <button
              onClick={exportToCSV}
              disabled={filteredQueries.length === 0}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </button>
            <button
              onClick={fetchResolvedQueries}
              disabled={isRefreshing}
              className="inline-flex items-center px-4 py-2 bg-green-600 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-xl shadow-lg border border-green-200 hover:shadow-xl transition-shadow">
          <div className="flex items-center">
            <div className="p-3 bg-green-500 rounded-lg">
              <CheckCircle className="h-8 w-8 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-3xl font-bold text-gray-900">{resolvedQueries.length}</p>
              <p className="text-sm font-medium text-gray-600">Total Resolved</p>
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-green-50 to-indigo-50 p-6 rounded-xl shadow-lg border border-green-200 hover:shadow-xl transition-shadow">
          <div className="flex items-center">
            <div className="p-3 bg-green-500 rounded-lg">
              <Clock className="h-8 w-8 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-3xl font-bold text-gray-900">
                {resolvedQueries.length > 0 ? 
                  Math.round(resolvedQueries.reduce((acc, q) => {
                    const resTime = new Date(q.resolvedAt).getTime() - new Date(q.createdAt).getTime();
                    return acc + (resTime / (1000 * 60 * 60));
                  }, 0) / resolvedQueries.length * 10) / 10 : '0'}h
              </p>
              <p className="text-sm font-medium text-gray-600">Avg Resolution Time</p>
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-purple-50 to-indigo-50 p-6 rounded-xl shadow-lg border border-purple-200 hover:shadow-xl transition-shadow">
          <div className="flex items-center">
            <div className="p-3 bg-purple-500 rounded-lg">
              <Calendar className="h-8 w-8 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-3xl font-bold text-gray-900">
                {resolvedQueries.filter(q => 
                  new Date(q.resolvedAt) >= new Date(Date.now() - 24 * 60 * 60 * 1000)
                ).length}
              </p>
              <p className="text-sm font-medium text-gray-600">Today</p>
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-6 rounded-xl shadow-lg border border-amber-200 hover:shadow-xl transition-shadow">
          <div className="flex items-center">
            <div className="p-3 bg-amber-500 rounded-lg">
              <FileText className="h-8 w-8 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-3xl font-bold text-gray-900">
                {resolvedQueries.filter(q => 
                  new Date(q.resolvedAt) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                ).length}
              </p>
              <p className="text-sm font-medium text-gray-600">This Week</p>
            </div>
          </div>
        </div>
      </div>


      {/* Branch-wise Resolved Queries */}
      <div className="space-y-6">
        {filteredBranches.length > 0 ? (
          filteredBranches.map((branch) => {
            const branchQueries = groupedByBranch.get(branch) || [];
            const totalResolved = branchQueries.length;
            const todayResolved = branchQueries.filter(q => 
              new Date(q.resolvedAt) >= new Date(Date.now() - 24 * 60 * 60 * 1000)
            ).length;
            const sanctionedCount = branchQueries.filter(q => q.isSanctioned).length;
            
            return (
              <div key={branch} className="bg-white border border-gray-200 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300">
                {/* Branch Header */}
                <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-green-50 to-blue-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="p-3 bg-green-500 rounded-lg">
                        <Building className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-gray-900">{branch}</h2>
                        <p className="text-sm text-gray-600 font-medium">
                          {totalResolved} resolved queries • {todayResolved} today
                          {sanctionedCount > 0 && ` • ${sanctionedCount} sanctioned`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="bg-green-100 text-green-800 text-sm font-semibold px-3 py-1 rounded-full">
                        ✓ {totalResolved} Resolved
                      </span>
                      {sanctionedCount > 0 && (
                        <span className="bg-purple-100 text-purple-800 text-sm font-semibold px-3 py-1 rounded-full">
                          🏆 {sanctionedCount} Sanctioned
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Branch Queries */}
                <div className="p-6 space-y-4">
                  {branchQueries.map((query, index) => (
                    <div
                      key={`${query.id}-${index}`}
                      className="p-4 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                      onClick={() => handleQueryClick(query)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <h3 className="font-bold text-gray-900">App: {query.appNo}</h3>
                            <span className={`text-xs font-medium px-2 py-1 rounded-full ${getPriorityColor(query.priority)}`}>
                              {query.priority?.toUpperCase()}
                            </span>
                            {query.isSanctioned && (
                              <span className="text-xs font-medium px-2 py-1 rounded-full bg-purple-100 text-purple-800">
                                🏆 Sanctioned
                              </span>
                            )}
                            {query.resolutionReason && (
                              <span className="text-xs font-medium px-2 py-1 rounded-full bg-green-100 text-green-800">
                                {query.resolutionReason}
                              </span>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                            <div>
                              <span className="text-gray-600">Customer:</span>
                              <p className="font-medium text-gray-900">{query.customerName}</p>
                            </div>
                            <div>
                              <span className="text-gray-600">Resolved by:</span>
                              <p className="font-medium text-gray-900">{query.resolvedBy || 'Credit Team'}</p>
                            </div>
                            <div>
                              <span className="text-gray-600">Resolution Time:</span>
                              <p className="font-medium text-gray-900">{calculateResolutionTime(query.createdAt, query.resolvedAt)}</p>
                            </div>
                            <div>
                              <span className="text-gray-600">Resolved on:</span>
                              <p className="font-medium text-gray-900">{new Date(query.resolvedAt).toLocaleDateString()}</p>
                            </div>
                          </div>
                          
                          {/* Show query text for individual queries */}
                          {query.isIndividualQuery && query.queryText && (
                            <div className="mt-3 p-3 bg-green-50 rounded-lg border-l-4 border-green-500">
                              <p className="text-sm font-medium text-green-900 mb-1">Query:</p>
                              <p className="text-sm text-green-800">{query.queryText}</p>
                            </div>
                          )}
                          
                          {/* Sanctioned info */}
                          {query.isSanctioned && query.sanctionedAmount && (
                            <div className="mt-3 flex items-center space-x-4 text-sm">
                              <span className="text-purple-600 font-medium">
                                💰 ₹{query.sanctionedAmount.toLocaleString()}
                              </span>
                              {query.loanType && (
                                <span className="text-purple-600 font-medium">
                                  📋 {query.loanType}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl p-12 text-center shadow-lg">
            <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="h-12 w-12 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No resolved queries found</h3>
            <p className="text-gray-600 max-w-md mx-auto">
              No queries have been resolved by the credit team yet. Resolved queries will appear here once team members take action on pending queries.
            </p>
          </div>
        )}
      </div>

      {/* Query Detail Modal */}
      {showModal && selectedQuery && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowModal(false)}></div>
            
            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full sm:p-6">
              <div className="mb-4">
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Resolved Query Details - {selectedQuery.appNo}
                </h3>
                <div className="flex items-center space-x-2 mb-4">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Resolved
                  </span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(selectedQuery.priority)}`}>
                    {selectedQuery.priority}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                  <div>
                    <span className="font-medium text-gray-900">Customer:</span>
                    <p className="text-gray-800">{selectedQuery.customerName}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-900">Branch:</span>
                    <p className="text-gray-800">{selectedQuery.branch}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-900">Created:</span>
                    <p className="text-gray-800">{new Date(selectedQuery.createdAt).toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-900">Resolved:</span>
                    <p className="text-gray-800">{new Date(selectedQuery.resolvedAt).toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-900">Resolution Time:</span>
                    <p className="text-gray-800">{calculateResolutionTime(selectedQuery.createdAt, selectedQuery.resolvedAt)}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-900">Resolved by:</span>
                    <p className="text-gray-800">{selectedQuery.resolvedBy || 'Credit Team'}</p>
                  </div>
                </div>

                {selectedQuery.resolutionReason && (
                  <div className="mb-4">
                    <span className="font-medium text-gray-900">Resolution Reason:</span>
                    <p className="text-gray-800 mt-1">{selectedQuery.resolutionReason}</p>
                  </div>
                )}

                {selectedQuery.messages && selectedQuery.messages.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Query Messages:</h4>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {selectedQuery.messages.map((message, index) => (
                        <div key={index} className="bg-gray-50 p-3 rounded-md">
                          <div className="flex justify-between items-start mb-1">
                            <span className="text-sm font-medium text-gray-900">{message.sender}</span>
                            <span className="text-xs text-gray-500">
                              {new Date(message.timestamp).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-sm text-gray-800">{message.text}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex justify-end">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}