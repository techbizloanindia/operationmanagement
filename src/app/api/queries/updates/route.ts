import { NextRequest, NextResponse } from 'next/server';
import { getQueryUpdatesSince } from '@/lib/queryUpdateLogger';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const since = url.searchParams.get('since');
    
    if (!since) {
      return NextResponse.json({
        success: false,
        error: 'Missing since parameter'
      }, { status: 400 });
    }

    const sinceDate = new Date(since);
    
    // Get updates from the logger
    const recentUpdates = getQueryUpdatesSince(since);
    
    // If no updates in log, check the main database for recent changes
    if (recentUpdates.length === 0 && global.globalQueriesDatabase) {
      const queries = global.globalQueriesDatabase;
      const recentQueries = queries.filter(query => {
        const queryDate = new Date(query.lastUpdated || query.createdAt);
        return queryDate > sinceDate;
      }).slice(0, 20);

      // Convert to update format
      const queryUpdates = recentQueries.map(query => ({
        queryId: query.id.toString(),
        appNo: query.appNo,
        customerName: query.customerName,
        branch: query.branch,
        status: query.status,
        priority: query.priority,
        team: query.team || query.markedForTeam,
        markedForTeam: query.markedForTeam,
        createdAt: query.createdAt,
        submittedBy: query.submittedBy,
        action: (new Date(query.createdAt) > sinceDate ? 'created' : 'updated') as 'created' | 'updated',
        timestamp: query.lastUpdated || query.createdAt
      }));

      return NextResponse.json({
        success: true,
        data: queryUpdates,
        count: queryUpdates.length
      });
    }

    return NextResponse.json({
      success: true,
      data: recentUpdates,
      count: recentUpdates.length
    });

  } catch (error) {
    console.error('Error fetching query updates:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch query updates'
    }, { status: 500 });
  }
}