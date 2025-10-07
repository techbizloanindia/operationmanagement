'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FaArrowLeft, FaSync, FaSearch, FaClock, FaUser, FaComments, FaPaperPlane, FaBell, FaWifi, FaPlay, FaPauseCircle, FaHistory } from 'react-icons/fa';
import { useAuth } from '@/contexts/AuthContext';
import ChatDisplay from '@/components/shared/ChatDisplay';
import SimpleCustomerBranchDisplay from '@/components/shared/SimpleCustomerBranchDisplay';
import { formatTATDisplay } from '@/lib/tatUtils';
import { createBranchParam } from '@/lib/utils/branchUtils';

// Interface for query action parameters
interface QueryActionParams {
  action: 'approve' | 'deferral' | 'otc' | 'waiver' | string;
  queryId: number | string; // Will be converted to number internally
  person?: string;
  remarks: string;
}

// Utility function to extract numeric queryId from UUID format
const extractNumericQueryId = (queryId: number | string): number => {
  const queryIdStr = String(queryId);
  console.log('🔍 Extracting numeric queryId from:', queryIdStr);
  
  // If it's already a number, return it
  if (!isNaN(Number(queryIdStr)) && !queryIdStr.includes('-')) {
    return Number(queryIdStr);
  }
  
  // Extract number from UUID format (e.g., 'uuid-query-3' -> 3 or 'uuid-abc-def-3' -> 3)
  const match = queryIdStr.match(/-query-(\d+)$/);
  if (match && match[1]) {
    const numericId = Number(match[1]);
    console.log('✅ Extracted numeric queryId from -query- pattern:', numericId);
    return numericId;
  }
  
  // Try to extract number from end of UUID (e.g., '196772eb-acb0-48a4-a76b-1448326e06ae-3' -> 3)
  const endMatch = queryIdStr.match(/-(\d+)$/);
  if (endMatch && endMatch[1]) {
    const numericId = Number(endMatch[1]);
    console.log('✅ Extracted numeric queryId from end pattern:', numericId);
    return numericId;
  }
  
  // Try to extract any sequence of digits from the string
  const digitMatch = queryIdStr.match(/(\d+)/);
  if (digitMatch && digitMatch[1]) {
    const numericId = Number(digitMatch[1]);
    console.log('✅ Extracted numeric queryId from first digits:', numericId);
    return numericId;
  }
  
  // Fallback: try to convert directly
  const directConversion = Number(queryIdStr);
  if (!isNaN(directConversion)) {
    console.log('✅ Direct conversion queryId:', directConversion);
    return directConversion;
  }
  
  console.error('❌ Failed to extract numeric queryId from:', queryIdStr);
  throw new Error(`Cannot extract numeric query ID from: ${queryIdStr}`);
};

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

// Real-time TAT Display Component for Sales
const RealTimeTATDisplay: React.FC<{ submittedAt: string | Date; tatHours?: number }> = ({ 
  submittedAt, 
  tatHours = 24 
}) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Update every minute for real-time display
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute
    
    return () => clearInterval(interval);
  }, []);
  
  // Calculate TAT in real-time
  const tatDisplay = formatTATDisplay(submittedAt, tatHours);
  
  return (
    <span className={tatDisplay.className} title={`TAT: ${tatHours} hours | Status: ${tatDisplay.status}`}>
      {tatDisplay.display}
      {tatDisplay.status === 'warning' && (
        <span className="ml-1 text-orange-500 animate-pulse">⚠️</span>
      )}
      {tatDisplay.status === 'overdue' && (
        <span className="ml-1 text-red-500 animate-bounce">🚨</span>
      )}
    </span>
  );
};

interface QueryMessage {
  id: string;
  text: string;
  timestamp?: string;
  sender?: string;
  senderRole?: string;
  status?: 'pending' | 'approved' | 'deferred' | 'otc' | 'resolved' | 'waived' | 'waiting for approval';
  queryNumber?: number;
}

interface Query {
  id: number;
  appNo: string;
  customerName: string;
  queries: QueryMessage[];
  sendTo: string[];
  submittedBy: string;
  submittedAt: string;
  status: 'pending' | 'approved' | 'deferred' | 'otc' | 'resolved' | 'waived' | 'waiting for approval';
  branch: string;
  branchCode: string;
  employeeId?: string;
  markedForTeam?: string;
  title?: string;
  priority?: 'high' | 'medium' | 'low';
  tat?: string;
  queryId?: string;
  queryIndex?: number;
  resolvedBy?: string; // Added for resolved queries
  resolvedAt?: string; // Added for resolved queries
  resolutionReason?: string; // Added for resolved queries
  resolutionTeam?: string; // Added for resolved queries
  resolvedByTeam?: string; // Added for resolved queries
}

interface ChatMessage {
  id: string;
  queryId: number;
  message: string;
  sender: string;
  senderRole: string;
  timestamp: string;
  team?: string;
  responseText?: string;
  isSystemMessage?: boolean;
  actionType?: string;
  isQuery?: boolean;
  isReply?: boolean;
}

// View types for the interface
type ViewType = 'applications' | 'queries' | 'chat';

