'use client';

import React, { useRef, useEffect } from 'react';
import { FaUser, FaUserTie, FaClock, FaReply } from 'react-icons/fa';

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

interface ChatDisplayProps {
  messages: ChatMessage[];
  title?: string;
  showTimestamp?: boolean;
  className?: string;
}

export default function ChatDisplay({ 
  messages, 
  title = 'Query & Response',
  showTimestamp = true,
  className = ''
}: ChatDisplayProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Debug logging for ChatDisplay
  useEffect(() => {
    console.log(`🎨 ChatDisplay: Received ${messages.length} messages to display:`);
    messages.forEach((msg, index) => {
      console.log(`  ChatDisplay Message ${index + 1}: ${msg.sender} (${msg.senderRole}/${msg.team}) - "${(msg.message || msg.responseText || '').substring(0, 40)}..."`);
    });
  }, [messages]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
    // Query from Operations - Bold and prominent
    if (message.team === 'Operations' || message.senderRole === 'operations' || message.isQuery) {
      return {
        container: 'bg-gradient-to-r from-purple-50 to-indigo-50 border-l-4 border-purple-500',
        header: 'text-purple-900 font-bold',
        content: 'text-gray-900 font-bold text-lg',
        icon: '🔍',
        label: 'QUERY FROM OPERATIONS'
      };
    }
    
    // Reply from Sales
    if (message.team === 'Sales' || message.senderRole === 'sales') {
      return {
        container: 'bg-gradient-to-r from-blue-50 to-cyan-50 border-l-4 border-blue-500',
        header: 'text-blue-900 font-semibold',
        content: 'text-gray-800',
        icon: '💼',
        label: 'SALES RESPONSE'
      };
    }
    
    // Reply from Credit
    if (message.team === 'Credit' || message.senderRole === 'credit') {
      return {
        container: 'bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-green-500',
        header: 'text-green-900 font-semibold',
        content: 'text-gray-800',
        icon: '💳',
        label: 'CREDIT RESPONSE'
      };
    }
    
    // System message
    if (message.isSystemMessage) {
      return {
        container: 'bg-gray-100 border-l-4 border-gray-400',
        header: 'text-gray-700',
        content: 'text-gray-600 italic',
        icon: 'ℹ️',
        label: 'SYSTEM'
      };
    }
    
    // Default style
    return {
      container: 'bg-gray-50 border-l-4 border-gray-400',
      header: 'text-gray-700',
      content: 'text-gray-800',
      icon: '💬',
      label: 'MESSAGE'
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

  const groupedMessages = groupMessagesByDate(messages);

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Header */}
      {title && (
        <div className="px-4 py-3 bg-white border-b border-gray-200">
          <h3 className="text-lg font-bold text-gray-800">{title}</h3>
        </div>
      )}
      
      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto bg-gray-50 p-4">
        {messages.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No messages yet</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedMessages).map(([date, dateMessages]) => (
              <div key={date}>
                {/* Date Separator */}
                <div className="flex items-center justify-center mb-4">
                  <div className="flex-1 border-t border-gray-300"></div>
                  <span className="px-3 text-sm text-gray-500 font-medium bg-gray-50">
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
                        className={`${style.container} rounded-lg shadow-sm p-4 transition-all duration-200 hover:shadow-md`}
                      >
                        {/* Message Header */}
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xl">{style.icon}</span>
                            <div>
                              <span className={`text-xs uppercase tracking-wider ${style.header}`}>
                                {style.label}
                              </span>
                              {message.sender && (
                                <div className="flex items-center gap-2 mt-1">
                                  <FaUser className="text-gray-400 text-xs" />
                                  <span className="text-sm font-semibold text-gray-700">
                                    {message.sender}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                          {showTimestamp && (
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                              <FaClock className="text-gray-400" />
                              <span>{formatTime(message.timestamp)}</span>
                            </div>
                          )}
                        </div>
                        
                        {/* Message Content */}
                        <div className={`mt-3 ${style.content} whitespace-pre-wrap break-words`}>
                          {message.responseText || message.message}
                        </div>
                        
                        {/* Reply Indicator */}
                        {message.isReply && (
                          <div className="mt-2 flex items-center gap-1 text-xs text-gray-500">
                            <FaReply className="text-gray-400" />
                            <span>Reply to query</span>
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
    </div>
  );
}