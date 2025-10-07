import { NextResponse } from 'next/server';
import { ApplicationModel } from '@/lib/models/Application';

// GET - Get application statistics
export async function GET() {
  try {
    // Skip during build time
    if (process.env.BUILDING === 'true') {
      return NextResponse.json({
        success: true,
        data: {
          total: 0,
          byStatus: {},
          byBranch: {},
          byPriority: {},
          recentCount: 0
        }
      });
    }

    const stats = await ApplicationModel.getApplicationStats();
    
    return NextResponse.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching application stats:', error);
    
    // Return empty stats during build time
    if (process.env.BUILDING === 'true') {
      return NextResponse.json({
        success: true,
        data: {
          total: 0,
          byStatus: {},
          byBranch: {},
          byPriority: {},
          recentCount: 0
        }
      });
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch application statistics' 
      },
      { status: 500 }
    );
  }
} 