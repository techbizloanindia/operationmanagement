import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { queryId } = body;

    console.log('🔍 PATCH DEBUG - Testing PATCH update for queryId:', queryId);
    
    // Test the same update that the action buttons would send
    const updateData = {
      queryId: queryId,
      originalQueryId: queryId,
      status: 'approved',
      resolvedAt: new Date().toISOString(),
      resolvedBy: 'Debug User',
      resolvedByTeam: 'Sales',
      resolutionReason: 'approve',
      resolutionStatus: 'approve',
      isResolved: true,
      isIndividualQuery: true,
      approvedBy: 'Debug User',
      approvedAt: new Date().toISOString(),
      approvalDate: new Date().toISOString(),
      approvalStatus: 'approve'
    };

    console.log('🔍 PATCH DEBUG - Sending update:', updateData);

    // Call the actual PATCH endpoint
    const response = await fetch('http://localhost:3000/api/queries', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updateData),
    });

    const result = await response.json();
    
    console.log('🔍 PATCH DEBUG - Response:', {
      status: response.status,
      ok: response.ok,
      result: result
    });

    // Now check if the query was actually updated
    const { db } = await connectDB();
    const updatedQuery = await db.collection('queries').findOne({ 'queries.id': queryId });
    const specificQuery = updatedQuery?.queries?.find((q: any) => q.id === queryId);
    
    console.log('🔍 PATCH DEBUG - After update check:', {
      queryFound: !!updatedQuery,
      specificQueryFound: !!specificQuery,
      specificQueryStatus: specificQuery?.status
    });

    return NextResponse.json({
      success: true,
      data: {
        queryId,
        patchResponse: {
          status: response.status,
          ok: response.ok,
          result: result
        },
        afterUpdate: {
          queryFound: !!updatedQuery,
          specificQueryFound: !!specificQuery,
          specificQueryStatus: specificQuery?.status,
          specificQuery: specificQuery
        }
      }
    });
    
  } catch (error) {
    console.error('❌ PATCH DEBUG error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}