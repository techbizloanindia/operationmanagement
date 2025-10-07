'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { FaArrowLeft, FaUser, FaCalendarAlt, FaComments, FaCheck, FaPause, FaHandshake, FaSync, FaReply, FaHistory, FaBuilding, FaIdCard } from 'react-icons/fa';
import { useAuth } from '@/contexts/AuthContext';
import LoadingState from '@/components/operations/LoadingState';
import ErrorState from '@/components/operations/ErrorState';

interface QueryMessage {
  id: string;
  text: string;
  timestamp?: string;
  sender?: string;
  senderRole?: string;
}

interface Query {
  id: number;
  appNo: string;
  customerName: string;
  queries: QueryMessage[];
  sendTo: string[];
  submittedBy: string;
  submittedAt: string;
  status: 'pending' | 'approved' | 'deferred' | 'otc' | 'resolved';
  branch: string;
  branchCode: string;
  employeeId?: string;
  resolvedAt?: string;
  resolvedBy?: string;
}

interface ChatMessage {
  id: number;
  queryId: number;
  message: string;
  sender: string;
  senderRole: string;
  timestamp: string;
  isSystemMessage?: boolean;
}

interface QueryAction {
  id: number;
  queryId: number;
  action: 'approve' | 'deferral' | 'otc';
  assignedTo?: string;
  remarks?: string;
  operationTeamMember: string;
  actionDate: string;
  status: 'completed';
}

// Fetch application queries
const fetchApplicationQueries = async (appNo: string): Promise<Query[]> => {
  const response = await fetch(`/api/queries?appNo=${appNo}`);
  const result = await response.json();
  
  if (!response.ok || !result.success) {
    throw new Error(result.error || 'Failed to fetch application queries');
  }
  
  return result.data;
};

// Fetch chat messages for all queries in the application
const fetchAllChatMessages = async (queryIds: number[]): Promise<ChatMessage[]> => {
  if (!queryIds.length) return [];
  
  const messages: ChatMessage[] = [];
  
  // Fetch messages for each query
  await Promise.all(queryIds.map(async (queryId) => {
    try {
      const response = await fetch(`/api/query-actions?type=messages&queryId=${queryId}`);
      const result = await response.json();
      
      if (response.ok && result.success) {
        messages.push(...result.data);
      }
    } catch (error) {
      console.error(`Error fetching messages for query ${queryId}:`, error);
    }
  }));
  
  return messages;
};

// Fetch query actions for all queries in the application
const fetchAllQueryActions = async (queryIds: number[]): Promise<QueryAction[]> => {
  if (!queryIds.length) return [];
  
  const actions: QueryAction[] = [];
  
  // Fetch actions for each query
  await Promise.all(queryIds.map(async (queryId) => {
    try {
      const response = await fetch(`/api/query-actions?type=actions&queryId=${queryId}`);
      const result = await response.json();
      
      if (response.ok && result.success) {
        actions.push(...result.data);
      }
    } catch (error) {
      console.error(`Error fetching actions for query ${queryId}:`, error);
    }
  }));
  
  return actions;
};

