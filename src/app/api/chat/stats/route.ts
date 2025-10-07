import { NextRequest, NextResponse } from 'next/server';
import { RemarkModel } from '@/lib/models/Chat';

// GET - Get chat statistics across all queries
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const team = searchParams.get('team');
    const period = searchParams.get('period') || '24h'; // 24h, 7d, 30d
    
    // Calculate date range based on period
    const now = new Date();
    const periodHours = {
      '24h': 24,
      '7d': 24 * 7,
      '30d': 24 * 30
    };
    
    const hoursBack = periodHours[period as keyof typeof periodHours] || 24;
    const fromDate = new Date(now.getTime() - (hoursBack * 60 * 60 * 1000));
    
    const filters: any = {
      dateFrom: fromDate,
      dateTo: now
    };
    
    if (team) {
      filters.team = team;
    }
    
    // Get chat statistics
    const stats = await RemarkModel.getQueryStatistics(filters);
    
    // Calculate additional metrics
    const responseTime = await calculateAverageResponseTime(filters);
    const activeChats = await getActiveChatsCount();
    const messageVolume = await getMessageVolumeByHour(fromDate, now);
    
    return NextResponse.json({
      success: true,
      data: {
        ...stats,
        averageResponseTime: responseTime,
        activeChats,
        messageVolume,
        period,
        lastUpdated: new Date().toISOString()
      }
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('💥 Error fetching chat stats:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: `Failed to fetch chat statistics: ${errorMessage}`
      },
      { status: 500 }
    );
  }
}

// Helper function to calculate average response time
async function calculateAverageResponseTime(filters: any): Promise<string> {
  try {
    // This would typically involve complex aggregation queries
    // For now, return a mock calculation
    const mockResponseTimes = ['2.5 min', '4.2 min', '1.8 min', '3.7 min'];
    return mockResponseTimes[Math.floor(Math.random() * mockResponseTimes.length)];
  } catch (error) {
    console.error('Error calculating response time:', error);
    return 'N/A';
  }
}

// Helper function to get active chats count
async function getActiveChatsCount(): Promise<number> {
  try {
    // Count chats with activity in the last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const activeQueries = await RemarkModel.getAllRemarkQueries({
      // This would need to be implemented in RemarkModel
    });
    
    // For now, return a mock count
    return Math.floor(Math.random() * 15) + 5;
  } catch (error) {
    console.error('Error getting active chats:', error);
    return 0;
  }
}

// Helper function to get message volume by hour
async function getMessageVolumeByHour(fromDate: Date, toDate: Date): Promise<Array<{hour: string, count: number}>> {
  try {
    // This would typically involve time-based aggregation
    // For now, return mock data
    const hours = [];
    const current = new Date(fromDate);
    
    while (current <= toDate) {
      hours.push({
        hour: current.toISOString().slice(0, 13) + ':00:00.000Z',
        count: Math.floor(Math.random() * 20) + 5
      });
      current.setHours(current.getHours() + 1);
    }
    
    return hours.slice(-24); // Return last 24 hours
  } catch (error) {
    console.error('Error getting message volume:', error);
    return [];
  }
}