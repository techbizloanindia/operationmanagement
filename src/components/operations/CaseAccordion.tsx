'use client';

import React, { useState, useEffect } from 'react';
import { FaChevronDown, FaChevronRight } from 'react-icons/fa';
import QueryItem from './QueryItem';

interface Query {
  id: number;
  title: string;
  status: 'pending' | 'resolved' | 'deferred' | 'approved' | 'otc';
  tat?: string;
  raisedDate: string;
  resolvedDate?: string;
  remarks: {
    id: number;
    user: string;
    team: string;
    content: string;
    timestamp: string;
  }[];
}

interface ApiQuery {
  id: string;
  appNo: string;
  title: string;
  tat: string;
  team: string;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'resolved' | 'approved' | 'deferred' | 'otc';
  customerName: string;
  caseId: string;
  createdAt: string;
  messages?: any[];
}

interface CaseAccordionProps {
  appNo: string;
  customerName: string;
  employeeId: string;
  status: string;
  statusBadgeColor: string;
  queries?: Query[];
  isResolved?: boolean;
  branch?: string;
  onRaiseQuery?: (appNo: string) => void;
}

export default function CaseAccordion({
  appNo,
  customerName,
  employeeId,
  status,
  statusBadgeColor,
  queries = [],
  isResolved = false,
  branch,
  onRaiseQuery
}: CaseAccordionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isQueriesExpanded, setIsQueriesExpanded] = useState(false);
  const [apiQueries, setApiQueries] = useState<ApiQuery[]>([]);
  const [loadingQueries, setLoadingQueries] = useState(false);

  const toggleAccordion = async () => {
    setIsOpen(!isOpen);
    
    // Fetch queries when opening the accordion
    if (!isOpen && apiQueries.length === 0) {
      await fetchQueries();
    }
  };

  const fetchQueries = async () => {
    setLoadingQueries(true);
    try {
      const response = await fetch(`/api/applications/${encodeURIComponent(appNo)}/queries`);
      const data = await response.json();
      
      if (data.success) {
        setApiQueries(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching queries:', error);
    } finally {
      setLoadingQueries(false);
    }
  };

  const getStatusDisplayName = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved': return 'Approved';
      case 'otc': return 'OTC';
      case 'deferred': return 'Deferral';
      case 'resolved': return 'Resolved';
      case 'pending': return 'Pending';
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved': return 'bg-green-200 text-green-900 border border-green-400';
      case 'otc': return 'bg-blue-200 text-blue-900 border border-blue-400';
      case 'deferred': return 'bg-orange-200 text-orange-900 border border-orange-400';
      case 'resolved': return 'bg-green-200 text-green-900 border border-green-400';
      case 'pending': return 'bg-orange-200 text-orange-900 border border-orange-400';
      default: return 'bg-gray-200 text-gray-900 border border-gray-400';
    }
  };

  const deferralOptions = [
    'Mr. Alok Sharma (Regional Manager)',
    'Mr. Sanjay Verma (Credit Head)',
    'Ms. Rina Patel (Zonal Head)',
  ];

  return (
    <div className="bg-white border border-gray-200 rounded-lg">
      <div className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
        <div 
          className="flex-1 flex items-center flex-wrap gap-x-4 cursor-pointer"
          onClick={toggleAccordion}
        >
          <span className="font-semibold text-gray-800">{appNo}</span>
          <span className="text-gray-600">{customerName}</span>
          {branch && (
            <span className="text-gray-500 text-sm">• {branch}</span>
          )}
          <span className="text-gray-500 text-sm">({employeeId})</span>
          <span className={`${statusBadgeColor} text-xs font-medium px-2.5 py-0.5 rounded-full`}>
            {status}
          </span>
          {apiQueries.length > 0 && (
            <span className="bg-blue-50 text-blue-700 text-xs font-medium px-2 py-1 rounded-full">
              {apiQueries.length} {apiQueries.length === 1 ? 'Query' : 'Queries'}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {onRaiseQuery && (
            <button
              onClick={() => onRaiseQuery(appNo)}
              className="px-3 py-1 text-xs font-medium text-white bg-cyan-600 hover:bg-cyan-700 rounded-md transition-colors"
            >
              📝 Raise Query
            </button>
          )}
          <button
            onClick={toggleAccordion}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <FaChevronDown className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>
      
      <div
        className="accordion-content"
        style={{ maxHeight: isOpen ? '2000px' : '0' }}
      >
        <div className="p-4 border-t border-gray-200">
          {loadingQueries ? (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-600">Loading queries...</span>
            </div>
          ) : (
            <>
              {/* Query Summary */}
              {apiQueries.length > 0 ? (
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-gray-800">
                      Query Summary ({apiQueries.length} {apiQueries.length === 1 ? 'query' : 'queries'} generated)
                    </h4>
                    <button
                      onClick={() => setIsQueriesExpanded(!isQueriesExpanded)}
                      className="flex items-center text-sm text-blue-600 hover:text-blue-800"
                    >
                      {isQueriesExpanded ? 'Hide Details' : 'View Details'}
                      <FaChevronRight className={`ml-1 transition-transform ${isQueriesExpanded ? 'rotate-90' : ''}`} />
                    </button>
                  </div>
                  
                  {/* Query List */}
                  <div className="space-y-2">
                    {apiQueries.map((query, index) => (
                      <div key={query.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <span className="font-medium text-gray-700">
                            Query {index + 1}
                          </span>
                          <span className="text-gray-600">–</span>
                          <span className="text-sm text-gray-600">{query.title}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`text-sm font-bold px-3 py-1.5 rounded-full shadow-sm ${getStatusColor(query.status)}`}>
                            {getStatusDisplayName(query.status)}
                          </span>
                          <span className="text-xs text-gray-500">
                            {query.team}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Detailed Query View */}
                  {isQueriesExpanded && (
                    <div className="mt-4 space-y-4 border-t pt-4">
                      {apiQueries.map((apiQuery) => {
                        // Convert API query to QueryItem format
                        const queryForItem: Query = {
                          id: parseInt(apiQuery.id),
                          title: apiQuery.title,
                          status: apiQuery.status,
                          tat: apiQuery.tat,
                          raisedDate: apiQuery.createdAt,
                          resolvedDate: apiQuery.status === 'resolved' ? new Date().toISOString() : undefined,
                          remarks: apiQuery.messages?.map((msg, idx) => ({
                            id: idx,
                            user: msg.sender || 'Unknown',
                            team: apiQuery.team,
                            content: msg.text || '',
                            timestamp: msg.timestamp || apiQuery.createdAt
                          })) || []
                        };

                        return (
                          <QueryItem
                            key={apiQuery.id}
                            id={queryForItem.id}
                            title={queryForItem.title}
                            status={queryForItem.status}
                            tat={queryForItem.tat}
                            raisedDate={queryForItem.raisedDate}
                            resolvedDate={queryForItem.resolvedDate}
                            remarks={queryForItem.remarks}
                            isResolved={isResolved}
                            deferralOptions={!isResolved ? deferralOptions : []}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-6 text-gray-500">
                  <p>No queries generated for this application yet.</p>
                  <p className="text-sm mt-1">Click "Raise Query" to create the first query.</p>
                </div>
              )}

              {/* Legacy queries support */}
              {queries.length > 0 && (
                <div className="space-y-4 mt-4 border-t pt-4">
                  <h4 className="font-medium text-gray-800">Additional Queries</h4>
                  {queries.map((query) => (
                    <QueryItem
                      key={query.id}
                      id={query.id}
                      title={query.title}
                      status={query.status}
                      tat={query.tat}
                      raisedDate={query.raisedDate}
                      resolvedDate={query.resolvedDate}
                      remarks={query.remarks}
                      isResolved={isResolved}
                      deferralOptions={!isResolved ? deferralOptions : []}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
} 