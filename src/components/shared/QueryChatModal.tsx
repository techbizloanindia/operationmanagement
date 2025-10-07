'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FaTimes, FaComments, FaPaperPlane, FaCalendarAlt, FaHistory, FaInfoCircle } from 'react-icons/fa';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from './ToastNotification';
import RevertMessageBox from './RevertMessageBox';

interface Message {
  id: string;
  sender: string;
  senderRole: string;
  message: string;
  timestamp: string;
  respondedBy?: string;
  responseText?: string;
  team?: string;
  isSystemMessage?: boolean; // Added for system messages
}

interface QueryChatModalProps {
  queryId: string;
  appNo: string;
  customerName: string;
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  branch?: string;
  createdAt?: string;
  status?: string;
}

interface UserAvatarProps {
  role: string;
  className?: string;
}

// User avatar component based on role
const UserAvatar = ({ role, className = 'w-8 h-8' }: UserAvatarProps) => {
  const getColor = () => {
    switch (role?.toLowerCase()) {
      case 'sales': return 'bg-blue-100 text-blue-600';
      case 'credit': return 'bg-green-100 text-green-600';
      case 'operations': return 'bg-purple-100 text-purple-600';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  return (
    <div className={`${className} rounded-full flex items-center justify-center ${getColor()}`}>
      <span className="font-bold">
        {role ? role.charAt(0).toUpperCase() : '?'}
      </span>
    </div>
  );
};

// Format date helper function
const formatDateTime = (dateString: string) => {
  try {
    if (!dateString) return 'No date';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid date';
    
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  } catch (e) {
    return 'Invalid date';
  }
};

// Get time ago helper function
const getTimeAgo = (dateString: string) => {
  try {
    if (!dateString) return 'Unknown time';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Unknown time';
    
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMinutes < 60) {
      return `${diffMinutes}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else {
    return `${diffDays}d ago`;
    }
  } catch (e) {
    return 'Unknown time';
  }
};

export default function QueryChatModal({
  queryId,
  appNo,
  customerName,
  isOpen,
  onClose,
  title = 'Query Details',
  branch = 'Default Branch',
  createdAt,
  status = 'pending'
}: QueryChatModalProps) {
  const { showError, ToastContainer } = useToast();
  const [responseText, setResponseText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  // Fetch query details
  const { data: queryDetails, isLoading: detailsLoading } = useQuery({
    queryKey: ['queryDetails', queryId],
    queryFn: async () => {
      const response = await fetch(`/api/queries/${queryId}`);
      if (!response.ok) throw new Error('Failed to fetch query details');
      return response.json();
    },
    enabled: isOpen && !!queryId,
    refetchOnWindowFocus: false,
  });

  // Fetch complete chat messages history
  const { data: chatMessages, isLoading: messagesLoading } = useQuery({
    queryKey: ['chatMessages', queryId],
    queryFn: async () => {
      try {
        // Use the complete API endpoint without type filter to get all messages
        const response = await fetch(`/api/query-actions?queryId=${queryId}`);
        if (!response.ok) {
          console.error('Failed to fetch messages:', response.status, response.statusText);
          throw new Error('Failed to fetch messages');
        }
        const data = await response.json();
        
        // Process and combine both messages and actions to show a complete history
        const result = data.data;
        const messages = result?.messages || [];
        
        console.log(`💬 Fetched ${messages.length} messages for query ${queryId}`);
        
        // Sort by timestamp to ensure correct chronological order
        return {
          success: true,
          data: messages.sort((a: any, b: any) => {
            return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
          })
        };
      } catch (error) {
        console.error('Error fetching chat messages:', error);
        return {
          success: false,
          data: []
        };
      }
    },
    enabled: isOpen && !!queryId,
    refetchOnWindowFocus: true,
    refetchInterval: 5000, // Poll every 5 seconds for real-time updates
  });

  // Submit message mutation
  const submitMessageMutation = useMutation({
    mutationFn: async (message: string) => {
      const response = await fetch('/api/query-responses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          queryId,
          appNo,
          responseText: message,
          team: user?.role ? (user.role.charAt(0).toUpperCase() + user.role.slice(1)) : 'Operations',
          respondedBy: user?.name || 'Team Member',
          timestamp: new Date().toISOString()
        }),
      });
      
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to send message');
      }
      return data;
    },
    onSuccess: () => {
      setResponseText('');
      setIsSubmitting(false);
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['chatMessages', queryId] });
      queryClient.invalidateQueries({ queryKey: ['pendingQueries'] });
      queryClient.invalidateQueries({ queryKey: ['salesQueries'] });
      queryClient.invalidateQueries({ queryKey: ['creditQueries'] });
    },
    onError: (error: Error) => {
      console.error('Error sending message:', error);
      showError(`Error: ${error.message}`);
      setIsSubmitting(false);
    }
  });

  // Format timestamp
  const formatTimestamp = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleString('en-IN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch (e) {
      return 'Invalid date';
    }
  };

  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (!responseText.trim() || isSubmitting) return;
    
    setIsSubmitting(true);
    submitMessageMutation.mutate(responseText.trim());
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (chatMessages?.data?.length > 0) {
      scrollToBottom();
    }
  }, [chatMessages]);

  if (!isOpen) return null;

  const messages: Message[] = chatMessages?.data || [];
  const isLoading = detailsLoading || messagesLoading;
  
  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      case 'deferred': return 'bg-orange-100 text-orange-800';
      case 'otc': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Determine if current user can reply
  const canCurrentTeamReply = status?.toLowerCase() === 'pending';

  return (
    <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 ${isOpen ? '' : 'hidden'}`}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl h-[85vh] flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-gray-200 flex justify-between items-center bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-xl">
          <div>
            <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <FaHistory className="text-blue-600" />
              Complete Chat History - {title}
            </h3>
            <div className="flex items-center gap-2 mt-1 text-sm text-gray-600">
              <span className="font-medium">App No:</span> 
              <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-md">{appNo}</span>
              <span>•</span>
              <span>{customerName}</span>
              <span>•</span>
              <span>{branch}</span>
              {createdAt && (
                <>
                  <span>•</span>
              <span className="flex items-center gap-1">
                <FaCalendarAlt className="text-xs" />
                    {formatTimestamp(createdAt)}
              </span>
                </>
              )}
              {status && (
                <span className={`ml-2 px-2 py-0.5 rounded-md text-xs font-medium ${getStatusColor(status)}`}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
              </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 p-2 rounded-full transition-colors"
          >
            <FaTimes />
          </button>
        </div>

        {/* Query Details */}
        {queryDetails?.data && (
          <div className="p-5 border-b border-gray-200 bg-blue-50">
            <h4 className="font-medium text-blue-900 mb-3 flex items-center gap-2">
              <FaInfoCircle />
              Original Queries:
            </h4>
            <div className="space-y-3">
              {queryDetails.data.queries.map((query: any, index: number) => (
                <div key={index} className="bg-white p-4 rounded-lg border border-blue-200 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-blue-800">Query #{index + 1}</span>
                    <span className="text-xs text-gray-500">{formatTimestamp(query.timestamp || '')}</span>
                  </div>
                  <p className="text-gray-800">{query.text}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
          {detailsLoading || messagesLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
            </div>
          ) : chatMessages?.data?.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <FaComments className="text-4xl mb-2 text-gray-400" />
              <p>No messages yet. Start the conversation!</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-start">
                <UserAvatar role="operations" />
                <div className="ml-3 bg-white p-4 rounded-lg rounded-tl-none shadow-sm max-w-3xl">
                  <div className="flex items-center">
                    <span className="font-medium text-gray-900">Operations Team</span>
                    <span className="ml-2 text-xs text-gray-500">
                      {createdAt && formatTimestamp(createdAt)}
                    </span>
                  </div>
                  <p className="mt-1 text-gray-800">{title}</p>
                </div>
              </div>

              {/* Chat messages */}
              {chatMessages?.data?.map((msg: Message) => {
                // Check for revert messages first
                if ((msg as any).actionType === 'revert') {
                  const teamContext = msg.senderRole?.toLowerCase() as 'sales' | 'credit' | 'operations' || 'operations';
                  return (
                    <div key={msg.id}>
                      <RevertMessageBox 
                        message={msg as any} 
                        teamContext={teamContext} 
                      />
                    </div>
                  );
                }
                
                // Determine if the message is from the current user's team
                const isCurrentUserTeam = user?.role?.toLowerCase() === msg.senderRole?.toLowerCase();
                
                // Handle system messages differently
                if (msg.isSystemMessage) {
                  return (
                    <div key={msg.id} className="flex justify-center">
                      <div className="bg-gray-100 text-gray-600 text-xs py-1 px-3 rounded-full">
                        {msg.message}
                      </div>
                    </div>
                  );
                }
                
                // Determine message type based on team/sender role
                const messageType = msg.team === 'Credit' ? 'Credit Response' :
                                    msg.team === 'Sales' ? 'Sales Response' : 
                                    'Operations';
                
                // Get appropriate styling based on sender role
                const getBubbleStyle = () => {
                  switch (msg.senderRole?.toLowerCase()) {
                    case 'sales':
                      return isCurrentUserTeam 
                        ? 'bg-blue-500 text-white rounded-br-none' 
                        : 'bg-white rounded-tl-none';
                    case 'credit':
                      return isCurrentUserTeam 
                        ? 'bg-green-500 text-white rounded-br-none' 
                        : 'bg-white rounded-tl-none';
                    case 'operations':
                      return isCurrentUserTeam 
                        ? 'bg-purple-500 text-white rounded-br-none' 
                        : 'bg-white rounded-tl-none';
                    default:
                      return 'bg-gray-200 text-gray-800';
                  }
                };
                
                // Get text color based on sender role and whether it's the current user
                const getTextColor = () => {
                  if (isCurrentUserTeam) {
                    return 'text-white';
                  }
                  return 'text-gray-800';
                };
                
                // Get timestamp color
                const getTimestampColor = () => {
                  if (isCurrentUserTeam) {
                    switch (msg.senderRole?.toLowerCase()) {
                      case 'sales': return 'text-blue-200';
                      case 'credit': return 'text-green-200';
                      case 'operations': return 'text-purple-200';
                      default: return 'text-gray-300';
                    }
                  }
                  return 'text-gray-400';
                };
                
                return (
                  <div 
                    key={msg.id} 
                    className={`flex items-start ${isCurrentUserTeam ? 'justify-end' : ''}`}
                  >
                    {!isCurrentUserTeam && <UserAvatar role={msg.senderRole || msg.team || 'unknown'} />}
                    
                    <div className={`p-4 rounded-lg shadow-sm max-w-xs md:max-w-md ml-3 mr-3 ${getBubbleStyle()}`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className={`font-medium ${isCurrentUserTeam ? 'text-white' : 'text-gray-900'}`}>
                          {messageType}
                        </span>
                        <span className={`text-xs ml-2 ${getTimestampColor()}`}>
                          {msg.timestamp && formatTimestamp(msg.timestamp)}
                        </span>
                      </div>
                      <p className={`${getTextColor()}`}>
                        {msg.message || msg.responseText}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Message Input */}
        <div className="p-4 border-t border-gray-200 bg-white">
          <form onSubmit={handleSendMessage} className="flex items-center">
            <input
              type="text"
              value={responseText}
              onChange={(e) => setResponseText(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 border border-gray-300 rounded-l-full py-2 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isSubmitting}
            />
            <button 
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-r-full py-2 px-4 flex items-center transition-colors disabled:opacity-50"
              disabled={!responseText.trim() || isSubmitting}
            >
              {isSubmitting ? (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white"></div>
              ) : (
                <>
                  <span className="mr-1">Send</span>
                  <FaPaperPlane />
                </>
              )}
            </button>
          </form>
          </div>
      </div>
      <ToastContainer />
    </div>
  );
} 