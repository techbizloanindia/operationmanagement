'use client';

import React, { useState, useEffect, useRef } from 'react';
import { FaTimes, FaPaperPlane, FaUser, FaCalendarAlt, FaSpinner, FaExclamationCircle, FaCheckCircle, FaReply, FaClock, FaBuilding } from 'react-icons/fa';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import RevertMessageBox from './RevertMessageBox';

interface QueryReplyModalProps {
  queryId: string;
  appNo: string;
  customerName: string;
  isOpen: boolean;
  onClose: () => void;
  team: 'Sales' | 'Credit';
  markedForTeam?: string;
  allowMessaging?: boolean;
}

interface ChatMessage {
  id: string;
  queryId: string;
  message: string;
  sender: string;
  senderRole: string;
  timestamp: string;
  isRead: boolean;
  team?: string; // Added for new message type
  isSystemMessage?: boolean; // Added for new message type
}

interface QueryDetails {
  id: string;
  appNo: string;
  customerName: string;
  branch: string;
  queries: Array<{
    id: string;
    text: string;
    status: string;
  }>;
  submittedBy: string;
  submittedAt: string;
  status: string;
  sendTo: string[];
  markedForTeam: string;
  allowMessaging: boolean;
  priority: string;
}

export default function QueryReplyModal({
  queryId,
  appNo,
  customerName,
  isOpen,
  onClose,
  team,
  markedForTeam,
  allowMessaging = false
}: QueryReplyModalProps) {
  const [replyText, setReplyText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
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

  // Determine if current team can reply based on query details
  const canCurrentTeamReply = React.useMemo(() => {
    // Always allow replies for Sales, Credit, and Operations teams
    return true;
  }, [queryDetails, team, allowMessaging]);

  // Fetch chat messages
  const { data: chatMessages, isLoading: messagesLoading } = useQuery({
    queryKey: ['chatMessages', queryId],
    queryFn: async () => {
      const response = await fetch(`/api/query-actions?queryId=${queryId}&type=messages`);
      if (!response.ok) throw new Error('Failed to fetch messages');
      return response.json();
    },
    enabled: isOpen && !!queryId,
    refetchOnWindowFocus: false,
  });

  // Fetch application details
  const { data: applicationDetails } = useQuery({
    queryKey: ['applicationDetails', appNo],
    queryFn: async () => {
      const response = await fetch(`/api/applications/${appNo}`);
      if (!response.ok) throw new Error('Failed to fetch application details');
      return response.json();
    },
    enabled: isOpen && !!appNo,
  });

  // Submit reply mutation
  const submitReplyMutation = useMutation({
    mutationFn: async (reply: { message: string }) => {
      const response = await fetch('/api/query-responses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          queryId,
          appNo,
          responseText: reply.message,
          team,
          respondedBy: user?.name || `${team} Team Member`,
        }),
      });
      
      const data = await response.json();
      if (!response.ok) {
        // For authorization errors, we still want to show the error but not prevent viewing
        if (response.status === 403 && data.canView) {
          throw new Error(data.error || 'Not authorized to reply to this query');
        }
        throw new Error(data.error || 'Failed to submit reply');
      }
      return data;
    },
    onSuccess: (data) => {
      setReplyText('');
      setIsSubmitting(false);
      setAuthError(null); // Clear any previous errors
      setShowSuccess(true);
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['chatMessages', queryId] });
      queryClient.invalidateQueries({ queryKey: ['salesQueries'] });
      queryClient.invalidateQueries({ queryKey: ['creditQueries'] });
      queryClient.invalidateQueries({ queryKey: ['pendingQueries'] });
      
      // Hide success message after 3 seconds
      setTimeout(() => setShowSuccess(false), 3000);
      
      // Show success message
      console.log(`✅ Reply submitted successfully from ${team} team - will appear in Operations message box:`, data.message);
    },
    onError: (error: Error) => {
      setIsSubmitting(false);
      console.error('❌ Error submitting reply:', error);
      
      // Show user-friendly error message
      if (error.message.includes('not marked to respond')) {
        // This is an authorization error - the modal should stay open and show chat
        setAuthError(error.message);
        console.log('🔒 Reply not authorized but chat viewing is allowed');
      } else {
        // Other errors should be handled normally
        setAuthError(`Failed to send reply: ${error.message}`);
        console.error('💥 Unexpected error:', error);
      }
      
      // Clear error after 5 seconds
      setTimeout(() => setAuthError(null), 5000);
    }
  });

  const handleSubmitReply = () => {
    if (!replyText.trim() || isSubmitting) return;
    
    setIsSubmitting(true);
    submitReplyMutation.mutate({ message: replyText.trim() });
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (chatMessages?.data?.length > 0) {
      scrollToBottom();
    }
  }, [chatMessages]);

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

      if (diffMinutes < 1) return 'Just now';
      if (diffMinutes < 60) return `${diffMinutes}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      return `${diffDays}d ago`;
    } catch (e) {
      return 'Unknown time';
    }
  };

  const getSenderColor = (senderRole: string) => {
    switch (senderRole?.toLowerCase()) {
      case 'operations': return 'bg-purple-50 border-purple-200 text-purple-900';
      case 'sales': return 'bg-blue-50 border-blue-200 text-blue-900';
      case 'credit': return 'bg-green-50 border-green-200 text-green-900';
      default: return 'bg-gray-50 border-gray-200 text-gray-900';
    }
  };

  const getRoleIcon = (senderRole: string) => {
    switch (senderRole?.toLowerCase()) {
      case 'operations': return '⚙️';
      case 'sales': return '🏢';
      case 'credit': return '💳';
      default: return '👤';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
          <div className="flex items-center gap-4">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              team === 'Sales' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'
            }`}>
              {team === 'Sales' ? '🏢' : '💳'}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Reply to Query - {team} Team
              </h2>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <span className="flex items-center gap-1">
                  <FaBuilding className="text-xs" />
                  App.No: {appNo}
                </span>
                <span>Customer: {customerName}</span>
                <span className="flex items-center gap-1 text-green-600 font-medium">
                  <FaCheckCircle className="text-xs" />
                  Reply Authorized
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <FaTimes className="text-gray-500" />
          </button>
        </div>

        {/* Application Summary */}
        {applicationDetails?.data && (
          <div className="p-4 bg-blue-50 border-b border-blue-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="font-medium text-blue-800">Branch:</span>
                <span className="ml-2 text-blue-700">{applicationDetails.data.branchName}</span>
              </div>
              <div>
                <span className="font-medium text-blue-800">Status:</span>
                <span className="ml-2 text-blue-700 capitalize">{applicationDetails.data.status}</span>
              </div>
              <div>
                <span className="font-medium text-blue-800">Amount:</span>
                <span className="ml-2 text-blue-700">₹{applicationDetails.data.loanAmount}</span>
              </div>
            </div>
          </div>
        )}



        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messagesLoading || detailsLoading ? (
            <div className="flex items-center justify-center py-8">
              <FaSpinner className="animate-spin text-gray-400 mr-2" />
              <span className="text-gray-500">Loading chat history...</span>
            </div>
          ) : chatMessages?.data?.length > 0 ? (
            chatMessages.data.map((message: ChatMessage) => {
              // Check for revert messages first
              if ((message as any).actionType === 'revert') {
                const teamContext = message.senderRole?.toLowerCase() as 'sales' | 'credit' | 'operations' || 'operations';
                return (
                  <div key={message.id}>
                    <RevertMessageBox 
                      message={message as any} 
                      teamContext={teamContext} 
                    />
                  </div>
                );
              }
              
              // Determine message type based on team/sender role
              const messageType = (message.team === 'Credit' || message.team === 'credit') ? 'Credit Response' :
                                 (message.team === 'Sales' || message.team === 'sales') ? 'Sales Response' : 
                                 message.isSystemMessage ? 'System Message' : 'Operations';
              
              // Handle system messages differently
              if (message.isSystemMessage) {
                return (
                  <div key={message.id} className="flex justify-center">
                    <div className="bg-gray-100 text-gray-600 text-xs py-1 px-3 rounded-full">
                      {message.message}
                    </div>
                  </div>
                );
              }
              
              return (
              <div key={message.id} className={`p-4 rounded-lg border ${getSenderColor(message.senderRole)}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                        {getRoleIcon(message.senderRole)} {messageType}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <FaClock />
                    <span>{getTimeAgo(message.timestamp)}</span>
                    <span className="text-gray-400">•</span>
                    <span>{formatDateTime(message.timestamp)}</span>
                  </div>
                </div>
                <p className="text-gray-800">{message.message}</p>
              </div>
              );
            })
          ) : (
            <div className="text-center py-8 text-gray-500">
              <FaReply className="mx-auto text-3xl mb-2 text-gray-300" />
              <p>No messages yet. Be the first to reply!</p>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Authorization Error Display */}
        {authError && (
          <div className="mx-4 mb-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2">
              <FaExclamationCircle className="text-red-500 text-sm" />
              <p className="text-sm text-red-700">{authError}</p>
            </div>
          </div>
        )}

        {/* Reply Section */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              <span className="font-medium">Send Response as {team} Team</span>
            </div>
            <div className="flex gap-3">
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder={`Type your ${team} team response here...`}
                className="flex-1 p-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-black bg-white font-bold"
                rows={3}
                disabled={isSubmitting}
                style={{ color: '#000000', backgroundColor: '#ffffff', fontWeight: '700' }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmitReply();
                  }
                }}
              />
              <button
                onClick={handleSubmitReply}
                disabled={isSubmitting || !replyText.trim()}
                className={`px-6 py-3 rounded-lg font-medium flex items-center gap-2 transition-all ${
                  team === 'Sales' 
                    ? 'bg-blue-600 hover:bg-blue-700 text-white disabled:bg-blue-300' 
                    : 'bg-green-600 hover:bg-green-700 text-white disabled:bg-green-300'
                } disabled:cursor-not-allowed`}
              >
                {isSubmitting ? (
                  <>
                    <FaSpinner className="animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <FaPaperPlane />
                    Send Reply
                  </>
                )}
              </button>
            </div>
            
            {/* Success Message */}
            {showSuccess && (
              <div className="flex items-center gap-2 p-3 bg-green-100 border border-green-200 rounded-lg">
                <FaCheckCircle className="text-green-600" />
                <span className="text-sm text-green-800 font-medium">
                  ✅ Reply sent successfully! Your message is now visible in the Operations message box.
                </span>
              </div>
            )}
            
            {/* Error Message */}
            {authError && (
              <div className="flex items-center gap-2 p-3 bg-red-100 border border-red-200 rounded-lg">
                <FaExclamationCircle className="text-red-600" />
                <span className="text-sm text-red-800 font-medium">
                  {authError}
                </span>
              </div>
            )}
            
            <div className="text-xs text-gray-500">
              Press Enter to send, Shift+Enter for new line. Your response will be visible to Operations team in real-time.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 