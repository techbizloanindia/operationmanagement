'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FaUser, FaUserTie, FaClock, FaReply, FaPaperPlane, FaBuilding, FaCreditCard, FaTools, FaComments, FaTimes } from 'react-icons/fa';

interface ChatMessage {
  id: string;
  message: string;
  sender: string;
  senderRole: string;
  team?: string;
  timestamp: string;
  isQuery?: boolean;
  isReply?: boolean;
  responseText?: string;
  isSystemMessage?: boolean;
  actionType?: string;
}

interface EnhancedQueryChatInterfaceProps {
  queryId: string;
  appNo: string;
  customerName: string;
  queryText: string;
  isOpen: boolean;
  onClose: () => void;
  currentUser: {
    name: string;
    role: string;
    team: string;
  };
  allowReply?: boolean;
  className?: string;
}

export default function EnhancedQueryChatInterface({
  queryId,
  appNo,
  customerName,
  queryText,
  isOpen,
  onClose,
  currentUser,
  allowReply = true,
  className = ''
}: EnhancedQueryChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadMessages = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/queries/${queryId}/chat`);
      const result = await response.json();
      
      if (result.success) {
        const chatMessages = result.data || [];
        
        // Sort messages chronologically
        chatMessages.sort((a: ChatMessage, b: ChatMessage) => 
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
        
        setMessages(chatMessages);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setIsLoading(false);
    }
  }, [queryId]);

  // Load messages when component opens
  useEffect(() => {
    if (isOpen && queryId) {
      loadMessages();
      // Set up polling for real-time updates
      const interval = setInterval(loadMessages, 5000);
      return () => clearInterval(interval);
    }
  }, [isOpen, queryId, loadMessages]);

  const sendMessage = async () => {
    if (!newMessage.trim() || isSending) return;

    try {
      setIsSending(true);
      const response = await fetch(`/api/queries/${queryId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: newMessage.trim(),
          sender: currentUser.name,
          senderRole: currentUser.role,
          team: currentUser.team
        }),
      });

      if (response.ok) {
        setNewMessage('');
        await loadMessages(); // Reload to get the new message
      } else {
        const errorData = await response.json();
        alert(`Failed to send message: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getMessageStyle = (message: ChatMessage) => {
    // Operations Query - Bold and prominent
    if (message.team === 'Operations' || message.senderRole === 'operations' || message.isQuery) {
      return {
        container: 'bg-gradient-to-r from-purple-100 to-indigo-100 border-l-4 border-purple-600 shadow-lg',
        header: 'text-purple-900 font-bold',
        content: 'text-gray-900 font-bold text-lg leading-relaxed',
        icon: <FaTools className="text-purple-600" />,
        label: 'OPERATIONS QUERY',
        badge: 'bg-purple-600 text-white'
      };
    }
    
    // Sales Reply
    if (message.team === 'Sales' || message.team === 'sales' || message.senderRole === 'sales') {
      return {
        container: 'bg-gradient-to-r from-blue-50 to-cyan-50 border-l-4 border-blue-500 shadow-md',
        header: 'text-blue-900 font-semibold',
        content: 'text-gray-800 font-medium',
        icon: <FaBuilding className="text-blue-600" />,
        label: 'SALES RESPONSE',
        badge: 'bg-blue-600 text-white'
      };
    }
    
    // Credit Reply
    if (message.team === 'Credit' || message.team === 'credit' || message.senderRole === 'credit') {
      return {
        container: 'bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-green-500 shadow-md',
        header: 'text-green-900 font-semibold',
        content: 'text-gray-800 font-medium',
        icon: <FaCreditCard className="text-green-600" />,
        label: 'CREDIT RESPONSE',
        badge: 'bg-green-600 text-white'
      };
    }
    
    // System message
    if (message.isSystemMessage) {
      return {
        container: 'bg-gray-100 border-l-4 border-gray-400',
        header: 'text-gray-700',
        content: 'text-gray-600 italic',
        icon: <FaComments className="text-gray-500" />,
        label: 'SYSTEM',
        badge: 'bg-gray-500 text-white'
      };
    }
    
    // Default style
    return {
      container: 'bg-gray-50 border-l-4 border-gray-400',
      header: 'text-gray-700',
      content: 'text-gray-800',
      icon: <FaUser className="text-gray-500" />,
      label: 'MESSAGE',
      badge: 'bg-gray-500 text-white'
    };
  };

  // Group messages by date
  const groupMessagesByDate = (messages: ChatMessage[]) => {
    const grouped: { [key: string]: ChatMessage[] } = {};
    
    messages.forEach(message => {
      const dateKey = formatDate(message.timestamp);
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(message);
    });
    
    return grouped;
  };

  if (!isOpen) return null;

  const groupedMessages = groupMessagesByDate(messages);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col ${className}`}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg">
              {customerName.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Query Chat - {appNo}
              </h2>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <span>Customer: {customerName}</span>
                <span className="flex items-center gap-1 text-green-600 font-medium">
                  <FaComments className="text-xs" />
                  Live Chat
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

        {/* Original Query Display - Always Bold and Prominent */}
        <div className="p-4 bg-gradient-to-r from-purple-100 to-indigo-100 border-b border-purple-200">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center text-white shadow-md">
              <FaTools />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="bg-purple-600 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                  OPERATIONS QUERY
                </span>
                <span className="text-xs text-purple-700 font-medium">
                  Original Query
                </span>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-sm border border-purple-200">
                <p className="text-gray-900 font-bold text-lg leading-relaxed">
                  {queryText}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto bg-gray-50 p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
              <span className="ml-3 text-gray-600">Loading chat history...</span>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FaComments className="mx-auto text-4xl mb-4 text-gray-300" />
              <p className="text-lg font-medium">No responses yet</p>
              <p className="text-sm">Responses from Sales and Credit teams will appear here</p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedMessages).map(([date, dateMessages]) => (
                <div key={date}>
                  {/* Date Separator */}
                  <div className="flex items-center justify-center mb-4">
                    <div className="flex-1 border-t border-gray-300"></div>
                    <span className="px-4 text-sm text-gray-500 font-medium bg-gray-50">
                      {date}
                    </span>
                    <div className="flex-1 border-t border-gray-300"></div>
                  </div>
                  
                  {/* Messages for this date */}
                  <div className="space-y-4">
                    {dateMessages.map((message) => {
                      const style = getMessageStyle(message);
                      
                      return (
                        <div
                          key={message.id}
                          className={`${style.container} rounded-lg p-4 transition-all duration-200 hover:shadow-lg transform hover:-translate-y-1`}
                        >
                          {/* Message Header */}
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full flex items-center justify-center">
                                {style.icon}
                              </div>
                              <div>
                                <span className={`text-xs uppercase tracking-wider font-bold ${style.header}`}>
                                  {style.label}
                                </span>
                                {message.sender && (
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="text-sm font-semibold text-gray-700">
                                      {message.sender}
                                    </span>
                                    <span className={`text-xs px-2 py-1 rounded-full ${style.badge}`}>
                                      {message.team || message.senderRole}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                              <FaClock className="text-gray-400" />
                              <span>{formatTime(message.timestamp)}</span>
                            </div>
                          </div>
                          
                          {/* Message Content */}
                          <div className={`${style.content} whitespace-pre-wrap break-words`}>
                            {message.responseText || message.message}
                          </div>
                          
                          {/* Reply Indicator */}
                          {message.isReply && (
                            <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
                              <FaReply className="text-gray-400" />
                              <span>Reply to Operations query</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {/* Auto-scroll anchor */}
          <div ref={messagesEndRef} />
        </div>

        {/* Reply Input - Only show if user can reply */}
        {allowReply && (
          <div className="p-4 border-t border-gray-200 bg-white">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <div className={`w-3 h-3 rounded-full ${
                  currentUser.team === 'sales' ? 'bg-blue-500' : 
                  currentUser.team === 'credit' ? 'bg-green-500' : 'bg-purple-500'
                }`}></div>
                <span className="font-medium">
                  Responding as {currentUser.team.charAt(0).toUpperCase() + currentUser.team.slice(1)} Team
                </span>
              </div>
              <div className="flex gap-3">
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder={`Type your ${currentUser.team} team response here...`}
                  className="flex-1 p-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none text-black bg-white font-bold"
                  rows={3}
                  disabled={isSending}
                  style={{ color: '#000000', backgroundColor: '#ffffff', fontWeight: '700' }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                />
                <button
                  onClick={sendMessage}
                  disabled={isSending || !newMessage.trim()}
                  className={`px-6 py-3 rounded-lg font-medium flex items-center gap-2 transition-all ${
                    currentUser.team === 'sales' 
                      ? 'bg-blue-600 hover:bg-blue-700 text-white disabled:bg-blue-300' 
                      : currentUser.team === 'credit'
                      ? 'bg-green-600 hover:bg-green-700 text-white disabled:bg-green-300'
                      : 'bg-purple-600 hover:bg-purple-700 text-white disabled:bg-purple-300'
                  } disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:-translate-y-1`}
                >
                  {isSending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Sending...
                    </>
                  ) : (
                    <>
                      <FaPaperPlane />
                      Send Response
                    </>
                  )}
                </button>
              </div>
              
              <div className="text-xs text-gray-500">
                Press Enter to send, Shift+Enter for new line. All messages remain visible and persist in the chat history.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}