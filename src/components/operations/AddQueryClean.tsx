'use client';

import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FaSearch, FaSpinner, FaExclamationCircle, FaUser, FaEnvelope, FaBuilding, FaTimes, FaPlus, FaCheckCircle, FaPaperPlane, FaChevronDown } from 'react-icons/fa';
import EmptyState from './EmptyState';
import { useAuth } from '@/contexts/AuthContext';

interface AddQueryProps {
  appNo?: string;
}

interface ApplicationDetails {
  appNo: string;
  customerName: string;
  branchName: string;
  taskName: string;
  appliedDate: string;
  loanNo: string;
  loanAmount: string;
  customerEmail: string;
  login: string;
  assetType: string;
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
  tenure: string;
  interestRate: string;
  processingFee: string;
  cibilScore: number | string;
  monthlyIncome: string;
  companyName: string;
  designation: string;
  workExperience: string;
  priority?: string;
  documentStatus?: string;
  remarks?: string;
}

interface QueryItem {
  id: number;
  text: string;
  isCustom?: boolean;
  team?: 'Sales' | 'Credit' | 'Custom';
}

// Search for application
const searchApplication = async (appNo: string): Promise<ApplicationDetails | null> => {
  try {
    console.log(`🔍 Frontend: Searching for application: "${appNo}"`);
    const response = await fetch(`/api/applications/${appNo}`);
    const result = await response.json();
    
    if (!response.ok || !result.success) {
      console.log('❌ Frontend: Search failed:', result);
      let errorMessage = result.error || 'Failed to find application';
      if (result.suggestion) {
        errorMessage += `\n\n💡 Suggestion: ${result.suggestion}`;
      }
      throw new Error(errorMessage);
    }
    
    console.log(`✅ Frontend: Found application:`, result.data.appNo);
    return result.data;
  } catch (error) {
    console.error('💥 Frontend: Error searching for application:', error);
    return null;
  }
};

