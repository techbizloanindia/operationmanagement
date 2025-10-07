'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Send,
  Phone,
  Video,
  MoreHorizontal,
  Paperclip,
  Smile,
  ArrowDown,
  Check,
  CheckCheck,
  User,
  MessageSquare,
  Edit3
} from 'lucide-react';

interface RemarkMessage {
  id: string;
  queryId: string;
  remark: string;
  sender: string;
  senderRole: string;
  timestamp: string;
  team?: string;
  status?: 'sending' | 'sent' | 'delivered' | 'read';
}

interface ModernRemarksInterfaceProps {
  isOpen: boolean;
  onClose: () => void;
  queryId: string;
  queryTitle: string;
  customerName: string;
  currentUser: {
    name: string;
    role: string;
    team: string;
    avatar?: string;
  };
}

export default function ModernRemarksInterface({
  isOpen,
  onClose,
  queryId,
  queryTitle,
  customerName,
  currentUser
}: ModernRemarksInterfaceProps) {
  const [remarks, setRemarks] = useState<RemarkMessage[]>([]);
  const [newRemark, setNewRemark] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const remarksEndRef = useRef<HTMLDivElement>(null);
  const remarksContainerRef = useRef<HTMLDivElement>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-scroll to bottom
  const scrollToBottom = (smooth = true) => {
    remarksEndRef.current?.scrollIntoView({ 
      behavior: smooth ? 'smooth' : 'auto',
      block: 'end'
    });
  };

  // Handle scroll to detect if user scrolled up
  const handleScroll = () => {
    if (remarksContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = remarksContainerRef.current;
      const isAtBottom = scrollHeight - scrollTop <= clientHeight + 100;
      setShowScrollButton(!isAtBottom);
    }
  };

  useEffect(() => {
    if (isOpen && queryId) {
      fetchRemarks();
      startPolling();
      scrollToBottom(false);
    } else {
      stopPolling();
    }

    return () => {
      stopPolling();
    };
  }, [isOpen, queryId]);

  useEffect(() => {
    scrollToBottom();
  }, [remarks]);

  const fetchRemarks = async () => {
    try {
      console.log(`🔍 ModernRemarksInterface: Fetching remarks for queryId: ${queryId}`);
      const response = await fetch(`/api/queries/${queryId}/remarks`);
      const result = await response.json();
      
      console.log(`📨 ModernRemarksInterface: API response:`, result);
      
      if (result.success) {
        // Transform API response to component format
        const transformedRemarks = (result.data || []).map((remark: any) => {
          console.log(`✅ ModernRemarksInterface: Transforming remark:`, remark);
          return {
            id: remark.id || `remark-${Date.now()}-${Math.random()}`,
            queryId: queryId,
            remark: remark.text || remark.remark,
            sender: remark.author || remark.sender,
            senderRole: remark.authorRole || remark.senderRole,
            timestamp: remark.timestamp,
            team: remark.authorTeam || remark.team || remark.senderRole,
            status: 'delivered' as const
          };
        });
        
        console.log(`🎯 ModernRemarksInterface: Setting ${transformedRemarks.length} remarks`);
        setRemarks(transformedRemarks);
      } else {
        console.error('❌ ModernRemarksInterface: API returned error:', result.error);
      }
    } catch (error) {
      console.error('❌ ModernRemarksInterface: Error fetching remarks:', error);
    }
  };


  const startPolling = () => {
    pollingIntervalRef.current = setInterval(() => {
      fetchRemarks();
    }, 5000); // Poll every 5 seconds
  };

  const stopPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  };

  const sendRemark = async () => {
    if (!newRemark.trim() || isSending) return;

    const messageText = newRemark.trim();
    setIsSending(true);

    const tempRemark: RemarkMessage = {
      id: `temp-${Date.now()}`,
      queryId,
      remark: messageText,
      sender: currentUser.name,
      senderRole: currentUser.role,
      timestamp: new Date().toISOString(),
      team: currentUser.team,
      status: 'sending'
    };

    setRemarks(prev => [...prev, tempRemark]);
    setNewRemark('');

    try {
      console.log(`📤 ${currentUser.team} team sending message:`, {
        queryId,
        message: messageText,
        team: currentUser.team,
        sender: currentUser.name
      });

      const response = await fetch(`/api/queries/${queryId}/remarks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: messageText,
          author: currentUser.name,
          authorRole: currentUser.role,
          authorTeam: currentUser.team,
          broadcast: true // Ensure operations dashboard gets notified
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        console.log(`✅ Message sent successfully by ${currentUser.team} team`);
        
        // Update remark status to delivered
        const sentRemark = {
          ...tempRemark,
          id: result.data.id,
          status: 'delivered' as const
        };
        
        setRemarks(prev => prev.map(remark => 
          remark.id === tempRemark.id ? sentRemark : remark
        ));

        // Show success message
        setShowSuccessMessage(true);
        setTimeout(() => {
          setShowSuccessMessage(false);
        }, 3000);

        console.log(`🎯 Message broadcasted to Operations Dashboard from ${currentUser.team} team`);
        
      } else {
        throw new Error(result.error || 'Failed to send remark');
      }
    } catch (error) {
      console.error(`❌ Error sending message from ${currentUser.team} team:`, error);
      // Remove temp message on error
      setRemarks(prev => prev.filter(remark => remark.id !== tempRemark.id));
      alert('Failed to send message. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendRemark();
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'sending':
        return <div className="w-3 h-3 bg-gray-400 rounded-full animate-pulse" />;
      case 'sent':
        return <Check className="w-3 h-3 text-gray-400" />;
      case 'delivered':
        return <CheckCheck className="w-3 h-3 text-gray-400" />;
      case 'read':
        return <CheckCheck className="w-3 h-3 text-blue-500" />;
      default:
        return null;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Glassmorphism backdrop */}
      <div 
        className="absolute inset-0 bg-gradient-to-br from-blue-400/20 via-purple-500/20 to-pink-500/20 backdrop-blur-md"
        onClick={onClose}
      />
      
      {/* Remarks container */}
      <div className="relative w-full max-w-lg h-[90vh] bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 overflow-hidden">
        {/* Remarks header */}
        <div className="bg-gradient-to-r from-indigo-500/90 to-purple-600/90 backdrop-blur-sm p-6 border-b border-white/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {/* Avatar */}
              <div className="relative">
                <div className="w-12 h-12 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg">
                  {customerName.charAt(0).toUpperCase()}
                </div>
                {isOnline && (
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white shadow-sm" />
                )}
              </div>
              
              {/* User info */}
              <div className="text-white">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  {customerName}
                </h3>
                <p className="text-indigo-100 text-sm">{queryTitle}</p>
                <p className="text-indigo-200 text-xs">
                  {isOnline ? 'Query Remarks' : 'Remarks History'}
                </p>
              </div>
            </div>
            
            {/* Action buttons */}
            <div className="flex items-center space-x-2">
              <button className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors">
                <Edit3 className="w-5 h-5 text-white" />
              </button>
              <button className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors">
                <MoreHorizontal className="w-5 h-5 text-white" />
              </button>
              <button 
                onClick={onClose}
                className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>
        </div>

        {/* Remarks container */}
        <div className="flex-1 flex flex-col h-full">
          <div 
            ref={remarksContainerRef}
            className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth"
            onScroll={handleScroll}
            style={{ height: 'calc(100vh - 200px)' }}
          >
            {remarks.map((remark, index) => {
              const isCurrentUser = remark.sender === currentUser.name;
              const showAvatar = !isCurrentUser && (!remarks[index - 1] || remarks[index - 1].sender !== remark.sender);
              
              return (
                <div
                  key={remark.id}
                  className={`flex items-end space-x-2 animate-fadeIn ${
                    isCurrentUser ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {/* Avatar for received remarks */}
                  {!isCurrentUser && (
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full ${showAvatar ? 'visible' : 'invisible'}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold shadow-md ${
                        remark.senderRole === 'sales' 
                          ? 'bg-gradient-to-br from-green-400 to-emerald-500'
                          : remark.senderRole === 'credit' 
                          ? 'bg-gradient-to-br from-blue-400 to-indigo-500'
                          : remark.senderRole === 'operations'
                          ? 'bg-gradient-to-br from-purple-400 to-pink-500'
                          : 'bg-gradient-to-br from-gray-400 to-gray-500'
                      }`}>
                        {remark.sender.charAt(0).toUpperCase()}
                      </div>
                    </div>
                  )}
                  
                  {/* Remark bubble */}
                  <div className={`max-w-xs lg:max-w-md ${isCurrentUser ? 'order-1' : 'order-2'}`}>
                    <div
                      className={`px-4 py-3 rounded-2xl shadow-lg ${
                        isCurrentUser
                          ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-br-md'
                          : 'bg-white/80 text-gray-800 rounded-bl-md backdrop-blur-sm border border-white/20'
                      }`}
                    >
                      {!isCurrentUser && (
                        <p className="text-xs font-medium mb-1 text-gray-600">
                          {remark.sender} • {remark.senderRole} • {remark.team || remark.senderRole}
                        </p>
                      )}
                      <p className="text-sm whitespace-pre-wrap">{remark.remark}</p>
                      
                      {/* Time and status */}
                      <div className={`flex items-center justify-end mt-1 space-x-1 ${
                        isCurrentUser ? 'text-indigo-100' : 'text-gray-500'
                      }`}>
                        <span className="text-xs">{formatTime(remark.timestamp)}</span>
                        {isCurrentUser && getStatusIcon(remark.status)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            
            <div ref={remarksEndRef} />
          </div>

          {/* Scroll to bottom button */}
          {showScrollButton && (
            <button
              onClick={() => scrollToBottom()}
              className="absolute bottom-20 right-6 p-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-full shadow-lg transition-all duration-200 z-10"
            >
              <ArrowDown className="w-4 h-4" />
            </button>
          )}

          {/* Input area */}
          <div className="p-4 bg-white/50 backdrop-blur-sm border-t border-white/20">
            <div className="flex items-end space-x-3">
              <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors">
                <Paperclip className="w-5 h-5" />
              </button>
              
              <div className="flex-1 relative">
                <textarea
                  value={newRemark}
                  onChange={(e) => setNewRemark(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Add a remark..."
                  className="w-full px-4 py-3 bg-white/80 backdrop-blur-sm border border-white/30 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent resize-none max-h-32 text-gray-800 placeholder-gray-500"
                  rows={1}
                  style={{ minHeight: '48px' }}
                />
              </div>
              
              <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors">
                <Smile className="w-5 h-5" />
              </button>
              
              <button
                onClick={sendRemark}
                disabled={!newRemark.trim() || isSending}
                className="p-3 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 disabled:from-gray-300 disabled:to-gray-400 text-white rounded-full transition-all duration-200 shadow-lg disabled:cursor-not-allowed"
              >
                {isSending ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>
            </div>
            
            {/* Success message */}
            {showSuccessMessage && (
              <div className="mt-3 p-3 bg-green-100 border border-green-200 rounded-lg animate-fadeIn">
                <div className="flex items-center">
                  <CheckCheck className="w-4 h-4 text-green-600 mr-2" />
                  <span className="text-sm text-green-800 font-medium">
                    Message sent successfully to Operations Dashboard!
                  </span>
                </div>
              </div>
            )}

            <p className="text-xs text-gray-500 mt-2 text-center">
              Press Enter to send • Shift + Enter for new line
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Add custom animations to global CSS
const styles = `
  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .animate-fadeIn {
    animation: fadeIn 0.3s ease-out;
  }
`;

// Inject styles if not already present
if (typeof document !== 'undefined' && !document.getElementById('modern-remarks-styles')) {
  const styleSheet = document.createElement('style');
  styleSheet.id = 'modern-remarks-styles';
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
}