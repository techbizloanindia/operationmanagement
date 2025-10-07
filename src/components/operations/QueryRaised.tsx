'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FaArrowLeft, FaSync, FaCheck, FaHandshake, FaPause, FaSearch, FaClock, FaUser, FaComments, FaPaperPlane, FaBell, FaWifi, FaPlay, FaPauseCircle, FaUndo } from 'react-icons/fa';
import { useAuth } from '@/contexts/AuthContext';
import RevertMessageBox from '../shared/RevertMessageBox';
import EnhancedQueryChatInterface from '@/components/shared/EnhancedQueryChatInterface';
import ChatDisplay from '@/components/shared/ChatDisplay';
import { formatTATDisplay, useRealTimeTAT } from '@/lib/tatUtils';

// Real-time TAT Display Component
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
  status?: 'pending' | 'approved' | 'deferred' | 'otc' | 'resolved' | 'waiting for approval' | 'deferral' | 'request-approved' | 'request-deferral' | 'request-otc';
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
  status: 'pending' | 'approved' | 'deferred' | 'otc' | 'resolved' | 'waiting for approval' | 'deferral' | 'request-approved' | 'request-deferral' | 'request-otc';
  branch: string;
  branchCode: string;
  employeeId?: string;
  markedForTeam?: string;
  title?: string;
  priority?: 'high' | 'medium' | 'low';
  tat?: string;
  queryId?: string; // Individual query ID
  queryIndex?: number; // Query number within application
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
  isSystemMessage?: boolean; // Added for system messages
  actionType?: string; // Added for action type (e.g., 'revert')
}

// View types for the four-view interface
type ViewType = 'applications' | 'queries' | 'chat';

// Generate unique key for query items
const generateQueryKey = (query: any, index: number, prefix: string = 'query') => {
  return `${prefix}-${query.queryId || query.id || 'unknown'}-${query.appNo || 'no-app'}-${index}`;
};

// Fetch queries function - Now fetches only truly pending queries (not approved/resolved)
const fetchQueries = async (): Promise<Query[]> => {
  try {
    // Fetch pending queries from the operations-specific API endpoint
    const response = await fetch('/api/queries/operations?status=pending&type=created');
    const result = await response.json();
    
    if (!response.ok || !result.success) {
      throw new Error(result.error || 'Failed to fetch queries');
    }
    
    // Filter out only completely resolved queries, but keep "waiting for approval" queries
    // Queries should stay in "Queries Raised" while waiting for approval
    const filteredQueries = result.data.filter((queryData: any) => {
      // Check overall query status - only exclude fully resolved queries
      if (['approved', 'deferral', 'otc', 'approved', 'resolved', 'deferred', 'otc', 'waived'].includes(queryData.status)) {
        return false;
      }
      
      // Check individual query statuses - only exclude fully resolved sub-queries
      const allQueriesResolved = queryData.queries?.every((q: any) => 
        ['approved', 'deferral', 'otc', 'approved', 'resolved', 'deferred', 'otc', 'waived'].includes(q.status)
      );
      
      // Include if not all queries are resolved (some might be pending or waiting for approval)
      return !allQueriesResolved;
    });
    
    // Convert the API response to the format expected by the component
    const queries = filteredQueries.map((queryData: any) => ({
      id: queryData.id,
      appNo: queryData.appNo,
      customerName: queryData.customerName,
      title: queryData.queries[0]?.text || `Query ${queryData.id}`,
      queries: queryData.queries.map((q: any, index: number) => ({
        id: q.id,
        text: q.text,
        timestamp: q.timestamp || queryData.submittedAt,
        sender: q.sender || queryData.submittedBy,
        status: q.status || 'pending',
        proposedAction: q.proposedAction || queryData.proposedAction,
        queryNumber: q.queryNumber || (index + 1),
        sentTo: q.sentTo || queryData.sendTo || [],
        tat: q.tat || queryData.tat || '24 hours'
      })),
      sendTo: queryData.sendTo,
      submittedBy: queryData.submittedBy,
      submittedAt: queryData.submittedAt,
      status: queryData.status,
      proposedAction: queryData.proposedAction,
      branch: queryData.branch,
      branchCode: queryData.branchCode,
      markedForTeam: queryData.markedForTeam,
      tat: '24 hours', // Default TAT
      priority: 'medium' // Default priority
    }));
    
    return queries;
  } catch (error) {
    console.error('Error fetching queries:', error);
    throw error;
  }
};

