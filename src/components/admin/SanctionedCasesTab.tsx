'use client';

import React, { useState, useEffect } from 'react';

interface SanctionedApplication {
  _id: string;
  appId: string;
  customerName: string;
  branch: string;
  sanctionedAmount: number;
  sanctionedDate: string;
  loanType: string;
  status: string;
  salesExec?: string;
}

const SanctionedCasesTab = () => {
  const [sanctionedApps, setSanctionedApps] = useState<SanctionedApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [selectedApps, setSelectedApps] = useState<string[]>([]);
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);

  // Fetch sanctioned applications
  const fetchSanctionedApplications = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/sanctioned-applications');
      const data = await response.json();
      
      if (data.success) {
        setSanctionedApps(data.data || []);
      } else {
        setError(data.error || 'Failed to fetch sanctioned applications');
      }
    } catch (err) {
      setError('Error fetching sanctioned applications');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchSanctionedApplications();
  }, []);

  // Handle delete
  const handleDelete = async (appId: string) => {
    if (!confirm(`Are you sure you want to delete sanctioned application ${appId}?`)) {
      return;
    }

    setDeleteLoading(appId);
    setError('');
    
    try {
      const response = await fetch(`/api/sanctioned-applications/${appId}`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSuccessMessage(`Successfully deleted application ${appId}`);
        setTimeout(() => setSuccessMessage(''), 3000);
        
        // Refresh the list
        await fetchSanctionedApplications();
      } else {
        setError(data.error || 'Failed to delete application');
      }
    } catch (err) {
      setError('Error deleting application');
      console.error('Error:', err);
    } finally {
      setDeleteLoading(null);
    }
  };

  // Handle select all
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedApps(filteredApps.map(app => app.appId));
    } else {
      setSelectedApps([]);
    }
  };

  // Handle individual selection
  const handleSelectApp = (appId: string, checked: boolean) => {
    if (checked) {
      setSelectedApps(prev => [...prev, appId]);
    } else {
      setSelectedApps(prev => prev.filter(id => id !== appId));
    }
  };

  // Handle bulk delete
  const handleBulkDelete = async () => {
    if (selectedApps.length === 0) {
      setError('Please select at least one application to delete');
      setTimeout(() => setError(''), 3000);
      return;
    }

    if (!confirm(`Are you sure you want to delete ${selectedApps.length} selected application(s)?`)) {
      return;
    }

    setBulkDeleteLoading(true);
    setError('');
    
    try {
      const deletePromises = selectedApps.map(appId =>
        fetch(`/api/sanctioned-applications/${appId}`, {
          method: 'DELETE',
        })
      );

      const results = await Promise.all(deletePromises);
      const successCount = results.filter(r => r.ok).length;
      const failCount = results.length - successCount;

      if (successCount > 0) {
        setSuccessMessage(`Successfully deleted ${successCount} application(s)${failCount > 0 ? `, ${failCount} failed` : ''}`);
        setTimeout(() => setSuccessMessage(''), 3000);
        setSelectedApps([]);
        await fetchSanctionedApplications();
      } else {
        setError('Failed to delete selected applications');
      }
    } catch (err) {
      setError('Error deleting applications');
      console.error('Error:', err);
    } finally {
      setBulkDeleteLoading(false);
    }
  };

  // Filter applications based on search term
  const filteredApps = sanctionedApps.filter(app => 
    app.appId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    app.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    app.branch.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent mb-2">
            Sanctioned Cases Management
          </h2>
          <p className="text-gray-300 text-sm">
            View and manage all sanctioned applications
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {selectedApps.length > 0 && (
            <button
              onClick={handleBulkDelete}
              disabled={bulkDeleteLoading}
              className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-400/30 text-red-300 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <span className="text-sm font-medium">
                {bulkDeleteLoading ? 'Deleting...' : `Delete Selected (${selectedApps.length})`}
              </span>
            </button>
          )}
          
          <button
            onClick={fetchSanctionedApplications}
            disabled={loading}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-orange-500/20 hover:bg-orange-500/30 border border-orange-400/30 text-orange-300 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg 
              className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span className="text-sm font-medium">Refresh</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <input
          type="text"
          placeholder="Search by Application No., Customer Name, or Branch..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-3 pl-12 backdrop-blur-sm bg-white/10 border border-white/20 rounded-xl focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-all duration-300 outline-none text-white placeholder-gray-400"
        />
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="backdrop-blur-sm bg-green-500/20 border border-green-400/30 text-green-200 px-4 py-3 rounded-xl text-sm flex items-center">
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {successMessage}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="backdrop-blur-sm bg-red-500/20 border border-red-400/30 text-red-200 px-4 py-3 rounded-xl text-sm flex items-center">
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="backdrop-blur-sm bg-white/10 border border-white/20 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Total Cases</p>
              <p className="text-2xl font-bold text-white mt-1">{sanctionedApps.length}</p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="backdrop-blur-sm bg-white/10 border border-white/20 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Filtered Results</p>
              <p className="text-2xl font-bold text-white mt-1">{filteredApps.length}</p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="backdrop-blur-sm bg-white/10 border border-white/20 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Active Status</p>
              <p className="text-2xl font-bold text-green-400 mt-1">
                {sanctionedApps.filter(app => app.status === 'active').length}
              </p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && sanctionedApps.length === 0 && (
        <div className="flex justify-center items-center py-12">
          <div className="flex items-center space-x-3">
            <svg className="animate-spin h-8 w-8 text-orange-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="text-gray-300 text-lg">Loading sanctioned cases...</span>
          </div>
        </div>
      )}

      {/* No Data State */}
      {!loading && filteredApps.length === 0 && (
        <div className="backdrop-blur-sm bg-white/5 border border-white/10 rounded-xl p-12 text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-orange-500/20 to-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-300 mb-2">No Sanctioned Cases Found</h3>
          <p className="text-gray-400">
            {searchTerm ? 'No cases match your search criteria.' : 'There are no sanctioned applications in the system.'}
          </p>
        </div>
      )}

      {/* Table */}
      {!loading && filteredApps.length > 0 && (
        <div className="backdrop-blur-sm bg-white/5 border border-white/10 rounded-xl overflow-hidden">
          {/* Selection Actions Bar */}
          {selectedApps.length > 0 && (
            <div className="bg-orange-500/10 border-b border-orange-400/20 px-6 py-3 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-orange-300 font-medium">
                  {selectedApps.length} item(s) selected
                </span>
              </div>
              <button
                onClick={() => setSelectedApps([])}
                className="text-sm text-orange-300 hover:text-orange-200 underline"
              >
                Clear Selection
              </button>
            </div>
          )}
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gradient-to-r from-orange-600/20 to-red-600/20 border-b border-white/10">
                  <th className="px-6 py-4 text-left">
                    <input
                      type="checkbox"
                      checked={filteredApps.length > 0 && selectedApps.length === filteredApps.length}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500 focus:ring-offset-slate-900 bg-white/10 border-white/20 cursor-pointer"
                    />
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                    Application No.
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                    Customer Name
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                    Branch
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                    Loan Type
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-300 uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredApps.map((app) => (
                  <tr 
                    key={app._id} 
                    className={`hover:bg-white/5 transition-colors duration-200 ${
                      selectedApps.includes(app.appId) ? 'bg-orange-500/5' : ''
                    }`}
                  >
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedApps.includes(app.appId)}
                        onChange={(e) => handleSelectApp(app.appId, e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500 focus:ring-offset-slate-900 bg-white/10 border-white/20 cursor-pointer"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-2 h-2 bg-orange-400 rounded-full mr-3"></div>
                        <span className="text-sm font-medium text-white">{app.appId}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-300">{app.customerName}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-300">{app.branch}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-semibold text-green-400">
                        ₹{app.sanctionedAmount.toLocaleString('en-IN')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-300">{app.loanType}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        app.status === 'active' 
                          ? 'bg-green-500/20 text-green-300 border border-green-400/30' 
                          : app.status === 'expired'
                          ? 'bg-red-500/20 text-red-300 border border-red-400/30'
                          : app.status === 'utilized'
                          ? 'bg-blue-500/20 text-blue-300 border border-blue-400/30'
                          : 'bg-gray-500/20 text-gray-300 border border-gray-400/30'
                      }`}>
                        {app.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-400">
                        {new Date(app.sanctionedDate).toLocaleDateString('en-IN')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <button
                        onClick={() => handleDelete(app.appId)}
                        disabled={deleteLoading === app.appId}
                        className="inline-flex items-center px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 border border-red-400/30 rounded-lg text-red-300 text-sm font-medium transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                      >
                        {deleteLoading === app.appId ? (
                          <>
                            <svg className="animate-spin h-4 w-4 mr-1.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Deleting...
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Delete
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default SanctionedCasesTab;