// Submit query
const submitQuery = async (data: {
  appNo: string;
  queries: string[];
  sendTo: string;
}): Promise<any> => {
  try {
    if (typeof window === 'undefined') {
      throw new Error('Cannot submit query: Not in browser environment');
    }

    if (!data.appNo || !data.queries || data.queries.length === 0 || !data.sendTo) {
      throw new Error('Missing required fields: appNo, queries, or sendTo');
    }

    console.log('🚀 Submitting query with data:', data);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    try {
      const response = await fetch('/api/queries/operations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
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
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log('✅ Query submitted successfully:', result);
      return result;

    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      
      if (fetchError.name === 'AbortError') {
        throw new Error('Request timed out. Please check your internet connection and try again.');
      }
      
      if (fetchError instanceof TypeError && fetchError.message.includes('fetch')) {
        throw new Error('Network error. Please check your internet connection and try again.');
      }
      
      throw fetchError;
    }
  } catch (error: any) {
    console.error('💥 Error submitting query:', error);
    const userMessage = error.message || 'Failed to submit query. Please try again.';
    throw new Error(userMessage);
  }
};

export default function AddQueryClean({ appNo = '' }: AddQueryProps) {
  const [searchTerm, setSearchTerm] = useState(appNo);
  const [queries, setQueries] = useState<QueryItem[]>([{ id: 1, text: '' }]);
  const [sendTo, setSendTo] = useState<string[]>(['Sales']);
  const [searchResult, setSearchResult] = useState<ApplicationDetails | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showBothTeams, setShowBothTeams] = useState(false);
  const [isQueryDropdownOpen, setIsQueryDropdownOpen] = useState<{[key: number]: boolean}>({});
  const [querySubmitted, setQuerySubmitted] = useState(false);
  const [showCustomMessage, setShowCustomMessage] = useState(false);
  const [customQueryId, setCustomQueryId] = useState<number | null>(null);
  const [customQueryTeam, setCustomQueryTeam] = useState<'Sales' | 'Credit'>('Sales');
  const [querySearchTerms, setQuerySearchTerms] = useState<{[key: number]: string}>({});
  
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  // Available teams
  const availableTeams = [
    { id: 'Sales', label: '🏢 Sales Team', color: 'bg-blue-50 hover:bg-blue-100' },
    { id: 'Credit', label: '💳 Credit Team', color: 'bg-green-50 hover:bg-green-100' },
  ];

  // Predefined query options
  const salesQueries = [
    "Application form missing / Incomplete filled / Photo missing / Sign missing / Cross sign missing in Photo",
    "KYC missing / Self Astled missing / OSV missing / Clear image missing",
    "Signature, Any change related to rate, tenure, roi , insurance, sanction condition, Applicant & co-applicant details mismatch",
    "Borrower & Co Borrower Details missing , Borrower declaration form missing / RM Details & Sign missing",
    "Property onwer details missing / Sign missing / Descreption of property missing",
  ];

  const creditQueries = [
    "ITR missing / Salary slip missing / Bank statement missing / Form 16 missing",
    "CIBIL score below minimum requirement / Credit history issues",
    "Income verification required / Employment verification needed",
    "Debt-to-income ratio concerns / Financial assessment required",
    "Additional documentation required for credit approval",
  ];

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
    mutationFn: submitQuery,
    onSuccess: (data) => {
      if (data.success) {
        setQueries([{ id: 1, text: '' }]);
        setQuerySubmitted(true);
        
        queryClient.invalidateQueries({ queryKey: ['pendingQueries'] });
        queryClient.invalidateQueries({ queryKey: ['resolvedQueries'] });
        queryClient.invalidateQueries({ queryKey: ['salesQueries'] });
        queryClient.invalidateQueries({ queryKey: ['creditQueries'] });
        
        console.log('Query submitted successfully:', data.message);
      } else {
        setSearchError('Failed to submit queries: ' + data.message);
      }
    },
    onError: (error) => {
      setSearchError('Error submitting queries. Please try again.');
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
    setQuerySubmitted(false);
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
    
    submitMutation.mutate({
      appNo: searchResult.appNo,
      queries: allQueriesText,
      sendTo: targetTeam
    });
  };

  const handleQueryChange = (id: number, text: string, isCustom = false, team?: 'Sales' | 'Credit' | 'Custom') => {
    setQueries(prev => prev.map(q => 
      q.id === id 
        ? { ...q, text, isCustom, team: team || q.team }
        : q
    ));
  };

  const addQuery = () => {
    const newId = Math.max(0, ...queries.map(q => q.id)) + 1;
    setQueries([...queries, { id: newId, text: '' }]);
  };

  const removeQuery = (id: number) => {
    if (queries.length > 1) {
      setQueries(queries.filter(q => q.id !== id));
    }
  };

  const handleTeamSelection = (teamId: string) => {
    setShowBothTeams(false);
    setSendTo([teamId]);
    setIsDropdownOpen(false);
  };

  const toggleQueryDropdown = (queryId: number) => {
    setIsQueryDropdownOpen(prev => ({
      ...prev,
      [queryId]: !prev[queryId]
    }));
  };

  const handleDropdownSelect = (queryId: number, selectedQuery: string) => {
    handleQueryChange(queryId, selectedQuery);
    setIsQueryDropdownOpen(prev => ({ ...prev, [queryId]: false }));
    // Clear search term when selecting a query
    setQuerySearchTerms(prev => ({ ...prev, [queryId]: '' }));
  };

  const handleQuerySearchChange = (queryId: number, searchTerm: string) => {
    setQuerySearchTerms(prev => ({ ...prev, [queryId]: searchTerm }));
  };

  const getFilteredQueries = (queryId: number) => {
    const searchTerm = querySearchTerms[queryId] || '';
    const queries = sendTo[0] === 'Sales' ? salesQueries : creditQueries;
    
    if (!searchTerm.trim()) {
      return queries;
    }
    
    return queries.filter(query => 
      query.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const handleCustomMessageSubmit = (customMessage: string) => {
    if (customQueryId !== null) {
      const teamAssignment: 'Sales' | 'Credit' | 'Custom' = customQueryTeam === 'Sales' ? 'Sales' : 'Credit';
      
      handleQueryChange(customQueryId, customMessage, true, teamAssignment);
      setShowCustomMessage(false);
      setCustomQueryId(null);
      setCustomQueryTeam('Sales');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved':
      case 'sanctioned':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'under processing':
      case 'in progress':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4 lg:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header Section */}
        <div className="text-center mb-8">
          <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-2">
            📝 Add Query
          </h1>
          <p className="text-gray-600 text-lg">
            Search for applications and submit queries to relevant teams
          </p>
        </div>

        {/* Success Message */}
        {querySubmitted && (
          <div className="bg-white rounded-2xl shadow-lg border border-green-200 p-6 mb-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <FaCheckCircle className="text-green-600 text-xl" />
              </div>
              <div>
                <h3 className="font-bold text-green-800 text-lg">Query Submitted Successfully!</h3>
                <p className="text-green-700">
                  Your query has been sent to {sendTo.join(' and ')} team{sendTo.length > 1 ? 's' : ''} in real-time.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Search Section */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 lg:p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <FaSearch className="text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Search Application</h2>
              <p className="text-gray-600 text-sm">Enter application number to find sanctioned cases</p>
            </div>
            {appNo && (
              <span className="ml-auto bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                Auto-loaded: {appNo}
              </span>
            )}
          </div>

          <form onSubmit={handleSearch} className="space-y-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Enter App.No (e.g., GGNP001, APP123)"
                className="w-full h-14 pl-12 pr-4 text-lg font-semibold text-gray-900 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:bg-white focus:outline-none transition-all duration-200"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <FaSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
            </div>
            
            <button
              type="submit"
              disabled={isSearching || !searchTerm.trim()}
              className="w-full h-14 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-semibold text-lg transition-all duration-200 flex items-center justify-center gap-3 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
            >
              {isSearching ? (
                <>
                  <FaSpinner className="animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <FaSearch />
                  Search Application
                </>
              )}
            </button>
          </form>
          
          {searchError && (
            <div className="mt-6 bg-red-50 border border-red-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <FaExclamationCircle className="text-red-500 mt-1 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-red-800 mb-1">Search Failed</h4>
                  <p className="text-red-700 text-sm whitespace-pre-wrap">{searchError}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      
        {searchResult ? (
          <div className="space-y-6">
            {/* Application Details - Clean Design */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                    <FaBuilding className="text-white text-xl" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white">Application Details</h3>
                    <p className="text-indigo-100">App.No: {searchResult.appNo}</p>
                  </div>
                </div>
              </div>
              
              {/* Content */}
              <div className="p-6 lg:p-8">
                {/* Customer Header */}
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8 pb-6 border-b border-gray-200">
                  <div className="space-y-3">
                    <h4 className="text-2xl font-bold text-gray-900">{searchResult.customerName}</h4>
                    <div className="flex flex-wrap items-center gap-3">
                      <span className={`px-4 py-2 rounded-full text-sm font-semibold ${getStatusColor(searchResult.status)}`}>
                        {searchResult.status}
                      </span>
                      {searchResult.priority && (
                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                          searchResult.priority === 'high' ? 'bg-red-100 text-red-800' :
                          searchResult.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {searchResult.priority} Priority
                        </span>
                      )}
                    </div>
                    <p className="text-gray-600">Applied on {searchResult.appliedDate}</p>
                  </div>
                  
                  <div className="mt-6 lg:mt-0 text-left lg:text-right">
                    <div className="space-y-2">
                      <div>
                        <p className="text-sm text-gray-600">Loan Amount</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {searchResult.loanAmount !== 'Not specified' ? `₹${searchResult.loanAmount}` : searchResult.loanAmount}
                        </p>
                      </div>
                      {searchResult.sanctionedAmount && searchResult.sanctionedAmount !== 'Same as loan amount' && (
                        <div>
                          <p className="text-sm text-gray-600">Sanctioned Amount</p>
                          <p className="text-xl font-bold text-green-600">₹{searchResult.sanctionedAmount}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Information Cards */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Loan Information */}
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                        </svg>
                      </div>
                      <h5 className="text-lg font-bold text-blue-900">💰 Loan Details</h5>
                    </div>
                    <div className="space-y-3">
                      <div className="bg-white rounded-lg p-4 border border-blue-200">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-blue-700">Requested Amount</span>
                          <span className="text-lg font-bold text-blue-900">
                            {searchResult.loanAmount !== 'Not specified' ? `₹${searchResult.loanAmount}` : searchResult.loanAmount}
                          </span>
                        </div>
                      </div>
                      <div className="bg-white rounded-lg p-4 border border-green-200">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-green-700">Sanctioned Amount</span>
                          <span className="text-lg font-bold text-green-700">
                            {searchResult.sanctionedAmount !== 'Same as loan amount' ? `₹${searchResult.sanctionedAmount}` : '₹' + searchResult.loanAmount}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Contact Information */}
                  <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-100">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-purple-500 rounded-xl flex items-center justify-center">
                        <FaEnvelope className="text-white" />
                      </div>
                      <h5 className="text-lg font-bold text-purple-900">📞 Contact & Branch</h5>
                    </div>
                    <div className="space-y-3">
                      <div className="bg-white rounded-lg p-4 border border-purple-200">
                        <div className="flex items-center gap-3">
                          <FaEnvelope className="text-purple-500" />
                          <div>
                            <p className="text-sm font-medium text-purple-700">Email Address</p>
                            <p className="font-semibold text-purple-900 truncate">{searchResult.customerEmail}</p>
                          </div>
                        </div>
                      </div>
                      <div className="bg-white rounded-lg p-4 border border-purple-200">
                        <div className="flex items-center gap-3">
                          <FaBuilding className="text-purple-500" />
                          <div>
                            <p className="text-sm font-medium text-purple-700">Branch</p>
                            <p className="font-semibold text-purple-900">{searchResult.branchName}</p>
                          </div>
                        </div>
                      </div>
                      {searchResult.login && searchResult.login !== 'Not provided' && (
                        <div className="bg-white rounded-lg p-4 border border-purple-200">
                          <div className="flex items-center gap-3">
                            <FaUser className="text-purple-500" />
                            <div>
                              <p className="text-sm font-medium text-purple-700">Employee Login</p>
                              <p className="font-semibold text-purple-900">{searchResult.login}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Add Query Form - Clean Design */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                    <FaPlus className="text-white text-xl" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white">Add New Query</h3>
                    <p className="text-emerald-100">Real-time submission to selected teams</p>
                  </div>
                </div>
              </div>
              
              <div className="p-6 lg:p-8">
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Team Selection */}
                  <div className="space-y-3">
                    <label className="text-lg font-semibold text-gray-900">Select Team</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {availableTeams.map((team) => (
                        <button
                          key={team.id}
                          type="button"
                          onClick={() => handleTeamSelection(team.id)}
                          className={`p-4 rounded-xl border-2 transition-all duration-200 text-left ${
                            sendTo.includes(team.id)
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300 bg-white'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${
                              team.id === 'Sales' ? 'bg-blue-100 text-blue-600' :
                              'bg-green-100 text-green-600'
                            }`}>
                              {team.label.split(' ')[0]}
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900">{team.label.split(' ').slice(1).join(' ')}</p>
                              <p className="text-sm text-gray-600">
                                {team.id === 'Sales' ? 'Documentation & Process' :
                                 'Financial & Approval'}
                              </p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  {/* Query Input */}
                  <div className="space-y-4">
                    <label className="text-lg font-semibold text-gray-900">Query Details</label>
                    
                    {queries.map((query, index) => (
                      <div key={query.id} className="space-y-3">
                        <div className="flex items-center gap-3">
                          <span className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-sm font-semibold text-gray-600">
                            {index + 1}
                          </span>
                          <h4 className="font-medium text-gray-900">Query {index + 1}</h4>
                          {queries.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeQuery(query.id)}
                              className="ml-auto w-8 h-8 text-red-500 hover:bg-red-50 rounded-lg flex items-center justify-center transition-colors"
                            >
                              <FaTimes />
                            </button>
                          )}
                        </div>
                        
                        {/* Predefined Query Selection */}
                        <div className="relative">
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => toggleQueryDropdown(query.id)}
                              className={`flex-1 p-4 border-2 rounded-xl text-left transition-all duration-200 ${
                                query.text && !query.isCustom 
                                  ? 'bg-green-50 border-green-500 cursor-default' 
                                  : 'bg-gray-50 border-gray-200 hover:border-gray-300 focus:border-blue-500 focus:outline-none'
                              }`}
                              disabled={Boolean(query.text && !query.isCustom)}
                            >
                              <div className="flex items-center justify-between">
                                <span className={query.text && !query.isCustom ? 'text-green-700 font-medium' : 'text-gray-600'}>
                                  {query.text && !query.isCustom 
                                    ? `✅ ${query.text.substring(0, 50)}${query.text.length > 50 ? '...' : ''}`
                                    : `📋 Select from ${sendTo[0]} team queries...`
                                  }
                                </span>
                                <FaChevronDown className={`transition-transform ${
                                  query.text && !query.isCustom 
                                    ? 'text-green-500' 
                                    : 'text-gray-400'
                                } ${isQueryDropdownOpen[query.id] ? 'rotate-180' : ''}`} />
                              </div>
                            </button>
                            
                            {/* Clear button - only show when a query is selected from dropdown */}
                            {query.text && !query.isCustom && (
                              <button
                                type="button"
                                onClick={() => handleQueryChange(query.id, '', false)}
                                className="px-4 py-4 bg-red-100 hover:bg-red-200 border-2 border-red-300 rounded-xl text-red-600 transition-all duration-200 flex items-center justify-center"
                                title="Clear selected query"
                              >
                                <FaTimes />
                              </button>
                            )}
                          </div>
                          
                          {isQueryDropdownOpen[query.id] && (
                            <div className="absolute z-30 top-full mt-2 w-full bg-white rounded-xl shadow-2xl border-2 border-gray-200 max-h-80 overflow-hidden opacity-100">
                              {/* Single Team Layout */}
                              <div className="bg-white">
                                <div className={`${sendTo[0] === 'Sales' ? 'bg-blue-600' : 'bg-green-600'} text-white p-3 font-semibold text-center opacity-100`}>
                                  {sendTo[0] === 'Sales' ? '🏢 Sales Queries' : '💳 Credit Queries'}
                                </div>
                                
                                {/* Search Input */}
                                <div className="p-3 border-b border-gray-200 bg-gray-50 opacity-100">
                                  <div className="relative">
                                    <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm" />
                                    <input
                                      type="text"
                                      placeholder="Search queries..."
                                      value={querySearchTerms[query.id] || ''}
                                      onChange={(e) => handleQuerySearchChange(query.id, e.target.value)}
                                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-black placeholder-gray-400 opacity-100"
                                      onClick={(e) => e.stopPropagation()}
                                      autoComplete="off"
                                      style={{ color: '#000000', backgroundColor: '#ffffff' }}
                                    />
                                  </div>
                                </div>
                                
                                <div className="max-h-48 overflow-y-auto bg-white opacity-100">
                                  {getFilteredQueries(query.id).map((teamQuery, idx) => (
                                    <button
                                      key={idx}
                                      type="button"
                                      onClick={() => handleDropdownSelect(query.id, teamQuery)}
                                      className={`w-full p-3 text-left hover:${sendTo[0] === 'Sales' ? 'bg-blue-50' : 'bg-green-50'} border-b border-gray-100 text-sm transition-colors opacity-100`}
                                    >
                                      {teamQuery}
                                    </button>
                                  ))}
                                  {getFilteredQueries(query.id).length === 0 && (
                                    <div className="p-4 text-center text-gray-500 text-sm bg-white opacity-100">
                                      No queries found matching "{querySearchTerms[query.id]}"
                                    </div>
                                  )}
                                </div>
                              </div>
                              
                              {/* Custom Option */}
                              <button
                                type="button"
                                onClick={() => {
                                  setCustomQueryId(query.id);
                                  setShowCustomMessage(true);
                                  setIsQueryDropdownOpen(prev => ({ ...prev, [query.id]: false }));
                                }}
                                className="w-full p-3 text-left hover:bg-yellow-50 border-t-2 border-yellow-200 text-sm font-medium text-yellow-800 transition-colors bg-white opacity-100"
                              >
                                ✏️ Write Custom Query
                              </button>
                            </div>
                          )}
                        </div>
                        
                        {/* Custom Text Input */}
                        <textarea
                          value={query.text}
                          onChange={(e) => handleQueryChange(query.id, e.target.value)}
                          placeholder={query.text && !query.isCustom ? "Query selected from dropdown" : "Or write your custom query here..."}
                          disabled={Boolean(query.text && !query.isCustom)}
                          className={`w-full h-32 p-4 border-2 rounded-xl resize-none transition-all duration-200 ${
                            query.text && !query.isCustom 
                              ? 'border-gray-200 bg-gray-100 text-gray-500 cursor-not-allowed' 
                              : 'border-gray-200 focus:border-blue-500 focus:outline-none'
                          }`}
                        />
                      </div>
                    ))}
                    
                    {/* Add Another Query Button */}
                    <button
                      type="button"
                      onClick={addQuery}
                      className="w-full h-14 border-2 border-dashed border-gray-300 rounded-xl text-gray-600 hover:border-blue-400 hover:text-blue-600 transition-all duration-200 flex items-center justify-center gap-2 font-medium"
                    >
                      <FaPlus />
                      Add Another Query
                    </button>
                  </div>
                  
                  {/* Submit Button */}
                  <div className="pt-6 border-t border-gray-200">
                    <button
                      type="submit"
                      disabled={submitMutation.isPending || queries.some(q => !q.text.trim())}
                      className="w-full h-14 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl font-semibold text-lg transition-all duration-200 flex items-center justify-center gap-3 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
                    >
                      {submitMutation.isPending ? (
                        <>
                          <FaSpinner className="animate-spin" />
                          Submitting Query...
                        </>
                      ) : (
                        <>
                          <FaPaperPlane />
                          Submit Query to {sendTo[0]} Team
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        ) : (
          <EmptyState 
            title="No Application Selected"
            message="Search for an application above to start adding queries"
          />
        )}

        {/* Custom Query Modal */}
        {showCustomMessage && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
              <div className="p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Write Custom Query</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Send to Team:</label>
                    <select
                      value={customQueryTeam}
                      onChange={(e) => setCustomQueryTeam(e.target.value as 'Sales' | 'Credit')}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                    >
                      <option value="Sales">🏢 Sales Team</option>
                      <option value="Credit">💳 Credit Team</option>
                    </select>
                  </div>
                  <textarea
                    placeholder="Enter your custom query..."
                    className="w-full h-32 p-3 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none resize-none"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.ctrlKey) {
                        const customMessage = (e.target as HTMLTextAreaElement).value;
                        if (customMessage.trim()) {
                          handleCustomMessageSubmit(customMessage);
                        }
                      }
                    }}
                  />
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        const textarea = document.querySelector('.fixed textarea') as HTMLTextAreaElement;
                        const customMessage = textarea?.value;
                        if (customMessage?.trim()) {
                          handleCustomMessageSubmit(customMessage);
                        }
                      }}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium transition-colors"
                    >
                      Add Query
                    </button>
                    <button
                      onClick={() => {
                        setShowCustomMessage(false);
                        setCustomQueryId(null);
                      }}
                      className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 py-3 rounded-lg font-medium transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
