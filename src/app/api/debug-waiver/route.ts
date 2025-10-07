import { NextRequest, NextResponse } from 'next/server';

/**
 * Debug endpoint to test waiver action flow
 * This will help us understand why waiver actions are going through approval workflow
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('🔍 Debug waiver action request:', JSON.stringify(body, null, 2));
    
    const { queryId, action = 'waiver', remarks = 'Debug test waiver', operationTeamMember = 'Debug User' } = body;
    
    if (!queryId) {
      return NextResponse.json({
        success: false,
        error: 'queryId is required for testing'
      }, { status: 400 });
    }
    
    // Test the waiver action logic
    const teamMember = operationTeamMember || 'Debug User';
    const actionTeam = 'Operations';
    
    // This is the same logic from the main query-actions route
    const isApprovalAction = ['approve', 'deferral', 'otc'].includes(action) && 
                            ['Operations', 'Sales', 'Credit'].includes(actionTeam);
    
    console.log('🔍 Debug analysis:');
    console.log(`- Action: ${action}`);
    console.log(`- Team: ${actionTeam}`);
    console.log(`- Is approval action: ${isApprovalAction}`);
    console.log(`- Should be processed immediately: ${!isApprovalAction}`);
    
    if (isApprovalAction) {
      return NextResponse.json({
        success: false,
        debug: true,
        message: 'This action would go through approval workflow (THIS IS THE BUG!)',
        analysis: {
          action,
          actionTeam,
          isApprovalAction,
          shouldProcessImmediately: false
        }
      });
    } else {
      // Test calling the actual query-actions endpoint
      const testPayload = {
        type: 'action',
        queryId,
        action,
        remarks,
        operationTeamMember
      };
      
      console.log('🧪 Testing actual API call with payload:', testPayload);
      
      const response = await fetch('http://localhost:3000/api/query-actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testPayload),
      });
      
      const result = await response.json();
      
      return NextResponse.json({
        success: true,
        debug: true,
        message: 'This action would be processed immediately (CORRECT)',
        analysis: {
          action,
          actionTeam,
          isApprovalAction,
          shouldProcessImmediately: true
        },
        apiResponse: result,
        apiStatus: response.status
      });
    }
    
  } catch (error) {
    console.error('❌ Debug waiver error:', error);
    return NextResponse.json({
      success: false,
      error: 'Debug test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// GET endpoint to show current waiver logic
export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'Waiver Debug Endpoint',
    usage: 'POST with { queryId, action: "waiver", remarks, operationTeamMember }',
    currentLogic: {
      approvalActions: ['approve', 'deferral', 'otc'],
      directActions: ['waiver', 'revert', 'assign-branch', 'respond', 'escalate'],
      note: 'Waiver should be processed immediately without approval'
    }
  });
}