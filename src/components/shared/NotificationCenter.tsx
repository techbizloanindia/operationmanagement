'use client';

import React, { useState, useEffect } from 'react';
import {
  Bell,
  X,
  MessageSquare,
  CheckCircle,
  AlertCircle,
  Clock,
  User,
  Building2,
  ChevronDown,
  Eye,
  EyeOff
} from 'lucide-react';
import { queryUpdateService } from '@/lib/queryUpdateService';

interface Notification {
  id: string;
  type: 'message' | 'reply' | 'query_update' | 'system';
  title: string;
  message: string;
  from: string;
  fromTeam: 'operations' | 'sales' | 'credit';
  queryId?: string;
  appNo?: string;
  timestamp: string;
  isRead: boolean;
  priority: 'low' | 'medium' | 'high';
}

interface NotificationCenterProps {
  team: 'operations' | 'sales' | 'credit';
  className?: string;
}

export default function NotificationCenter({ team, className = '' }: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread' | 'messages' | 'replies'>('all');

  useEffect(() => {
    // Load initial notifications from localStorage
    loadNotifications();

    // Subscribe to real-time updates
    const unsubscribe = queryUpdateService.subscribe(team, (update) => {
      handleNewUpdate(update);
    });

    // Subscribe to all teams to catch cross-team notifications
    const unsubscribeOperations = queryUpdateService.subscribe('operations', (update) => {
      if (team !== 'operations' && (update.markedForTeam === team || update.markedForTeam === 'both' || update.broadcast)) {
        handleNewUpdate(update);
      }
    });
    
    const unsubscribeSales = queryUpdateService.subscribe('sales', (update) => {
      if (team !== 'sales' && (update.markedForTeam === team || update.markedForTeam === 'both' || update.broadcast)) {
        handleNewUpdate(update);
      }
    });
    
    const unsubscribeCredit = queryUpdateService.subscribe('credit', (update) => {
      if (team !== 'credit' && (update.markedForTeam === team || update.markedForTeam === 'both' || update.broadcast)) {
        handleNewUpdate(update);
      }
    });

    return () => {
      unsubscribe();
      unsubscribeOperations();
      unsubscribeSales();
      unsubscribeCredit();
    };
  }, [team]);

  const loadNotifications = () => {
    try {
      const stored = localStorage.getItem(`notifications_${team}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        setNotifications(parsed || []);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  const saveNotifications = (notifs: Notification[]) => {
    try {
      localStorage.setItem(`notifications_${team}`, JSON.stringify(notifs));
    } catch (error) {
      console.error('Error saving notifications:', error);
    }
  };

  const handleNewUpdate = (update: any) => {
    let notificationType: 'message' | 'reply' | 'query_update' | 'system' = 'system';
    let title = '';
    let message = '';

    switch (update.action) {
      case 'message_added':
        notificationType = update.messageFrom === team ? 'reply' : 'message';
        title = `New ${notificationType} from ${update.messageFrom} team`;
        message = update.newMessage?.text || 'New message received';
        break;
      case 'created':
        notificationType = 'query_update';
        title = 'New Query Created';
        message = `New query created for ${update.appNo}`;
        break;
      case 'approved':
      case 'rejected':
      case 'resolved':
        notificationType = 'query_update';
        title = `Query ${update.action}`;
        message = `Query ${update.appNo} has been ${update.action}`;
        break;
      default:
        notificationType = 'system';
        title = 'System Update';
        message = `Query ${update.appNo} updated`;
    }

    const newNotification: Notification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      type: notificationType,
      title,
      message,
      from: update.messageFrom || update.team || 'System',
      fromTeam: (update.messageFrom || update.team || 'operations').toLowerCase() as any,
      queryId: update.id?.toString(),
      appNo: update.appNo,
      timestamp: new Date().toISOString(),
      isRead: false,
      priority: update.priority || 'medium'
    };

    setNotifications(prev => {
      const updated = [newNotification, ...prev].slice(0, 50); // Keep last 50
      saveNotifications(updated);
      return updated;
    });

    console.log(`🔔 New notification for ${team} team:`, newNotification);
  };

  const markAsRead = (notificationId: string) => {
    setNotifications(prev => {
      const updated = prev.map(n => 
        n.id === notificationId ? { ...n, isRead: true } : n
      );
      saveNotifications(updated);
      return updated;
    });
  };

  const markAllAsRead = () => {
    setNotifications(prev => {
      const updated = prev.map(n => ({ ...n, isRead: true }));
      saveNotifications(updated);
      return updated;
    });
  };

  const clearNotification = (notificationId: string) => {
    setNotifications(prev => {
      const updated = prev.filter(n => n.id !== notificationId);
      saveNotifications(updated);
      return updated;
    });
  };

  const clearAllNotifications = () => {
    setNotifications([]);
    saveNotifications([]);
  };

  const getFilteredNotifications = () => {
    switch (filter) {
      case 'unread':
        return notifications.filter(n => !n.isRead);
      case 'messages':
        return notifications.filter(n => n.type === 'message');
      case 'replies':
        return notifications.filter(n => n.type === 'reply');
      default:
        return notifications;
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;
  const filteredNotifications = getFilteredNotifications();

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'message':
        return <MessageSquare className="w-4 h-4 text-blue-600" />;
      case 'reply':
        return <MessageSquare className="w-4 h-4 text-green-600" />;
      case 'query_update':
        return <CheckCircle className="w-4 h-4 text-purple-600" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-600" />;
    }
  };

  const getTeamColor = (teamName: string) => {
    switch (teamName.toLowerCase()) {
      case 'sales':
        return 'text-blue-600';
      case 'credit':
        return 'text-green-600';
      case 'operations':
        return 'text-purple-600';
      default:
        return 'text-gray-600';
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now.getTime() - time.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  return (
    <div className={`relative ${className}`}>
      {/* Notification Bell */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-full transition-colors"
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Panel */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Panel */}
          <div className="absolute right-0 top-12 w-96 bg-white rounded-lg shadow-2xl border border-gray-200 z-50 max-h-[600px] flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-gray-900">
                  Notifications
                </h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 hover:bg-gray-100 rounded-full"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>
              
              {/* Filter Buttons */}
              <div className="flex gap-2 mb-3">
                {['all', 'unread', 'messages', 'replies'].map((filterType) => (
                  <button
                    key={filterType}
                    onClick={() => setFilter(filterType as any)}
                    className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                      filter === filterType
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {filterType.charAt(0).toUpperCase() + filterType.slice(1)}
                  </button>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={markAllAsRead}
                  className="px-3 py-1 text-xs text-blue-600 hover:text-blue-800"
                  disabled={unreadCount === 0}
                >
                  Mark all read
                </button>
                <button
                  onClick={clearAllNotifications}
                  className="px-3 py-1 text-xs text-red-600 hover:text-red-800"
                >
                  Clear all
                </button>
              </div>
            </div>

            {/* Notifications List */}
            <div className="flex-1 overflow-y-auto">
              {filteredNotifications.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Bell className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  <p>No notifications</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {filteredNotifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 hover:bg-gray-50 transition-colors ${
                        !notification.isRead ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Icon */}
                        <div className="flex-shrink-0 mt-1">
                          {getNotificationIcon(notification.type)}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900">
                                {notification.title}
                              </p>
                              <p className="text-sm text-gray-600 mt-1">
                                {notification.message}
                              </p>
                              <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                                <User className="w-3 h-3" />
                                <span className={getTeamColor(notification.fromTeam)}>
                                  {notification.from}
                                </span>
                                {notification.appNo && (
                                  <>
                                    <Building2 className="w-3 h-3" />
                                    <span>{notification.appNo}</span>
                                  </>
                                )}
                                <Clock className="w-3 h-3" />
                                <span>{formatTimeAgo(notification.timestamp)}</span>
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-1 ml-2">
                              {!notification.isRead && (
                                <button
                                  onClick={() => markAsRead(notification.id)}
                                  className="p-1 hover:bg-gray-200 rounded"
                                  title="Mark as read"
                                >
                                  <Eye className="w-3 h-3 text-gray-400" />
                                </button>
                              )}
                              <button
                                onClick={() => clearNotification(notification.id)}
                                className="p-1 hover:bg-gray-200 rounded"
                                title="Remove notification"
                              >
                                <X className="w-3 h-3 text-gray-400" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}