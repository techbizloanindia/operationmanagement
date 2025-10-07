'use client';

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  FaDownload, 
  FaFileExcel, 
  FaFileCsv, 
  FaCalendarAlt, 
  FaFilter,
  FaSearch,
  FaChartBar,
  FaFileAlt,
  FaUsers,
  FaCodeBranch,
  FaClock,
  FaCheckCircle,
  FaExclamationTriangle,
  FaTimesCircle,
  FaSpinner,
  FaEye
} from 'react-icons/fa';
import LoadingState from './LoadingState';
import ErrorState from './ErrorState';
import EmptyState from './EmptyState';
import { queryUpdateService } from '@/lib/queryUpdateService';
import * as XLSX from 'xlsx';

interface Query {
  id: number;
  appNo: string;
  customerName: string;
  queries: Array<{
    id: string;
    text: string;
    status: string;
    timestamp?: string;
    sender?: string;
    senderRole?: string;
  }>;
  sendTo: string[];
  submittedBy: string;
  submittedAt: string;
  status: string;
  branch: string;
  branchCode: string;
  lastUpdated: string;
  resolvedAt?: string;
  resolvedBy?: string;
  resolvedByTeam?: string;
  resolutionTeam?: string;
  resolutionReason?: string;
  amount?: string;
  appliedOn?: string;
  title?: string;
  assignedTo?: string;
  approvedBy?: string;
  approvedAt?: string;
  remarks?: Array<{
    id: string;
    text: string;
    author: string;
    authorRole: string;
    authorTeam: string;
    timestamp: Date;
    editedAt?: Date;
    isEdited?: boolean;
  }> | string;
}

interface ReportFilters {
  dateFrom: string;
  dateTo: string;
  status: string;
  branch: string;
  team: string;
  resolvedBy: string;
  approvedBy: string;
}

interface ReportStats {
  totalResolved: number;
  approvedCount: number;
  deferredCount: number;
  otcCount: number;
  waivedCount: number;
  avgResolutionTime: number;
  branchWiseStats: Array<{
    branch: string;
    count: number;
    percentage: number;
  }>;
  teamWiseStats: Array<{
    team: string;
    count: number;
    percentage: number;
  }>;
  statusWiseStats: Array<{
    status: string;
    count: number;
    percentage: number;
  }>;
}

