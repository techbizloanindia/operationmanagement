import { NextRequest, NextResponse } from 'next/server';
import { ApplicationModel } from '@/lib/models/Application';
import { SanctionedApplicationModel } from '@/lib/models/SanctionedApplication';

// GET - Get sales executive details and their cases
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ salesExec: string }> }
) {
  try {
    const { salesExec: rawSalesExec } = await params;
    
    if (!rawSalesExec) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Sales Executive name is required' 
        },
        { status: 400 }
      );
    }

    // Decode URL encoding and trim whitespace
    const salesExec = decodeURIComponent(rawSalesExec).trim();
    
    console.log(`🔍 API: Fetching details for sales executive: "${salesExec}"`);

    // Get all applications handled by this sales executive
    const applications = await ApplicationModel.getAllApplications();
    const salesExecApplications = applications.filter(app => 
      app.salesExec === salesExec || app.uploadedBy === salesExec
    );

    // Get sanctioned cases for this sales executive
    const sanctionedApplications = await SanctionedApplicationModel.getAllSanctionedApplications();
    const sanctionedCases = sanctionedApplications.filter(app => 
      app.salesExec === salesExec || app.sanctionedBy === salesExec
    );

    // Calculate statistics
    const stats = {
      totalApplications: salesExecApplications.length,
      sanctionedCount: sanctionedCases.length,
      pendingCount: salesExecApplications.filter(app => app.status === 'pending').length,
      approvedCount: salesExecApplications.filter(app => app.status === 'approved').length,
      rejectedCount: salesExecApplications.filter(app => app.status === 'rejected').length,
      totalSanctionedAmount: sanctionedCases.reduce((sum, app) => sum + (app.sanctionedAmount || 0), 0)
    };

    // Format recent cases
    const recentCases = sanctionedCases
      .sort((a, b) => new Date(b.sanctionedDate).getTime() - new Date(a.sanctionedDate).getTime())
      .slice(0, 10)
      .map(app => ({
        appId: app.appId,
        customerName: app.customerName,
        branch: app.branch,
        sanctionedAmount: app.sanctionedAmount,
        sanctionedDate: app.sanctionedDate,
        loanType: app.loanType,
        status: app.status
      }));

    console.log(`✅ API: Found ${salesExecApplications.length} applications and ${sanctionedCases.length} sanctioned cases for ${salesExec}`);

    return NextResponse.json({
      success: true,
      data: {
        salesExec,
        stats,
        recentCases,
        lastUpdated: new Date().toISOString()
      }
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('💥 API Error fetching sales executive details:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: `Failed to fetch sales executive details: ${errorMessage}`,
        details: 'There was an error fetching the sales executive information. Please try again.'
      },
      { status: 500 }
    );
  }
}