export default function ApplicationQueryDetails() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const appNo = params.appNo as string;
  
  const [newMessage, setNewMessage] = useState('');
  const [selectedQueryId, setSelectedQueryId] = useState<number | null>(null);
  
  // Fetch application queries
  const { 
    data: queries, 
    isLoading: queriesLoading, 
    isError: queriesError,
    error: queriesErrorData,
    refetch: refetchQueries
  } = useQuery({
    queryKey: ['applicationQueries', appNo],
    queryFn: () => fetchApplicationQueries(appNo),
    enabled: !!appNo,
  });
  
  // Get all query IDs
  const queryIds = React.useMemo(() => {
    return queries?.map(query => query.id) || [];
  }, [queries]);
  
  // Fetch chat messages
  const { 
    data: chatMessages,
    isLoading: messagesLoading
  } = useQuery({
    queryKey: ['applicationChatMessages', appNo],
    queryFn: () => fetchAllChatMessages(queryIds),
    enabled: queryIds.length > 0,
  });
  
  // Fetch query actions with polling for real-time updates
  const { 
    data: queryActions,
    isLoading: actionsLoading
  } = useQuery({
    queryKey: ['applicationQueryActions', appNo],
    queryFn: () => fetchAllQueryActions(queryIds),
    enabled: queryIds.length > 0,
    refetchInterval: 5000, // Poll every 5 seconds for updates
  });
  
  // Get messages for a specific query
  const getMessagesForQuery = (queryId: number) => {
    return chatMessages?.filter(message => message.queryId === queryId) || [];
  };
  
  // Get actions for a specific query
  const getActionsForQuery = (queryId: number) => {
    return queryActions?.filter(action => action.queryId === queryId) || [];
  };
  
  // Format date time
  const formatDateTime = (dateString: string) => {
    try {
      if (!dateString) return 'No date';
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid date';
      
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        hour12: true
      });
    } catch (e) {
      return 'Invalid date';
    }
  };
  
  // Send message mutation
  const handleSendMessage = async () => {
    if (!selectedQueryId || !newMessage.trim() || !user) return;
    
    try {
      const response = await fetch('/api/query-actions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'message',
          queryId: selectedQueryId,
          message: newMessage,
          sender: user.name,
          senderRole: user.role || 'operations'
        }),
      });
      
      const result = await response.json();
      
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to send message');
      }
      
      // Invalidate and refetch chat messages to update UI in real-time
      queryClient.invalidateQueries({ queryKey: ['applicationChatMessages', appNo] });
      setNewMessage('');
      
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again.');
    }
  };
  
  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'deferred':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'otc':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };
  
  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <FaCheck className="mr-1 text-green-600" />;
      case 'deferred':
        return <FaPause className="mr-1 text-yellow-600" />;
      case 'otc':
        return <FaHandshake className="mr-1 text-purple-600" />;
      default:
        return null;
    }
  };
  
  // Loading state
  if (queriesLoading) {
    return <LoadingState message={`Loading queries for application ${appNo}...`} />;
  }
  
  // Error state
  if (queriesError) {
    return <ErrorState message={queriesErrorData?.message || 'Failed to load application queries'} onRetry={refetchQueries} />;
  }
  
  // No queries found
  if (!queries || queries.length === 0) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-6">
          <button 
            onClick={() => router.back()}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-800"
          >
            <FaArrowLeft />
            <span>Back to Dashboard</span>
          </button>
        </div>
        
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="text-6xl mb-4 text-gray-300">🔍</div>
          <h2 className="text-2xl font-bold text-gray-700 mb-2">No Queries Found</h2>
          <p className="text-gray-600 mb-6">
            No queries were found for application number {appNo}.
          </p>
          <button 
            onClick={() => router.back()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }
  
  // Get the first query for application details
  const firstQuery = queries[0];
  
  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header with Back Button */}
      <div className="mb-6">
        <button 
          onClick={() => router.back()}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-800"
        >
          <FaArrowLeft />
          <span>Back to Dashboard</span>
        </button>
      </div>
      
      {/* Application Details Card */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden mb-8">
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center gap-4 mb-4">
            <div className="bg-blue-100 text-blue-700 p-3 rounded-lg">
              <FaIdCard className="text-2xl" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Application: {appNo}
              </h1>
              <p className="text-lg text-gray-700">{firstQuery.customerName}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div className="flex items-center gap-2 text-gray-600">
              <FaBuilding className="text-blue-600" />
              <span>Branch: {firstQuery.branch} ({firstQuery.branchCode})</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <FaUser className="text-blue-600" />
              <span>Submitted by: {firstQuery.submittedBy}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <FaCalendarAlt className="text-blue-600" />
              <span>Date: {formatDateTime(firstQuery.submittedAt)}</span>
            </div>
          </div>
        </div>
        
        <div className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <FaHistory className="text-blue-600" />
            Complete Query History
          </h2>
          
          <div className="space-y-8">
            {queries.map((query) => {
              const messages = getMessagesForQuery(query.id);
              const actions = getActionsForQuery(query.id);
              const isResolved = query.status === 'approved' || query.status === 'deferred' || query.status === 'otc';
              
              return (
                <div key={query.id} className="border border-gray-200 rounded-lg overflow-hidden">
                  {/* Query Header */}
                  <div className={`p-4 ${isResolved ? 'bg-green-50' : 'bg-blue-50'}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium flex items-center ${getStatusColor(query.status)}`}>
                          {getStatusIcon(query.status)}
                          {query.status.charAt(0).toUpperCase() + query.status.slice(1)}
                        </span>
                        <span className="text-gray-700">
                          {isResolved ? 'Resolved' : 'Pending'} Query
                        </span>
                      </div>
                      <div className="text-sm text-gray-600">
                        ID: {query.id}
                      </div>
                    </div>
                  </div>
                  
                  {/* Original Queries */}
                  <div className="p-4 border-b border-gray-200">
                    <h3 className="font-medium text-gray-900 mb-3">Original Queries:</h3>
                    <div className="space-y-3">
                      {query.queries.map((q, index) => (
                        <div key={index} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-700">Query #{index + 1}</span>
                          </div>
                          <p className="text-gray-800">{q.text}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Chat Messages */}
                  <div className="p-4 border-b border-gray-200">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-medium text-gray-900 flex items-center gap-2">
                        <FaComments className="text-blue-600" />
                        Chat History
                      </h3>
                      {messages.length > 0 && (
                        <span className="text-sm text-gray-600">
                          {messages.length} message{messages.length !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                    
                    {messages.length === 0 ? (
                      <div className="text-center py-6 bg-gray-50 rounded-lg">
                        <FaComments className="text-gray-400 text-3xl mx-auto mb-2" />
                        <p className="text-gray-600">No messages yet</p>
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-80 overflow-y-auto p-2">
                        {messages.map((message) => (
                          <div 
                            key={message.id}
                            className={`p-3 rounded-lg ${
                              message.isSystemMessage 
                                ? 'bg-gray-100 border border-gray-200' 
                                : message.senderRole === user?.role
                                  ? 'bg-blue-50 border-l-4 border-blue-500 ml-8'
                                  : 'bg-gray-50 border border-gray-200 mr-8'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-gray-900">{message.sender}</span>
                                <span className={`text-xs px-2 py-0.5 rounded-full ${
                                  message.senderRole === 'Sales' ? 'bg-blue-100 text-blue-800' :
                                  message.senderRole === 'Credit' ? 'bg-green-100 text-green-800' :
                                  'bg-purple-100 text-purple-800'
                                }`}>
                                  {message.senderRole}
                                </span>
                              </div>
                              <span className="text-xs text-gray-500">
                                {formatDateTime(message.timestamp)}
                              </span>
                            </div>
                            <p className="text-gray-800">{message.message}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {/* Resolution Details */}
                  {isResolved && actions.length > 0 && (
                    <div className="p-4 border-b border-gray-200">
                      <h3 className="font-medium text-gray-900 mb-3">Resolution:</h3>
                      {actions.map((action) => (
                        <div 
                          key={action.id}
                          className={`p-4 rounded-lg ${
                            action.action === 'approve' ? 'bg-green-50 border-l-4 border-green-500' :
                            action.action === 'deferral' ? 'bg-yellow-50 border-l-4 border-yellow-500' : 
                            'bg-purple-50 border-l-4 border-purple-500'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium flex items-center gap-2">
                              {action.action === 'approve' ? <FaCheck className="text-green-600" /> :
                               action.action === 'deferral' ? <FaPause className="text-yellow-600" /> :
                               <FaHandshake className="text-purple-600" />}
                              {action.action === 'approve' ? 'Approved' :
                               action.action === 'deferral' ? `Deferred to ${action.assignedTo}` :
                               `OTC assigned to ${action.assignedTo}`}
                            </span>
                            <span className="text-xs text-gray-500 flex items-center gap-1">
                              <FaCalendarAlt />
                              {formatDateTime(action.actionDate)}
                            </span>
                          </div>
                          {action.remarks && (
                            <div className="mt-2 bg-white p-3 rounded-lg border border-gray-200">
                              <div className="text-xs text-gray-500 mb-1">Remarks:</div>
                              <p className="text-gray-700">{action.remarks}</p>
                            </div>
                          )}
                          <div className="mt-3 text-sm text-gray-600 flex items-center gap-1">
                            <FaUser className="text-xs" />
                            by {action.operationTeamMember}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Send Message (only for pending queries) */}
                  {!isResolved && user && (
                    <div className="p-4 bg-gray-50">
                      <h3 className="font-medium text-gray-900 mb-3">Reply to Query:</h3>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={selectedQueryId === query.id ? newMessage : ''}
                          onChange={(e) => {
                            setSelectedQueryId(query.id);
                            setNewMessage(e.target.value);
                          }}
                          onClick={() => setSelectedQueryId(query.id)}
                          placeholder="Type your message here..."
                          className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <button
                          onClick={handleSendMessage}
                          disabled={selectedQueryId !== query.id || !newMessage.trim()}
                          className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                            selectedQueryId !== query.id || !newMessage.trim()
                              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                              : 'bg-blue-600 text-white hover:bg-blue-700'
                          } transition-colors`}
                        >
                          <FaReply />
                          Send
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}