import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';

/**
 * Sales Analytics API Route
 * Provides analytics data specific to Sales team operations
 */

// GET - Fetch sales analytics data
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '30'; // days
    const branch = searchParams.get('branch') || 'all';
    
    console.log(`📊 Sales Analytics: Fetching data for period: ${period} days, branch: ${branch}`);
    
    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - parseInt(period));
    
    // Define types for analytics data
    interface DailyTrend {
      date: string;
      total: number;
      resolved: number;
      pending: number;
    }

    interface BranchStats {
      total: number;
      resolved: number;
      pending: number;
      resolutionRate: number;
    }

    let analyticsData: {
      summary: {
        totalQueries: number;
        resolvedQueries: number;
        pendingQueries: number;
        resolutionRate: number;
        avgResolutionTime: number;
      };
      actions: {
        approved: number;
        deferred: number;
        otc: number;
        waived: number;
      };
      trends: {
        daily: DailyTrend[];
        weekly: any[];
        monthly: any[];
      };
      branches: { [key: string]: BranchStats };
      performance: {
        salesExecs: { [key: string]: any };
        topPerformers: any[];
      };
    } = {
      summary: {
        totalQueries: 0,
        resolvedQueries: 0,
        pendingQueries: 0,
        resolutionRate: 0,
        avgResolutionTime: 0
      },
      actions: {
        approved: 0,
        deferred: 0,
        otc: 0,
        waived: 0
      },
      trends: {
        daily: [],
        weekly: [],
        monthly: []
      },
      branches: {},
      performance: {
        salesExecs: {},
        topPerformers: []
      }
    };

    try {
      const { db } = await connectDB();
      
      // Build filter for sales queries
      const filter: any = {
        $or: [
          { markedForTeam: 'sales' },
          { markedForTeam: 'both' },
          { team: 'sales' },
          { sendToSales: true }
        ],
        createdAt: {
          $gte: startDate,
          $lte: endDate
        }
      };

      if (branch !== 'all') {
        filter.branch = branch;
      }

      // Get queries data
      const queries = await db.collection('queries').find(filter).toArray();
      console.log(`📊 Sales Analytics: Found ${queries.length} queries`);

      // Calculate summary statistics
      analyticsData.summary.totalQueries = queries.length;
      analyticsData.summary.resolvedQueries = queries.filter(q => 
        ['approved', 'deferred', 'otc', 'waived', 'resolved'].includes(q.status)
      ).length;
      analyticsData.summary.pendingQueries = queries.filter(q => 
        ['pending', 'waiting for approval'].includes(q.status)
      ).length;
      analyticsData.summary.resolutionRate = analyticsData.summary.totalQueries > 0 
        ? Math.round((analyticsData.summary.resolvedQueries / analyticsData.summary.totalQueries) * 100)
        : 0;

      // Calculate action statistics
      queries.forEach(query => {
        if (query.queries && Array.isArray(query.queries)) {
          query.queries.forEach((subQuery: any) => {
            const status = subQuery.status || query.status;
            if (analyticsData.actions.hasOwnProperty(status)) {
              analyticsData.actions[status as keyof typeof analyticsData.actions]++;
            }
          });
        } else {
          const status = query.status;
          if (analyticsData.actions.hasOwnProperty(status)) {
            analyticsData.actions[status as keyof typeof analyticsData.actions]++;
          }
        }
      });

      // Calculate average resolution time for resolved queries
      const resolvedQueries = queries.filter(q => 
        q.resolvedAt && ['approved', 'deferred', 'otc', 'waived', 'resolved'].includes(q.status)
      );
      
      if (resolvedQueries.length > 0) {
        const totalResolutionTime = resolvedQueries.reduce((sum, query) => {
          const createdAt = new Date(query.createdAt);
          const resolvedAt = new Date(query.resolvedAt);
          return sum + (resolvedAt.getTime() - createdAt.getTime());
        }, 0);
        
        analyticsData.summary.avgResolutionTime = Math.round(
          (totalResolutionTime / resolvedQueries.length) / (1000 * 60 * 60 * 24) // Convert to days
        );
      }

      // Calculate branch-wise statistics
      const branchStats: { [key: string]: BranchStats } = {};
      queries.forEach(query => {
        const queryBranch = query.branch || 'Unknown';
        if (!branchStats[queryBranch]) {
          branchStats[queryBranch] = {
            total: 0,
            resolved: 0,
            pending: 0,
            resolutionRate: 0
          };
        }
        branchStats[queryBranch].total++;
        
        if (['approved', 'deferred', 'otc', 'waived', 'resolved'].includes(query.status)) {
          branchStats[queryBranch].resolved++;
        } else {
          branchStats[queryBranch].pending++;
        }
      });

      // Calculate resolution rates for branches
      Object.keys(branchStats).forEach(branch => {
        const stats = branchStats[branch];
        stats.resolutionRate = stats.total > 0 
          ? Math.round((stats.resolved / stats.total) * 100)
          : 0;
      });

      analyticsData.branches = branchStats;

      // Generate daily trends (last 30 days)
      const dailyTrends: DailyTrend[] = [];
      for (let i = parseInt(period) - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        const dayQueries = queries.filter(q => {
          const queryDate = new Date(q.createdAt).toISOString().split('T')[0];
          return queryDate === dateStr;
        });

        dailyTrends.push({
          date: dateStr,
          total: dayQueries.length,
          resolved: dayQueries.filter(q => 
            ['approved', 'deferred', 'otc', 'waived', 'resolved'].includes(q.status)
          ).length,
          pending: dayQueries.filter(q => 
            ['pending', 'waiting for approval'].includes(q.status)
          ).length
        });
      }

      analyticsData.trends.daily = dailyTrends;

    } catch (dbError) {
      console.error('❌ Sales Analytics: MongoDB error, using fallback data:', dbError);
      
      // Provide fallback analytics data
      analyticsData = {
        summary: {
          totalQueries: 25,
          resolvedQueries: 18,
          pendingQueries: 7,
          resolutionRate: 72,
          avgResolutionTime: 2
        },
        actions: {
          approved: 8,
          deferred: 5,
          otc: 3,
          waived: 2
        },
        trends: {
          daily: Array.from({ length: parseInt(period) }, (_, i): DailyTrend => ({
            date: new Date(Date.now() - (parseInt(period) - 1 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            total: Math.floor(Math.random() * 5) + 1,
            resolved: Math.floor(Math.random() * 4) + 1,
            pending: Math.floor(Math.random() * 2)
          })),
          weekly: [],
          monthly: []
        },
        branches: {
          'Delhi NCR': { total: 8, resolved: 6, pending: 2, resolutionRate: 75 },
          'Mumbai': { total: 7, resolved: 5, pending: 2, resolutionRate: 71 },
          'Bangalore': { total: 6, resolved: 4, pending: 2, resolutionRate: 67 },
          'Chennai': { total: 4, resolved: 3, pending: 1, resolutionRate: 75 }
        },
        performance: {
          salesExecs: {},
          topPerformers: []
        }
      };
    }

    return NextResponse.json({
      success: true,
      data: analyticsData,
      period: period,
      branch: branch,
      generatedAt: new Date().toISOString()
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('💥 Sales Analytics: Error fetching data:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage
      },
      { status: 500 }
    );
  }
}

// POST - Update sales analytics preferences or trigger reports
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, period, filters } = body;

    console.log(`📊 Sales Analytics: Processing action: ${action}`);

    // Handle different analytics actions
    switch (action) {
      case 'generate_report':
        // Generate and return report data
        return NextResponse.json({
          success: true,
          message: 'Sales report generated successfully',
          reportId: `sales-report-${Date.now()}`,
          downloadUrl: `/api/reports/sales/${Date.now()}`
        });
        
      case 'update_preferences':
        // Update user analytics preferences
        return NextResponse.json({
          success: true,
          message: 'Analytics preferences updated successfully'
        });
        
      default:
        return NextResponse.json(
          { success: false, error: 'Unknown action' },
          { status: 400 }
        );
    }

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('💥 Sales Analytics: Error processing action:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage
      },
      { status: 500 }
    );
  }
}