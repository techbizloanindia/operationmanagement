'use client';

import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Send,
  Edit3,
  Trash2,
  Save,
  X,
  Clock,
  User,
  RefreshCw
} from 'lucide-react';

interface Remark {
  id: string;
  text: string;
  author: string;
  authorRole: string;
  authorTeam: string;
  timestamp: string;
  editedAt?: string;
  isEdited?: boolean;
}

interface RemarksComponentProps {
  queryId: string;
  currentUser: {
    name: string;
    role: string;
    team: string;
  };
  onRemarksUpdate?: (remarks: Remark[]) => void;
}

export default function RemarksComponent({ 
  queryId, 
  currentUser, 
  onRemarksUpdate 
}: RemarksComponentProps) {
  const [remarks, setRemarks] = useState<Remark[]>([]);
  const [newRemarkText, setNewRemarkText] = useState('');
  const [editingRemarkId, setEditingRemarkId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch remarks on component mount and set up polling for real-time updates
  useEffect(() => {
    fetchRemarks();
    
    // Set up polling for real-time updates every 5 seconds
    const interval = setInterval(fetchRemarks, 5000);
    
    return () => clearInterval(interval);
  }, [queryId]);

  const fetchRemarks = async (showRefreshing = false) => {
    try {
      if (showRefreshing) setIsRefreshing(true);
      
      const response = await fetch(`/api/queries/${queryId}/remarks`);
      const result = await response.json();
      
      if (result.success) {
        setRemarks(result.data);
        if (onRemarksUpdate) {
          onRemarksUpdate(result.data);
        }
      }
    } catch (error) {
      console.error('Error fetching remarks:', error);
    } finally {
      setIsLoading(false);
      if (showRefreshing) setIsRefreshing(false);
    }
  };

  const handleAddRemark = async () => {
    if (!newRemarkText.trim()) return;
    
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/queries/${queryId}/remarks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: newRemarkText.trim(),
          author: currentUser.name,
          authorRole: currentUser.role,
          authorTeam: currentUser.team
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        setNewRemarkText('');
        fetchRemarks(); // Refresh remarks list
      } else {
        alert('Failed to add remark: ' + result.error);
      }
    } catch (error) {
      console.error('Error adding remark:', error);
      alert('Failed to add remark. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditRemark = (remark: Remark) => {
    setEditingRemarkId(remark.id);
    setEditingText(remark.text);
  };

  const handleSaveEdit = async () => {
    if (!editingText.trim() || !editingRemarkId) return;
    
    try {
      const response = await fetch(`/api/queries/${queryId}/remarks`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          remarkId: editingRemarkId,
          text: editingText.trim()
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        setEditingRemarkId(null);
        setEditingText('');
        fetchRemarks(); // Refresh remarks list
      } else {
        alert('Failed to update remark: ' + result.error);
      }
    } catch (error) {
      console.error('Error updating remark:', error);
      alert('Failed to update remark. Please try again.');
    }
  };

  const handleDeleteRemark = async (remarkId: string) => {
    if (!confirm('Are you sure you want to delete this remark?')) return;
    
    try {
      const response = await fetch(`/api/queries/${queryId}/remarks?remarkId=${remarkId}`, {
        method: 'DELETE',
      });

      const result = await response.json();
      
      if (result.success) {
        fetchRemarks(); // Refresh remarks list
      } else {
        alert('Failed to delete remark: ' + result.error);
      }
    } catch (error) {
      console.error('Error deleting remark:', error);
      alert('Failed to delete remark. Please try again.');
    }
  };

  const cancelEdit = () => {
    setEditingRemarkId(null);
    setEditingText('');
  };

  const getTeamColor = (team: string) => {
    switch (team.toLowerCase()) {
      case 'operations': return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'sales': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'credit': return 'bg-green-100 text-green-800 border-green-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return date.toLocaleDateString();
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-4 bg-gray-300 rounded w-1/4"></div>
        <div className="h-16 bg-gray-300 rounded"></div>
        <div className="h-16 bg-gray-300 rounded"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="text-lg font-semibold text-gray-900 flex items-center">
          <MessageSquare className="h-5 w-5 mr-2" />
          Remarks ({remarks.length})
        </h4>
        <button
          onClick={() => fetchRemarks(true)}
          disabled={isRefreshing}
          className="flex items-center px-3 py-1 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Add New Remark */}
      <div className="bg-gray-50 p-4 rounded-lg border">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Add New Remark
        </label>
        <div className="flex space-x-2">
          <textarea
            value={newRemarkText}
            onChange={(e) => setNewRemarkText(e.target.value)}
            placeholder="Type your remark here..."
            className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            rows={3}
          />
          <button
            onClick={handleAddRemark}
            disabled={!newRemarkText.trim() || isSubmitting}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            <Send className="h-4 w-4 mr-1" />
            {isSubmitting ? 'Sending...' : 'Send'}
          </button>
        </div>
      </div>

      {/* Remarks List */}
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {remarks.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <MessageSquare className="h-12 w-12 mx-auto mb-2 text-gray-400" />
            <p>No remarks yet. Be the first to add one!</p>
          </div>
        ) : (
          remarks.map((remark) => (
            <div key={remark.id} className="bg-white border border-gray-200 rounded-lg p-4">
              {/* Remark Header */}
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <div className="flex items-center">
                    <User className="h-4 w-4 text-gray-400 mr-1" />
                    <span className="font-medium text-gray-900">{remark.author}</span>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full border ${getTeamColor(remark.authorTeam)}`}>
                    {remark.authorTeam}
                  </span>
                  <span className="text-xs text-gray-500">{remark.authorRole}</span>
                </div>
                
                <div className="flex items-center space-x-1">
                  <div className="flex items-center text-xs text-gray-500">
                    <Clock className="h-3 w-3 mr-1" />
                    {formatTimeAgo(remark.timestamp)}
                    {remark.isEdited && (
                      <span className="ml-1 text-orange-600">(edited)</span>
                    )}
                  </div>
                  
                  {/* Edit/Delete buttons for author */}
                  {remark.author === currentUser.name && (
                    <div className="flex space-x-1">
                      <button
                        onClick={() => handleEditRemark(remark)}
                        className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                      >
                        <Edit3 className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => handleDeleteRemark(remark.id)}
                        className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Remark Content */}
              {editingRemarkId === remark.id ? (
                <div className="space-y-2">
                  <textarea
                    value={editingText}
                    onChange={(e) => setEditingText(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    rows={3}
                  />
                  <div className="flex space-x-2">
                    <button
                      onClick={handleSaveEdit}
                      className="flex items-center px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                    >
                      <Save className="h-3 w-3 mr-1" />
                      Save
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="flex items-center px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700"
                    >
                      <X className="h-3 w-3 mr-1" />
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-gray-800 whitespace-pre-wrap">{remark.text}</p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
