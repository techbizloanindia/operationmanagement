'use client';

import React, { useState } from 'react';
import { FaSearch, FaEye, FaClock, FaUser, FaBuilding } from 'react-icons/fa';
import { ResolvedQuery } from '@/types/shared';

interface ResolvedQueriesTableProps {
  queries: ResolvedQuery[];
  onQueryClick: (query: ResolvedQuery) => void;
  isLoading?: boolean;
}

const ResolvedQueriesTable = ({ queries, onQueryClick, isLoading = false }: ResolvedQueriesTableProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'resolvedAt' | 'priority' | 'customerName'>('resolvedAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Filter queries based on search term
  const filteredQueries = queries.filter(query =>
    query.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    query.caseId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    query.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    query.branch.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Sort queries
  const sortedQueries = [...filteredQueries].sort((a, b) => {
    let comparison = 0;
    
    switch (sortBy) {
      case 'resolvedAt':
        comparison = new Date(a.resolvedAt).getTime() - new Date(b.resolvedAt).getTime();
        break;
      case 'priority':
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        comparison = priorityOrder[a.priority] - priorityOrder[b.priority];
        break;
      case 'customerName':
        comparison = a.customerName.localeCompare(b.customerName);
        break;
    }
    
    return sortOrder === 'desc' ? -comparison : comparison;
  });

  const handleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-300 rounded w-1/4"></div>
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-4 bg-gray-300 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-lg font-medium text-gray-900">Resolved Queries</h2>
            <p className="text-sm text-gray-500 mt-1">
              {sortedQueries.length} resolved queries found
            </p>
          </div>
          
          {/* Search */}
          <div className="relative max-w-sm w-full">
            <input
              type="text"
              placeholder="Search queries..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black font-bold bg-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ color: '#000000', backgroundColor: '#ffffff', fontWeight: '700' }}
            />
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm" />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Query Details
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('customerName')}
              >
                Customer & Case
                {sortBy === 'customerName' && (
                  <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('priority')}
              >
                Priority & Team
                {sortBy === 'priority' && (
                  <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('resolvedAt')}
              >
                Resolution Details
                {sortBy === 'resolvedAt' && (
                  <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedQueries.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                  <div className="flex flex-col items-center">
                    <FaSearch className="text-3xl text-gray-300 mb-2" />
                    <p className="text-lg font-medium">No resolved queries found</p>
                    <p className="text-sm">
                      {searchTerm ? 'Try adjusting your search criteria' : 'No queries have been resolved yet'}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              sortedQueries.map((query) => (
                <tr 
                  key={query.id}
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => onQueryClick(query)}
                >
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-gray-900 line-clamp-2">
                        {query.title}
                      </p>
                      <p className="text-xs text-gray-500">
                        Query ID: {query.queryId}
                      </p>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <FaUser className="text-gray-400 text-xs" />
                        <p className="text-sm font-medium text-gray-900">
                          {query.customerName}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <FaBuilding className="text-gray-400 text-xs" />
                        <p className="text-xs text-gray-500">
                          {query.caseId} • {query.branch}
                        </p>
                      </div>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getPriorityColor(query.priority)}`}>
                        {query.priority.charAt(0).toUpperCase() + query.priority.slice(1)}
                      </span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getTeamColor(query.team || 'sales')}`}>
                        {query.team === 'both' ? 'Sales & Credit' : (query.team ? query.team.charAt(0).toUpperCase() + query.team.slice(1) : 'Sales')}
                      </span>
                    </div>
                      {query.resolvedBy && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <FaUser className="text-xs" />
                          <span>Resolved by: {query.resolvedBy}</span>
                        </div>
                      )}
                      {query.resolvedAt && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <FaClock className="text-xs" />
                          <span>Resolved at: {formatDate(query.resolvedAt)}</span>
                        </div>
                      )}
                      {/* Resolution information - using resolutionReason if available */}
                      {query.resolutionReason && (
                        <div className="mt-2">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border-blue-200`}>
                            {query.resolutionReason}
                          </span>
                        </div>
                      )}
                    </div>
                  </td>
                  
                  <td className="px-6 py-4">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onQueryClick(query);
                      }}
                      className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <FaEye className="mr-2 text-gray-500" />
                      View Details
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ResolvedQueriesTable; 