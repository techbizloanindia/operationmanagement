import { NextRequest, NextResponse } from 'next/server';
import { broadcastQueryUpdate } from '@/lib/eventStreamUtils';
import { logQueryUpdate } from '@/lib/queryUpdateLogger';

// Test endpoint to verify real-time functionality
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { team = 'both', appNo = 'TEST-001' } = body;
    
    // Create a test update
    const testUpdate = {
      id: `test-${Date.now()}`,
      appNo: appNo,
      customerName: 'Test Customer',
      branch: 'Test Branch',
      status: 'pending',
      priority: 'medium',
      team: team === 'both' ? 'both' : team,
      markedForTeam: team,
      createdAt: new Date().toISOString(),
      submittedBy: 'Test User',
      action: 'created' as const
    };
    
    console.log('🧪 Creating test real-time update:', testUpdate);
    
    // Log the update for polling fallback
    logQueryUpdate({
      queryId: testUpdate.id,
      appNo: testUpdate.appNo,
      customerName: testUpdate.customerName,
      branch: testUpdate.branch,
      status: testUpdate.status,
      priority: testUpdate.priority,
      team: testUpdate.team,
      markedForTeam: testUpdate.markedForTeam,
      createdAt: testUpdate.createdAt,
      submittedBy: testUpdate.submittedBy,
      action: 'created'
    });
    
    // Broadcast via SSE
    broadcastQueryUpdate(testUpdate);
    
    return NextResponse.json({
      success: true,
      message: 'Test real-time update sent successfully',
      data: testUpdate
    });
    
  } catch (error) {
    console.error('Error sending test update:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to send test update'
    }, { status: 500 });
  }
}

// Get connection status
export async function GET(request: NextRequest) {
  try {
    const { getConnections } = await import('@/lib/eventStreamUtils');
    const connections = getConnections();
    
    return NextResponse.json({
      success: true,
      data: {
        connectionCount: connections.length,
        connections: connections.map(conn => ({
          id: conn.id,
          lastPing: new Date(conn.lastPing).toISOString()
        }))
      }
    });
    
  } catch (error) {
    console.error('Error getting connection status:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to get connection status'
    }, { status: 500 });
  }
}
