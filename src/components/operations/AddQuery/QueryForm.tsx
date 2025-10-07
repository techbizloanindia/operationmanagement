'use client';

import React, { useState, useEffect, useRef } from 'react';
import { FaPlus, FaTimes, FaChevronDown, FaPaperPlane, FaSpinner, FaSearch } from 'react-icons/fa';

interface QueryItem {
  id: number;
  text: string;
  isCustom?: boolean;
  team?: 'Sales' | 'Credit' | 'Custom';
}

interface QueryFormProps {
  queries: QueryItem[];
  setQueries: React.Dispatch<React.SetStateAction<QueryItem[]>>;
  sendTo: string[];
  setSendTo: React.Dispatch<React.SetStateAction<string[]>>;
  onSubmit: (e: React.FormEvent) => void;
  isSubmitting: boolean;
  onCustomQuery: (queryId: number) => void;
}

// Available teams - restored Credit team for credit dashboard functionality
const availableTeams = [
  { id: 'Sales', label: '🏢 Sales Team', color: 'bg-blue-50 hover:bg-blue-100' },
  { id: 'Credit', label: '💳 Credit Team', color: 'bg-green-50 hover:bg-green-100' },
];

// Predefined query options
const salesQueries = [
  "🏢 Process & Docs",
  "Application form missing / Incomplete filled / Photo missing / Sign missing / Cross sign missing in photo",
  "KYC missing / Self-attested missing / OSV missing / Clear image missing",
  "Signature / Any change related to rate, tenure, ROI, insurance, sanction condition, Applicant & Co-applicant details mismatch",
  "Borrower & Co-Borrower details missing / Borrower declaration form missing / RM details & sign missing",
  "Property owner details missing / Sign missing / Description of property missing",
  "Declarant details wrongly mentioned / Declarant sign in wrong place",
  "Details wrongly mentioned / Signing issue",
  "Complete login details required / Login fee missing / Cheque & online payment image missing",
  "As per sanction another person cheque / Signing issues / Favour wrong or missing / SDPC missing / If mandate done – 5 SPDC required",
  "As per sanction another person cheque / Signing issues / Favour wrong or missing / SDPC missing / As per policy all Co-Applicants 3 PDC required",
  "NACH form wrong place / Wrong details mentioned / As per sanction another person cheque",
  "Insured person sign missing, wrong place sign / Declarant sign missing / Declarant KYC missing",
  "Insured person sign missing, wrong place sign / Insurance form missing",
  "Property owner details mismatch / Date issue / Product name mismatch",
  "Signature missing / Bank account missing / Repayment change",
  "Guarantor details missing / Sign missing / Photo missing",
  "A/C details wrong / Sign missing / Bank stamp missing",
  "Repayment A/c Banking",
  "✏️ Write Custom Query"
];

const creditQueries = [
  "💳 Credit & Finance",
  "Applicant & Co-Applicant details missing or wrong / Condition mismatch (ROI, tenure, processing fee, insurance etc.)",
  "Resi & office FI missing / Negative & refer cases",
  "A/C details wrong / Refer & fake cases",
  "Sign missing / Property details wrong / Product mismatch / Property value issue",
  "CIBIL & crime report missing",
  "Property owner details mismatch / Date issue / Product name mismatch & Search report issue / Document missing as per Legal (Credit/Sales overlap)",
  "Credit condition vetting issue / Condition mismatch between CAM & sanction",
  "✏️ Write Custom Query"
];

