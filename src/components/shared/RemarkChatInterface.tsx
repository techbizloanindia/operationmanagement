'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Send,
  MessageCircle,
  User,
  Clock,
  AlertCircle,
  Loader2,
  ArrowDown
} from 'lucide-react';

interface RemarkMessage {
  id: string;
  remarkId: string;
  message: string;
  sender: string;
  senderRole: string;
  timestamp: string;
  team?: string;
}

interface RemarkChatInterfaceProps {
  isOpen: boolean;
  onClose: () => void;
  queryId: string;
  remarkId: string;
  remarkHeadline: string;
  remarkText: string;
  customerName: string;
  appNo: string;
  currentUser: {
    name: string;
    role: string;
    team: string;
  };
}

export default function RemarkChatInterface({
  isOpen,
  onClose,
  queryId,
  remarkId,
  remarkHeadline,
  remarkText,
  customerName,
  appNo,
  currentUser
}: RemarkChatInterfaceProps) {
  const [messages, setMessages] = useState<RemarkMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-scroll to bottom
  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ 
      behavior: smooth ? 'smooth' : 'auto',
      block: 'end'
    });
  };

  // Handle scroll to detect if user scrolled up
  const handleScroll = () => {
    if (messagesContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
      const isAtBottom = scrollHeight - scrollTop <= clientHeight + 100;
      setShowScrollButton(!isAtBottom);
    }
  };

  useEffect(() => {
    if (isOpen && remarkId) {
      fetchMessages();
      startRealtimePolling();
      scrollToBottom(false);
    } else {
      stopRealtimePolling();
    }

    return () => {
      stopRealtimePolling();
    };
  }, [isOpen, remarkId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchMessages = async () => {
    if (!remarkId) {
      console.warn('No remarkId provided for fetching messages');
      return;
    }
    
    setIsLoading(true);
    try {
      const response = await fetch(`/api/remarks/${remarkId}/chat`);
      const result = await response.json();
      
      if (result.success) {
        setMessages(Array.isArray(result.data) ? result.data : []);
      } else {
        console.error('Failed to fetch remark messages:', result.error);
      }
    } catch (error) {
      console.error('Error fetching remark messages:', error);
      // Set empty array on error to prevent crashes
      setMessages([]);
    } finally {
      setIsLoading(false);
    }
  };

  const startRealtimePolling = () => {
    pollingIntervalRef.current = setInterval(() => {
      fetchMessages();
    }, 3000);
  };

  const stopRealtimePolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || isSending) return;
    
    if (!remarkId || !currentUser?.name) {
      console.error('Missing required data for sending message');
      alert('Unable to send message. Please try refreshing the page.');
      return;
    }

    const tempMessage: RemarkMessage = {
      id: `temp-${Date.now()}`,
      remarkId,
      message: newMessage.trim(),
      sender: currentUser.name,
      senderRole: currentUser.role || 'User',
      timestamp: new Date().toISOString(),
      team: currentUser.team || 'Unknown'
    };

    setMessages(prev => Array.isArray(prev) ? [...prev, tempMessage] : [tempMessage]);
    setNewMessage('');
    setIsSending(true);

    try {
      const response = await fetch(`/api/remarks/${remarkId}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: newMessage.trim(),
          sender: currentUser.name,
          senderRole: currentUser.role,
          team: currentUser.team,
          queryId
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        // Update message with server ID
        setMessages(prev => prev.map(msg => 
          msg.id === tempMessage.id 
            ? { ...msg, id: result.data.id }
            : msg
        ));
      } else {
        throw new Error(result.error || 'Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      // Remove failed message
      setMessages(prev => prev.filter(msg => msg.id !== tempMessage.id));
      alert('Failed to send message. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getTeamColor = (team: string) => {
    switch (team?.toLowerCase()) {
      case 'sales': return 'bg-blue-100 text-blue-800';
      case 'credit': return 'bg-green-100 text-green-800';
      case 'operations': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Chat container */}
      <div className="relative w-full max-w-2xl h-[80vh] bg-white rounded-2xl shadow-2xl border overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-4 text-white">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h3 className="font-semibold text-lg">Remark Discussion</h3>
              <p className="text-indigo-100 text-sm">
                App: {appNo} • Customer: {customerName}
              </p>
              <div className="mt-2 p-2 bg-white/10 rounded-lg">
                <p className="text-xs text-indigo-100 font-medium mb-1">Remark:</p>
                <p className="text-sm font-semibold">{remarkHeadline}</p>
                {remarkText !== remarkHeadline && (
                  <p className="text-xs text-indigo-200 mt-1">{remarkText}</p>
                )}
              </div>
            </div>
            
            <button 
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-full transition-colors ml-4"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Messages container */}
        <div className="flex-1 flex flex-col" style={{ height: 'calc(80vh - 200px)' }}>
          <div 
            ref={messagesContainerRef}
            className="flex-1 overflow-y-auto p-4 space-y-4"
            onScroll={handleScroll}
          >
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                <span className="ml-2 text-gray-500">Loading messages...</span>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <MessageCircle className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500">No messages yet</p>
                  <p className="text-sm text-gray-400">Start the discussion about this remark</p>
                </div>
              </div>
            ) : (
              messages.map((message, index) => {
                const isCurrentUser = message.sender === currentUser.name;
                const showAvatar = !isCurrentUser && (!messages[index - 1] || messages[index - 1].sender !== message.sender);
                
                return (
                  <div
                    key={message.id}
                    className={`flex items-end space-x-2 ${
                      isCurrentUser ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    {/* Avatar for received messages */}
                    {!isCurrentUser && (
                      <div className={`flex-shrink-0 w-8 h-8 rounded-full ${showAvatar ? 'visible' : 'invisible'}`}>
                        <div className="w-8 h-8 bg-gradient-to-br from-gray-400 to-gray-600 rounded-full flex items-center justify-center text-white text-xs font-semibold">
                          {message.sender.charAt(0).toUpperCase()}
                        </div>
                      </div>
                    )}
                    
                    {/* Message bubble */}
                    <div className={`max-w-xs lg:max-w-md ${isCurrentUser ? 'order-1' : 'order-2'}`}>
                      <div
                        className={`px-4 py-3 rounded-2xl shadow-sm ${
                          isCurrentUser
                            ? 'bg-indigo-500 text-white rounded-br-md'
                            : 'bg-gray-100 text-gray-800 rounded-bl-md'
                        }`}
                      >
                        {!isCurrentUser && (
                          <div className="flex items-center space-x-2 mb-1">
                            <p className="text-xs font-medium text-gray-600">
                              {message.sender}
                            </p>
                            <span className={`px-2 py-0.5 text-xs rounded-full ${getTeamColor(message.team || message.senderRole)}`}>
                              {message.team || message.senderRole}
                            </span>
                          </div>
                        )}
                        <p className="text-sm whitespace-pre-wrap">{message.message}</p>
                        
                        {/* Time */}
                        <div className={`flex items-center justify-end mt-1 ${
                          isCurrentUser ? 'text-indigo-100' : 'text-gray-500'
                        }`}>
                          <span className="text-xs">{formatTime(message.timestamp)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            
            <div ref={messagesEndRef} />
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
          <div className="p-4 bg-gray-50 border-t">
            <div className="flex items-end space-x-3">
              <div className="flex-1">
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your message about this remark..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none max-h-32 text-gray-800 placeholder-gray-500"
                  rows={1}
                  disabled={isSending}
                />
              </div>
              
              <button
                onClick={sendMessage}
                disabled={!newMessage.trim() || isSending}
                className="p-3 bg-indigo-500 hover:bg-indigo-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl transition-all duration-200 shadow-sm"
              >
                {isSending ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>
            </div>
            
            <p className="text-xs text-gray-500 mt-2 text-center">
              Press Enter to send • Shift + Enter for new line
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}