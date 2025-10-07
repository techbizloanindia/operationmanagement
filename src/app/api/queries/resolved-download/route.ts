import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'json'; // csv, excel, or json
    
    // Connect to MongoDB for real-time data
    const { db } = await connectDB();
    
    // Build query filter for resolved queries
    const filter = {
      status: { 
        $in: [
          'resolved', 'approved', 'deferred', 'otc', 'waived', 
          'request-approved', 'request-deferral', 'request-otc', 
          'completed', 'waiting for approval'
        ] 
      }
    };
    
    // Fetch queries from MongoDB with real-time data
    const queries = await db.collection('queries')
      .find(filter)
      .sort({ resolvedAt: -1, lastUpdated: -1 })
      .toArray();
    
    // Transform MongoDB documents for download
    const transformedQueries = queries.map((query, index) => {
      const resolvedAt = query.resolvedAt || query.lastUpdated || query.approvedAt;
      const submittedAt = query.submittedAt || query.createdAt;
      
      // Extract query text from queries array
      const queryText = query.queries && query.queries.length > 0 
        ? query.queries.map((q: any) => q.text).join('; ') 
        : 'No query text available';
      
      return {
        'S.No': index + 1,
        'Application': query.appNo,
        'Query Text': queryText,
        'Customer': query.customerName || 'Unknown Customer',
        'Branch': query.branch || 'Unknown Branch',
        'Status': query.status,
        'Resolved By': query.resolvedBy || query.approvedBy || 'N/A',
        'Approver Name': query.approvedBy || query.resolvedBy || 'N/A',
        'Query Raise Date': submittedAt ? new Date(submittedAt).toLocaleDateString() : 'N/A',
        'Query Raise Time': submittedAt ? new Date(submittedAt).toLocaleTimeString() : 'N/A',
        'Resolved Date': resolvedAt ? new Date(resolvedAt).toLocaleDateString() : 'N/A',
        'Resolved Time': resolvedAt ? new Date(resolvedAt).toLocaleTimeString() : 'N/A',
        'Resolution Reason': query.resolutionReason || query.resolutionStatus || 'N/A'
      };
    });
    
    return NextResponse.json({
      success: true,
      data: transformedQueries,
      total: transformedQueries.length,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error in resolved queries download API:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch resolved queries for download',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}