// Fetch queries function with app number filtering - fetch all queries to properly filter resolved ones
const fetchQueries = async (userBranches: string[] = [], appNoFilter?: string): Promise<Query[]> => {
  try {
    console.log('🔍 Sales Dashboard: Fetching all sales queries from API...');
    console.log('🏢 Sales Dashboard: User branches:', userBranches);
    const branchParam = createBranchParam(userBranches);
    const appNoParam = appNoFilter ? `&appNo=${encodeURIComponent(appNoFilter)}` : '';
    const apiUrl = `/api/queries?status=all&team=sales&includeBoth=true${branchParam}${appNoParam}`;
    console.log('🌐 Sales Dashboard: API URL:', apiUrl);
    
    // Fetch all queries (not just pending) so we can properly filter resolved ones on frontend
    const response = await fetch(apiUrl);
    const result = await response.json();
    
    console.log('📊 Sales Dashboard: API Response:', { 
      success: result.success, 
      count: result.count || result.data?.length || 0,
      hasData: !!result.data 
    });
    
    if (!response.ok || !result.success) {
      throw new Error(result.error || 'Failed to fetch queries');
    }
    
    // SIMPLIFIED: API already filters for sales team, so use all returned data
    console.log(`🔍 Sales Dashboard: API returned ${result.data.length} queries for sales team`);
    const filteredQueries = result.data; // Use all queries returned by API
    
    // Convert the API response to the format expected by the component
    const queries = filteredQueries.map((queryData: any) => {
      console.log(`🔄 Converting query data for ${queryData.appNo}:`, {
        hasQueries: !!queryData.queries,
        queriesLength: queryData.queries?.length || 0,
        status: queryData.status,
        team: queryData.team,
        markedForTeam: queryData.markedForTeam
      });
      
      return {
        id: queryData.id,
        appNo: queryData.appNo,
        customerName: queryData.customerName || 'Unknown Customer',
        title: queryData.title || `Query - ${queryData.appNo}`,
        queries: (queryData.queries || []).map((q: any, index: number) => ({
          id: q.id || `${queryData.id}-q${index}`,
          text: q.text || 'No query text',
          timestamp: q.timestamp || queryData.submittedAt,
          sender: q.sender || queryData.submittedBy || 'Operations',
          status: q.status || queryData.status || 'pending',
          queryNumber: q.queryNumber || (index + 1),
          sentTo: q.sentTo || queryData.sendTo || [],
          tat: q.tat || queryData.tat || '24 hours'
        })),
        sendTo: queryData.sendTo || [],
        submittedBy: queryData.submittedBy || 'Operations',
        submittedAt: queryData.submittedAt,
        status: queryData.status || 'pending',
        branch: queryData.branch,
        branchCode: queryData.branchCode,
        applicationBranch: queryData.applicationBranch,
        applicationBranchCode: queryData.applicationBranchCode,
        markedForTeam: queryData.markedForTeam || 'sales',
        team: queryData.team || 'sales',
        tat: queryData.tat || '24 hours',
        priority: queryData.priority || 'medium',
        createdAt: queryData.createdAt,
        messages: queryData.messages || [],
        allowMessaging: queryData.allowMessaging !== false
      };
    });
    
    return queries;
  } catch (error) {
    console.error('Error fetching sales queries:', error);
    throw error;
  }
};

interface SalesQueriesRaisedProps {
  searchAppNo?: string;
}

