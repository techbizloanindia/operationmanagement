import { NextRequest, NextResponse } from 'next/server';

// Mock reports data
const mockReports = [
  {
    id: '1',
    name: 'Monthly Approval Summary',
    type: 'summary',
    dateRange: {
      from: new Date('2024-01-01'),
      to: new Date('2024-01-31')
    },
    filters: {},
    format: 'pdf',
    generatedAt: new Date('2024-01-31T23:59:00'),
    downloadUrl: '/reports/monthly-summary-jan-2024.pdf'
  },
  {
    id: '2',
    name: 'Loan Approval Analysis',
    type: 'detailed',
    dateRange: {
      from: new Date('2024-01-01'),
      to: new Date('2024-01-31')
    },
    filters: { type: ['loan'] },
    format: 'excel',
    generatedAt: new Date('2024-01-30T15:30:00'),
    downloadUrl: '/reports/loan-analysis-jan-2024.xlsx'
  }
];

const mockDashboardStats = {
  totalApprovals: 145,
  approvalRate: 89,
  avgProcessingTime: 2.3,
  slaCompliance: 94,
  monthlyTrend: '+12%',
  topApprovers: [
    { name: 'Lisa Anderson', count: 45, percentage: 31 },
    { name: 'Mike Wilson', count: 38, percentage: 26 },
    { name: 'Sarah Davis', count: 28, percentage: 19 },
    { name: 'Robert Johnson', count: 22, percentage: 15 },
    { name: 'Others', count: 12, percentage: 9 }
  ],
  approvalsByType: [
    { type: 'Expense', count: 52, percentage: 36 },
    { type: 'Loan', count: 38, percentage: 26 },
    { type: 'Credit', count: 28, percentage: 19 },
    { type: 'Policy', count: 18, percentage: 12 },
    { type: 'Budget', count: 9, percentage: 7 }
  ]
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'summary';
    const team = searchParams.get('team');
    
    // For operations reports, get latest query data
    if (team === 'operations' || type === 'operations') {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || `${process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : 'https://' + (request.headers.get('host') || 'localhost')}`;
        const queriesResponse = await fetch(`${baseUrl}/api/queries?status=all`, {
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });
        
        if (queriesResponse.ok) {
          const queriesData = await queriesResponse.json();
          if (queriesData.success) {
            const queries = queriesData.data || [];
            
            // Enhance queries with approval tracking fields for reports
            const enhancedQueries = queries.map((query: any) => ({
              ...query,
              // Ensure approval fields are included
              approvedBy: query.approvedBy || query.resolvedBy || null,
              approvedAt: query.approvedAt || query.resolvedAt || null,
              approvalDate: query.approvalDate || query.resolvedAt || null,
              approvalStatus: query.approvalStatus || (
                query.status === 'approved' ? 'approved' :
                query.status === 'deferred' ? 'deferral' :
                query.status === 'otc' ? 'otc' :
                query.status === 'waived' ? 'waived' : null
              ),
              // Format dates for reports
              formattedApprovalDate: query.approvedAt || query.resolvedAt ?
                new Date(query.approvedAt || query.resolvedAt).toLocaleDateString('en-US') : null,
              formattedApprovalTime: query.approvedAt || query.resolvedAt ?
                new Date(query.approvedAt || query.resolvedAt).toLocaleTimeString('en-US') : null
            }));
            
            // Calculate real-time statistics with approval tracking
            const stats = {
              total: queries.length,
              pending: queries.filter((q: any) => q.status === 'pending').length,
              approved: queries.filter((q: any) => q.status === 'approved').length,
              deferred: queries.filter((q: any) => q.status === 'deferred').length,
              otc: queries.filter((q: any) => q.status === 'otc').length,
              waived: queries.filter((q: any) => q.status === 'waived').length,
              resolved: queries.filter((q: any) => ['approved', 'deferred', 'otc', 'waived', 'resolved'].includes(q.status)).length,
              pendingApproval: queries.filter((q: any) => q.status === 'waiting for approval' || q.status === 'pending-approval').length,
              lastUpdated: new Date().toISOString(),
              // Add approval tracking stats
              approvedToday: queries.filter((q: any) => {
                if (!q.approvedAt && !q.resolvedAt) return false;
                const approvalDate = new Date(q.approvedAt || q.resolvedAt);
                const today = new Date();
                return approvalDate.toDateString() === today.toDateString();
              }).length,
              averageApprovalTime: calculateAverageApprovalTime(queries)
            };
            
            return NextResponse.json({
              success: true,
              data: {
                reports: mockReports,
                stats: stats,
                queries: enhancedQueries,
                type: 'operations',
                exportFields: [
                  'appNo',
                  'customerName',
                  'branch',
                  'status',
                  'priority',
                  'createdAt',
                  'submittedBy',
                  'approvedBy',
                  'formattedApprovalDate',
                  'formattedApprovalTime',
                  'approvalStatus',
                  'approverComment'
                ]
              }
            });
          }
        }
      } catch (error) {
        console.error('Error fetching live queries data for reports:', error);
      }
    }
    
    // Return credit-specific reports if team is credit
    if (team === 'credit') {
      const creditTemplates = [
        {
          id: '1',
          name: 'Credit Risk Summary',
          description: 'Comprehensive overview of credit risk across all applications',
          category: 'Risk Analysis',
          frequency: 'Daily',
          lastGenerated: '2024-08-14T09:00:00Z'
        },
        {
          id: '2',
          name: 'Approval Trends Report',
          description: 'Analysis of approval and rejection trends over time',
          category: 'Performance',
          frequency: 'Weekly',
          lastGenerated: '2024-08-13T15:30:00Z'
        },
        {
          id: '3',
          name: 'Branch Performance Report',
          description: 'Credit performance metrics by branch location',
          category: 'Performance',
          frequency: 'Monthly',
          lastGenerated: '2024-08-01T10:00:00Z'
        },
        {
          id: '4',
          name: 'High Risk Cases Report',
          description: 'Detailed analysis of high-risk credit applications',
          category: 'Risk Analysis',
          frequency: 'Weekly',
          lastGenerated: '2024-08-12T14:20:00Z'
        },
        {
          id: '5',
          name: 'Portfolio Analysis',
          description: 'Credit portfolio distribution and performance analysis',
          category: 'Analytics',
          frequency: 'Monthly',
          lastGenerated: '2024-08-05T11:15:00Z'
        },
        {
          id: '6',
          name: 'Regulatory Compliance Report',
          description: 'Compliance metrics and regulatory requirements status',
          category: 'Compliance',
          frequency: 'Monthly',
          lastGenerated: '2024-08-01T16:45:00Z'
        }
      ];

      const creditGenerated = [
        {
          id: '1',
          name: 'Credit Risk Summary - Aug 2024',
          type: 'Credit Risk Summary',
          generatedBy: 'Credit Manager',
          generatedAt: '2024-08-14T09:00:00Z',
          fileSize: '2.4 MB',
          status: 'completed',
          downloadUrl: '/reports/credit-risk-summary-aug-2024.pdf'
        },
        {
          id: '2',
          name: 'Branch Performance - July 2024',
          type: 'Branch Performance Report',
          generatedBy: 'Credit Analyst',
          generatedAt: '2024-08-01T10:00:00Z',
          fileSize: '1.8 MB',
          status: 'completed',
          downloadUrl: '/reports/branch-performance-july-2024.pdf'
        },
        {
          id: '3',
          name: 'High Risk Cases - Week 32',
          type: 'High Risk Cases Report',
          generatedBy: 'Risk Analyst',
          generatedAt: '2024-08-12T14:20:00Z',
          fileSize: '945 KB',
          status: 'completed',
          downloadUrl: '/reports/high-risk-cases-week-32.pdf'
        }
      ];

      return NextResponse.json({
        success: true,
        data: {
          templates: creditTemplates,
          generated: creditGenerated
        }
      });
    }
    
    // In a real app, you would filter reports based on user permissions and team
    return NextResponse.json({
      success: true,
      data: {
        reports: mockReports,
        stats: mockDashboardStats
      }
    });
  } catch (error) {
    console.error('Error fetching reports:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch reports'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('Generating new report:', body);

    // Mock report generation
    const newReport = {
      id: Date.now().toString(),
      ...body,
      generatedAt: new Date(),
      downloadUrl: `/reports/${body.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.${body.format}`
    };

    // Simulate report generation delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    return NextResponse.json({
      success: true,
      message: 'Report generated successfully',
      data: newReport
    });
  } catch (error) {
    console.error('Error generating report:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate report'
      },
      { status: 500 }
    );
  }
}

// Helper function to calculate average approval time
function calculateAverageApprovalTime(queries: any[]): string {
  const approvedQueries = queries.filter(q =>
    (q.status === 'approved' || q.status === 'deferred' || q.status === 'otc' || q.status === 'waived') &&
    q.createdAt && (q.approvedAt || q.resolvedAt)
  );
  
  if (approvedQueries.length === 0) return 'N/A';
  
  const totalTime = approvedQueries.reduce((sum, q) => {
    const created = new Date(q.createdAt).getTime();
    const approved = new Date(q.approvedAt || q.resolvedAt).getTime();
    return sum + (approved - created);
  }, 0);
  
  const avgMs = totalTime / approvedQueries.length;
  const avgHours = Math.round(avgMs / (1000 * 60 * 60));
  
  if (avgHours < 24) {
    return `${avgHours} hours`;
  } else {
    const avgDays = Math.round(avgHours / 24);
    return `${avgDays} days`;
  }
}