// Fetch all resolved queries with real-time data
const fetchResolvedQueries = async (): Promise<Query[]> => {
  try {
    const timestamp = new Date().getTime();
    const response = await fetch(`/api/reports/resolved?_=${timestamp}`, {
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch resolved queries');
    }
    
    // The API already filters out Unknown entries for non-operations teams
    // For operations dashboard, we keep all entries including Unknown
    return result.data.queries || [];
  } catch (error) {
    console.error('Error fetching resolved queries:', error);
    // Fallback to main queries API if reports API fails
    try {
      const fallbackTimestamp = Date.now();
      const fallbackResponse = await fetch(`/api/queries?_=${fallbackTimestamp}`, {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      const fallbackResult = await fallbackResponse.json();
      
      if (fallbackResponse.ok && fallbackResult.success) {
        // Filter to include only resolved queries
        const resolvedStatuses = [
          'request-approved', 'request-deferral', 'request-otc',
          'approved', 'deferred', 'otc', 'waived', 'resolved',
          'completed', 'waiting for approval'
        ];
        
        const resolvedQueries = fallbackResult.data.filter((query: any) => {
          if (resolvedStatuses.includes(query.status)) {
            return true;
          }
          
          const hasResolvedSubQueries = query.queries?.some((q: any) =>
            resolvedStatuses.includes(q.status)
          );
          
          return hasResolvedSubQueries;
        });
        
        return resolvedQueries || [];
      }
    } catch (fallbackError) {
      console.error('Fallback API also failed:', fallbackError);
    }
    
    throw error;
  }
};

// Calculate report statistics
const calculateStats = (queries: Query[]): ReportStats => {
  const total = queries.length;
  
  const statusCounts = {
    approved: queries.filter(q => ['approved', 'request-approved'].includes(q.status) || (q.status === 'resolved' && q.resolutionReason === 'approve')).length,
    deferred: queries.filter(q => ['deferred', 'request-deferral'].includes(q.status) || (q.status === 'resolved' && q.resolutionReason === 'deferral')).length,
    otc: queries.filter(q => ['otc', 'request-otc'].includes(q.status) || (q.status === 'resolved' && q.resolutionReason === 'otc')).length,
    waived: queries.filter(q => q.status === 'waived' || (q.status === 'resolved' && q.resolutionReason === 'waiver')).length,
  };

  // Calculate branch-wise statistics
  const branchCounts: { [key: string]: number } = {};
  queries.forEach(query => {
    const branch = query.branch || 'Unknown';
    branchCounts[branch] = (branchCounts[branch] || 0) + 1;
  });

  const branchWiseStats = Object.entries(branchCounts).map(([branch, count]) => ({
    branch,
    count,
    percentage: total > 0 ? Math.round((count / total) * 100) : 0
  })).sort((a, b) => b.count - a.count);

  // Calculate team-wise statistics
  const teamCounts: { [key: string]: number } = {};
  queries.forEach(query => {
    const team = query.resolvedByTeam || query.resolutionTeam || 'Unknown';
    teamCounts[team] = (teamCounts[team] || 0) + 1;
  });

  const teamWiseStats = Object.entries(teamCounts).map(([team, count]) => ({
    team,
    count,
    percentage: total > 0 ? Math.round((count / total) * 100) : 0
  })).sort((a, b) => b.count - a.count);

  // Status-wise statistics
  const statusWiseStats = [
    { status: 'Approved', count: statusCounts.approved, percentage: total > 0 ? Math.round((statusCounts.approved / total) * 100) : 0 },
    { status: 'Deferred', count: statusCounts.deferred, percentage: total > 0 ? Math.round((statusCounts.deferred / total) * 100) : 0 },
    { status: 'OTC', count: statusCounts.otc, percentage: total > 0 ? Math.round((statusCounts.otc / total) * 100) : 0 },
    { status: 'Waived', count: statusCounts.waived, percentage: total > 0 ? Math.round((statusCounts.waived / total) * 100) : 0 },
  ];

  // Calculate average resolution time (mock calculation)
  const avgResolutionTime = 2.5; // Days - this would be calculated from actual data

  return {
    totalResolved: total,
    approvedCount: statusCounts.approved,
    deferredCount: statusCounts.deferred,
    otcCount: statusCounts.otc,
    waivedCount: statusCounts.waived,
    avgResolutionTime,
    branchWiseStats,
    teamWiseStats,
    statusWiseStats
  };
};

export default function QueryReports() {
  const [filters, setFilters] = useState<ReportFilters>({
    dateFrom: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    dateTo: new Date().toISOString().split('T')[0],
    status: '',
    branch: '',
    team: '',
    resolvedBy: '',
    approvedBy: ''
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [showDetailedView, setShowDetailedView] = useState(false);

  // Fetch resolved queries with real-time updates
  const { data: queries, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['resolvedQueries', filters],
    queryFn: fetchResolvedQueries,
    refetchOnWindowFocus: true,
    staleTime: 5 * 1000, // Consider data stale after 5 seconds for real-time experience
    refetchInterval: 10000, // Refetch every 10 seconds for real-time updates
    refetchIntervalInBackground: true, // Continue refetching when tab is not active
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Subscribe to real-time query updates for reports
  useEffect(() => {
    const unsubscribe = queryUpdateService.subscribe('reports', (update) => {
      console.log('📊 QueryReports: Received query update:', update);
      
      // Check if this is a resolved query update
      const isResolvedQuery = update.action === 'approved' || 
             update.action === 'deferred' || 
             update.action === 'otc' || 
             update.action === 'resolved' ||
             update.action === 'waived' ||
             ['approved', 'resolved', 'deferred', 'otc', 'waived'].includes(update.status);
      
      if (isResolvedQuery) {
        console.log(`🆕 Reports: New resolved query: ${update.appNo} - Status: ${update.status}`);
        // Immediately refresh the reports data
        refetch();
      }
    });
    
    return () => unsubscribe();
  }, [refetch]);

  // Filter queries based on filters and search term
  const filteredQueries = React.useMemo(() => {
    if (!queries) return [];

    return queries.filter(query => {
      // Date filter
      const queryDate = new Date(query.resolvedAt || query.lastUpdated);
      const fromDate = new Date(filters.dateFrom);
      const toDate = new Date(filters.dateTo);
      
      if (queryDate < fromDate || queryDate > toDate) return false;

      // Status filter
      if (filters.status && !query.status.toLowerCase().includes(filters.status.toLowerCase())) {
        return false;
      }

      // Branch filter
      if (filters.branch && !query.branch.toLowerCase().includes(filters.branch.toLowerCase())) {
        return false;
      }

      // Team filter
      if (filters.team) {
        const team = query.resolvedByTeam || query.resolutionTeam || '';
        if (!team.toLowerCase().includes(filters.team.toLowerCase())) {
          return false;
        }
      }

      // Resolved by filter
      if (filters.resolvedBy && query.resolvedBy) {
        if (!query.resolvedBy.toLowerCase().includes(filters.resolvedBy.toLowerCase())) {
          return false;
        }
      }

      // Approved by filter
      if (filters.approvedBy && query.approvedBy) {
        if (!query.approvedBy.toLowerCase().includes(filters.approvedBy.toLowerCase())) {
          return false;
        }
      }

      // Search term filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const queryText = query.queries && query.queries.length > 0 
          ? query.queries.map(q => q.text).join(' ').toLowerCase()
          : '';
        return (
          query.appNo.toLowerCase().includes(searchLower) ||
          query.customerName.toLowerCase().includes(searchLower) ||
          query.branch.toLowerCase().includes(searchLower) ||
          queryText.includes(searchLower) ||
          (query.resolvedBy && query.resolvedBy.toLowerCase().includes(searchLower))
        );
      }

      return true;
    });
  }, [queries, filters, searchTerm]);

  // Calculate statistics for filtered data
  const stats = React.useMemo(() => {
    return calculateStats(filteredQueries);
  }, [filteredQueries]);

  // Calculate TAT in days
  const calculateTAT = (submittedAt: string, resolvedAt: string) => {
    if (!submittedAt || !resolvedAt) return 'N/A';
    
    const submitted = new Date(submittedAt);
    const resolved = new Date(resolvedAt);
    const diffTime = resolved.getTime() - submitted.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return Math.max(0, diffDays);
  };

  // Generate CSV data with all required columns including new fields
  const generateCSVData = () => {
    const csvData = filteredQueries.map((query, index) => {
      const submittedDate = query.submittedAt ? new Date(query.submittedAt) : null;
      const resolvedDate = query.resolvedAt ? new Date(query.resolvedAt) : (query.lastUpdated ? new Date(query.lastUpdated) : null);
      const tat = submittedDate && resolvedDate ? calculateTAT(query.submittedAt, query.resolvedAt || query.lastUpdated) : 'N/A';
      
      // Get remarks text with better formatting
      const remarksText = query.remarks && Array.isArray(query.remarks) && query.remarks.length > 0
        ? query.remarks.map((remark: any) => {
            const author = remark.author || remark.authorRole || 'User';
            const text = remark.text || remark.message || '';
            return `${author}: ${text}`;
          }).join(' | ')
        : (typeof query.remarks === 'string' && query.remarks.trim() !== '' 
            ? query.remarks 
            : 'No remarks');

      return {
        'S.No': index + 1,
        'Application': query.appNo,
        'Query Text': query.queries && query.queries.length > 0 ? query.queries.map(q => q.text).join('; ') : 'N/A',
        'Customer': query.customerName,
        'Status': query.status,
        'Resolved By': query.resolvedBy || query.approvedBy || 'N/A',
        'Approver Name': query.approvedBy || 'N/A',
        'Query Raise Date': submittedDate ? submittedDate.toLocaleDateString() : 'N/A',
        'Query Raise Time': submittedDate ? submittedDate.toLocaleTimeString() : 'N/A',
        'Resolved Date': resolvedDate ? resolvedDate.toLocaleDateString() : 'N/A',
        'Resolved Time': resolvedDate ? resolvedDate.toLocaleTimeString() : 'N/A',
        'TAT': tat,
        'Remarks': remarksText,
        'Resolved At': resolvedDate ? resolvedDate.toLocaleString() : 'N/A'
      };
    });

    return csvData;
  };

  // Download CSV file with enhanced data
  const downloadCSV = async () => {
    setIsGeneratingReport(true);
    
    try {
      // Always use local data generation for better reliability
      const csvData = generateCSVData();
      
      if (!csvData || csvData.length === 0) {
        throw new Error('No data available for export');
      }
      
      // Create CSV with proper encoding
      const worksheet = XLSX.utils.json_to_sheet(csvData);
      const csv = XLSX.utils.sheet_to_csv(worksheet);
      
      // Add BOM for proper UTF-8 encoding in Excel
      const BOM = '\uFEFF';
      const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      
      if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `query_resolution_report_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error generating CSV:', error);
      // Fallback to basic CSV generation
      try {
        const csvData = generateCSVData();
        const worksheet = XLSX.utils.json_to_sheet(csvData);
        const csv = XLSX.utils.sheet_to_csv(worksheet);
        
        const BOM = '\uFEFF';
        const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `query_resolution_report_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } catch (fallbackError) {
        console.error('Fallback CSV generation failed:', fallbackError);
        alert('Failed to generate CSV report. Please try again.');
      }
    } finally {
      setIsGeneratingReport(false);
    }
  };

  // Download Excel file with enhanced data
  const downloadExcel = async () => {
    setIsGeneratingReport(true);
    
    try {
      // Generate enhanced report locally for better reliability
      const queryData = generateCSVData();
      
      if (!queryData || queryData.length === 0) {
        throw new Error('No data available for export');
      }
      
      const workbook = XLSX.utils.book_new();
      
      // Main data sheet with the required columns
      const worksheet = XLSX.utils.json_to_sheet(queryData);
        
      // Set column widths for better formatting - updated for all fields including Query Text
      const wscols = [
        { wch: 8 },   // S.No
        { wch: 15 },  // Application
        { wch: 50 },  // Query Text (wider for content)
        { wch: 25 },  // Customer
        { wch: 15 },  // Status
        { wch: 20 },  // Resolved By
        { wch: 20 },  // Approver Name
        { wch: 15 },  // Query Raise Date
        { wch: 15 },  // Query Raise Time
        { wch: 15 },  // Resolved Date
        { wch: 15 },  // Resolved Time
        { wch: 10 },  // TAT
        { wch: 40 },  // Remarks
        { wch: 20 }   // Resolved At
      ];
      worksheet['!cols'] = wscols;
      
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Query Resolution Report');
      
      // Summary sheet
      const summaryData = [
        { Metric: 'Total Resolved Queries', Value: stats.totalResolved },
        { Metric: 'Approved Count', Value: stats.approvedCount },
        { Metric: 'Deferred Count', Value: stats.deferredCount },
        { Metric: 'OTC Count', Value: stats.otcCount },
        { Metric: 'Waived Count', Value: stats.waivedCount },
        { Metric: 'Average Resolution Time (Days)', Value: stats.avgResolutionTime },
        { Metric: 'Report Generated At', Value: new Date().toLocaleString() },
        { Metric: 'Date Range', Value: `${filters.dateFrom} to ${filters.dateTo}` }
      ];
      
      const summaryWorksheet = XLSX.utils.json_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(workbook, summaryWorksheet, 'Summary');
      
      // Branch-wise analysis
      if (stats.branchWiseStats && stats.branchWiseStats.length > 0) {
        const branchWorksheet = XLSX.utils.json_to_sheet(stats.branchWiseStats);
        XLSX.utils.book_append_sheet(workbook, branchWorksheet, 'Branch Analysis');
      }
      
      // Team-wise analysis
      if (stats.teamWiseStats && stats.teamWiseStats.length > 0) {
        const teamWorksheet = XLSX.utils.json_to_sheet(stats.teamWiseStats);
        XLSX.utils.book_append_sheet(workbook, teamWorksheet, 'Team Analysis');
      }
      
      XLSX.writeFile(workbook, `query_resolution_report_${new Date().toISOString().split('T')[0]}.xlsx`);
        
    } catch (error) {
      console.error('Error generating Excel:', error);
      // Fallback to basic generation
      try {
        const csvData = generateCSVData();
        const worksheet = XLSX.utils.json_to_sheet(csvData);
        const workbook = XLSX.utils.book_new();
        
        // Set column widths for fallback too - all fields including Query Text
        const fallbackCols = [
          { wch: 8 },   // S.No
          { wch: 15 },  // Application
          { wch: 50 },  // Query Text (wider for content)
          { wch: 25 },  // Customer
          { wch: 15 },  // Status
          { wch: 20 },  // Resolved By
          { wch: 20 },  // Approver Name
          { wch: 15 },  // Query Raise Date
          { wch: 15 },  // Query Raise Time
          { wch: 15 },  // Resolved Date
          { wch: 15 },  // Resolved Time
          { wch: 10 },  // TAT
          { wch: 40 },  // Remarks
          { wch: 20 }   // Resolved At
        ];
        worksheet['!cols'] = fallbackCols;
        
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Query Resolution Report');
        XLSX.writeFile(workbook, `query_resolution_report_${new Date().toISOString().split('T')[0]}.xlsx`);
      } catch (fallbackError) {
        console.error('Fallback Excel generation failed:', fallbackError);
        alert('Failed to generate Excel report. Please try again.');
      }
    } finally {
      setIsGeneratingReport(false);
    }
  };

  // Handle filter changes
  const handleFilterChange = (key: keyof ReportFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  // Reset filters
  const resetFilters = () => {
    setFilters({
      dateFrom: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      dateTo: new Date().toISOString().split('T')[0],
      status: '',
      branch: '',
      team: '',
      resolvedBy: '',
      approvedBy: ''
    });
    setSearchTerm('');
  };

  if (isLoading) {
    return <LoadingState message="Loading resolved queries data..." />;
  }

  if (isError) {
    return <ErrorState message="Failed to load reports data. Please try again." onRetry={refetch} />;
  }

  if (!queries || queries.length === 0) {
    return <EmptyState message="No resolved queries found" />;
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              <FaChartBar className="inline mr-3 text-blue-600" />
              Query Resolution Reports
              <span className="ml-2 inline-flex items-center">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="ml-1 text-xs text-green-600 font-medium">Real-time</span>
              </span>
            </h1>
            <p className="text-gray-600">
              Comprehensive reports and analytics for resolved queries
              <span className="text-xs text-gray-500 ml-2">(Auto-refreshes every 10 seconds)</span>
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 mt-4 lg:mt-0">
            <button
              onClick={() => refetch()}
              disabled={isLoading}
              className="flex items-center justify-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <FaSpinner className="animate-spin mr-2" />
              ) : (
                <FaSpinner className="mr-2" />
              )}
              Refresh
            </button>
            
            <button
              onClick={downloadCSV}
              disabled={isGeneratingReport || filteredQueries.length === 0}
              className="flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isGeneratingReport ? (
                <FaSpinner className="animate-spin mr-2" />
              ) : (
                <FaFileCsv className="mr-2" />
              )}
              Download CSV
            </button>
            
            <button
              onClick={downloadExcel}
              disabled={isGeneratingReport || filteredQueries.length === 0}
              className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isGeneratingReport ? (
                <FaSpinner className="animate-spin mr-2" />
              ) : (
                <FaFileExcel className="mr-2" />
              )}
              Download Excel
            </button>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <FaCheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Resolved</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalResolved}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <FaCheckCircle className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Approved</p>
              <p className="text-2xl font-bold text-gray-900">{stats.approvedCount}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <FaExclamationTriangle className="h-8 w-8 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Deferred</p>
              <p className="text-2xl font-bold text-gray-900">{stats.deferredCount}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <FaClock className="h-8 w-8 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Avg Resolution</p>
              <p className="text-2xl font-bold text-gray-900">{stats.avgResolutionTime}d</p>
            </div>
          </div>
        </div>
      </div>



      {/* Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Status Distribution */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Status Distribution</h3>
          <div className="space-y-3">
            {stats.statusWiseStats.map((stat, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className={`w-3 h-3 rounded-full mr-3 ${
                    stat.status === 'Approved' ? 'bg-green-500' :
                    stat.status === 'Deferred' ? 'bg-yellow-500' :
                    stat.status === 'OTC' ? 'bg-blue-500' : 'bg-purple-500'
                  }`}></div>
                  <span className="text-sm text-gray-600">{stat.status}</span>
                </div>
                <div className="flex items-center">
                  <span className="text-sm font-medium text-gray-900 mr-2">{stat.count}</span>
                  <span className="text-xs text-gray-500">({stat.percentage}%)</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Branches */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Branches</h3>
          <div className="space-y-3">
            {stats.branchWiseStats.slice(0, 5).map((stat, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center">
                  <FaCodeBranch className="w-3 h-3 text-gray-400 mr-3" />
                  <span className="text-sm text-gray-600">{stat.branch}</span>
                </div>
                <div className="flex items-center">
                  <span className="text-sm font-medium text-gray-900 mr-2">{stat.count}</span>
                  <span className="text-xs text-gray-500">({stat.percentage}%)</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              Resolved Queries ({filteredQueries.length})
            </h3>
            <button
              onClick={() => setShowDetailedView(!showDetailedView)}
              className="flex items-center text-sm text-blue-600 hover:text-blue-800"
            >
              <FaEye className="mr-1" />
              {showDetailedView ? 'Simple View' : 'Detailed View'}
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  S.No
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Application
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Query Text
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Resolved By
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Approver Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Resolved At
                </th>
                {showDetailedView && (
                  <>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Query Raise Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Query Raise Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Resolved Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Resolved Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      TAT
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Remarks
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Team
                    </th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredQueries.map((query, index) => (
                <tr key={query.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{index + 1}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{query.appNo}</div>
                  </td>
                  <td className="px-6 py-4 max-w-xs">
                    <div className="text-sm text-gray-900 truncate" title={
                      query.queries && query.queries.length > 0 
                        ? query.queries.map(q => q.text).join('; ')
                        : 'N/A'
                    }>
                      {query.queries && query.queries.length > 0 
                        ? query.queries.map(q => q.text).join('; ')
                        : 'N/A'
                      }
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {query.customerName}
                    </div>
                    <div className="text-xs text-gray-500">
                      {query.branch}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      ['approved', 'request-approved'].includes(query.status) || (query.status === 'resolved' && query.resolutionReason === 'approve')
                        ? 'bg-green-100 text-green-800' 
                        : ['deferred', 'request-deferral'].includes(query.status) || (query.status === 'resolved' && query.resolutionReason === 'deferral')
                        ? 'bg-yellow-100 text-yellow-800'
                        : ['otc', 'request-otc'].includes(query.status) || (query.status === 'resolved' && query.resolutionReason === 'otc')
                        ? 'bg-blue-100 text-blue-800'
                        : query.status === 'waived' || (query.status === 'resolved' && query.resolutionReason === 'waiver')
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {query.status === 'approved' || (query.status === 'resolved' && query.resolutionReason === 'approve') ? 'REQUEST APPROVED' :
                       query.status === 'deferred' || (query.status === 'resolved' && query.resolutionReason === 'deferral') ? 'REQUEST DEFERRAL' :
                       query.status === 'otc' || (query.status === 'resolved' && query.resolutionReason === 'otc') ? 'REQUEST OTC' :
                       query.status === 'waived' || (query.status === 'resolved' && query.resolutionReason === 'waiver') ? 'REQUEST WAIVED' :
                       query.status.replace('request-', '').toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {query.resolvedBy || 'System'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {query.approvedBy || '-'}
                    </div>
                    {query.approvedAt && (
                      <div className="text-xs text-gray-500">
                        {new Date(query.approvedAt).toLocaleDateString()}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {query.resolvedAt 
                        ? new Date(query.resolvedAt).toLocaleDateString()
                        : new Date(query.lastUpdated).toLocaleDateString()
                      }
                    </div>
                    <div className="text-xs text-gray-500">
                      {query.resolvedAt 
                        ? new Date(query.resolvedAt).toLocaleTimeString()
                        : new Date(query.lastUpdated).toLocaleTimeString()
                      }
                    </div>
                  </td>
                  {showDetailedView && (
                    <>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {query.submittedAt 
                            ? new Date(query.submittedAt).toLocaleDateString()
                            : 'N/A'
                          }
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {query.submittedAt 
                            ? new Date(query.submittedAt).toLocaleTimeString()
                            : 'N/A'
                          }
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {query.resolvedAt 
                            ? new Date(query.resolvedAt).toLocaleDateString()
                            : (query.lastUpdated ? new Date(query.lastUpdated).toLocaleDateString() : 'N/A')
                          }
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {query.resolvedAt 
                            ? new Date(query.resolvedAt).toLocaleTimeString()
                            : (query.lastUpdated ? new Date(query.lastUpdated).toLocaleTimeString() : 'N/A')
                          }
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {query.submittedAt && (query.resolvedAt || query.lastUpdated)
                            ? `${calculateTAT(query.submittedAt, query.resolvedAt || query.lastUpdated)} days`
                            : 'N/A'
                          }
                        </div>
                      </td>
                      <td className="px-6 py-4 max-w-xs">
                        <div className="text-sm text-gray-900" style={{ 
                          maxWidth: '200px',
                          wordWrap: 'break-word',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'pre-wrap'
                        }} title={
                          query.remarks && Array.isArray(query.remarks) 
                            ? query.remarks.map((remark: any) => `${remark.author || remark.authorRole || 'User'}: ${remark.text || remark.message || ''}`).join('\n')
                            : (typeof query.remarks === 'string' ? query.remarks : 'No remarks')
                        }>
                          {query.remarks && Array.isArray(query.remarks) && query.remarks.length > 0
                            ? query.remarks.map((remark: any, idx: number) => (
                                <div key={idx} className="mb-1 text-xs">
                                  <span className="font-medium text-blue-600">
                                    {remark.author || remark.authorRole || 'User'}:
                                  </span>
                                  <span className="ml-1">
                                    {remark.text || remark.message || ''}
                                  </span>
                                </div>
                              ))
                            : (typeof query.remarks === 'string' && query.remarks.trim() !== '' 
                                ? <span className="text-gray-700">{query.remarks}</span>
                                : <span className="text-gray-400 italic">No remarks</span>)
                          }
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {query.resolvedByTeam || query.resolutionTeam || 'N/A'}
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredQueries.length === 0 && (
          <div className="text-center py-8">
            <FaFileAlt className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No queries found</h3>
            <p className="mt-1 text-sm text-gray-500">
              Try adjusting your filters or search criteria.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
