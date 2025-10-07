import { NextRequest, NextResponse } from 'next/server';
import { SanctionedApplicationModel } from '@/lib/models/SanctionedApplication';

// GET - Fetch sanctioned applications with optional filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const branch = searchParams.get('branch');
    const loanType = searchParams.get('loanType');
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;
    const skip = searchParams.get('skip') ? parseInt(searchParams.get('skip')!) : undefined;

    console.log('🔍 Fetching sanctioned applications with filters:', { status, branch, loanType, limit, skip });

    const applications = await SanctionedApplicationModel.getAllSanctionedApplications({
      status: status || undefined,
      branch: branch || undefined,
      loanType: loanType || undefined,
      limit,
      skip
    });

    console.log(`✅ Found ${applications.length} sanctioned applications`);

    return NextResponse.json({
      success: true,
      data: applications,
      count: applications.length
    });

  } catch (error) {
    console.error('❌ Error fetching sanctioned applications:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

// POST - Create a new sanctioned application
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log('📝 Creating new sanctioned application:', body.appId);

    const newApplication = await SanctionedApplicationModel.createSanctionedApplication(body);

    console.log(`✅ Created sanctioned application: ${newApplication.appId}`);

    return NextResponse.json({
      success: true,
      data: newApplication,
      message: 'Sanctioned application created successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('❌ Error creating sanctioned application:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

// DELETE - Clear all sanctioned applications
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const confirm = searchParams.get('confirm');

    if (confirm !== 'true') {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing confirmation parameter. Add ?confirm=true to confirm deletion.' 
        },
        { status: 400 }
      );
    }

    console.log('🗑️ Clearing all sanctioned applications...');

    const result = await SanctionedApplicationModel.clearAllSanctionedApplications();

    console.log(`✅ Cleared ${result.deletedCount} sanctioned applications`);

    return NextResponse.json({
      success: true,
      data: result,
      message: `Successfully cleared ${result.deletedCount} sanctioned applications`
    });

  } catch (error) {
    console.error('❌ Error clearing sanctioned applications:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}