export default function QueryForm({
  queries,
  setQueries,
  sendTo,
  setSendTo,
  onSubmit,
  isSubmitting,
  onCustomQuery
}: QueryFormProps) {
  const [isQueryDropdownOpen, setIsQueryDropdownOpen] = useState<{[key: number]: boolean}>({});
  const [searchTerms, setSearchTerms] = useState<{[key: number]: string}>({});
  // Track which queries are assigned to which team
  const [usedQueries, setUsedQueries] = useState<{[query: string]: 'Sales' | 'Credit'}>({});
  
  // Track previous queries for cleanup
  const prevQueriesRef = useRef<QueryItem[]>([]);

  // Handle keyboard navigation for modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Close modal on Escape key
      if (e.key === 'Escape') {
        const openQueryId = Object.keys(isQueryDropdownOpen).find(
          key => isQueryDropdownOpen[parseInt(key)]
        );
        if (openQueryId) {
          setIsQueryDropdownOpen(prev => ({ ...prev, [parseInt(openQueryId)]: false }));
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isQueryDropdownOpen]);

  // Effect to handle usedQueries cleanup when queries change
  useEffect(() => {
    const prevQueries = prevQueriesRef.current;
    
    // Find queries that were cleared (had text, now don't have text)
    const clearedQueries = prevQueries.filter(prevQuery => {
      const currentQuery = queries.find(q => q.id === prevQuery.id);
      return prevQuery.text && 
             !prevQuery.isCustom && 
             (!currentQuery || currentQuery.text === '');
    });

    // Find queries that were removed completely
    const removedQueries = prevQueries.filter(prevQuery => {
      return !queries.find(q => q.id === prevQuery.id) && 
             prevQuery.text && 
             !prevQuery.isCustom;
    });

    // Combine cleared and removed queries for cleanup
    const queriesToCleanup = [...clearedQueries, ...removedQueries];

    // Remove queries from usedQueries
    if (queriesToCleanup.length > 0) {
      setUsedQueries(prevUsed => {
        const newUsed = { ...prevUsed };
        queriesToCleanup.forEach(query => {
          delete newUsed[query.text];
        });
        return newUsed;
      });
    }

    // Update the ref for next comparison
    prevQueriesRef.current = [...queries];
  }, [queries]);

  const handleQueryChange = (id: number, text: string, isCustom = false, team?: 'Sales' | 'Credit' | 'Custom') => {
    setQueries(prev => 
      prev.map(q => 
        q.id === id 
          ? { ...q, text, isCustom, team: team || q.team }
          : q
      )
    );
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
    setSendTo([teamId]);
    // Note: We don't clear usedQueries here because we want to maintain 
    // the exclusivity across team switches
  };

  const toggleQueryDropdown = (queryId: number) => {
    setIsQueryDropdownOpen(prev => ({
      ...prev,
      [queryId]: !prev[queryId]
    }));
  };

  const handleDropdownSelect = (queryId: number, selectedQuery: string) => {
    // Check if custom query option is selected
    if (selectedQuery === "✏️ Write Custom Query") {
      onCustomQuery(queryId);
      setIsQueryDropdownOpen(prev => ({ ...prev, [queryId]: false }));
      return;
    }
    
    // Check if it's a custom team header (Process & Docs or Credit & Finance)
    if (selectedQuery === "🏢 Process & Docs" || selectedQuery === "💳 Credit & Finance") {
      // These are just headers/categories, treat as custom query
      onCustomQuery(queryId);
      setIsQueryDropdownOpen(prev => ({ ...prev, [queryId]: false }));
      return;
    }
    
    // Track which team this query is assigned to
    const currentTeam = sendTo[0] as 'Sales' | 'Credit';
    setUsedQueries(prev => ({ ...prev, [selectedQuery]: currentTeam }));
    
    handleQueryChange(queryId, selectedQuery, false, currentTeam);
    setIsQueryDropdownOpen(prev => ({ ...prev, [queryId]: false }));
    // Clear search term when selecting a query
    setSearchTerms(prev => ({ ...prev, [queryId]: '' }));
  };

  const handleSearchChange = (queryId: number, searchTerm: string) => {
    setSearchTerms(prev => ({ ...prev, [queryId]: searchTerm }));
  };

  const getFilteredQueries = (queryId: number) => {
    const searchTerm = searchTerms[queryId] || '';
    const currentTeam = sendTo[0] as 'Sales' | 'Credit';
    // Use appropriate queries based on selected team
    const allQueries = currentTeam === 'Sales' ? salesQueries : creditQueries;
    
    // Filter out queries that are already used by the opposite team
    let availableQueries = allQueries.filter(query => {
      // Always show the custom query option and team headers
      if (query === "✏️ Write Custom Query" || 
          query === "🏢 Process & Docs" || 
          query === "💳 Credit & Finance") {
        return true;
      }
      
      const assignedTeam = usedQueries[query];
      // Show query if it's not assigned to any team, or if it's assigned to the current team
      return !assignedTeam || assignedTeam === currentTeam;
    });
    
    // Apply search term filter if provided
    if (searchTerm.trim()) {
      availableQueries = availableQueries.filter(query => 
        query.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    return availableQueries;
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
      {/* Enhanced Header */}
      <div className="bg-gradient-to-r from-emerald-500 to-teal-500 p-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
            <FaPlus className="text-white text-lg" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Add New Query</h3>
            <p className="text-emerald-100 text-sm">Submit to selected team</p>
          </div>
        </div>
      </div>
      
      <div className="p-6">
        <form onSubmit={onSubmit} className="space-y-6">
          {/* Team Selection - Enhanced Layout */}
          <div className="space-y-3">
            <label className="text-base font-semibold text-gray-800 flex items-center gap-2">
              <span>Select Team</span>
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">Required</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {availableTeams.map((team) => (
                <button
                  key={team.id}
                  type="button"
                  onClick={() => handleTeamSelection(team.id)}
                  className={`p-4 rounded-lg border-2 transition-all duration-200 text-left group ${
                    sendTo.includes(team.id)
                      ? 'border-blue-500 bg-blue-50 shadow-md transform scale-105'
                      : 'border-gray-300 hover:border-gray-400 bg-white hover:shadow-md'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold ${
                      team.id === 'Sales' ? 'bg-blue-100 text-blue-600' :
                      'bg-green-100 text-green-600'
                    } ${sendTo.includes(team.id) ? 'shadow-sm' : ''}`}>
                      {team.label.split(' ')[0]}
                    </div>
                    <div className="flex-1">
                      <p className="text-base font-semibold text-gray-900 group-hover:text-gray-700">
                        {team.label.split(' ').slice(1).join(' ')}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        {team.id === 'Sales' ? 'Process & Docs' : 'Credit & Finance'}
                      </p>
                    </div>
                    {sendTo.includes(team.id) && (
                      <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs">✓</span>
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
          
          {/* Query Details - Enhanced Layout */}
          <div className="space-y-4">
            <label className="text-base font-semibold text-gray-800 flex items-center gap-2">
              <span>Query Details</span>
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">Required</span>
            </label>
            
            {queries.map((query, index) => (
              <div key={query.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex items-center gap-3 mb-4">
                  <span className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                    {index + 1}
                  </span>
                  <h4 className="text-base font-semibold text-gray-800">Query {index + 1}</h4>
                  {queries.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeQuery(query.id)}
                      className="ml-auto w-8 h-8 text-red-500 hover:bg-red-100 rounded-full flex items-center justify-center transition-colors"
                      title="Remove this query"
                    >
                      <FaTimes className="text-sm" />
                    </button>
                  )}
                </div>
                
                {/* Enhanced Predefined Query Selection */}
                <div className="space-y-3">
                  <div className="relative">
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => toggleQueryDropdown(query.id)}
                        className={`flex-1 p-4 bg-white border-2 rounded-lg text-left transition-all duration-200 ${
                          query.text && !query.isCustom 
                            ? 'border-green-500 bg-green-50 cursor-default shadow-sm' 
                            : 'border-gray-300 hover:border-blue-400 focus:border-blue-500 focus:outline-none hover:shadow-md'
                        }`}
                        disabled={Boolean(query.text && !query.isCustom)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 pr-2">
                            <span className={`text-sm font-medium block ${
                              query.text && !query.isCustom 
                                ? 'text-green-700' 
                                : 'text-gray-700'
                            }`}>
                              {query.text && !query.isCustom 
                                ? `✅ Selected Query:`
                                : `📋 Select ${sendTo[0]} Query`
                              }
                            </span>
                            {query.text && !query.isCustom && (
                              <span className="text-xs text-green-600 mt-1 block leading-relaxed">
                                {query.text}
                              </span>
                            )}
                            {!query.text && (
                              <span className="text-xs text-gray-500 mt-1 block">
                                Choose from predefined queries or write custom
                              </span>
                            )}
                          </div>
                          <FaChevronDown className={`transition-transform text-sm ${
                            query.text && !query.isCustom 
                              ? 'text-green-500' 
                              : 'text-gray-400'
                          } ${isQueryDropdownOpen[query.id] ? 'rotate-180' : ''}`} />
                        </div>
                      </button>
                      
                      {/* Clear button */}
                      {query.text && !query.isCustom && (
                        <button
                          type="button"
                          onClick={() => handleQueryChange(query.id, '', false)}
                          className="px-4 py-2 bg-red-100 hover:bg-red-200 border-2 border-red-300 rounded-lg text-red-600 transition-all duration-200 flex items-center justify-center font-medium"
                          title="Clear selected query"
                        >
                          <FaTimes className="text-sm mr-2" />
                          Clear
                        </button>
                      )}
                    </div>
                  
                    {isQueryDropdownOpen[query.id] && (
                      <div 
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm"
                        onClick={() => setIsQueryDropdownOpen(prev => ({ ...prev, [query.id]: false }))}
                      >
                        <div 
                          className="w-full max-w-2xl max-h-[90vh] bg-white rounded-xl shadow-2xl border-2 border-gray-300 overflow-hidden"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {/* Enhanced Team Header */}
                          <div className="bg-white">
                            <div className={`${sendTo[0] === 'Sales' ? 'bg-gradient-to-r from-blue-500 to-blue-600' : 'bg-gradient-to-r from-green-500 to-green-600'} text-white p-4 text-center relative`}>
                              <h4 className="text-lg font-bold">
                                {sendTo[0] === 'Sales' ? '🏢 Sales Queries' : '💳 Credit Queries'}
                              </h4>
                              <p className="text-sm opacity-90 mt-1">
                                Choose from predefined queries below
                              </p>
                              {/* Close button */}
                              <button
                                type="button"
                                onClick={() => setIsQueryDropdownOpen(prev => ({ ...prev, [query.id]: false }))}
                                className="absolute top-4 right-4 w-8 h-8 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full flex items-center justify-center transition-all duration-200"
                              >
                                <FaTimes className="text-white text-sm" />
                              </button>
                            </div>
                            
                            {/* Enhanced Search Input */}
                            <div className="p-4 border-b border-gray-200 bg-gray-50">
                              <div className="relative">
                                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm" />
                                <input
                                  type="text"
                                  placeholder="Search queries..."
                                  value={searchTerms[query.id] || ''}
                                  onChange={(e) => handleSearchChange(query.id, e.target.value)}
                                  className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900 placeholder-gray-500"
                                  onClick={(e) => e.stopPropagation()}
                                  autoComplete="off"
                                  autoFocus
                                />
                              </div>
                            </div>
                            
                            {/* Scrollable Query List */}
                            <div className="max-h-[60vh] overflow-y-auto bg-white">
                              {getFilteredQueries(query.id).map((teamQuery, idx) => {
                                const isCustomOption = teamQuery === "✏️ Write Custom Query";
                                const isTeamHeader = teamQuery === "🏢 Process & Docs" || teamQuery === "💳 Credit & Finance";
                                return (
                                  <button
                                    key={idx}
                                    type="button"
                                    onClick={() => handleDropdownSelect(query.id, teamQuery)}
                                    className={`w-full p-4 text-left transition-colors text-sm leading-relaxed hover:scale-[1.02] transform ${
                                      isCustomOption 
                                        ? 'bg-yellow-50 hover:bg-yellow-100 border-b border-yellow-200 text-yellow-800 font-semibold'
                                        : isTeamHeader
                                        ? `bg-gradient-to-r ${sendTo[0] === 'Sales' ? 'from-blue-100 to-blue-50 hover:from-blue-150 hover:to-blue-100 text-blue-900' : 'from-green-100 to-green-50 hover:from-green-150 hover:to-green-100 text-green-900'} border-b-2 ${sendTo[0] === 'Sales' ? 'border-blue-200' : 'border-green-200'} font-bold`
                                        : `hover:${sendTo[0] === 'Sales' ? 'bg-blue-50' : 'bg-green-50'} border-b border-gray-100 text-gray-800 hover:text-gray-900 hover:shadow-sm`
                                    }`}
                                  >
                                    <span className="block break-words">{teamQuery}</span>
                                  </button>
                                );
                              })}
                              {getFilteredQueries(query.id).length === 0 && (
                                <div className="p-8 text-center text-gray-500 text-sm bg-white">
                                  <div className="text-gray-400 text-4xl mb-4">🔍</div>
                                  {searchTerms[query.id] ? (
                                    <>
                                      <p className="font-medium text-lg">No queries found</p>
                                      <p className="text-sm mt-2">No results for "{searchTerms[query.id]}"</p>
                                      <p className="text-xs mt-2 text-gray-400">Try different keywords or write a custom query</p>
                                    </>
                                  ) : (
                                    <>
                                      <p className="font-medium text-lg">No available queries</p>
                                      <p className="text-sm mt-2">No queries available for {sendTo[0]} team</p>
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                            
                            {/* Footer with action buttons */}
                            <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
                              <p className="text-xs text-gray-600">
                                {getFilteredQueries(query.id).length} queries available
                              </p>
                              <button
                                type="button"
                                onClick={() => setIsQueryDropdownOpen(prev => ({ ...prev, [query.id]: false }))}
                                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-sm font-medium transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                </div>
                
                  {/* Enhanced Custom Text Input */}
                  <div className="mt-3">
                    <label className="text-sm font-medium text-gray-700 mb-2 block">
                      Custom Query Text
                    </label>
                    <textarea
                      value={query.text}
                      onChange={(e) => handleQueryChange(query.id, e.target.value)}
                      placeholder={query.text && !query.isCustom ? "Query selected from dropdown" : "Or write your custom query here..."}
                      disabled={Boolean(query.text && !query.isCustom)}
                      className={`w-full h-24 p-4 border-2 rounded-lg resize-none transition-all duration-200 text-sm leading-relaxed ${
                        query.text && !query.isCustom 
                          ? 'border-gray-200 bg-gray-100 text-gray-500 cursor-not-allowed' 
                          : 'border-gray-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 text-gray-900 bg-white hover:border-gray-400'
                      }`}
                      rows={3}
                    />
                    {query.text && (
                      <div className="mt-2 text-xs text-gray-500">
                        Character count: {query.text.length}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {/* Enhanced Add Another Query Button */}
            <button
              type="button"
              onClick={addQuery}
              className="w-full h-12 border-2 border-dashed border-gray-400 rounded-lg text-gray-700 hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200 flex items-center justify-center gap-3 text-sm font-semibold bg-gray-50 hover:shadow-md"
            >
              <FaPlus className="text-sm" />
              Add Another Query
            </button>
          </div>
          
          {/* Enhanced Submit Button */}
          <div className="pt-6 border-t-2 border-gray-200">
            <button
              type="submit"
              disabled={isSubmitting || queries.some(q => !q.text.trim())}
              className="w-full h-14 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-lg font-bold text-base transition-all duration-200 flex items-center justify-center gap-3 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98]"
            >
              {isSubmitting ? (
                <>
                  <FaSpinner className="animate-spin text-lg" />
                  <span>Submitting Query...</span>
                </>
              ) : (
                <>
                  <FaPaperPlane className="text-lg" />
                  <span>Submit to {sendTo[0]} Team</span>
                </>
              )}
            </button>
            {queries.some(q => !q.text.trim()) && (
              <p className="text-xs text-red-500 mt-2 text-center">
                Please fill in all query fields before submitting
              </p>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
