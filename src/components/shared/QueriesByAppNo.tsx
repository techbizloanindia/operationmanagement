'use client';

import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  Clock,
  User,
  Building,
  Calendar,
  AlertTriangle,
  RefreshCw,
  Eye,
  MessageCircle,
  ChevronDown,
  ChevronRight,
  Settings
} from 'lucide-react';

interface QueryMessage {
  id: string;
  text: string;
  timestamp: string;
  sender: string;
  senderRole?: string;
  status: 'pending' | 'resolved' | 'approved' | 'deferred' | 'otc' | 'pending-approval';
  team?: string;
  assignedBy?: string;
  assignedByTeam?: string;
}

interface QueryData {
  id: string;
  appNo: string;
  title: string;
  customerName: string;
  branch: string;
  status: 'pending' | 'resolved' | 'approved' | 'deferred' | 'otc' | 'pending-approval';
  priority: 'high' | 'medium' | 'low';
  createdAt: string;
  submittedBy: string;
  messages: QueryMessage[];
  team: string;
  markedForTeam: string;
  assignedBy?: string;
  assignedByTeam?: string;
  queries: QueryMessage[];
  remarks?: string;
}

interface GroupedQueries {
  [appNo: string]: {
    appNo: string;
    customerName: string;
    branch: string;
    queries: QueryData[];
    totalQueries: number;
    pendingQueries: number;
    resolvedQueries: number;
  };
}

interface QueriesByAppNoProps {
  teamContext: 'sales' | 'credit' | 'operations';
  onQuerySelect?: (query: QueryData) => void;
  showRemarks?: boolean;
}

