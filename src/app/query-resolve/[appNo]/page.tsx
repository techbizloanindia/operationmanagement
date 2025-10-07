'use client';

import React, { useState, useEffect } from 'react';
import { FaArrowLeft, FaCheck, FaUndo, FaPaperPlane, FaEye, FaUser, FaClock, FaCalendarAlt } from 'react-icons/fa';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ChatMessage, TeamType } from '@/types/shared';

// Create a client for this page
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60000, // 1 minute
      refetchOnWindowFocus: true,
      retry: 1,
    },
  },
});

interface Query {
  id: string;
  title: string;
  tat: string;
  team?: TeamType;
  messages: ChatMessage[];
  markedForTeam?: TeamType;
  allowMessaging?: boolean;
  priority?: 'high' | 'medium' | 'low';
  status: 'pending' | 'resolved' | 'in_progress';
  customerName?: string;
  caseId?: string;
  createdAt?: string;
  appNo: string;
}

const QueryResolvePageContent = () => {
  const router = useRouter();
  const params = useParams();
  const appNo = params.appNo as string;
  const [responseText, setResponseText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeQueryId, setActiveQueryId] = useState<string | null>(null);
  const queryClientInstance = useQueryClient();

  // Get user role from auth context
  const { user } = useAuth();
  const userRole = user?.role || 'sales';

  const handleBack = () => {
    router.back();
  };

  // Fetch queries for this application
  const { data: queries, isLoading, error } = useQuery({
    queryKey: ['applicationQueries', appNo, userRole],
    queryFn: async () => {
      const response = await fetch(`/api/applications/${appNo}/queries?team=${userRole}`);
      if (!response.ok) {
        throw new Error('Failed to fetch queries');
      }
      return response.json();
    },
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Submit response mutation
  const submitResponseMutation = useMutation({
    mutationFn: async (response: { queryId: string; responseText: string }) => {
      const res = await fetch('/api/query-responses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...response,
          appNo,
          team: userRole.charAt(0).toUpperCase() + userRole.slice(1),
          respondedBy: user?.name || userRole,
        }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit response');
      }
      
      return data;
    },
    onSuccess: (data) => {
      setResponseText('');
      setIsSubmitting(false);
      setActiveQueryId(null);
      // Invalidate and refetch queries
      queryClientInstance.invalidateQueries({ queryKey: ['applicationQueries', appNo] });
      queryClientInstance.invalidateQueries({ queryKey: ['salesQueries'] });
      queryClientInstance.invalidateQueries({ queryKey: ['creditQueries'] });
      alert(data.message || 'Response submitted successfully!');
    },
    onError: (error: Error) => {
      console.error('Error submitting response:', error);
      alert(`Error: ${error.message}`);
    }
  });

  const handleSubmitResponse = (queryId: string) => {
    if (!responseText.trim()) {
      alert('Please enter a response');
      return;
    }

    setIsSubmitting(true);
    setActiveQueryId(queryId);
    submitResponseMutation.mutate({
      queryId,
      responseText: responseText.trim(),
    });
  };

  const formatDateTime = (dateString: string) => {
    try {
      if (!dateString) return 'No date';
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid date';
      
      return date.toLocaleString('en-IN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch (e) {
      return 'Invalid date';
    }
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-orange-100 text-orange-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading queries...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-red-500">Error loading queries: {(error as Error).message}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-6xl mx-auto flex items-center gap-4">
          <button 
            onClick={handleBack}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            <FaArrowLeft />
            Back
          </button>
          <div className="h-6 w-px bg-gray-300"></div>
          <h1 className="text-xl font-semibold text-gray-900">
            Queries for Application {appNo}
          </h1>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* App Info */}
        {queries?.data && queries.data.length > 0 && (
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <h2 className="text-lg font-semibold text-blue-900">
                  Application: {appNo}
                </h2>
                <span className="text-blue-700">
                  Customer: {queries.data[0].customerName}
                </span>
                <span className="text-blue-600 text-sm">
                  {queries.data.length} quer{queries.data.length === 1 ? 'y' : 'ies'} found
                </span>
              </div>
              <div className="text-sm text-blue-600">
                Team: {userRole.charAt(0).toUpperCase() + userRole.slice(1)}
              </div>
            </div>
          </div>
        )}
        
        <div className="space-y-6">
          {queries?.data?.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
              <div className="text-gray-400 mb-4">
                <FaEye className="mx-auto h-12 w-12" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No Queries Found
              </h3>
              <p className="text-gray-600">
                There are no queries available for application {appNo} at this time.
              </p>
              <button
                onClick={handleBack}
                className="mt-4 inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <FaArrowLeft className="mr-2" />
                Go Back
              </button>
            </div>
          ) : (
            queries?.data?.map((query: Query) => (
            <div key={query.id} className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-6 space-y-4">
                {/* Query Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-medium text-gray-900">{query.title}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(query.priority)}`}>
                      {query.priority ? query.priority.charAt(0).toUpperCase() + query.priority.slice(1) : 'Medium'}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(query.status)}`}>
                      {query.status.charAt(0).toUpperCase() + query.status.slice(1)}
                    </span>
                  </div>
                </div>

                {/* Query Details */}
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <FaClock className="text-xs" />
                    <span className="font-medium">TAT:</span>
                    <span>{query.tat}</span>
                  </div>
                  {query.createdAt && (
                    <div className="flex items-center gap-1">
                      <FaCalendarAlt className="text-xs" />
                      <span>{formatDateTime(query.createdAt)}</span>
                    </div>
                  )}
                </div>

                {/* Messages */}
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">Messages</h4>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {query.messages.map((message, index) => (
                      <div
                        key={index}
                        className={`p-4 rounded-lg ${
                          message.isSent 
                            ? 'bg-blue-50 border-l-4 border-blue-500 ml-8' 
                            : 'bg-gray-50 border-l-4 border-gray-300 mr-8'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <FaUser className="text-xs text-gray-500" />
                            <span className="text-sm font-medium text-gray-700">{message.sender}</span>
                          </div>
                          <span className="text-xs text-gray-500">{formatDateTime(message.timestamp)}</span>
                        </div>
                        <p className="text-sm text-gray-900">{message.text}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Response Section */}
                {query.status === 'pending' && (
                  <div className="border-t pt-4 mt-4">
                    {query.allowMessaging ? (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-gray-900">Your Response</h4>
                          <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full font-medium">
                            ✓ Authorized to Reply
                          </span>
                        </div>
                        <textarea
                          value={responseText}
                          onChange={(e) => setResponseText(e.target.value)}
                          placeholder={`Type your ${userRole} team response here...`}
                          className="w-full p-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-black bg-white font-bold"
                          rows={4}
                          disabled={isSubmitting && activeQueryId === query.id}
                          style={{ color: '#000000', backgroundColor: '#ffffff', fontWeight: '700' }}
                        />
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-gray-500">
                            Query marked for: {query.markedForTeam} team
                          </span>
                          <button
                            onClick={() => handleSubmitResponse(query.id)}
                            disabled={(isSubmitting && activeQueryId === query.id) || !responseText.trim()}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            {isSubmitting && activeQueryId === query.id ? (
                              <>
                                <FaCheck className="animate-spin" />
                                Submitting...
                              </>
                            ) : (
                              <>
                                <FaPaperPlane />
                                Send Response
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                          <h4 className="font-medium text-gray-700">Response Not Allowed</h4>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">
                          This query is marked for {query.markedForTeam} team only. 
                          You can view the query but cannot respond to it.
                        </p>
                        <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                          Your team: {userRole} | Marked for: {query.markedForTeam}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            ))
          )}
        </div>
        
        {/* Back Button */}
        {queries?.data && queries.data.length > 0 && (
          <div className="mt-8 text-center">
            <button
              onClick={handleBack}
              className="inline-flex items-center px-6 py-3 border border-gray-300 shadow-sm text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
            >
              <FaArrowLeft className="mr-2" />
              Back to Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// Main wrapper component with QueryClient
const QueryResolvePage = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <QueryResolvePageContent />
    </QueryClientProvider>
  );
};

export default QueryResolvePage; 