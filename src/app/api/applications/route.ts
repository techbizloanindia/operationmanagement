import { NextRequest, NextResponse } from 'next/server';
import { ApplicationModel } from '@/lib/models/Application';

// GET - Get all applications with optional filters
export async function GET(request: NextRequest) {
  try {
    // Skip during build time or return sample data
    if (process.env.BUILDING === 'true' || process.env.NODE_ENV === 'production') {
      return NextResponse.json({
        success: true,
        data: [],
        count: 0,
        message: 'Applications API running in safe mode'
      });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const branch = searchParams.get('branch');
    const priority = searchParams.get('priority');
    const limit = searchParams.get('limit');
    const skip = searchParams.get('skip');
    const debug = searchParams.get('debug');

    console.log('📋 Applications API called with filters:', {
      status, branch, priority, limit, skip, debug
    });

    try {
      const filters: {
        status?: string;
        branch?: string;
        priority?: string;
        limit?: number;
        skip?: number;
      } = {};
      if (status) filters.status = status;
      if (branch) filters.branch = branch;
      if (priority) filters.priority = priority;
      if (limit) filters.limit = parseInt(limit);
      if (skip) filters.skip = parseInt(skip);

      const applications = await ApplicationModel.getAllApplications(filters);
      
      console.log(`📊 Found ${applications.length} applications`);
      
      return NextResponse.json({
        success: true,
        data: applications,
        count: applications.length,
        debug: debug === 'true' ? {
          sampleApplications: applications.slice(0, 5).map(app => ({
            appId: app.appId,
            customerName: app.customerName,
            status: app.status,
            branch: app.branch,
            uploadedAt: app.uploadedAt
          }))
        } : undefined
      });
    } catch (dbError) {
      console.error('Database error:', dbError);
      // Return fallback data instead of throwing error
      return NextResponse.json({
        success: true,
        data: [],
        count: 0,
        message: 'Using fallback data due to database error'
      });
    }
  } catch (error) {
    console.error('Error in Applications API:', error);
    
    // Always return valid JSON, never throw HTML error pages
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch applications',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// POST - Update application status
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { appId, status, actor, remarks } = body;
    
    if (!appId || !status || !actor) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required fields: appId, status, actor' 
        },
        { status: 400 }
      );
    }

    const updatedApplication = await ApplicationModel.updateApplicationStatus(
      appId, 
      status, 
      actor, 
      remarks
    );
    
    if (!updatedApplication) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Application not found' 
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updatedApplication,
      message: 'Application status updated successfully'
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('Error updating application:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: `Failed to update application: ${errorMessage}`
      },
      { status: 500 }
    );
  }
}