export default function QueriesByAppNo({ 
  teamContext, 
  onQuerySelect,
  showRemarks = false 
}: QueriesByAppNoProps) {
  const [groupedQueries, setGroupedQueries] = useState<GroupedQueries>({});
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedApps, setExpandedApps] = useState<Set<string>>(new Set());
  const [selectedQuery, setSelectedQuery] = useState<QueryData | null>(null);
  const [remarks, setRemarks] = useState<{ [queryId: string]: string }>({});

  useEffect(() => {
    fetchQueries();
  }, [teamContext]);

  const fetchQueries = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/queries?team=${teamContext}`);
      const result = await response.json();
      
      if (result.success) {
        const queries = result.data as QueryData[];
        
        // Group queries by App.No
        const grouped = queries.reduce((acc: GroupedQueries, query) => {
          const appNo = query.appNo;
          
          if (!acc[appNo]) {
            acc[appNo] = {
              appNo,
              customerName: query.customerName,
              branch: query.branch,
              queries: [],
              totalQueries: 0,
              pendingQueries: 0,
              resolvedQueries: 0
            };
          }
          
          acc[appNo].queries.push(query);
          acc[appNo].totalQueries++;
          
          if (['pending', 'pending-approval'].includes(query.status)) {
            acc[appNo].pendingQueries++;
          } else if (['resolved', 'approved'].includes(query.status)) {
            acc[appNo].resolvedQueries++;
          }
          
          return acc;
        }, {});
        
        setGroupedQueries(grouped);
      }
    } catch (error) {
      console.error('Error fetching queries:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleAppExpansion = (appNo: string) => {
    const newExpanded = new Set(expandedApps);
    if (newExpanded.has(appNo)) {
      newExpanded.delete(appNo);
    } else {
      newExpanded.add(appNo);
    }
    setExpandedApps(newExpanded);
  };

  const handleQueryClick = (query: QueryData) => {
    setSelectedQuery(query);
    if (onQuerySelect) {
      onQuerySelect(query);
    }
  };

  const isOperationsQuery = (query: QueryData): boolean => {
    // A query is from Operations if it was submitted by Operations team
    // This is used to show newly raised queries in bold for Sales/Credit teams
    const isFromOperations = query.submittedBy?.toLowerCase().includes('operations') ||
                            query.submittedBy?.toLowerCase().includes('ops') ||
                            (query.submittedBy === 'Operations User') ||
                            (query.submittedBy === 'Operations Team');
    
    return isFromOperations;
  };

  const handleRemarksChange = (queryId: string, value: string) => {
    setRemarks(prev => ({
      ...prev,
      [queryId]: value
    }));
  };

  const saveRemarks = async (queryId: string) => {
    try {
      const response = await fetch(`/api/queries/${queryId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          remarks: remarks[queryId]
        }),
      });

      if (response.ok) {
        // Refresh queries to get updated data
        fetchQueries();
      }
    } catch (error) {
      console.error('Error saving remarks:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'pending-approval': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'resolved': return 'bg-green-100 text-green-800 border-green-300';
      case 'approved': return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'deferred': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'otc': return 'bg-purple-100 text-purple-800 border-purple-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'low': return 'bg-green-100 text-green-800 border-green-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const filteredGroupedQueries = Object.values(groupedQueries).filter(group => {
    const matchesSearch = searchTerm === '' || 
      group.appNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      group.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      group.branch.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  if (isLoading) {
    return (
      <div className="p-6 bg-white rounded-lg shadow-sm">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-300 rounded w-1/4"></div>
          <div className="h-4 bg-gray-300 rounded w-1/2"></div>
          <div className="h-4 bg-gray-300 rounded w-1/3"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow-sm">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">
          Queries by Application Number
        </h2>
        <button
          onClick={fetchQueries}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* Search and Filters */}
      <div className="mb-6 space-y-4">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search by App.No, Customer Name, or Branch..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Applications List */}
      <div className="space-y-4">
        {filteredGroupedQueries.length === 0 ? (
          <div className="text-center py-8">
            <MessageCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No queries found</h3>
            <p className="text-gray-500">
              {searchTerm ? 'Try adjusting your search criteria.' : 'No queries available for this team.'}
            </p>
          </div>
        ) : (
          filteredGroupedQueries.map((group) => (
            <div key={group.appNo} className="border border-gray-200 rounded-lg overflow-hidden">
              {/* Application Header */}
              <div 
                className="bg-gray-50 p-4 cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => toggleAppExpansion(group.appNo)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center">
                      {expandedApps.has(group.appNo) ? (
                        <ChevronDown className="h-5 w-5 text-gray-500" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-gray-500" />
                      )}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        App.No: {group.appNo}
                      </h3>
                      <div className="flex items-center space-x-4 mt-1">
                        <span className="text-sm text-gray-600">
                          <User className="inline h-4 w-4 mr-1" />
                          {group.customerName}
                        </span>
                        <span className="text-sm text-gray-600">
                          <Building className="inline h-4 w-4 mr-1" />
                          {group.branch}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-900">
                        {group.totalQueries} Total Queries
                      </div>
                      <div className="flex space-x-2 mt-1">
                        {group.pendingQueries > 0 && (
                          <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">
                            {group.pendingQueries} Pending
                          </span>
                        )}
                        {group.resolvedQueries > 0 && (
                          <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                            {group.resolvedQueries} Resolved
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Expanded Queries */}
              {expandedApps.has(group.appNo) && (
                <div className="p-4 space-y-4">
                  {group.queries.map((query, index) => (
                    <div 
                      key={query.id}
                      className={`border rounded-lg p-4 cursor-pointer transition-all ${
                        selectedQuery?.id === query.id 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      } ${
                        isOperationsQuery(query) 
                          ? 'bg-gradient-to-r from-purple-50 to-purple-100 border-purple-300 font-bold' 
                          : ''
                      }`}
                      onClick={() => handleQueryClick(query)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h4 className={`font-medium ${isOperationsQuery(query) ? 'font-bold text-purple-900' : 'text-gray-900'}`}>
                              Query #{index + 1}: {query.title}
                            </h4>
                            {isOperationsQuery(query) && (
                              <span className="px-2 py-1 text-xs bg-purple-200 text-purple-800 rounded-full font-semibold">
                                ⚙️ Operations Team
                              </span>
                            )}
                          </div>
                          
                          <div className="flex items-center space-x-4 text-sm text-gray-600 mb-2">
                            <span>
                              <User className="inline h-4 w-4 mr-1" />
                              {query.submittedBy}
                            </span>
                            <span>
                              <Calendar className="inline h-4 w-4 mr-1" />
                              {new Date(query.createdAt).toLocaleDateString()}
                            </span>
                            <span>
                              <Clock className="inline h-4 w-4 mr-1" />
                              {new Date(query.createdAt).toLocaleTimeString()}
                            </span>
                          </div>

                          <div className="flex items-center space-x-2">
                            <span className={`px-3 py-1 text-xs rounded-full border ${getStatusColor(query.status)}`}>
                              {query.status.charAt(0).toUpperCase() + query.status.slice(1).replace('-', ' ')}
                            </span>
                            <span className={`px-3 py-1 text-xs rounded-full border ${getPriorityColor(query.priority)}`}>
                              {query.priority} Priority
                            </span>
                            {query.messages.length > 0 && (
                              <span className="px-3 py-1 text-xs bg-gray-100 text-gray-800 rounded-full border border-gray-300">
                                <MessageCircle className="inline h-3 w-3 mr-1" />
                                {query.messages.length} Messages
                              </span>
                            )}
                          </div>

                          {/* Remarks Section */}
                          {showRemarks && (
                            <div className="mt-4 pt-4 border-t border-gray-200">
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Remarks:
                              </label>
                              <div className="flex space-x-2">
                                <textarea
                                  value={remarks[query.id] || query.remarks || ''}
                                  onChange={(e) => handleRemarksChange(query.id, e.target.value)}
                                  placeholder="Add your remarks..."
                                  className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                                  rows={2}
                                />
                                <button
                                  onClick={() => saveRemarks(query.id)}
                                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                >
                                  Save
                                </button>
                              </div>
                              {query.remarks && (
                                <div className="mt-2 p-2 bg-gray-50 rounded text-sm text-gray-700">
                                  <strong>Current remarks:</strong> {query.remarks}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