export default function QueryRaised() {
  // View state management
  const [currentView, setCurrentView] = useState<ViewType>('applications');
  const [selectedAppNo, setSelectedAppNo] = useState<string>('');
  const [selectedQuery, setSelectedQuery] = useState<Query | null>(null);
  const [appQueries, setAppQueries] = useState<Array<Query & { queryIndex: number; queryText: string; queryId: string }>>([]);
  
  // UI state
  const [searchTerm, setSearchTerm] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  
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
  
  // Fetch queries with real-time updates
  const { data: queries, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['pendingQueries'],
    queryFn: async () => {
      setConnectionStatus('connecting');
      try {
        console.log('🔍 QueryRaised: Fetching queries from API...');
        const result = await fetchQueries();
        console.log(`🔍 QueryRaised: Received ${result.length} queries from API`);
        console.log('🔍 QueryRaised: Sample queries:', result.slice(0, 3).map(q => ({
          id: q.id,
          appNo: q.appNo,
          status: q.status,
          markedForTeam: q.markedForTeam
        })));
        setConnectionStatus('connected');
        setLastUpdated(new Date());
        return result;
      } catch (error) {
        console.error('🔍 QueryRaised: Error fetching queries:', error);
        setConnectionStatus('disconnected');
        throw error;
      }
    },
    refetchOnWindowFocus: true,
    staleTime: 10000, // 10 seconds
    refetchInterval: autoRefresh ? 15000 : false, // Auto-refresh every 15 seconds when enabled
    refetchIntervalInBackground: true, // Continue refreshing in background
  });

  // Listen for query events from AddQuery component for immediate updates
  useEffect(() => {
    const handleQueryAdded = (event: Event) => {
      const customEvent = event as CustomEvent;
      console.log('🔔 QueryRaised: New query added event detected!', customEvent?.detail);
      setNewQueryCount(prev => prev + 1);
      showSuccessMessage('New query added! Refreshing data... 🔔');
      
      // Immediately refresh queries to show the new one
      console.log('🔄 QueryRaised: Triggering immediate refetch...');
      refetch();
    };

    const handleQueryUpdated = (event: Event) => {
      const customEvent = event as CustomEvent;
      console.log('🔄 QueryRaised: Query updated event detected!', customEvent?.detail);
      showSuccessMessage('Query updated! Refreshing data... ✅');
      
      // Immediately refresh queries
      refetch();
    };

    // Listen for localStorage changes (cross-tab synchronization)
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'queryUpdate') {
        console.log('🔄 QueryRaised: Storage-based query update detected');
        showSuccessMessage('Query data updated! Refreshing... 🔔');
        refetch();
      }
    };

    // Add event listeners
    console.log('📡 QueryRaised: Setting up event listeners...');
    window.addEventListener('queryAdded', handleQueryAdded);
    window.addEventListener('queryUpdated', handleQueryUpdated);
    window.addEventListener('queryResolved', handleQueryUpdated);
    window.addEventListener('storage', handleStorageChange);

    // Subscribe to real-time updates from queryUpdateService
    import('@/lib/queryUpdateService').then(({ queryUpdateService }) => {
      const unsubscribe = queryUpdateService.subscribe('operations', (update) => {
        console.log('📨 QueryRaised received real-time update:', update.appNo, update.action, 'Status:', update.status);
        
        // Handle different types of updates
        if (update.action === 'created') {
          setNewQueryCount(prev => prev + 1);
          showSuccessMessage(`New query added for ${update.appNo}! 🔔`);
          refetch(); // Refresh to show new query
        } else if (update.action === 'message_added') {
          // New message received from sales/credit team
          console.log(`💬 New message received from ${update.messageFrom} team for query ${update.appNo}`);
          showSuccessMessage(`New message from ${update.messageFrom} team for ${update.appNo}! 💬`);
          
          // If we're currently viewing this query's chat, refresh messages
          if (selectedQuery && selectedQuery.appNo === update.appNo && currentView === 'chat') {
            loadChatMessages(selectedQuery.id);
          }
          
          // Show notification badge or indicator for new messages
          setNewQueryCount(prev => prev + 1);
          
        } else if (update.action === 'approved' || update.action === 'resolved' || ['approved', 'deferral', 'otc', 'approved', 'deferred', 'otc', 'resolved', 'waived'].includes(update.status)) {
          // Query has been approved/resolved - remove from pending list
          console.log(`🆕 Query ${update.appNo} has been ${update.status} - removing from pending queries`);
          showSuccessMessage(`Query ${update.appNo} has been ${update.status}! ✅`);
          refetch(); // Refresh to remove approved query from this view
          
          // If we're currently viewing this query, go back to applications view
          if (selectedQuery && selectedQuery.appNo === update.appNo) {
            setCurrentView('applications');
            setSelectedQuery(null);
          }
        } else if (update.action === 'updated') {
          // General update - refresh to show changes
          refetch();
        }
        
        // Update last refresh time
        setLastUpdated(new Date());
      });
      
      console.log('🌐 QueryRaised: Subscribed to real-time query updates');
      
      // Store unsubscribe function for cleanup
      return unsubscribe;
    });

    return () => {
      // Clean up event listeners
      console.log('🧹 QueryRaised: Cleaning up event listeners...');
      window.removeEventListener('queryAdded', handleQueryAdded);
      window.removeEventListener('queryUpdated', handleQueryUpdated);
      window.removeEventListener('queryResolved', handleQueryUpdated);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [refetch, selectedQuery, currentView]);

  // Real-time refresh management for applications view
  useEffect(() => {
    let refreshInterval: NodeJS.Timeout;
    
    if (autoRefresh && currentView === 'applications') {
      refreshInterval = setInterval(async () => {
        setIsRefreshing(true);
        try {
          await refetch();
        } catch (error) {
          console.error('Auto-refresh failed:', error);
          setConnectionStatus('disconnected');
        } finally {
          setIsRefreshing(false);
        }
      }, 15000);
    }

    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [autoRefresh, currentView, refetch]);

  // Auto-refresh app queries when in queries view
  useEffect(() => {
    let appRefreshInterval: NodeJS.Timeout;
    
    if (autoRefresh && currentView === 'queries' && selectedAppNo && queries) {
      appRefreshInterval = setInterval(async () => {
        setIsRefreshing(true);
        try {
          // Trigger a refetch of main queries and update app queries
          const result = await refetch();
          
          if (result.data) {
            // Create grouped queries from the fresh data
            const freshGrouped = new Map();
            result.data.forEach(query => {
              if (!freshGrouped.has(query.appNo)) {
                freshGrouped.set(query.appNo, []);
              }
              freshGrouped.get(query.appNo).push(query);
            });
            
            // Update app queries from the refreshed grouped data
            const updatedAppQueries = freshGrouped.get(selectedAppNo) || [];
            
            // Check for new queries
            const oldCount = appQueries.length;
            const newCount = updatedAppQueries.length;
            
            if (newCount > oldCount) {
              showSuccessMessage(`${newCount - oldCount} new query(s) added! 🔔`);
            }
            
            // Check for status changes
            const statusChanges = updatedAppQueries.filter((newQuery: Query, index: number) => {
              const oldQuery = appQueries[index];
              return oldQuery && oldQuery.status !== newQuery.status;
            });
            
            if (statusChanges.length > 0) {
              showSuccessMessage(`${statusChanges.length} query status updated! ✅`);
            }
            
            setAppQueries(updatedAppQueries);
          }
          
          setLastUpdated(new Date());
        } catch (error) {
          console.error('Failed to refresh app queries:', error);
        } finally {
          setIsRefreshing(false);
        }
      }, 20000); // Refresh every 20 seconds
    }

    return () => {
      if (appRefreshInterval) {
        clearInterval(appRefreshInterval);
      }
    };
  }, [autoRefresh, currentView, selectedAppNo, appQueries.length, refetch, queries]);

  // Auto-refresh chat messages when in chat view with enhanced isolation
  useEffect(() => {
    let chatRefreshInterval: NodeJS.Timeout;
    
    if (autoRefresh && currentView === 'chat' && selectedQuery) {
      // Store the query ID to prevent race conditions
      const currentQueryId = selectedQuery.id;
      
      console.log(`🔄 Setting up auto-refresh for chat messages (query ${currentQueryId})`);
      
      chatRefreshInterval = setInterval(async () => {
        try {
          // Double-check we're still viewing the same query
          if (selectedQuery && selectedQuery.id === currentQueryId && currentView === 'chat') {
            console.log(`🔄 Auto-refreshing chat messages for query ${currentQueryId}`);
            await loadChatMessages(currentQueryId);
          } else {
            console.log(`🛑 Skipping chat refresh - query changed or view changed`);
          }
        } catch (error) {
          console.error('Failed to refresh chat messages:', error);
        }
      }, 3000); // Real-time messaging with 3-second refresh for cross-team chat
    }

    return () => {
      if (chatRefreshInterval) {
        console.log(`🧹 Cleaning up chat auto-refresh interval`);
        clearInterval(chatRefreshInterval);
      }
    };
  }, [autoRefresh, currentView, selectedQuery?.id]); // Added selectedQuery.id dependency

  // Extract individual queries for display with sequential numbering
  const individualQueries = React.useMemo(() => {
    if (!queries || queries.length === 0) return [];
    
    const individual: Array<Query & { queryIndex: number; queryText: string; queryId: string }> = [];
    
    queries.forEach(queryGroup => {
      queryGroup.queries.forEach((query, index) => {
        // Include all queries except resolved and waiting for approval ones (as per workflow requirement)
        const queryStatus = query.status || queryGroup.status;
  const isResolved = ['approved', 'deferral', 'otc', 'approved', 'resolved', 'deferred', 'otc', 'completed', 'waiting for approval', 'waived'].includes(queryStatus);
        
        if (!isResolved) {
          individual.push({
            ...queryGroup,
            queryIndex: individual.length + 1, // Sequential numbering using array index + 1
            queryText: query.text,
            queryId: query.id || `${queryGroup.id}-${index}`,
            id: parseInt(query.id?.split('-')[0] || queryGroup.id.toString()) + index, // Unique ID for each query
            title: `Query ${individual.length + 1} - ${queryGroup.appNo}`,
            status: queryStatus
          });
        }
      });
    });
    
    return individual;
  }, [queries]);

  // Group individual queries by application number for the applications view
  const groupedQueries = React.useMemo(() => {
    const grouped = new Map();
    individualQueries.forEach(query => {
      if (!grouped.has(query.appNo)) {
        grouped.set(query.appNo, []);
      }
      grouped.get(query.appNo).push(query);
    });
    return grouped;
  }, [individualQueries]);

  // Filter applications based on search
  const filteredApplications = React.useMemo(() => {
    if (!queries || queries.length === 0) return [];
    
    const applications = Array.from(groupedQueries.keys());
    if (!searchTerm) return applications;
    
    return applications.filter(appNo => 
      appNo.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [groupedQueries, searchTerm, queries]);

  // Handle navigation
  const handleSelectApplication = async (appNo: string) => {
    setSelectedAppNo(appNo);
    setCurrentView('queries');
    
    // Filter individual queries from the main queries list for this application
    const appQueriesFiltered = individualQueries.filter(query => query.appNo === appNo);
    setAppQueries(appQueriesFiltered);
    
    // Reset new query counter when user views queries
    setNewQueryCount(0);
  };

  const handleSelectQuery = (query: Query) => {
    console.log(`🎯 Operations Dashboard: Opening chat for query:`, {
      queryId: (query as any).queryId || query.id,
      id: query.id,
      appNo: query.appNo,
      customerName: query.customerName
    });
    setSelectedQuery(query);
    setCurrentView('chat');
    // Use queryId for proper cross-team chat isolation
    loadChatMessages((query as any).queryId || query.id);
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

  // Handle opening chat for a specific query
  const handleOpenChat = (query: Query & { queryIndex: number; queryText: string; queryId: string }) => {
    console.log(`🎯 Operations Dashboard: Opening chat for query:`, {
      queryId: query.queryId || query.id,
      id: query.id,
      appNo: query.appNo,
      customerName: query.customerName
    });
    setSelectedQueryForChat(query);
    setIsChatOpen(true);
  };

  // Load chat messages with cross-team visibility
  const loadChatMessages = async (queryId: number) => {
    try {
      console.log(`🔄 OPERATIONS: Loading ALL cross-team messages for query ${queryId}`);
      
      // Enhanced cache-busting and cross-team message loading
      const cacheBuster = Date.now() + Math.random();
      const response = await fetch(`/api/queries/${queryId}/chat?t=${cacheBuster}&team=operations&crossTeam=true&debug=true`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0',
          'X-Team': 'operations',
          'X-Query-Id': queryId.toString(),
          'X-Cross-Team': 'enabled', // Request cross-team messages
          'X-Force-Refresh': 'true'
        }
      });
      const result = await response.json();
      
      if (result.success) {
        const messages = result.data || [];
        console.log(`📬 OPERATIONS: Loaded ${messages.length} total messages for query ${queryId}`);
        
        // CRITICAL: Validate that ALL messages belong to the current query
        const validMessages = messages.filter((msg: any) => {
          const msgQueryId = msg.queryId?.toString();
          const targetQueryId = queryId.toString();
          
          // Strict validation - exact match only
          const isValid = msgQueryId === targetQueryId;
          
          if (!isValid) {
            console.warn(`🚫 FILTERED OUT contaminated message: msg.queryId="${msgQueryId}", target="${targetQueryId}"`);
          }
          
          return isValid;
        });
        
        if (validMessages.length !== messages.length) {
          console.warn(`⚠️ Operations Chat: Filtered out ${messages.length - validMessages.length} contaminated messages for query ${queryId}`);
        }
        
        // ENHANCED: Transform messages for proper cross-team visibility
        const transformedMessages = validMessages.map((msg: any) => {
          const senderTeam = msg.team?.toLowerCase() || msg.senderRole?.toLowerCase() || 'unknown';
          
          const messageClassification = {
            ...msg,
            isQuery: senderTeam === 'operations' || msg.senderRole === 'operations',
            isReply: senderTeam === 'sales' || senderTeam === 'credit' || 
                    msg.senderRole === 'sales' || msg.senderRole === 'credit',
            isOperationsMessage: senderTeam === 'operations' || msg.senderRole === 'operations',
            isCreditMessage: senderTeam === 'credit' || msg.senderRole === 'credit',
            isSalesMessage: senderTeam === 'sales' || msg.senderRole === 'sales',
            crossTeamVisible: true, // All messages visible to operations
            validated: true,
            targetQueryId: queryId.toString(),
            displayTeam: senderTeam === 'operations' ? 'Operations' : 
                        senderTeam === 'credit' ? 'Credit' : 
                        senderTeam === 'sales' ? 'Sales' : 
                        msg.team || 'Unknown'
          };
          
          console.log(`💬 Message from ${msg.sender} (${messageClassification.displayTeam}): ${msg.message?.substring(0, 50)}...`);
          
          return messageClassification;
        });
        
        // Sort messages by timestamp
        transformedMessages.sort((a: { timestamp: string }, b: { timestamp: string }) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
        
        // Log message distribution for debugging
        const messageStats = transformedMessages.reduce((acc: any, msg: any) => {
          const team = msg.displayTeam;
          acc[team] = (acc[team] || 0) + 1;
          return acc;
        }, {});
        
        console.log(`📊 OPERATIONS CHAT: Message distribution:`, messageStats);
        console.log(`✅ OPERATIONS: Set ${transformedMessages.length} messages with full cross-team visibility`);
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

  // Send message with enhanced validation
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedQuery) return;

    // Use the correct queryId for cross-team compatibility
    const queryIdToUse = (selectedQuery as any).queryId || selectedQuery.id;
    console.log(`📤 Operations: Sending message to queryId: ${queryIdToUse} (original id: ${selectedQuery.id})`);
    
    try {
      const response = await fetch(`/api/queries/${queryIdToUse}/chat`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        },
        body: JSON.stringify({
          message: newMessage,
          sender: user?.name || 'Operations Team',
          senderRole: 'operations',
          team: 'Operations',
          queryId: queryIdToUse // Explicitly include queryId for validation
        }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log(`✅ Operations: Message sent successfully to queryId ${queryIdToUse}`);
        
        setNewMessage('');
        
        // Reload messages with a small delay to ensure server has processed
        setTimeout(async () => {
          await loadChatMessages(queryIdToUse);
        }, 500);
        
        showSuccessMessage('Message sent! 📤');
      } else {
        const errorData = await response.json();
        console.error(`❌ Operations: Failed to send message to queryId ${queryIdToUse}:`, errorData);
        showSuccessMessage(`❌ Error: Failed to send message. ${errorData.error}`);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      showSuccessMessage('❌ Error: Failed to send message. Please try again.');
    }
  };




  // Format time
  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-orange-600';
      case 'approved': 
      case 'request-approved': return 'text-green-600';
      case 'deferred': 
      case 'request-deferral': return 'text-yellow-600';
      case 'otc': 
      case 'request-otc': return 'text-blue-600';
      case 'waiting for approval': return 'text-purple-600';
      case 'resolved': return 'text-emerald-600';
      default: return 'text-gray-600';
    }
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
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span className="text-gray-600">Loading queries...</span>
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
          className="text-blue-600 hover:text-blue-800 font-medium"
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
                  Query Raised Applications
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
                  <span className="text-xs text-blue-600 flex items-center">
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
                    <><FaPause className="inline h-3 w-3 mr-1" />Auto-refresh ON</>
                  ) : (
                    <><FaPlay className="inline h-3 w-3 mr-1" />Auto-refresh OFF</>
                  )}
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
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black font-bold bg-white"
                style={{ color: '#000000', backgroundColor: '#ffffff', fontWeight: '700' }}
        />
            </div>
      </div>

          {/* Summary Stats */}
          {filteredApplications.length > 0 && (
            <div className="px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-lg font-bold text-gray-800">
                    {individualQueries.length}
                  </div>
                  <div className="text-xs text-gray-600">Total Individual Queries</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-orange-600">
                    {individualQueries.filter((q: Query) => q.status === 'pending').length}
                  </div>
                  <div className="text-xs text-gray-600">Pending</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-green-600">
                    {individualQueries.filter((q: Query) => ['approved', 'request-approved'].includes(q.status)).length}
                  </div>
                  <div className="text-xs text-gray-600">Approved</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-blue-600">
                    {filteredApplications.length}
                  </div>
                  <div className="text-xs text-gray-600">Applications</div>
                </div>
              </div>
            </div>
          )}

          {/* Application List */}
          <div className="flex-grow overflow-y-auto p-4 space-y-3">
            {filteredApplications.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <FaComments className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No applications with queries found</p>
                <p className="text-xs mt-2">Queries will appear here once raised</p>
              </div>
            ) : (
              filteredApplications.map((appNo) => {
                const queries = groupedQueries.get(appNo) || [];
                const activeQueries = queries.filter((q: Query) => q.status === 'pending').length;
                const waitingQueries = queries.filter((q: Query) => q.status === 'waiting for approval').length;
                const approvedQueries = queries.filter((q: Query) => ['approved', 'request-approved'].includes(q.status)).length;
                const deferredQueries = queries.filter((q: Query) => ['deferred', 'request-deferral'].includes(q.status)).length;
                const otcQueries = queries.filter((q: Query) => ['otc', 'request-otc'].includes(q.status)).length;
                const totalQueries = queries.length;
                const firstQuery = queries[0]; // Get first query for customer info
            
            return (
              <div 
                    key={appNo} 
                    onClick={() => handleSelectApplication(appNo)}
                    className="p-4 bg-white border border-gray-200 rounded-lg cursor-pointer hover:bg-blue-50 hover:border-blue-400 transition-colors duration-200 relative shadow-sm"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h2 className="text-lg font-semibold text-gray-800">{appNo}</h2>
                          <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-full">
                            {totalQueries} Individual {totalQueries === 1 ? 'Query' : 'Queries'} Raised
                          </span>
                      </div>
                        
                        <p className="text-sm text-gray-600 mb-3">
                          Customer: {firstQuery?.customerName || firstQuery?.appNo}
                        </p>
                        
                        {/* Query Status Summary */}
                        <div className="flex flex-wrap gap-2 text-xs">
                          {activeQueries > 0 && (
                            <span className="bg-orange-200 text-orange-900 px-3 py-1.5 rounded-full font-bold border border-orange-400 shadow-sm">
                              📋 {activeQueries} Pending
                            </span>
                          )}
                          {waitingQueries > 0 && (
                            <span className="bg-blue-200 text-blue-900 px-3 py-1.5 rounded-full font-bold border border-blue-400 shadow-sm">
                              ⏳ {waitingQueries} Awaiting Approval
                            </span>
                          )}
                          {approvedQueries > 0 && (
                            <span className="bg-green-200 text-green-900 px-3 py-1.5 rounded-full font-bold border border-green-400 shadow-sm">
                              ✅ {approvedQueries} Approved
                            </span>
                          )}
                          {otcQueries > 0 && (
                            <span className="bg-blue-200 text-blue-900 px-3 py-1.5 rounded-full font-bold border border-blue-400 shadow-sm">
                              🔄 {otcQueries} OTC
                            </span>
                          )}
                          {deferredQueries > 0 && (
                            <span className="bg-orange-200 text-orange-900 px-3 py-1.5 rounded-full font-bold border border-orange-400 shadow-sm">
                              ⏸️ {deferredQueries} Deferred
                            </span>
                          )}
                    </div>
                    
                        {/* Teams Involved */}
                        <div className="mt-2 text-xs text-gray-500">
                          Teams: {firstQuery?.markedForTeam === 'both' ? 'Sales, Credit' : 
                                  firstQuery?.markedForTeam === 'sales' ? 'Sales' : 
                                  firstQuery?.markedForTeam === 'credit' ? 'Credit' : 
                                  firstQuery?.sendTo?.join(', ') || 'Unknown'}
                        </div>
                      </div>
                      
                      <div className="flex flex-col items-end space-y-2">
                        <span className={`text-sm font-medium px-3 py-1 rounded-full ${
                          activeQueries > 0 
                            ? 'bg-orange-100 text-orange-700' 
                            : 'bg-green-100 text-green-700'
                        }`}>
                          {activeQueries > 0 ? '🔴 Active' : '🟢 All Resolved'}
                        </span>
                        
                        {newQueryCount > 0 && false && (
                          <span className="animate-pulse bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                            🔔 NEW
                          </span>
                        )}
                        
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
                  Individual Queries for {selectedAppNo}
                </h1>
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <span>
                    {appQueries.length} individual {appQueries.length === 1 ? 'query' : 'queries'} found
                  </span>
                  <span className="text-xs">
                    Updated: {formatLastUpdated()}
                  </span>
                  {isRefreshing && (
                    <span className="text-blue-600 flex items-center">
                      <FaSync className="h-3 w-3 animate-spin mr-1" />
                      Refreshing...
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {getConnectionStatusIcon()}
              <button
                onClick={() => handleSelectApplication(selectedAppNo)}
                disabled={isRefreshing}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors"
              >
                <FaSync className={`h-4 w-4 text-gray-600 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
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
                <div key={generateQueryKey(query, index, 'query-raised')} className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                  <div 
                    onClick={() => handleSelectQuery(query)}
                    className="cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <span className="font-bold text-gray-700 text-lg">
                          Query {query.queryIndex} - {query.appNo}
                        </span>
                        {query.status === 'waiting for approval' && (
                          <span className="text-blue-600 text-xs ml-2" title="Waiting for approval">⏳</span>
                        )}
                        <span className="text-gray-400">–</span>
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                          query.status === 'pending' ? 'bg-orange-100 text-orange-800' :
                          query.status === 'waiting for approval' ? 'bg-purple-100 text-purple-800' :
                          query.status === 'approved' || query.status === 'request-approved' ? 'bg-green-100 text-green-800' :
                          query.status === 'deferred' || query.status === 'request-deferral' ? 'bg-yellow-100 text-yellow-800' :
                          query.status === 'otc' || query.status === 'request-otc' ? 'bg-blue-100 text-blue-800' :
                          query.status === 'resolved' ? 'bg-emerald-100 text-emerald-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {query.status === 'pending' ? 'Pending' :
                           query.status === 'waiting for approval' ? 'Approval Pending' :
                           query.status === 'approved' || query.status === 'request-approved' ? 'Approved' :
                           query.status === 'deferred' || query.status === 'request-deferral' ? 'Deferred' :
                           query.status === 'otc' || query.status === 'request-otc' ? 'OTC' :
                           query.status === 'resolved' ? 'Resolved' :
                           // Safe fallback for any other status values
                           typeof query.status === 'string' ? 
                             (query.status as string).charAt(0).toUpperCase() + (query.status as string).slice(1) : 
                             'Unknown'}
                  </span>
                </div>
                      <div className="flex items-center space-x-2">
                        {/* Team Assignment Badges */}
                        <div className="flex items-center space-x-1">
                          <span className="text-xs font-medium text-gray-600">Sent to:</span>
                          {(query.markedForTeam === 'both' || query.sendTo?.includes('Sales') || query.markedForTeam === 'sales') && (
                            <span className="inline-flex items-center px-2 py-1 text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200 rounded-full">
                              🏢 Sales
                            </span>
                          )}
                          {(query.markedForTeam === 'both' || query.sendTo?.includes('Credit') || query.markedForTeam === 'credit') && (
                            <span className="inline-flex items-center px-2 py-1 text-xs font-semibold bg-green-100 text-green-800 border border-green-200 rounded-full">
                              💳 Credit
                            </span>
                          )}
                          {!query.markedForTeam && !query.sendTo?.length && (
                            <span className="inline-flex items-center px-2 py-1 text-xs font-semibold bg-gray-100 text-gray-600 border border-gray-200 rounded-full">
                              📋 Operations
                            </span>
                          )}
                        </div>
              </div>
                    </div>
                    
                    {/* Query Details Section - Enhanced Bold and Responsive Style */}
                    <div className="mt-3 p-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg border-l-4 border-purple-600 shadow-md">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center">
                          <span className="text-white text-xs font-bold">Q</span>
                        </div>
                        <p className="text-purple-900 text-sm font-bold uppercase tracking-wider">Operations Query Details:</p>
                      </div>
                      <div className="bg-white p-3 rounded-md border border-purple-200 shadow-sm">
                        <p className="text-gray-900 font-bold text-base leading-relaxed">
                          {query.queryText || 'No query text available'}
                        </p>
                      </div>
                    </div>
                    
                    {/* Query Info Grid */}
                    <div className="mt-4 grid grid-cols-3 gap-4 text-xs">
                      <div className="text-gray-500">
                        <span className="font-medium text-gray-700">Submitted by:</span><br/>
                        <span className="text-gray-600">{query.submittedBy}</span>
                      </div>
                      <div className="text-gray-500">
                        <span className="font-medium text-gray-700">TAT:</span><br/>
                        <RealTimeTATDisplay submittedAt={query.submittedAt} />
                      </div>
                      <div className="text-gray-500">
                        <span className="font-medium text-gray-700">Date:</span><br/>
                        <span className="text-gray-600">{formatDate(query.submittedAt)}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Info section only - action buttons removed */}
                  <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-end">
                    <div className="text-xs text-gray-500">
                      Actions are now handled by Sales and Credit teams
                    </div>
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
          <div className="p-4 border-b border-gray-200 flex-shrink-0 flex items-center justify-between">
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
                <p className="text-sm text-gray-600">
                  Customer: {selectedQuery.customerName}
                  <span className="ml-2 text-xs">
                    {autoRefresh && '• Auto-updating messages'}
                  </span>
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {getConnectionStatusIcon()}
            </div>
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
                placeholder="Type your message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                className="flex-1 px-4 py-2 bg-white border-2 border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black font-bold"
                style={{ color: '#000000', backgroundColor: '#ffffff', fontWeight: '700' }}
              />
              <button
                onClick={handleSendMessage}
                disabled={!newMessage.trim()}
                className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-full flex items-center disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <span className="hidden sm:inline">Send</span>
                <FaPaperPlane className="h-4 w-4 ml-0 sm:ml-2" />
              </button>
            </div>
          </div>
              </div>
      )}

    </div>
  );
}
