import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const team = searchParams.get('team');
    const branch = searchParams.get('branch');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    
    // Connect to MongoDB for real-time data
    const { db } = await connectDB();
    
    // Build query filter for resolved queries
    const filter: any = {
      status: { 
        $in: ['resolved', 'approved', 'deferred', 'otc', 'waived', 'request-approved', 'request-deferral', 'request-otc', 'completed', 'waiting for approval'] 
      }
    };
    
    // Add team filter if specified
    if (team) {
      const teamLower = team.toLowerCase();
      filter.$or = [
        { markedForTeam: teamLower },
        { team: teamLower },
        { resolvedByTeam: teamLower },
        { resolutionTeam: teamLower }
      ];
      
      // Include queries with sendToSales/sendToCredit flags
      if (teamLower === 'sales') {
        filter.$or.push({ sendToSales: true });
        filter.$or.push({ sendTo: 'Sales' });
        filter.$or.push({ sendTo: { $in: ['Sales'] } });
      } else if (teamLower === 'credit') {
        filter.$or.push({ sendToCredit: true });
        filter.$or.push({ sendTo: 'Credit' });
        filter.$or.push({ sendTo: { $in: ['Credit'] } });
      }
    }
    
    // Add branch filter if specified
    if (branch) {
      filter.branch = branch;
    }
    
    // Add date range filter if specified
    if (dateFrom || dateTo) {
      const dateFilter: any = {};
      if (dateFrom) {
        dateFilter.$gte = new Date(dateFrom);
      }
      if (dateTo) {
        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999);
        dateFilter.$lte = endDate;
      }
      
      filter.$or = [
        { resolvedAt: dateFilter },
        { lastUpdated: dateFilter },
        { approvedAt: dateFilter }
      ];
    }
    
    // Fetch queries from MongoDB with real-time data
    const queries = await db.collection('queries')
      .find(filter)
      .sort({ resolvedAt: -1, lastUpdated: -1 })
      .toArray();
    
    // Transform MongoDB documents to include all necessary fields
    const transformedQueries = queries.map(query => {
      // Ensure dates are properly formatted
      const resolvedAt = query.resolvedAt || query.lastUpdated || query.approvedAt;
      const submittedAt = query.submittedAt || query.createdAt;
      
      return {
        id: query.id || query._id?.toString(),
        appNo: query.appNo,
        customerName: query.customerName || 'Unknown Customer',
        branch: query.branch || 'Unknown Branch',
        branchCode: query.branchCode || query.branch || 'Unknown',
        status: query.status,
        priority: query.priority || 'medium',
        title: query.title || `Query - ${query.appNo}`,
        queries: query.queries || [],
        sendTo: query.sendTo || [],
        submittedBy: query.submittedBy || 'Unknown',
        submittedAt: submittedAt ? new Date(submittedAt).toISOString() : new Date().toISOString(),
        lastUpdated: query.lastUpdated ? new Date(query.lastUpdated).toISOString() : new Date().toISOString(),
        resolvedAt: resolvedAt ? new Date(resolvedAt).toISOString() : null,
        resolvedBy: query.resolvedBy || query.approvedBy || null,
        resolvedByTeam: query.resolvedByTeam || query.resolutionTeam || team || null,
        resolutionTeam: query.resolutionTeam || query.resolvedByTeam || team || null,
        resolutionReason: query.resolutionReason || query.resolutionStatus || null,
        amount: query.amount || null,
        appliedOn: query.appliedOn || null,
        assignedTo: query.assignedTo || null,
        approvedBy: query.approvedBy || query.resolvedBy || null,
        approvedAt: query.approvedAt || query.resolvedAt || null,
        remarks: query.remarks || [],
        // Additional fields for reports
        approverComment: query.approverComment || null,
        approvalStatus: query.approvalStatus || query.status,
        approvalDate: query.approvalDate || query.approvedAt || query.resolvedAt || null
      };
    });
    
    // Filter out Unknown Customer/Branch for sales and credit teams
    let filteredQueries = transformedQueries;
    if (team && (team === 'sales' || team === 'credit')) {
      filteredQueries = transformedQueries.filter(query => 
        query.customerName !== 'Unknown Customer' && 
        query.customerName !== 'Unknown' &&
        query.customerName !== '' &&
        query.branch !== 'Unknown Branch' &&
        query.branch !== 'Unknown' &&
        query.branch !== ''
      );
    }
    
    // Calculate statistics
    const stats = {
      totalResolved: filteredQueries.length,
      approvedCount: filteredQueries.filter(q => 
        ['approved', 'request-approved'].includes(q.status) || 
        (q.status === 'resolved' && q.resolutionReason === 'approve')
      ).length,
      deferredCount: filteredQueries.filter(q => 
        ['deferred', 'request-deferral'].includes(q.status) || 
        (q.status === 'resolved' && q.resolutionReason === 'deferral')
      ).length,
      otcCount: filteredQueries.filter(q => 
        ['otc', 'request-otc'].includes(q.status) || 
        (q.status === 'resolved' && q.resolutionReason === 'otc')
      ).length,
      waivedCount: filteredQueries.filter(q => 
        q.status === 'waived' || 
        (q.status === 'resolved' && q.resolutionReason === 'waiver')
      ).length,
      lastUpdated: new Date().toISOString()
    };
    
    return NextResponse.json({
      success: true,
      data: {
        queries: filteredQueries,
        stats: stats,
        timestamp: new Date().toISOString(),
        count: filteredQueries.length
      }
    }, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
    
  } catch (error) {
    console.error('Error fetching resolved queries:', error);
    
    // Fallback response with empty data
    return NextResponse.json({
      success: true,
      data: {
        queries: [],
        stats: {
          totalResolved: 0,
          approvedCount: 0,
          deferredCount: 0,
          otcCount: 0,
          waivedCount: 0,
          lastUpdated: new Date().toISOString()
        },
        timestamp: new Date().toISOString(),
        count: 0
      },
      error: 'Failed to fetch resolved queries, returning empty dataset'
    }, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  }
}

// POST endpoint for generating reports
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { filters, format = 'csv' } = body;
    
    // Get resolved queries based on filters
    const url = new URL(request.url);
    const params = new URLSearchParams();
    
    if (filters?.team) params.append('team', filters.team);
    if (filters?.branch) params.append('branch', filters.branch);
    if (filters?.dateFrom) params.append('dateFrom', filters.dateFrom);
    if (filters?.dateTo) params.append('dateTo', filters.dateTo);
    
    url.search = params.toString();
    
    // Fetch the data using GET endpoint
    const response = await GET(new NextRequest(url));
    const result = await response.json();
    
    if (!result.success) {
      throw new Error('Failed to fetch resolved queries for report');
    }
    
    return NextResponse.json({
      success: true,
      message: 'Report data generated successfully',
      data: result.data,
      format: format
    });
    
  } catch (error) {
    console.error('Error generating report:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to generate report'
    }, { status: 500 });
  }
}