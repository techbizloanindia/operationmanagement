import { NextRequest, NextResponse } from 'next/server';
import { ApplicationModel } from '@/lib/models/Application';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Testing sanctioned cases fetch...');
    
    // Get all applications first
    const allApplications = await ApplicationModel.getAllApplications();
    console.log(`📊 Total applications in database: ${allApplications.length}`);
    
    // Get specifically sanctioned applications
    const sanctionedApplications = await ApplicationModel.getAllApplications({ status: 'sanctioned' });
    console.log(`✅ Sanctioned applications: ${sanctionedApplications.length}`);
    
    // Get applications by different statuses to see what's in the database
    const statusCount: { [key: string]: number } = {};
    allApplications.forEach(app => {
      statusCount[app.status] = (statusCount[app.status] || 0) + 1;
    });
    
    console.log('📋 Status breakdown:', statusCount);
    
    // Sample of sanctioned applications
    const sampleSanctioned = sanctionedApplications.slice(0, 5).map(app => ({
      appId: app.appId,
      customerName: app.customerName,
      status: app.status,
      branch: app.branch,
      uploadedAt: app.uploadedAt,
      sanctionAmount: app.sanctionAmount,
      amount: app.amount
    }));
    
    return NextResponse.json({
      success: true,
      data: {
        totalApplications: allApplications.length,
        sanctionedCount: sanctionedApplications.length,
        statusBreakdown: statusCount,
        sampleSanctioned,
        allStatuses: Object.keys(statusCount),
        message: sanctionedApplications.length > 0 
          ? `Found ${sanctionedApplications.length} sanctioned applications ready for operations dashboard`
          : 'No sanctioned applications found. Please upload CSV with sanctioned data first.'
      }
    });
    
  } catch (error) {
    console.error('❌ Error testing sanctioned cases:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to fetch sanctioned cases - check database connection'
      },
      { status: 500 }
    );
  }
}
