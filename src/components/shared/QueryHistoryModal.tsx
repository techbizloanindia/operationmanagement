'use client';

import React from 'react';
import { FaTimes, FaClock, FaUser, FaComments, FaExchangeAlt, FaCheck, FaFlag, FaBuilding, FaIdCard } from 'react-icons/fa';
import { ResolvedQuery, QueryHistoryItem } from '@/types/shared';

interface QueryHistoryModalProps {
  query: ResolvedQuery | null;
  isOpen: boolean;
  onClose: () => void;
}

const QueryHistoryModal = ({ query, isOpen, onClose }: QueryHistoryModalProps) => {
  if (!isOpen || !query) return null;

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'created': return <FaFlag className="text-blue-500" />;
      case 'message_sent': return <FaComments className="text-green-500" />;
      case 'reverted': return <FaExchangeAlt className="text-orange-500" />;
      case 'resolved': return <FaCheck className="text-green-600" />;
      case 'marked_for_team': return <FaUser className="text-purple-500" />;
      default: return <FaClock className="text-gray-500" />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'created': return 'border-blue-200 bg-blue-50';
      case 'message_sent': return 'border-green-200 bg-green-50';
      case 'reverted': return 'border-orange-200 bg-orange-50';
      case 'resolved': return 'border-green-200 bg-green-50';
      case 'marked_for_team': return 'border-purple-200 bg-purple-50';
      default: return 'border-gray-200 bg-gray-50';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return {
      date: date.toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      }),
      time: date.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit'
      })
    };
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTeamColor = (team: string) => {
    switch (team) {
      case 'sales': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'credit': return 'bg-green-100 text-green-800 border-green-200';
      case 'both': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div 
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="inline-block w-full max-w-4xl p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-lg">
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-gray-200">
            <div className="flex-1">
              <h3 className="text-lg font-medium text-gray-900 pr-4">
                Query History
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Complete timeline for Query ID: {query.queryId}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <FaTimes />
            </button>
          </div>

          {/* Query Summary */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Query Title</label>
                  <p className="text-sm font-medium text-gray-900 mt-1">{query.title}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Case ID</label>
                    <div className="flex items-center gap-2 mt-1">
                      <FaIdCard className="text-gray-400 text-xs" />
                      <p className="text-sm text-gray-900">{query.caseId}</p>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Branch</label>
                    <div className="flex items-center gap-2 mt-1">
                      <FaBuilding className="text-gray-400 text-xs" />
                      <p className="text-sm text-gray-900">{query.branch}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</label>
                  <div className="flex items-center gap-2 mt-1">
                    <FaUser className="text-gray-400 text-xs" />
                    <p className="text-sm font-medium text-gray-900">{query.customerName}</p>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getPriorityColor(query.priority)}`}>
                    {query.priority.charAt(0).toUpperCase() + query.priority.slice(1)} Priority
                  </span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getTeamColor(query.team || 'sales')}`}>
                    {query.team === 'both' ? 'Sales & Credit' : (query.team ? query.team.charAt(0).toUpperCase() + query.team.slice(1) : 'Sales')}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="mt-6">
            <h4 className="text-sm font-medium text-gray-900 mb-4">Query Timeline</h4>
            
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {query.history.map((item, index) => {
                const { date, time } = formatTimestamp(item.timestamp);
                const isLast = index === query.history.length - 1;
                
                return (
                  <div key={item.id} className="relative">
                    {/* Timeline line */}
                    {!isLast && (
                      <div className="absolute left-4 top-8 bottom-0 w-0.5 bg-gray-200" />
                    )}
                    
                    <div className="flex gap-4">
                      {/* Icon */}
                      <div className={`flex-shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center ${getActionColor(item.action)}`}>
                        {getActionIcon(item.action)}
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">
                              {item.action.split('_').map(word => 
                                word.charAt(0).toUpperCase() + word.slice(1)
                              ).join(' ')}
                            </p>
                            <p className="text-sm text-gray-600 mt-1">
                              {item.details}
                            </p>
                            {item.additionalData && (
                              <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                                <pre className="text-xs text-gray-700 whitespace-pre-wrap">
                                  {typeof item.additionalData === 'string' 
                                    ? item.additionalData 
                                    : JSON.stringify(item.additionalData, null, 2)
                                  }
                                </pre>
                              </div>
                            )}
                          </div>
                          
                          <div className="flex-shrink-0 text-right">
                            <p className="text-xs font-medium text-gray-900">{time}</p>
                            <p className="text-xs text-gray-500">{date}</p>
                            <p className="text-xs text-gray-600 mt-1">by {item.actor}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Resolution Summary */}
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-start gap-3">
              <FaCheck className="text-green-600 mt-0.5" />
              <div className="flex-1">
                <h4 className="text-sm font-medium text-green-900">Query Resolved</h4>
                <p className="text-sm text-green-700 mt-1">
                  Resolved by {query.resolvedBy} on {formatTimestamp(query.resolvedAt).date} at {formatTimestamp(query.resolvedAt).time}
                </p>
                {query.resolutionReason && (
                  <div className="mt-2 p-3 bg-white border border-green-200 rounded">
                    <p className="text-xs font-medium text-gray-700 mb-1">Resolution Details:</p>
                    <p className="text-sm text-gray-900">{query.resolutionReason}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-6 pt-4 border-t border-gray-200 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QueryHistoryModal; 