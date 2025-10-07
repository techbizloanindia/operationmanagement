import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Query from '@/lib/models/Query';

// GET - Fetch queries assigned to Sales team
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'pending';
    
    console.log('🏢 Sales Dashboard: Fetching queries...');
    
    let salesQueries: any[] = [];
    
    // Try MongoDB first
    try {
      const { connectDB } = await import('@/lib/mongodb');
      const { db } = await connectDB();
      
      // Build query filter for sales team
      const filter: any = {
        $or: [
          { markedForTeam: 'sales' },
          { markedForTeam: 'both' },
          { team: 'sales' },
          { sendToSales: true }
        ]
      };
      
      if (status !== 'all') {
        filter.status = status;
      }
      
      const queries = await db.collection('queries').find(filter).sort({ createdAt: -1 }).toArray();
      console.log(`🏢 Sales Dashboard: Found ${queries.length} queries in MongoDB`);
      
      // Convert to plain objects with proper date formatting
      salesQueries = queries.map(query => ({
        ...query,
        id: query.id || query._id?.toString(),
        createdAt: query.createdAt?.toISOString ? query.createdAt.toISOString() : query.createdAt,
        submittedAt: query.submittedAt?.toISOString ? query.submittedAt.toISOString() : query.submittedAt || query.createdAt,
        resolvedAt: query.resolvedAt?.toISOString ? query.resolvedAt.toISOString() : query.resolvedAt,
        lastUpdated: query.lastUpdated?.toISOString ? query.lastUpdated.toISOString() : query.lastUpdated,
        remarks: query.remarks?.map((remark: any) => ({
          ...remark,
          timestamp: remark.timestamp?.toISOString ? remark.timestamp.toISOString() : remark.timestamp,
          editedAt: remark.editedAt?.toISOString ? remark.editedAt.toISOString() : remark.editedAt
        })) || []
      }));
      
    } catch (dbError) {
      console.error('❌ Sales Dashboard: MongoDB query failed, checking in-memory storage:', dbError);
      
      // Fallback to main queries API
      const fallbackResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/queries?status=${status}&team=sales`);
      const fallbackResult = await fallbackResponse.json();
      
      if (fallbackResult.success) {
        salesQueries = fallbackResult.data.filter((query: any) => 
          query.markedForTeam === 'sales' || 
          query.markedForTeam === 'both' || 
          query.sendToSales === true
        );
        console.log(`🏢 Sales Dashboard: Found ${salesQueries.length} queries via fallback API`);
      }
    }
    
    return NextResponse.json({
      success: true,
      data: salesQueries,
      count: salesQueries.length,
      team: 'sales',
      filters: { status }
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('💥 Sales Dashboard: Error fetching queries:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage,
        team: 'sales'
      },
      { status: 500 }
    );
  }
}

// PATCH - Update query status from Sales team
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { queryId, action, remarks, assignedTo, salesTeamMember } = body;
    
    console.log(`🏢 Sales Dashboard: Processing ${action} action for query ${queryId}`);
    
    if (!queryId || !action) {
      return NextResponse.json(
        { success: false, error: 'Query ID and action are required' },
        { status: 400 }
      );
    }

    // Use the main query-actions API for consistency and proper waiver support
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    
    const actionBody = {
      type: 'action',
      queryId: parseInt(queryId) || queryId,
      action: action,
      remarks: remarks || `${action} by Sales team`,
      salesTeamMember: salesTeamMember || 'Sales Team',
      team: 'Sales',
      assignedTo: assignedTo
    };

    console.log('🏢 Sales API: Delegating to main query-actions endpoint:', actionBody);

    const response = await fetch(`${baseUrl}/api/query-actions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(actionBody),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('❌ Sales API: Query-actions API failed:', result);
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to process action' },
        { status: response.status }
      );
    }

    console.log(`✅ Sales API: Query ${queryId} ${action} action completed successfully`);
    
    return NextResponse.json({
      success: true,
      message: `Query ${action}ed successfully by Sales team`,
      queryId,
      action,
      data: result.data
    });
    
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('💥 Sales Dashboard: Error updating query:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage
      },
      { status: 500 }
    );
  }
}