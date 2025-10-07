import { NextRequest, NextResponse } from 'next/server';

/**
 * Test endpoint to verify waiver action functionality
 * This endpoint helps test that waiver actions properly resolve single queries
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { queryId, team = 'Operations', teamMember = 'Test User', remarks = 'Test waiver action' } = body;

    if (!queryId) {
      return NextResponse.json({
        success: false,
        error: 'queryId is required for testing waiver action'
      }, { status: 400 });
    }

    console.log('🧪 TEST WAIVER ACTION - Starting test for query:', queryId);

    // Test the waiver action by calling the main query-actions endpoint
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/query-actions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'action',
        queryId: queryId,
        action: 'waiver',
        remarks: remarks,
        operationTeamMember: team === 'Operations' ? teamMember : undefined,
        salesTeamMember: team === 'Sales' ? teamMember : undefined,
        creditTeamMember: team === 'Credit' ? teamMember : undefined,
        team: team
      }),
    });

    const result = await response.json();

    console.log('🧪 TEST WAIVER ACTION - Result:', result);

    if (response.ok) {
      return NextResponse.json({
        success: true,
        message: 'Waiver action test completed successfully',
        data: result,
        testInfo: {
          queryId: queryId,
          team: team,
          teamMember: teamMember,
          remarks: remarks,
          timestamp: new Date().toISOString()
        }
      });
    } else {
      return NextResponse.json({
        success: false,
        error: 'Waiver action test failed',
        details: result,
        testInfo: {
          queryId: queryId,
          team: team,
          teamMember: teamMember,
          remarks: remarks,
          timestamp: new Date().toISOString()
        }
      }, { status: 500 });
    }

  } catch (error) {
    console.error('🧪 TEST WAIVER ACTION - Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Test waiver action failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// GET endpoint to show test instructions
export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'Waiver Action Test Endpoint',
    usage: 'POST with { queryId, team?, teamMember?, remarks? }',
    description: 'Tests that waiver actions properly resolve single queries and move them to resolved section',
    example: {
      queryId: 123,
      team: 'Credit',
      teamMember: 'John Doe',
      remarks: 'Test waiver for verification'
    }
  });
}