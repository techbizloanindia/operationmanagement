import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { queryId } = body;

    console.log('🧪 COMPREHENSIVE DEBUG - Testing full action flow for queryId:', queryId);
    
    // Step 1: Check initial status
    const { db } = await connectDB();
    const beforeQuery = await db.collection('queries').findOne({ 'queries.id': queryId });
    const beforeSpecific = beforeQuery?.queries?.find((q: any) => q.id === queryId);
    
    console.log('🧪 STEP 1 - Before action status:', beforeSpecific?.status);
    
    // Step 2: Execute waiver action
    const actionBody = {
      type: "action",
      queryId: queryId,
      action: "waiver",
      remarks: "Comprehensive test waiver",
      creditTeamMember: "Test User",
      team: "Credit"
    };
    
    console.log('🧪 STEP 2 - Executing action:', actionBody);
    
    const actionResponse = await fetch('http://localhost:3000/api/query-actions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(actionBody)
    });
    
    const actionResult = await actionResponse.json();
    console.log('🧪 STEP 2 - Action result:', actionResult.success ? 'SUCCESS' : 'FAILED');
    
    // Step 3: Check status immediately after action
    const afterQuery = await db.collection('queries').findOne({ 'queries.id': queryId });
    const afterSpecific = afterQuery?.queries?.find((q: any) => q.id === queryId);
    
    console.log('🧪 STEP 3 - After action status:', afterSpecific?.status);
    
    // Step 4: Check what the action endpoint actually sent to PATCH
    console.log('🧪 STEP 4 - Analyzing action result data');
    
    return NextResponse.json({
      success: true,
      data: {
        queryId,
        before: {
          status: beforeSpecific?.status,
          query: beforeSpecific
        },
        actionResult: {
          success: actionResult.success,
          data: actionResult.data
        },
        after: {
          status: afterSpecific?.status,
          query: afterSpecific
        },
        statusChanged: beforeSpecific?.status !== afterSpecific?.status,
        expectedStatus: 'waived',
        actualStatusMatch: afterSpecific?.status === 'waived'
      }
    });
    
  } catch (error) {
    console.error('❌ Comprehensive debug error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}