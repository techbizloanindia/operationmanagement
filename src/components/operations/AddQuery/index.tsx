'use client';

import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import SearchSection from './SearchSection';
import ApplicationDetails from './ApplicationDetails';
import QueryForm from './QueryForm';
import ConfirmationModal from './ConfirmationModal';
import QuerySuccessModal from './QuerySuccessModal';
import CustomQueryModal from './CustomQueryModal';
import EmptyState from '../EmptyState';

interface AddQueryProps {
  appNo?: string;
  onQuerySubmitted?: () => void;
}

interface ApplicationData {
  appNo: string;
  customerName: string;
  branchName: string;
  taskName?: string;
  appliedDate: string;
  loanNo?: string;
  loanAmount: string;
  customerEmail: string;
  login: string;
  salesExec: string;
  assetType?: string;
  sanctionedAmount: string;
  status: string;
  customerPhone: string;
  address: string;
  pincode: string;
  city: string;
  state: string;
  employeeId: string;
  loanType: string;
  lastUpdated: string;
  sanctionedDate?: string;
  tenure?: string;
  interestRate?: string;
  processingFee?: string;
  cibilScore?: number | string;
  monthlyIncome?: string;
  companyName?: string;
  designation?: string;
  workExperience?: string;
  priority?: string;
  documentStatus?: string;
  remarks?: string;
  loginFee?: string;
  uploadedBy?: string;
  uploadedAt?: string;
  appStatus?: string;
  assignedTo?: string;
  resolverName?: string;
  history?: any[];
  totalHistoryEntries?: number;
}

interface QueryItem {
  id: number;
  text: string;
  isCustom?: boolean;
  team?: 'Sales' | 'Credit' | 'Custom';
}

// Search for application
const searchApplication = async (appNo: string): Promise<ApplicationData | null> => {
  try {
    const response = await fetch(`/api/applications/${appNo}`);
    const result = await response.json();
    
    if (!response.ok || !result.success) {
      let errorMessage = result.error || 'Failed to find application';
      if (result.suggestion) {
        errorMessage += `\n\n💡 Suggestion: ${result.suggestion}`;
      }
      throw new Error(errorMessage);
    }
    
    return result.data;
  } catch (error) {
    console.error('Error searching for application:', error);
    return null;
  }
};

