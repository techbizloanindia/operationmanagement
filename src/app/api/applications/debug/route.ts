import { NextResponse } from 'next/server';
import { ApplicationModel } from '@/lib/models/Application';

// GET - Debug endpoint to show all applications in database
export async function GET() {
  try {
    console.log('🔍 Debug: Fetching all applications from database...');
    
    const applications = await ApplicationModel.getAllApplications({ limit: 20 });
    
    console.log(`📊 Debug: Found ${applications.length} applications in database`);
    
    // Log each application for debugging
    applications.forEach((app, index) => {
      console.log(`${index + 1}. App.No: "${app.appId}" | Customer: "${app.customerName}" | Status: "${app.status}" | Branch: "${app.branch}"`);
    });
    
    return NextResponse.json({
      success: true,
      message: 'Debug information for applications database',
      data: {
        totalApplications: applications.length,
        applications: applications.map(app => ({
          appId: app.appId,
          appIdLength: app.appId.length,
          appIdBytes: [...app.appId].map(char => char.charCodeAt(0)),
          customerName: app.customerName,
          status: app.status,
          branch: app.branch,
          uploadedAt: app.uploadedAt,
          uploadedBy: app.uploadedBy
        }))
      }
    });
    
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('💥 Debug API Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: `Debug API failed: ${errorMessage}`
      },
      { status: 500 }
    );
  }
} 