export default function SalesQueriesRaised({ searchAppNo }: SalesQueriesRaisedProps = {}) {
  // View state management
  const [currentView, setCurrentView] = useState<ViewType>('applications');
  const [selectedAppNo, setSelectedAppNo] = useState<string>('');
  const [selectedQuery, setSelectedQuery] = useState<Query | null>(null);
  const [appQueries, setAppQueries] = useState<Array<Query & { queryIndex: number; queryText: string; queryId: string }>>([]);
  
  // UI state
  const [searchTerm, setSearchTerm] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  
  // Action modal state
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'deferral' | 'otc' | 'waiver' | undefined>(undefined);
  const [selectedPerson, setSelectedPerson] = useState('');
  const [actionRemarks, setActionRemarks] = useState('');
  
  // Real-time state
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [newQueryCount, setNewQueryCount] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting'>('connected');
  
  // Chat functionality
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [selectedQueryForChat, setSelectedQueryForChat] = useState<Query & { queryIndex: number; queryText: string; queryId: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  // Fetch queries with real-time updates - now fetches all queries and filters on frontend
  const { data: queries, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['salesQueries', 'all', user?.employeeId, searchAppNo], // Changed from 'pending' to 'all'
    queryFn: async () => {
      setConnectionStatus('connecting');
      try {
        console.log('🔍 Sales Dashboard: Fetching all queries from API...');
        const userBranches = getUserBranches(user);
        console.log('🏢 Sales Dashboard: User branches for query:', userBranches);
        const result = await fetchQueries(userBranches, searchAppNo);
        console.log(`🔍 Sales Dashboard: Received ${result.length} total queries from API`);
        setConnectionStatus('connected');
        setLastUpdated(new Date());
        return result;
      } catch (error) {
        console.error('🔍 Sales Dashboard: Error fetching queries:', error);
        setConnectionStatus('disconnected');
        throw error;
      }
    },
    refetchOnWindowFocus: true,
    staleTime: 0, // No caching - always fetch fresh data
    refetchInterval: autoRefresh ? 5000 : false, // Faster refresh
    refetchIntervalInBackground: true,
  });

  // Listen for query events for immediate updates
  useEffect(() => {
    const handleQueryAdded = (event: Event) => {
      const customEvent = event as CustomEvent;
      console.log('🔔 Sales Dashboard: New query added event detected!', customEvent?.detail);
      setNewQueryCount(prev => prev + 1);
      showSuccessMessage('New query added! Refreshing data... 🔔');
      refetch();
    };

    const handleQueryUpdated = (event: Event) => {
      const customEvent = event as CustomEvent;
      console.log('🔄 Sales Dashboard: Query updated event detected!', customEvent?.detail);
      showSuccessMessage('Query updated! Refreshing data... ✅');
      refetch();
    };

    // Add event listeners
    console.log('📡 Sales Dashboard: Setting up event listeners...');
    window.addEventListener('queryAdded', handleQueryAdded);
    window.addEventListener('queryUpdated', handleQueryUpdated);
    window.addEventListener('queryResolved', handleQueryUpdated);

    // Subscribe to real-time updates from queryUpdateService
    import('@/lib/queryUpdateService').then(({ queryUpdateService }) => {
      const unsubscribe = queryUpdateService.subscribe('sales', (update) => {
        console.log('📨 Sales Dashboard received real-time update:', update.appNo, update.action);
        
        // Handle different types of updates
        if (update.action === 'created' && (update.markedForTeam === 'sales' || update.markedForTeam === 'both')) {
          setNewQueryCount(prev => prev + 1);
          showSuccessMessage(`New query added for ${update.appNo}! 🔔`);
          refetch();
        } else if (update.action === 'message_added') {
          console.log(`💬 New message received for query ${update.appNo}`);
          showSuccessMessage(`New message for ${update.appNo}! 💬`);
          
          if (selectedQuery && selectedQuery.appNo === update.appNo && currentView === 'chat') {
            loadChatMessages(selectedQuery.id);
          }
          
          setNewQueryCount(prev => prev + 1);
        } else if (update.action === 'updated') {
          refetch();
        }
        
        setLastUpdated(new Date());
      });
      
      console.log('🌐 Sales Dashboard: Subscribed to real-time query updates');
      
      return unsubscribe;
    });

    return () => {
      console.log('🧹 Sales Dashboard: Cleaning up event listeners...');
      window.removeEventListener('queryAdded', handleQueryAdded);
      window.removeEventListener('queryUpdated', handleQueryUpdated);
      window.removeEventListener('queryResolved', handleQueryUpdated);
    };
  }, [refetch, selectedQuery, currentView]);

  // Extract individual queries for display with sequential numbering - EXCLUDE RESOLVED QUERIES
  const individualQueries = React.useMemo(() => {
    console.log('🔍 Sales Dashboard: Processing queries for display...');
    console.log('🔍 Sales Dashboard: Raw queries data:', queries);
    
    if (!queries || queries.length === 0) {
      console.log('🚫 Sales Dashboard: No queries data available');
      return [];
    }
    
    // RESOLVED STATUSES - queries with these statuses should NOT appear in "Queries Raised"
    const resolvedStatuses = ['resolved', 'approved', 'deferred', 'otc', 'waived', 'completed', 'waiting for approval'];
    
    const pendingQueries: Array<Query & { queryIndex: number; queryText: string; queryId: string }> = [];
    
    queries.forEach((queryGroup, groupIndex) => {
      console.log(`🔍 Processing ${queryGroup.appNo} - Group Status: ${queryGroup.status}`);
      
      // Check if the entire query group is resolved
      const groupStatus = queryGroup.status || 'pending';
      const isGroupResolved = resolvedStatuses.includes(groupStatus.toLowerCase());
      
      if (isGroupResolved) {
        console.log(`⏭️ SKIPPING: Query group ${queryGroup.appNo} is resolved (${groupStatus})`);
        return;
      }
      
      // Process sub-queries only if group is not resolved
      if (!queryGroup.queries || queryGroup.queries.length === 0) {
        // Create default entry only if group is not resolved
        console.log(`➕ Adding default entry for ${queryGroup.appNo} (no sub-queries)`);
        pendingQueries.push({
          ...queryGroup,
          queryIndex: pendingQueries.length + 1,
          queryText: `Query for ${queryGroup.appNo}`,
          queryId: `${queryGroup.id}-default`,
          title: `Query ${pendingQueries.length + 1} - ${queryGroup.appNo}`,
          status: 'pending'
        });
        return;
      }
      
      // Process individual sub-queries, excluding resolved ones
      queryGroup.queries.forEach((query, index) => {
        const rawStatus = (query.status || queryGroup.status || 'pending').toLowerCase();
        const isQueryResolved = resolvedStatuses.includes(rawStatus);
        
        if (isQueryResolved) {
          console.log(`⏭️ SKIPPING: Sub-query ${queryGroup.appNo}-${index} is resolved (${rawStatus})`);
          return;
        }
        
        // Map status to valid Query status type
        const queryStatus: 'pending' | 'approved' | 'deferred' | 'otc' | 'resolved' | 'waived' | 'waiting for approval' = 
          rawStatus === 'approved' ? 'approved' :
          rawStatus === 'deferred' ? 'deferred' :
          rawStatus === 'otc' ? 'otc' :
          rawStatus === 'resolved' ? 'resolved' :
          rawStatus === 'waived' ? 'waived' :
          rawStatus === 'waiting for approval' ? 'waiting for approval' : 'pending';
        
        console.log(`✅ Adding pending query ${queryGroup.appNo} - ${query.text} (${queryStatus})`);
        
        pendingQueries.push({
          ...queryGroup,
          queryIndex: pendingQueries.length + 1,
          queryText: query.text,
          queryId: query.id || `${queryGroup.id}-q${index}`,
          title: `Query ${pendingQueries.length + 1} - ${queryGroup.appNo}`,
          status: queryStatus
        });
      });
    });
    
    console.log(`📊 Sales Dashboard: Created ${pendingQueries.length} pending queries for display (excluded resolved)`);
    return pendingQueries;
  }, [queries]);

  // Group individual queries by application number
  const groupedQueries = React.useMemo(() => {
    console.log('🔍 Sales Dashboard: Grouping queries by application...', {
      individualQueriesLength: individualQueries.length
    });
    
    const grouped = new Map();
    individualQueries.forEach(query => {
      if (!grouped.has(query.appNo)) {
        grouped.set(query.appNo, []);
      }
      grouped.get(query.appNo).push(query);
    });
    
    console.log('🔍 Sales Dashboard: Grouped queries result:', {
      groupCount: grouped.size,
      applications: Array.from(grouped.keys())
    });
    
    return grouped;
  }, [individualQueries]);

  // Filter applications based on search
  const filteredApplications = React.useMemo(() => {
    console.log('🔍 Sales Dashboard: Filtering applications...', {
      queriesLength: queries?.length || 0,
      groupedQueriesSize: groupedQueries.size,
      searchTerm
    });
    
    if (!queries || queries.length === 0) {
      console.log('🚫 Sales Dashboard: No queries available for filtering');
      return [];
    }
    
    const applications = Array.from(groupedQueries.keys());
    console.log('🔍 Sales Dashboard: Available applications:', applications);
    
    if (!searchTerm) return applications;
    
    const filtered = applications.filter(appNo => 
      appNo.toLowerCase().includes(searchTerm.toLowerCase())
    );
    console.log('🔍 Sales Dashboard: Filtered applications:', filtered);
    return filtered;
  }, [groupedQueries, searchTerm, queries]);

  // Handle navigation
  const handleSelectApplication = async (appNo: string) => {
    setSelectedAppNo(appNo);
    setCurrentView('queries');
    
    const appQueriesFiltered = individualQueries.filter(query => query.appNo === appNo);
    setAppQueries(appQueriesFiltered);
    
    setNewQueryCount(0);
  };

  const handleSelectQuery = (query: Query) => {
    setSelectedQuery(query);
    setCurrentView('chat');
    loadChatMessages(query.id);
  };

  const handleBackToApplications = () => {
    setCurrentView('applications');
    setSelectedAppNo('');
    setAppQueries([]);
  };

  const handleBackToQueries = () => {
    setCurrentView('queries');
    setSelectedQuery(null);
    setChatMessages([]);
  };

  // Handle opening chat for a specific query
  const handleOpenChat = (query: Query & { queryIndex: number; queryText: string; queryId: string }) => {
    console.log(`🎯 Sales Dashboard: Opening chat for query:`, {
      queryId: query.queryId || query.id,
      id: query.id,
      appNo: query.appNo,
      customerName: query.customerName
    });
    setSelectedQueryForChat(query);
    setIsChatOpen(true);
  };

  const showSuccessMessage = (message = 'Success! The action was completed.') => {
    setSuccessMessage(message);
    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
    }, 3000);
  };

  // Toggle auto-refresh
  const toggleAutoRefresh = () => {
    setAutoRefresh(!autoRefresh);
    showSuccessMessage(autoRefresh ? 'Auto-refresh disabled' : 'Auto-refresh enabled');
  };

  // Action handlers
  const handleAction = (type: 'approve' | 'deferral' | 'otc' | 'waiver') => {
    console.log('🎯 Action button clicked:', type);
    console.log('📋 Current state before action:', {
      selectedQuery: selectedQuery ? {
        id: selectedQuery.id,
        appNo: selectedQuery.appNo,
        queryId: selectedQuery.queryId
      } : null,
      showActionModal,
      actionType,
      actionRemarks,
      selectedPerson
    });
    
    setActionType(type);
    setActionRemarks(''); // Clear remarks when opening new action
    setSelectedPerson(''); // Clear selected person when opening new action
    setShowActionModal(true);
    
    console.log('✅ Action state updated:', {
      newActionType: type,
      modalWillShow: true,
      clearedRemarks: true,
      clearedPerson: true
    });
  };

  // Action mutation for handling query actions
  const actionMutation = useMutation({
    mutationFn: async ({ action, queryId, person, remarks }: QueryActionParams) => {
      console.log('🔥 MUTATION STARTED - Sales action mutation triggered');
      console.log('📊 Mutation input params:', { action, queryId, person, remarks });
      
      // Don't extract numeric ID - use the original UUID queryId directly
      const originalQueryId = queryId;
      console.log('🔢 Using original query ID:', originalQueryId);
      
      const requestBody: any = {
        type: 'action', // Explicitly set the type for the API
        queryId: originalQueryId, // Use original UUID queryId
        action,
        remarks,
        salesTeamMember: user?.name || 'Sales Team',
        team: 'Sales'
      };

      console.log('📝 Sales action request validation passed:', {
        originalQueryId: queryId,
        action,
        team: requestBody.team,
        hasRemarks: !!remarks,
        salesTeamMember: requestBody.salesTeamMember
      });

      // For sales team actions with these button names, 
      // the person represents who APPROVED the query, not who it's assigned to
      if (person && ['approve', 'deferral', 'otc', 'waiver'].includes(action)) {
        requestBody.approvedBy = person; // Mark who approved it
        requestBody.assignedTo = null; // Don't assign to anyone
        console.log('✅ Sales team approval: marking query as approved by', person);
      } else if (person) {
        requestBody.assignedTo = person; // For other actions, keep assignment logic
      }

      console.log('📝 Sending sales action request:', requestBody);
      console.log('🌐 Making API call to /api/query-actions...');

      const response = await fetch('/api/query-actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      console.log('🔍 Sales action response received:', {
        status: response.status, 
        statusText: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries())
      });
      
      if (!response.ok) {
        let errorData;
        let errorText = '';
        
        // Try to get the response text first
        try {
          errorText = await response.text();
          console.log('📋 Raw error response:', errorText);
        } catch (textError) {
          console.error('❌ Could not read error response as text:', textError);
        }

        // Try to parse as JSON if we have text
        if (errorText) {
          try {
            errorData = JSON.parse(errorText);
          } catch (parseError) {
            console.error('❌ Sales action failed - Could not parse error response as JSON:', parseError);
            console.error('📋 Raw response text:', errorText);
            throw new Error(`HTTP ${response.status}: ${response.statusText || 'Failed to submit action'}. Response: ${errorText.substring(0, 200)}`);
          }
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText || 'Failed to submit action'}. No response body.`);
        }
        
        console.error('❌ Sales action failed:', errorData);
        throw new Error(errorData?.error || errorData?.message || `HTTP ${response.status}: ${response.statusText || 'Failed to submit action'}`);
      }
      
      const result = await response.json();
      console.log('✅ Sales action completed successfully:', result);
      console.log('🎉 API Response data:', JSON.stringify(result, null, 2));
      return result;
    },
    onSuccess: (data, variables) => {
      console.log('🎉 Sales action success - starting real-time updates:', { data, variables });
      console.log('📊 Success callback triggered with data:', JSON.stringify(data, null, 2));
      
      // Close modal and reset form
      console.log('🔄 Closing modal and resetting form...');
      setShowActionModal(false);
      setActionRemarks('');
      setSelectedPerson('');
      
      // Immediate optimistic UI update
      if (selectedQuery) {
        console.log('🔄 Applying optimistic update to selected query');
        // Map action to proper status for resolved queries
        const resolvedStatus = variables.action === 'approve' ? 'approved' :
                              variables.action === 'deferral' ? 'deferred' :
                              variables.action === 'otc' ? 'otc' :
                              variables.action === 'waiver' ? 'waived' : 'resolved';
        
        // Update the queries data directly to trigger immediate re-filtering
        queryClient.setQueryData(['salesQueries', 'all', user?.employeeId, searchAppNo], (oldData: Query[] | undefined) => {
          if (!oldData) return oldData;
          
          return oldData.map(queryGroup => {
            if (queryGroup.id === selectedQuery.id || queryGroup.appNo === selectedQuery.appNo) {
              return {
                ...queryGroup,
                queries: queryGroup.queries.map(q => {
                  if (q.id === selectedQuery.queryId || (selectedQuery as any).queryText === q.text) {
                    console.log(`✅ Optimistically updating query ${q.id} to status: ${resolvedStatus}`);
                    return {
                      ...q,
                      status: resolvedStatus,
                      resolvedBy: user?.name || 'Sales Team',
                      resolvedAt: new Date().toISOString(),
                      resolutionReason: variables.action
                    };
                  }
                  return q;
                })
              };
            }
            return queryGroup;
          });
        });
        
        setSelectedQuery(null); // Clear selected query since it's now resolved
        console.log('✅ Optimistic update applied and query cleared from selection');
      }      // Force immediate data refresh with multiple strategies
      console.log('🔄 Triggering comprehensive data refresh...');
      
      // Strategy 1: Invalidate all relevant query caches (including Operations Dashboard)
      const invalidatePromises = [
        queryClient.invalidateQueries({ queryKey: ['salesQueries'] }),
        queryClient.invalidateQueries({ queryKey: ['pendingQueries'] }),
        queryClient.invalidateQueries({ queryKey: ['allQueries'] }),
        queryClient.invalidateQueries({ queryKey: ['queries'] }),
        queryClient.invalidateQueries({ queryKey: ['queryMessages'] }),
        queryClient.invalidateQueries({ queryKey: ['resolvedQueries'] }), // For Operations Dashboard
        queryClient.invalidateQueries({ queryKey: ['operationsQueries'] }), // For Operations Dashboard
        queryClient.invalidateQueries({ queryKey: ['queryReports'] }) // For real-time reporting
      ];
      
      Promise.all(invalidatePromises).then(() => {
        console.log('✅ All query caches invalidated successfully');
      }).catch(error => {
        console.error('❌ Error invalidating caches:', error);
      });
      
      // Strategy 2: Force immediate refetch
      console.log('🔄 Forcing immediate refetch...');
      refetch().then(() => {
        console.log('✅ Main query refetch completed');
      }).catch(error => {
        console.error('❌ Error in main refetch:', error);
      });
      
      // Show specific success messages based on action type with approval indication
      let message = 'Single query action completed successfully! ✅';
      
      switch (variables.action) {
        case 'approve':
          message = variables.person ? 
            `Single query approved by ${variables.person}! Query moved to Sales resolved section. ✅` :
            `Single query approved successfully! Query moved to Sales resolved section. ✅`;
          break;
        case 'deferral':
          message = variables.person ? 
            `Single query deferred by ${variables.person}! Query moved to Sales resolved section. 📋` :
            `Single query deferred successfully! Query moved to Sales resolved section. 📋`;
          break;
        case 'otc':
          message = variables.person ? 
            `Single query OTC processed by ${variables.person}! Query moved to Sales resolved section. 🏢` :
            `Single query OTC processed successfully! Query moved to Sales resolved section. 🏢`;
          break;
        case 'waiver':
          message = `Single query waived successfully! Query moved to Sales resolved section. ✅`;
          break;
      }
      
      console.log('📢 Showing success message:', message);
      showSuccessMessage(message);
      
      // Strategy 3: Refresh current view data immediately
      if (currentView === 'queries' && selectedAppNo) {
        console.log('🔄 Refreshing current application view...');
        handleSelectApplication(selectedAppNo);
      }

      // Strategy 4: For resolving actions, immediately update UI state and force view refresh
      if (['waiver', 'approve', 'deferral', 'otc'].includes(variables.action)) {
        console.log('🎯 Resolution action completed - forcing immediate UI update');
        
        // Force view back to applications to see updated list
        setCurrentView('applications');
        setSelectedAppNo(''); // Clear selected application to force refresh
        
        // Additional aggressive refresh for resolution actions
        setTimeout(() => {
          console.log('⏰ Delayed aggressive refresh for resolution action');
          refetch();
        }, 100); // Very short delay for immediate effect
        
        // Another refresh after a bit more time to ensure consistency
        setTimeout(() => {
          console.log('⏰ Secondary refresh for resolution action');
          refetch();
        }, 1000);
      }
      
      console.log('✅ Sales action success handling completed');
    },
    onError: (error: Error, variables) => {
      console.error('💥 Sales action failed:', {
        error: error.message,
        stack: error.stack,
        variables,
        timestamp: new Date().toISOString()
      });
      console.error('💥 DETAILED ERROR INFO:', error);
      const actionName = variables.action.charAt(0).toUpperCase() + variables.action.slice(1);
      const errorMessage = `❌ Error: Failed to ${variables.action} query. ${error.message}`;
      console.log('📢 Showing error message:', errorMessage);
      showSuccessMessage(errorMessage);
    }
  });

  const handleSubmitAction = () => {
    console.log('🚀 Starting sales action submission...');
    console.log('🔍 Modal state check:', {
      showActionModal,
      actionType,
      selectedQuery: selectedQuery ? {
        id: selectedQuery.id,
        appNo: selectedQuery.appNo,
        queryId: selectedQuery.queryId
      } : null,
      remarksLength: actionRemarks.length,
      selectedPerson,
      mutationStatus: actionMutation.status
    });
    
    if (!selectedQuery) {
      console.error('❌ No selected query for action');
      showSuccessMessage('❌ Please select a query first.');
      return;
    }
    
    if (!actionType) {
      console.error('❌ No action type selected');
      showSuccessMessage('❌ Please select an action type.');
      return;
    }
    
    // Validation
    if (!actionRemarks.trim()) {
      console.error('❌ No remarks provided');
      showSuccessMessage('❌ Remarks are required for all actions. Please enter your remarks.');
      return;
    }

    // Use the individual query ID, not the application ID
    const individualQueryId = selectedQuery.queryId || selectedQuery.id;
    
    if (!individualQueryId) {
      console.error('❌ No valid query ID found:', selectedQuery);
      showSuccessMessage('❌ Invalid query selected. Please try again.');
      return;
    }
    
    console.log(`🎯 Processing sales query: ${individualQueryId} for app: ${selectedQuery.appNo}`);
    console.log('📋 Action details (before extraction):', {
      action: actionType,
      originalQueryId: individualQueryId,
      queryIdType: typeof individualQueryId,
      person: selectedPerson || 'None',
      remarks: actionRemarks,
      timestamp: new Date().toISOString()
    });

    console.log('🚀 About to call actionMutation.mutate...');
    actionMutation.mutate({
      action: actionType!,
      queryId: individualQueryId,
      person: selectedPerson || undefined,
      remarks: actionRemarks
    });
    console.log('✅ actionMutation.mutate called successfully');
  };

  // Load chat messages
  const loadChatMessages = async (queryId: number) => {
    try {
      console.log(`🔄 Loading chat messages for query ${queryId}`);
      
      const response = await fetch(`/api/queries/${queryId}/chat`);
      const result = await response.json();
      
      if (result.success) {
        const messages = result.data || [];
        console.log(`📬 Loaded ${messages.length} messages for query ${queryId}`);
        
        // Transform messages to include proper flags for ChatDisplay
        const transformedMessages = messages.map((msg: any) => ({
          ...msg,
          isQuery: msg.team === 'Operations' || msg.senderRole === 'operations',
          isReply: msg.team === 'Sales' || msg.senderRole === 'sales'
        }));
        
        // Sort messages by timestamp
        transformedMessages.sort((a: { timestamp: string }, b: { timestamp: string }) => 
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
        
        setChatMessages(transformedMessages);
        
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      } else {
        console.error('Failed to load chat messages:', result.error);
        showSuccessMessage('❌ Failed to load chat messages');
      }
    } catch (error) {
      console.error('Error loading chat messages:', error);
      showSuccessMessage('❌ Error loading chat messages');
    }
  };

  // Send message
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedQuery) return;

    try {
      const response = await fetch(`/api/queries/${selectedQuery.id}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: newMessage,
          sender: user?.name || 'Sales Team',
          senderRole: 'sales',
          team: 'Sales'
        }),
      });

      if (response.ok) {
        setNewMessage('');
        loadChatMessages(selectedQuery.id);
        showSuccessMessage('Message sent! 📤');
      } else {
        const errorData = await response.json();
        showSuccessMessage(`❌ Error: Failed to send message. ${errorData.error}`);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      showSuccessMessage('❌ Error: Failed to send message. Please try again.');
    }
  };

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatLastUpdated = () => {
    return lastUpdated.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getConnectionStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return <FaWifi className="h-4 w-4 text-green-500" />;
      case 'connecting':
        return <FaSync className="h-4 w-4 text-yellow-500 animate-spin" />;
      case 'disconnected':
        return <FaWifi className="h-4 w-4 text-red-500" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600"></div>
          <span className="text-gray-600">Loading sales queries...</span>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-4">
          <p className="text-lg font-medium">Error Loading Queries</p>
          <p className="text-sm text-gray-600">{error?.message}</p>
        </div>
        <button
          onClick={() => refetch()}
          className="text-green-600 hover:text-green-800 font-medium"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="h-full w-full bg-white overflow-hidden shadow-xl rounded-lg max-w-6xl mx-auto">
      {/* Success Message */}
      {showSuccess && (
        <div className="fixed top-5 right-5 bg-green-500 text-white py-2 px-4 rounded-lg shadow-lg z-50 transition-transform">
          {successMessage}
        </div>
      )}

      {/* View 1: Applications List */}
      {currentView === 'applications' && (
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-4 border-b border-gray-200 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <h1 className="text-xl font-bold text-gray-800">
                  Sales Query Applications
                  {newQueryCount > 0 && (
                    <span className="ml-2 animate-bounce bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                      +{newQueryCount} NEW
                    </span>
                  )}
                </h1>
              </div>
              <div className="flex items-center space-x-2">
                {getConnectionStatusIcon()}
                <span className="text-xs text-gray-500">
                  {connectionStatus}
                </span>
              </div>
            </div>
            
            {/* Real-time Controls */}
            <div className="mt-3 flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <span className="text-xs text-gray-500">
                  Last updated: {formatLastUpdated()}
                </span>
                {isRefreshing && (
                  <span className="text-xs text-green-600 flex items-center">
                    <FaSync className="h-3 w-3 animate-spin mr-1" />
                    Refreshing...
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <button 
                  onClick={toggleAutoRefresh}
                  className={`text-xs px-3 py-1 rounded-full transition-colors ${
                    autoRefresh 
                      ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {autoRefresh ? (
                    <><FaPauseCircle className="inline h-3 w-3 mr-1" />Auto-refresh ON</>
                  ) : (
                    <><FaPlay className="inline h-3 w-3 mr-1" />Auto-refresh OFF</>
                  )}
                </button>
                
                <button
                  onClick={() => {
                    queryClient.invalidateQueries({ queryKey: ['salesQueries'] });
                    refetch();
                  }}
                  className="px-3 py-1 rounded text-sm font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
                >
                  🔄 Force Refresh
                </button>
              </div>
            </div>
            
            {/* Search */}
            <div className="mt-4 relative">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search applications..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-black font-bold bg-white"
                style={{ color: '#000000', backgroundColor: '#ffffff', fontWeight: '700' }}
              />
            </div>
          </div>

          {/* Application List */}
          <div className="flex-grow overflow-y-auto p-4 space-y-3">
            {filteredApplications.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <FaComments className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No sales queries found</p>
                <p className="text-xs mt-2">Queries marked for Sales team will appear here</p>
              </div>
            ) : (
              filteredApplications.map((appNo) => {
                const queries = groupedQueries.get(appNo) || [];
                const activeQueries = queries.filter((q: Query) => q.status === 'pending').length;
                const totalQueries = queries.length;
                const firstQuery = queries[0];
            
                return (
                  <div 
                    key={appNo} 
                    onClick={() => handleSelectApplication(appNo)}
                    className="p-4 bg-white border border-gray-200 rounded-lg cursor-pointer hover:bg-green-50 hover:border-green-400 transition-colors duration-200 relative shadow-sm"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h2 className="text-lg font-semibold text-gray-800">{appNo}</h2>
                          <span className="bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded-full">
                            {totalQueries} {totalQueries === 1 ? 'Query' : 'Queries'}
                          </span>
                        </div>
                        
                        {/* Simple Customer/Branch Display */}
                        <div className="mb-3">
                          <SimpleCustomerBranchDisplay
                            customerName={firstQuery?.customerName || ''}
                            branch={firstQuery?.branch || ''}
                            branchCode={firstQuery?.branchCode}
                            appNo={appNo}
                            compact={true}
                            className="mb-2"
                          />
                        </div>
                        
                        <div className="flex flex-wrap gap-2 text-xs">
                          {activeQueries > 0 && (
                            <span className="bg-orange-200 text-orange-900 px-3 py-1.5 rounded-full font-bold border border-orange-400 shadow-sm">
                              📋 {activeQueries} Pending
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex flex-col items-end space-y-2">
                        <span className={`text-sm font-medium px-3 py-1 rounded-full ${
                          activeQueries > 0 
                            ? 'bg-orange-100 text-orange-700' 
                            : 'bg-green-100 text-green-700'
                        }`}>
                          {activeQueries > 0 ? '🔴 Active' : '🟢 Resolved'}
                        </span>
                        
                        <div className="text-xs text-gray-400 text-right">
                          Last: {queries[0] ? formatDate(queries[0].submittedAt) : 'N/A'}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
      
      {/* View 2: Queries List */}
      {currentView === 'queries' && (
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-4 border-b border-gray-200 flex-shrink-0 flex items-center justify-between">
            <div className="flex items-center">
              <button 
                onClick={handleBackToApplications}
                className="p-2 rounded-full hover:bg-gray-200 mr-2"
              >
                <FaArrowLeft className="h-6 w-6 text-gray-600" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-800">
                  Queries for {selectedAppNo}
                </h1>
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <span>
                    {appQueries.length} {appQueries.length === 1 ? 'query' : 'queries'} found
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Query List */}
          <div className="flex-grow overflow-y-auto p-4 space-y-3">
            {appQueries.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p>No queries found for this application</p>
              </div>
            ) : (
              appQueries.map((query, index) => (
                <div key={`sales-query-${query.id}-${index}`} className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                  <div 
                    onClick={() => handleSelectQuery(query)}
                    className="cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <span className="font-bold text-gray-700 text-lg">
                          Query {query.queryIndex}
                        </span>
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                          query.status === 'pending' ? 'bg-orange-100 text-orange-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {query.status === 'pending' ? 'Pending' : 'Resolved'}
                        </span>
                      </div>
                    </div>
                    
                    {/* Query Details */}
                    <div className="mt-3 p-4 bg-slate-50 rounded-lg">
                      <p className="text-gray-700 text-sm font-bold">
                        {query.queryText || 'No query text available'}
                      </p>
                    </div>
                    
                    {/* Query Info Grid with TAT */}
                    <div className="mt-4 grid grid-cols-3 gap-4 text-xs">
                      <div className="text-gray-500">
                        <span className="font-medium text-gray-700">Submitted:</span><br/>
                        <span className="text-gray-600">{query.submittedBy}</span>
                      </div>
                      <div className="text-gray-500">
                        <span className="font-medium text-gray-700">TAT:</span><br/>
                        <RealTimeTATDisplay submittedAt={query.submittedAt} />
                      </div>
                      <div className="text-gray-500">
                        <span className="font-medium text-gray-700">Date:</span><br/>
                        <span className="text-gray-600">{new Date(query.submittedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    
                    {/* Sales Action Buttons */}
                    {query.status === 'pending' && (
                      <div className="mt-4 flex items-center space-x-2">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            console.log('🟢 APPROVE button clicked for query:', {
                              id: query.id,
                              appNo: query.appNo,
                              queryId: query.queryId,
                              status: query.status
                            });
                            setSelectedQuery(query);
                            handleAction('approve');
                          }}
                          className="px-4 py-2 text-sm font-bold text-green-900 bg-green-200 border border-green-400 rounded-full hover:bg-green-300 transition-all duration-200 transform hover:scale-105 active:scale-95 shadow-sm"
                        >
                          Approved
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            console.log('🔵 OTC button clicked for query:', {
                              id: query.id,
                              appNo: query.appNo,
                              queryId: query.queryId,
                              status: query.status
                            });
                            setSelectedQuery(query);
                            handleAction('otc');
                          }}
                          className="px-4 py-2 text-sm font-bold text-blue-900 bg-blue-200 border border-blue-400 rounded-full hover:bg-blue-300 transition-all duration-200 transform hover:scale-105 active:scale-95 shadow-sm"
                        >
                          OTC
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            console.log('🟠 DEFERRAL button clicked for query:', {
                              id: query.id,
                              appNo: query.appNo,
                              queryId: query.queryId,
                              status: query.status
                            });
                            setSelectedQuery(query);
                            handleAction('deferral');
                          }}
                          className="px-4 py-2 text-sm font-bold text-orange-900 bg-orange-200 border border-orange-400 rounded-full hover:bg-orange-300 transition-all duration-200 transform hover:scale-105 active:scale-95 shadow-sm"
                        >
                          Deferral
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            console.log('🟣 WAIVER button clicked for query:', {
                              id: query.id,
                              appNo: query.appNo,
                              queryId: query.queryId,
                              status: query.status
                            });
                            setSelectedQuery(query);
                            handleAction('waiver');
                          }}
                          className="px-4 py-2 text-sm font-bold text-purple-900 bg-purple-200 border border-purple-400 rounded-full hover:bg-purple-300 transition-all duration-200 transform hover:scale-105 active:scale-95 shadow-sm"
                        >
                          Waiver
                        </button>
                      </div>
                    )}
                    
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* View 3: Chat/Remarks */}
      {currentView === 'chat' && selectedQuery && (
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-4 border-b border-gray-200 flex-shrink-0">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <button
                  onClick={handleBackToQueries}
                  className="p-2 rounded-full hover:bg-gray-200 mr-3"
                >
                  <FaArrowLeft className="h-6 w-6 text-gray-600" />
                </button>
                <div>
                  <h1 className="text-xl font-bold text-gray-800">
                    Query Chat - {selectedQuery.appNo}
                  </h1>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {getConnectionStatusIcon()}
              </div>
            </div>
            
            {/* Simple Customer/Branch Display in Chat Header */}
            <SimpleCustomerBranchDisplay
              customerName={selectedQuery.customerName}
              branch={selectedQuery.branch}
              branchCode={selectedQuery.branchCode}
              appNo={selectedQuery.appNo}
              compact={false}
              className="bg-green-50 border-green-200"
            />
          </div>
          
          {/* Use the new ChatDisplay component */}
          <div className="flex-1 overflow-hidden">
            <ChatDisplay 
              messages={chatMessages}
              title=""
              showTimestamp={true}
              className="h-full"
            />
          </div>
          
          {/* Message Input */}
          <div className="p-4 bg-white border-t border-gray-200 flex-shrink-0">
            <div className="flex items-center space-x-4">
              <input
                type="text"
                placeholder="Type your response..." 
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                className="flex-1 px-4 py-2 bg-white border-2 border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-black font-bold"
                style={{ color: '#000000', backgroundColor: '#ffffff', fontWeight: '700' }}
              />
              <button
                onClick={handleSendMessage}
                disabled={!newMessage.trim()}
                className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-full flex items-center disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <span className="hidden sm:inline">Send</span>
                <FaPaperPlane className="h-4 w-4 ml-0 sm:ml-2" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sales Action Modal */}
      {showActionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-bold mb-4 text-black">
              {actionType === 'approve' && 'Approve Query - Sales Team'}
              {actionType === 'deferral' && 'Deferral Action - Sales Team'}
              {actionType === 'otc' && 'OTC Action - Sales Team'}
              {actionType === 'waiver' && 'Waiver Query - Sales Team'}
            </h3>
            
            <div className="space-y-4">
              {/* Display sales user name for all actions */}
              <div>
                <label className="block text-sm font-bold text-black">Sales Team Member</label>
                <input
                  type="text"
                  value={user?.name || 'Sales Team'}
                  disabled
                  className="mt-1 block w-full pl-3 pr-3 py-3 text-gray-700 bg-gray-100 border-2 border-gray-300 rounded-md font-bold cursor-not-allowed"
                />
              </div>

              {/* Approval field for approve, deferral and otc */}
              {(actionType === 'approve' || actionType === 'deferral' || actionType === 'otc') && (
                <div>
                  <label className="block text-sm font-bold text-black">
                    {actionType === 'approve' ? 'Approved By' : actionType === 'deferral' ? 'Deferred By' : 'OTC Processed By'}
                  </label>
                  <select
                    value={selectedPerson}
                    onChange={(e) => setSelectedPerson(e.target.value)}
                    className="mt-1 shadow-sm focus:ring-green-500 focus:border-green-500 block w-full text-black bg-white border-2 border-gray-300 rounded-md p-3 font-bold"
                    style={{ color: '#000000', backgroundColor: '#ffffff', fontWeight: '700' }}
                  >
                    <option value="">Select approver...</option>
                    <option value="Abhishek Mishra">Abhishek Mishra</option>
                    <option value="Aarti Pujara - Credit Manager">Aarti Pujara - Credit Manager</option>
                    <option value="Sumit Khari - Sales Manager">Sumit Khari - Sales Manager</option>
                    <option value="Rahul Jain">Rahul Jain</option>
                    <option value="Vikram Diwan">Vikram Diwan</option>
                    <option value="Puneet Chadha">Puneet Chadha</option>
                    <option value="Mohan Keswani">Mohan Keswani</option>
                  </select>
                </div>
              )}

              {/* Waiver By field for waiver actions */}
              {actionType === 'waiver' && (
                <div>
                  <label className="block text-sm font-bold text-black">
                    Waiver By
                  </label>
                  <select
                    value={selectedPerson}
                    onChange={(e) => setSelectedPerson(e.target.value)}
                    className="mt-1 shadow-sm focus:ring-purple-500 focus:border-purple-500 block w-full text-black bg-white border-2 border-gray-300 rounded-md p-3 font-bold"
                    style={{ color: '#000000', backgroundColor: '#ffffff', fontWeight: '700' }}
                  >
                    <option value="">Select approver...</option>
                    <option value="Abhishek Mishra">Abhishek Mishra</option>
                    <option value="Aarti Pujara - Credit Manager">Aarti Pujara - Credit Manager</option>
                    <option value="Sumit Khari - Sales Manager">Sumit Khari - Sales Manager</option>
                    <option value="Rahul Jain">Rahul Jain</option>
                    <option value="Vikram Diwan">Vikram Diwan</option>
                    <option value="Puneet Chadha">Puneet Chadha</option>
                    <option value="Mohan Keswani">Mohan Keswani</option>
                  </select>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-bold text-black">
                  Remarks <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={actionRemarks}
                  onChange={(e) => setActionRemarks(e.target.value)}
                  rows={4} 
                  className={`mt-1 shadow-sm block w-full text-black bg-white border-2 rounded-md p-3 font-bold transition-colors ${
                    actionRemarks.trim() 
                      ? 'border-green-300 focus:ring-green-500 focus:border-green-500' 
                      : 'border-red-300 focus:ring-red-500 focus:border-red-500'
                  }`}
                  placeholder="Enter your remarks... (required)"
                  style={{ color: '#000000', backgroundColor: '#ffffff', fontWeight: '700' }}
                  required
                />
                {!actionRemarks.trim() && (
                  <p className="mt-1 text-sm text-red-600">Remarks are required for all actions</p>
                )}
              </div>
            </div>
              
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowActionModal(false);
                  setActionRemarks('');
                  setSelectedPerson('');
                }}
                className="bg-gray-200 text-black px-4 py-2 rounded-md hover:bg-gray-300 transition-colors font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitAction}
                disabled={
                  actionMutation.isPending || 
                  !actionRemarks.trim() || 
                  (actionType && ['approve', 'deferral', 'otc', 'waiver'].includes(actionType) && !selectedPerson.trim())
                }
                className={`px-4 py-2 rounded-md font-bold transition-colors ${
                  actionMutation.isPending || 
                  !actionRemarks.trim() || 
                  (actionType && ['approve', 'deferral', 'otc', 'waiver'].includes(actionType) && !selectedPerson.trim())
                    ? 'bg-gray-400 text-gray-600 cursor-not-allowed opacity-50'
                    : 'bg-green-500 text-white hover:bg-green-600'
                }`}
                title={
                  !actionRemarks.trim() 
                    ? 'Please enter remarks before submitting' 
                    : (actionType && ['approve', 'deferral', 'otc', 'waiver'].includes(actionType) && !selectedPerson.trim())
                      ? 'Please select an approver before submitting'
                      : ''
                }
              >
                {actionMutation.isPending ? 'Processing...' : 'Submit'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}