// Submit query with retry mechanism
const submitQuery = async (data: {
  appNo: string;
  queries: string[];
  sendTo: string;
}, retryCount = 0): Promise<any> => {
  const maxRetries = 2;
  const retryDelay = 2000; // 2 seconds

  try {
    if (typeof window === 'undefined') {
      throw new Error('Cannot submit query: Not in browser environment');
    }

    if (!data.appNo || !data.queries || data.queries.length === 0 || !data.sendTo) {
      throw new Error('Missing required fields: appNo, queries, or sendTo');
    }

    // Get current user from localStorage for authentication
    const currentUser = localStorage.getItem('currentUser');
    let userRole = 'guest';
    let userId = 'unknown';

    if (currentUser) {
      try {
        const user = JSON.parse(currentUser);
        userRole = user.role || 'guest';
        userId = user.employeeId || 'unknown';
      } catch (parseError) {
        console.error('Failed to parse current user:', parseError);
      }
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    try {
      const response = await fetch('/api/queries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': userRole,
          'x-user-id': userId,
        },
        body: JSON.stringify(data),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        let errorMessage = `HTTP Error: ${response.status} ${response.statusText}`;
        try {
          const result = await response.json();
          errorMessage = result.error || errorMessage;
        } catch (parseError) {
          console.warn('Failed to parse error response:', parseError);
        }

        // Retry on server errors (5xx) but not client errors (4xx)
        if (response.status >= 500 && retryCount < maxRetries) {
          console.log(`🔄 Retrying request (attempt ${retryCount + 1}/${maxRetries + 1}) after server error:`, errorMessage);
          await new Promise(resolve => setTimeout(resolve, retryDelay * (retryCount + 1)));
          return submitQuery(data, retryCount + 1);
        }

        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log('✅ Query submitted successfully:', result);
      return result;

    } catch (fetchError: any) {
      clearTimeout(timeoutId);

      // Retry on timeout or network errors
      if ((fetchError.name === 'AbortError' ||
           (fetchError instanceof TypeError && fetchError.message.includes('fetch'))) &&
          retryCount < maxRetries) {
        const errorType = fetchError.name === 'AbortError' ? 'timeout' : 'network error';
        console.log(`🔄 Retrying request (attempt ${retryCount + 1}/${maxRetries + 1}) after ${errorType}`);
        await new Promise(resolve => setTimeout(resolve, retryDelay * (retryCount + 1)));
        return submitQuery(data, retryCount + 1);
      }

      if (fetchError.name === 'AbortError') {
        throw new Error('Request timed out after multiple attempts. Please check your internet connection and try again.');
      }

      if (fetchError instanceof TypeError && fetchError.message.includes('fetch')) {
        throw new Error('Network error after multiple attempts. Please check your internet connection and try again.');
      }

      throw fetchError;
    }
  } catch (error: any) {
    console.error('Error submitting query:', error);
    const userMessage = error.message || 'Failed to submit query. Please try again.';
    throw new Error(userMessage);
  }
};

function AddQuery({ appNo = '', onQuerySubmitted }: AddQueryProps) {
  // Main state
  const [searchTerm, setSearchTerm] = useState(appNo);
  const [searchResult, setSearchResult] = useState<ApplicationData | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  // Query form state - default to Sales team only
  const [queries, setQueries] = useState<QueryItem[]>([{ id: 1, text: '' }]);
  const [sendTo, setSendTo] = useState<string[]>(['Sales']);

  // Modal state
  const [showConfirmationPopup, setShowConfirmationPopup] = useState(false);
  const [pendingSubmissionData, setPendingSubmissionData] = useState<{
    appNo: string;
    queries: string[];
    sendTo: string;
  } | null>(null);

  // Custom query modal state
  const [showCustomMessage, setShowCustomMessage] = useState(false);
  const [customQueryId, setCustomQueryId] = useState<number | null>(null);
  const [customQueryTeam, setCustomQueryTeam] = useState<'Sales' | 'Credit'>('Sales');
  
  // Success modal state
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successData, setSuccessData] = useState<{
    appNo: string;
    customerName: string;
    queries: string[];
    sentTo: string;
  } | null>(null);
  
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // React Query mutations
  const searchMutation = useMutation({
    mutationFn: searchApplication,
    onSuccess: (data) => {
      if (data) {
        setSearchResult(data);
        setSearchError(null);
      } else {
        setSearchError('Application not found. Please check the application number and try again.');        
        setSearchResult(null);
      }
      setIsSearching(false);
    },
    onError: (error: Error) => {
      setSearchError(error.message);
      setSearchResult(null);
      setIsSearching(false);
    }
  });

  const submitMutation = useMutation({
    mutationFn: (data: { appNo: string; queries: string[]; sendTo: string; }) => submitQuery(data),
    onSuccess: (data, variables) => {
      console.log('🎉 Submit mutation onSuccess called with data:', data);
      console.log('📊 Query details:', {
        appNo: searchResult?.appNo,
        teams: sendTo,
        queryCount: queries.filter(q => q.text.trim()).length
      });
      
      setSearchError(null);
      console.log('✅ Query submitted without showing success message');
      
      // Reset form only if submission was successful
      if (data && data.success) {
        setQueries([{ id: 1, text: '' }]);
        console.log('🔄 Form reset completed');
        
        // Log the created queries for debugging
        if (data.data && Array.isArray(data.data)) {
          console.log('📝 Created queries:', data.data.map((q: any) => ({
            id: q.id,
            appNo: q.appNo,
            markedForTeam: q.markedForTeam,
            sendToSales: q.sendToSales,
            sendToCredit: q.sendToCredit,
            status: q.status
          })));
        }
        
        // Invalidate all relevant query caches
        console.log('🔄 Invalidating query caches...');
        queryClient.invalidateQueries({ queryKey: ['pendingQueries'] });
        queryClient.invalidateQueries({ queryKey: ['resolvedQueries'] });
        queryClient.invalidateQueries({ queryKey: ['salesQueries'] });
        queryClient.invalidateQueries({ queryKey: ['creditQueries'] });
        queryClient.invalidateQueries({ queryKey: ['allQueries'] });
        
        // Force refetch with logging
        console.log('🔄 Force refetching queries...');
        queryClient.refetchQueries({ queryKey: ['pendingQueries'] }).then(() => {
          console.log('✅ Queries refetched successfully');
        }).catch((error) => {
          console.error('❌ Error refetching queries:', error);
        });
        console.log('🔄 Query caches invalidated and refetch initiated');
        
        // Broadcast updates
        if (typeof window !== 'undefined') {
          console.log('📡 Broadcasting query update events...');
          
          // Dispatch event for immediate UI updates
          window.dispatchEvent(new CustomEvent('queryAdded', {
            detail: {
              appNo: searchResult?.appNo,
              queriesCount: data.count || 1,
              sendTo: sendTo,
              teams: sendTo.join(', '),
              timestamp: new Date().toISOString()
            }
          }));
          
          // Store in localStorage for cross-tab sync
          localStorage.setItem('queryUpdate', JSON.stringify({
            type: 'added',
            appNo: searchResult?.appNo,
            count: data.count || 1,
            teams: sendTo.join(', '),
            timestamp: new Date().toISOString()
          }));
          
          setTimeout(() => localStorage.removeItem('queryUpdate'), 100);
          
          console.log('📡 Events broadcasted successfully');
        }
        
        // Show success modal with submitted data
        if (searchResult && variables) {
          setSuccessData({
            appNo: searchResult.appNo,
            customerName: searchResult.customerName,
            queries: variables.queries,
            sentTo: variables.sendTo
          });
          setShowSuccessModal(true);
        }
      } else {
        console.warn('⚠️ API response indicates failure:', data);
        setSearchError('Failed to submit queries: ' + (data?.message || 'Unknown error'));
      }
      
      console.log('🏁 Submit mutation onSuccess completed');
    },
    onError: (error) => {
      console.error('❌ Query submission failed:', error);
      setSearchError(`Error submitting queries: ${error.message}. Please try again.`);
    }
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanSearchTerm = searchTerm
      .trim()
      .replace(/\s+/g, ' ')
      .toUpperCase();
    
    if (!cleanSearchTerm) return;
    
    setIsSearching(true);
    searchMutation.mutate(cleanSearchTerm);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchResult || queries.some(q => !q.text.trim())) return;
    
    const validQueries = queries.filter(q => q.text.trim().length > 0);
    
    if (validQueries.length === 0) {
      setSearchError('Please enter at least one query');
      return;
    }
    
    const allQueriesText = validQueries.map(q => q.text);
    const targetTeam = sendTo[0];
    
    // Store the submission data and show confirmation popup
    setPendingSubmissionData({
      appNo: searchResult.appNo,
      queries: allQueriesText,
      sendTo: targetTeam
    });
    setShowConfirmationPopup(true);
  };

  const handleConfirmSubmission = () => {
    if (pendingSubmissionData) {
      // Store data for success modal before clearing pendingSubmissionData
      const submissionData = { ...pendingSubmissionData };
      submitMutation.mutate(submissionData);
      setShowConfirmationPopup(false);
      setPendingSubmissionData(null);
    }
  };

  const handleCancelSubmission = () => {
    setShowConfirmationPopup(false);
    setPendingSubmissionData(null);
  };

  const handleCustomQuery = (queryId: number) => {
    setCustomQueryId(queryId);
    setShowCustomMessage(true);
  };

  const handleCustomMessageSubmit = (customMessage: string) => {
    if (customQueryId !== null) {
      const teamAssignment: 'Sales' | 'Credit' | 'Custom' = customQueryTeam === 'Sales' ? 'Sales' : 'Credit';
      
      setQueries(prev => prev.map(q => 
        q.id === customQueryId 
          ? { ...q, text: customMessage, isCustom: true, team: teamAssignment }
          : q
      ));
      setShowCustomMessage(false);
      setCustomQueryId(null);
      setCustomQueryTeam('Sales');
    }
  };

  const handleCustomMessageCancel = () => {
    setShowCustomMessage(false);
    setCustomQueryId(null);
  };

  const handleSuccessModalClose = () => {
    setShowSuccessModal(false);
    setSuccessData(null);
  };

  const handleSendToAdditionalTeam = async (team: 'Sales' | 'Credit') => {
    if (!successData) return;
    
    try {
      // Submit the same query to the additional team
      const submissionData = {
        appNo: successData.appNo,
        queries: successData.queries,
        sendTo: team
      };
      
      await submitQuery(submissionData);
      
      // Update success data to reflect additional submission
      setSuccessData(prev => prev ? { ...prev, sentTo: `${prev.sentTo} and ${team}` } : null);
      
      // Invalidate caches again for the new team
      queryClient.invalidateQueries({ queryKey: ['pendingQueries'] });
      queryClient.invalidateQueries({ queryKey: ['salesQueries'] });
      queryClient.invalidateQueries({ queryKey: ['creditQueries'] });
      
    } catch (error) {
      console.error('Error sending query to additional team:', error);
      setSearchError(`Failed to send query to ${team} team: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-3 lg:p-4">
      <div className="max-w-5xl mx-auto space-y-4">
        {/* Compact Header Section */}
        <div className="text-center mb-6">
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-1">
            📝 Add Query
          </h1>
          <p className="text-gray-600 text-sm lg:text-base">
            Search applications and submit queries to teams
          </p>
        </div>

        {/* Search Section */}
        <SearchSection
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          onSearch={handleSearch}
          isSearching={isSearching}
          searchError={searchError}
          appNo={appNo}
        />
      
        {searchResult ? (
          <div className="space-y-4">
            {/* Application Details */}
            <ApplicationDetails application={searchResult} />
            
            {/* Query Form */}
            <QueryForm
              queries={queries}
              setQueries={setQueries}
              sendTo={sendTo}
              setSendTo={setSendTo}
              onSubmit={handleSubmit}
              isSubmitting={submitMutation.isPending}
              onCustomQuery={handleCustomQuery}
            />
          </div>
        ) : (
          <EmptyState
            title="No Application Selected"
            message="Search for an application above to start adding queries"
          />
        )}

        {/* Custom Query Modal */}
        <CustomQueryModal
          isOpen={showCustomMessage}
          onSubmit={handleCustomMessageSubmit}
          onCancel={handleCustomMessageCancel}
          defaultTeam={customQueryTeam}
          onTeamChange={setCustomQueryTeam}
        />

        {/* Confirmation Modal */}
        <ConfirmationModal
          isOpen={showConfirmationPopup}
          onConfirm={handleConfirmSubmission}
          onCancel={handleCancelSubmission}
          isSubmitting={submitMutation.isPending}
          application={searchResult ? {
            appNo: searchResult.appNo,
            customerName: searchResult.customerName
          } : null}
          queries={pendingSubmissionData?.queries || []}
          sendTo={pendingSubmissionData?.sendTo || ''}
        />

        {/* Success Modal */}
        <QuerySuccessModal
          isOpen={showSuccessModal}
          onClose={handleSuccessModalClose}
          application={successData ? {
            appNo: successData.appNo,
            customerName: successData.customerName
          } : null}
          queries={successData?.queries || []}
          sentTo={successData?.sentTo || ''}
          onSendToTeam={handleSendToAdditionalTeam}
        />
      </div>
    </div>
  );
}

export default AddQuery;
