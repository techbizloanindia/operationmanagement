'use client';

import React from 'react';

interface Remark {
  id: number;
  user: string;
  team: string;
  content: string;
  timestamp: string;
}

interface QueryItemProps {
  id: number;
  title: string;
  status: 'pending' | 'approved' | 'deferred' | 'otc' | 'resolved';
  tat?: string;
  raisedDate: string;
  resolvedDate?: string;
  remarks: Remark[];
  isResolved?: boolean;
  deferralOptions?: string[];
}

interface DeferralOption {
  id: string;
  name: string;
  reason: string;
  description: string;
}

const deferralOptions: DeferralOption[] = [
  {
    id: 'documentation',
    name: 'Additional Documentation',
    reason: 'Incomplete documentation',
    description: 'Customer needs to provide additional documents'
  },
  {
    id: 'verification',
    name: 'Verification Pending',
    reason: 'Third-party verification required',
    description: 'Waiting for external verification or confirmation'
  },
  {
    id: 'approval',
    name: 'Management Approval',
    reason: 'Higher authority approval needed',
    description: 'Case requires management or senior team approval'
  },
  {
    id: 'technical_issue',
    name: 'Technical Issue',
    reason: 'System or technical problem',
    description: 'Technical difficulties preventing case resolution'
  },
  {
    id: 'customer_response',
    name: 'Customer Response',
    reason: 'Waiting for customer response',
    description: 'Customer input or clarification required'
  },
  {
    id: 'policy_review',
    name: 'Policy Review',
    reason: 'Policy clarification needed',
    description: 'Internal policy review or interpretation required'
  },
  {
    id: 'legal_review',
    name: 'Legal Review',
    reason: 'Legal department review required',
    description: 'Case needs legal compliance check or review'
  }
];

export default function QueryItem({ 
  id, 
  title, 
  status = 'pending', 
  tat, 
  raisedDate, 
  resolvedDate, 
  remarks, 
  isResolved = false,
  deferralOptions = []
}: QueryItemProps) {
  // Format the timestamp to a more readable format
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return `${date.toLocaleDateString('en-IN', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric' 
    })} ${date.toLocaleTimeString('en-IN', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    })}`;
  };

  // Determine team color
  const getTeamColor = (team: string) => {
    if (team.includes('Sales')) return 'bg-blue-50 text-blue-700 border-blue-200';
    if (team.includes('Credit')) return 'bg-green-50 text-green-700 border-green-200';
    if (team.includes('OPS')) return 'bg-purple-50 text-purple-700 border-purple-200';
    return 'bg-gray-50 text-gray-700 border-gray-200';
  };

  const getStatusColor = () => {
    switch (status) {
      case 'resolved':
        return 'bg-green-200 text-green-900 border border-green-400';
      case 'deferred':
        return 'bg-orange-200 text-orange-900 border border-orange-400';
      case 'approved':
        return 'bg-green-200 text-green-900 border border-green-400';
      case 'otc':
        return 'bg-blue-200 text-blue-900 border border-blue-400';
      case 'pending':
        return 'bg-yellow-200 text-yellow-900 border border-yellow-400';
      default:
        return 'bg-blue-200 text-blue-900 border border-blue-400';
    }
  };

  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
        <div className="flex items-center gap-3">
          <h3 className="font-semibold text-gray-900">{title}</h3>
          <span className={`text-sm font-bold px-3 py-1.5 rounded-full shadow-sm ${getStatusColor()}`}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </span>
        </div>
        <div className="text-sm text-gray-500">
          ID: {id}
        </div>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-3 text-sm">
        <div>
          <span className="font-medium text-gray-600">Raised:</span>
          <span className="ml-2 text-gray-800">{formatTimestamp(raisedDate)}</span>
        </div>
        {resolvedDate && (
          <div>
            <span className="font-medium text-gray-600">Resolved:</span>
            <span className="ml-2 text-gray-800">{formatTimestamp(resolvedDate)}</span>
          </div>
        )}
        {tat && (
          <div>
            <span className="font-medium text-gray-600">TAT:</span>
            <span className="ml-2 text-gray-800">{tat}</span>
          </div>
        )}
      </div>

      {remarks && remarks.length > 0 && (
        <div className="mt-4">
          <h4 className="font-medium text-gray-700 mb-2">Remarks:</h4>
          <div className="space-y-2">
            {remarks.map((remark) => (
              <div key={remark.id} className="bg-gray-50 p-3 rounded border-l-4 border-gray-300">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-gray-800">{remark.user}</span>
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${getTeamColor(remark.team)}`}>
                    {remark.team}
                  </span>
                  <span className="text-xs text-gray-500">{formatTimestamp(remark.timestamp)}</span>
                </div>
                <p className="text-gray-700">{remark.content}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 

