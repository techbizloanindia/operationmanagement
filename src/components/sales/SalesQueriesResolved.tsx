'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { querySyncService } from '@/lib/querySyncService';
import { queryUpdateService } from '@/lib/queryUpdateService';
import {
  CheckCircle,
  Search,
  Calendar,
  User,
  Building,
  Clock,
  FileText,
  Download,
  Filter,
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
  salesExec?: string;
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

interface SalesQueriesResolvedProps {
  searchAppNo?: string;
}

export default function SalesQueriesResolved({ searchAppNo }: SalesQueriesResolvedProps = {}) {
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
    const unsubscribe = queryUpdateService.subscribe('sales', (update) => {
      console.log('📊 SalesQueriesResolved: Received query update:', update);
      
      // Check if this is a resolved query that's relevant to Sales team (with specific OTC, Deferral, and Waiver support)
  const isResolvedQuery = update.action === 'resolved' || 
             update.action === 'updated' || 
             update.action === 'waived' ||
             ['resolved', 'approved', 'deferred', 'otc', 'waiver', 'waived'].includes(update.status);
      
      const isRelevantToSales = update.markedForTeam === 'sales' || 
                               update.markedForTeam === 'both' || 
                               update.team === 'sales' || 
                               update.broadcast;
      
      if (isResolvedQuery && isRelevantToSales) {
        console.log(`🆕 New resolved query for Sales: ${update.appNo}`);
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
      
      // Fetch resolved queries specifically for Sales team - using resolved=true for better performance
      const response = await fetch(`/api/queries?team=sales&resolved=true${branchParam}`);
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
              resolvedByTeam: query.resolvedByTeam || 'Sales',
              resolvedBy: query.resolvedBy || query.approvedBy || 'Sales Team',
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
                  resolvedBy: subQuery.resolvedBy || subQuery.approvedBy || query.resolvedBy || 'Sales Team',
                  resolvedByTeam: subQuery.resolvedByTeam || query.resolvedByTeam || 'Sales',
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
        
        console.log(`📊 SalesQueriesResolved: Found ${expandedResolvedQueries.length} resolved queries for Sales team`);
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
        return 'bg-blue-100 text-blue-800';
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
      'Sales Executive': query.salesExec || 'N/A',
      'Is Sanctioned': query.isSanctioned ? 'Yes' : 'No'
    }));

    const headers = Object.keys(csvData[0] || {}).join(',');
    const rows = csvData.map(row => Object.values(row).join(','));
    const csvContent = [headers, ...rows].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', `sales_resolved_queries_${new Date().toISOString().split('T')[0]}.csv`);
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
                <div className="flex items-center text-blue-600">
                  <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                  <span className="text-sm font-medium">Updating...</span>
                </div>
              )}
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <p className="text-lg text-gray-700 font-medium">
                {filteredQueries.length} resolved queries by Sales team
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
              className="inline-flex items-center px-4 py-2 bg-blue-600 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
            {/* Enhanced Stats Cards */}
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
        
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-xl shadow-lg border border-blue-200 hover:shadow-xl transition-shadow">
          <div className="flex items-center">
            <div className="p-3 bg-blue-500 rounded-lg">
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

      {/* Enhanced Filters with Better Visibility */}
      <div className="mb-8 bg-gradient-to-r from-blue-50 to-indigo-50 p-8 rounded-xl shadow-lg border-2 border-blue-200">
        <div className="flex items-center mb-6">
          <Filter className="h-6 w-6 text-blue-700 mr-3" />
          <h3 className="text-xl font-bold text-gray-900">Filter & Search</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Search */}
          <div className="relative">
            <label className="block text-sm font-bold text-gray-800 mb-3">Search Queries</label>
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-600 h-5 w-5" />
            <input
              type="text"
              placeholder="Search by app no, customer name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-4 border-2 border-gray-300 rounded-lg focus:ring-3 focus:ring-blue-500 focus:border-blue-500 text-sm font-medium text-gray-900 bg-white shadow-sm"
            />
          </div>

          {/* Date Filter */}
          <div>
            <label className="block text-sm font-bold text-gray-800 mb-3">Date Range</label>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full px-4 py-4 border-2 border-gray-300 rounded-lg focus:ring-3 focus:ring-blue-500 focus:border-blue-500 text-sm font-bold text-gray-900 bg-white shadow-sm"
            >
              <option value="all" className="font-bold">All Time</option>
              <option value="today" className="font-bold">Today</option>
              <option value="week" className="font-bold">Last 7 days</option>
              <option value="month" className="font-bold">Last 30 days</option>
            </select>
          </div>

          {/* Priority Filter */}
          <div>
            <label className="block text-sm font-bold text-gray-800 mb-3">Priority Level</label>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="w-full px-4 py-4 border-2 border-gray-300 rounded-lg focus:ring-3 focus:ring-blue-500 focus:border-blue-500 text-sm font-bold text-gray-900 bg-white shadow-sm"
            >
              <option value="all" className="font-bold">All Priorities</option>
              <option value="high" className="font-bold">High Priority</option>
              <option value="medium" className="font-bold">Medium Priority</option>
              <option value="low" className="font-bold">Low Priority</option>
            </select>
          </div>

          {/* Clear Filters */}
          <div className="flex items-end">
            <button
              onClick={() => {
                setSearchTerm('');
                setDateFilter('all');
                setPriorityFilter('all');
              }}
              className="w-full px-6 py-4 bg-gradient-to-r from-red-500 to-red-600 text-white font-bold rounded-lg hover:from-red-600 hover:to-red-700 transition-all duration-200 text-sm shadow-lg transform hover:scale-105"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Resolved Queries List */}
      {/* Enhanced Resolved Queries List */}
      <div className="space-y-6">
        {filteredQueries.length > 0 ? (
          filteredQueries.map((query) => (
            <div
              key={query.id}
              className="bg-white border border-gray-200 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer transform hover:-translate-y-1"
              onClick={() => handleQueryClick(query)}
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      </div>
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-green-100 text-green-800">
                        ✓ Resolved
                      </span>
                      {query.isSanctioned && (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-purple-100 text-purple-800">
                          🏆 Sanctioned
                        </span>
                      )}
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${getPriorityColor(query.priority)}`}>
                        {query.priority?.toUpperCase()}
                      </span>
                      {query.resolutionReason && (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-blue-100 text-blue-800">
                          {query.resolutionReason}
                        </span>
                      )}
                    </div>
                    
                    <h3 className="text-xl font-bold text-gray-900 mb-4">
                      Application: {query.appNo}
                    </h3>
                    
                    {/* Show specific query text for individual resolved queries */}
                    {query.isIndividualQuery && query.queryText && (
                      <div className="mb-4 p-3 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                        <p className="text-sm font-medium text-blue-900 mb-1">Resolved Query:</p>
                        <p className="text-sm text-blue-800">{query.queryText}</p>
                      </div>
                    )}
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm mb-4">
                      <div className="flex items-center bg-gray-50 p-3 rounded-lg">
                        <User className="h-4 w-4 mr-2 text-blue-600 flex-shrink-0" />
                        <div>
                          <p className="font-medium text-gray-900">
                            {query.customerName}
                          </p>
                          <p className="text-xs text-gray-600">Customer</p>
                        </div>
                      </div>
                      <div className="flex items-center bg-gray-50 p-3 rounded-lg">
                        <Building className="h-4 w-4 mr-2 text-purple-600 flex-shrink-0" />
                        <div>
                          <p className="font-medium text-gray-900">
                            {query.branch}
                          </p>
                          <p className="text-xs text-gray-600">Branch</p>
                        </div>
                      </div>
                      <div className="flex items-center bg-gray-50 p-3 rounded-lg">
                        <Clock className="h-4 w-4 mr-2 text-amber-600 flex-shrink-0" />
                        <div>
                          <p className="font-medium text-gray-900">{calculateResolutionTime(query.createdAt, query.resolvedAt)}</p>
                          <p className="text-xs text-gray-600">Resolution Time</p>
                        </div>
                      </div>
                      <div className="flex items-center bg-gray-50 p-3 rounded-lg">
                        <User className="h-4 w-4 mr-2 text-green-600 flex-shrink-0" />
                        <div>
                          <p className="font-medium text-gray-900">{query.resolvedBy || 'Sales Team'}</p>
                          <p className="text-xs text-gray-600">Resolved By</p>
                        </div>
                      </div>
                    </div>

                    {/* Additional info for sanctioned applications */}
                    {query.isSanctioned && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm mb-4">
                        <div className="flex items-center bg-purple-50 p-3 rounded-lg">
                          <span className="text-purple-600 mr-2">💰</span>
                          <div>
                            <p className="font-medium text-gray-900">₹{query.sanctionedAmount?.toLocaleString()}</p>
                            <p className="text-xs text-gray-600">Sanctioned Amount</p>
                          </div>
                        </div>
                        <div className="flex items-center bg-purple-50 p-3 rounded-lg">
                          <span className="text-purple-600 mr-2">📋</span>
                          <div>
                            <p className="font-medium text-gray-900">{query.loanType}</p>
                            <p className="text-xs text-gray-600">Loan Type</p>
                          </div>
                        </div>
                        {query.salesExec && (
                          <div className="flex items-center bg-purple-50 p-3 rounded-lg">
                            <span className="text-purple-600 mr-2">👨‍💼</span>
                            <div>
                              <p className="font-medium text-gray-900">{query.salesExec}</p>
                              <p className="text-xs text-gray-600">Sales Executive</p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
                      <p className="text-sm font-medium text-gray-800">
                        <span className="text-blue-700 font-semibold">Resolved on:</span> {' '}
                        {new Date(query.resolvedAt).toLocaleDateString()} at {new Date(query.resolvedAt).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-end space-y-2 ml-6">
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                      {new Date(query.resolvedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl p-12 text-center shadow-lg">
            <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="h-12 w-12 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No resolved queries found</h3>
            <p className="text-gray-600 max-w-md mx-auto">
              {searchTerm || dateFilter !== 'all' || priorityFilter !== 'all'
                ? 'Try adjusting your filters to see more results. You can clear all filters and search again.'
                : 'No queries have been resolved by the sales team yet. Resolved queries will appear here once team members take action on pending queries.'}
            </p>
            {(searchTerm || dateFilter !== 'all' || priorityFilter !== 'all') && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setDateFilter('all');
                  setPriorityFilter('all');
                }}
                className="mt-4 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Clear All Filters
              </button>
            )}
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
                    <p className="text-gray-800">{selectedQuery.resolvedBy || 'Sales Team'}</p>
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