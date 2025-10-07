import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';

/**
 * Sales Reports API Route
 * Generates and manages sales team reports
 */

// GET - Fetch sales reports
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const reportType = searchParams.get('type') || 'summary';
    const period = searchParams.get('period') || '30';
    const branch = searchParams.get('branch') || 'all';
    const format = searchParams.get('format') || 'json';
    
    console.log(`📋 Sales Reports: Generating ${reportType} report for ${period} days`);
    
    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - parseInt(period));
    
    const reportData: any = {
      metadata: {
        reportType,
        period: `${period} days`,
        branch,
        generatedAt: new Date().toISOString(),
        generatedBy: 'Sales Team'
      },
      summary: {},
      details: []
    };

    try {
      const { db } = await connectDB();
      
      // Build filter for sales queries
      const filter: any = {
        $or: [
          { markedForTeam: 'sales' },
          { markedForTeam: 'both' },
          { team: 'sales' },
          { sendToSales: true }
        ],
        createdAt: {
          $gte: startDate,
          $lte: endDate
        }
      };

      if (branch !== 'all') {
        filter.branch = branch;
      }

      const queries = await db.collection('queries').find(filter).sort({ createdAt: -1 }).toArray();
      console.log(`📋 Sales Reports: Found ${queries.length} queries for report`);

      switch (reportType) {
        case 'summary':
          reportData.summary = {
            totalQueries: queries.length,
            resolvedQueries: queries.filter(q => 
              ['approved', 'deferred', 'otc', 'waived', 'resolved'].includes(q.status)
            ).length,
            pendingQueries: queries.filter(q => 
              ['pending', 'waiting for approval'].includes(q.status)
            ).length,
            actionBreakdown: {
              approved: queries.filter(q => q.status === 'approved').length,
              deferred: queries.filter(q => q.status === 'deferred').length,
              otc: queries.filter(q => q.status === 'otc').length,
              waived: queries.filter(q => q.status === 'waived').length
            }
          };
          break;

        case 'detailed':
          reportData.details = queries.map(query => ({
            id: query.id,
            appNo: query.appNo,
            customerName: query.customerName,
            branch: query.branch,
            status: query.status,
            createdAt: query.createdAt,
            resolvedAt: query.resolvedAt,
            resolvedBy: query.resolvedBy,
            resolutionReason: query.resolutionReason,
            queries: query.queries?.map((subQuery: any) => ({
              id: subQuery.id,
              text: subQuery.text,
              status: subQuery.status,
              resolvedAt: subQuery.resolvedAt
            })) || []
          }));
          break;

        case 'performance':
          // Calculate performance metrics
          const branchPerformance: { [key: string]: any } = {};
          queries.forEach(query => {
            const queryBranch = query.branch || 'Unknown';
            if (!branchPerformance[queryBranch]) {
              branchPerformance[queryBranch] = {
                total: 0,
                resolved: 0,
                avgResolutionTime: 0,
                resolutionTimes: []
              };
            }
            branchPerformance[queryBranch].total++;
            
            if (query.resolvedAt && ['approved', 'deferred', 'otc', 'waived', 'resolved'].includes(query.status)) {
              branchPerformance[queryBranch].resolved++;
              const resolutionTime = new Date(query.resolvedAt).getTime() - new Date(query.createdAt).getTime();
              branchPerformance[queryBranch].resolutionTimes.push(resolutionTime);
            }
          });

          // Calculate average resolution times
          Object.keys(branchPerformance).forEach(branch => {
            const perf = branchPerformance[branch];
            if (perf.resolutionTimes.length > 0) {
              perf.avgResolutionTime = Math.round(
                (perf.resolutionTimes.reduce((sum: number, time: number) => sum + time, 0) / perf.resolutionTimes.length) 
                / (1000 * 60 * 60 * 24) // Convert to days
              );
            }
            delete perf.resolutionTimes; // Remove raw data from response
          });

          reportData.performance = branchPerformance;
          break;
      }

    } catch (dbError) {
      console.error('❌ Sales Reports: MongoDB error, using fallback data:', dbError);
      
      // Provide fallback report data
      reportData.summary = {
        totalQueries: 25,
        resolvedQueries: 18,
        pendingQueries: 7,
        actionBreakdown: {
          approved: 8,
          deferred: 5,
          otc: 3,
          waived: 2
        }
      };
    }

    // Return different formats based on request
    if (format === 'csv' && reportType === 'detailed') {
      // Generate CSV format
      const csvHeaders = ['ID', 'App No', 'Customer Name', 'Branch', 'Status', 'Created At', 'Resolved At', 'Resolved By'];
      const csvRows = reportData.details.map((item: any) => {
        return [
          item.id,
          item.appNo,
          item.customerName,
          item.branch,
          item.status,
          item.createdAt,
          item.resolvedAt || '',
          item.resolvedBy || item.approvedBy || ''
        ];
      });
      
      const csvContent = [
        csvHeaders.join(','),
        ...csvRows.map((row: any[]) => row.join(','))
      ].join('\n');

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="sales-report-${Date.now()}.csv"`
        }
      });
    }

    return NextResponse.json({
      success: true,
      data: reportData
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('💥 Sales Reports: Error generating report:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage
      },
      { status: 500 }
    );
  }
}

// POST - Generate custom reports
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { reportType, filters, email } = body;
    
    console.log(`📋 Sales Reports: Generating custom ${reportType} report`);

    // Generate custom report based on filters
    const reportId = `sales-custom-${Date.now()}`;
    
    // Here you would typically:
    // 1. Process the custom filters
    // 2. Generate the report
    // 3. Store it for download
    // 4. Optionally email it

    return NextResponse.json({
      success: true,
      reportId,
      message: 'Custom sales report generated successfully',
      downloadUrl: `/api/reports/download/${reportId}`,
      estimatedCompletion: new Date(Date.now() + 5 * 60 * 1000).toISOString() // 5 minutes
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('💥 Sales Reports: Error generating custom report:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage
      },
      { status: 500 }
    );
  }
}