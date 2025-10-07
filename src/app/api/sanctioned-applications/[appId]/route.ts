import { NextRequest, NextResponse } from 'next/server';
import { SanctionedApplicationModel } from '@/lib/models/SanctionedApplication';

// GET - Fetch a specific sanctioned application by appId
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ appId: string }> }
) {
  try {
    const { appId } = await params;
    console.log(`🔍 Fetching sanctioned application: ${appId}`);

    const application = await SanctionedApplicationModel.getSanctionedApplicationByAppId(appId);

    if (!application) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Sanctioned application not found' 
        },
        { status: 404 }
      );
    }

    console.log(`✅ Found sanctioned application: ${application.appId}`);

    return NextResponse.json({
      success: true,
      data: application
    });

  } catch (error) {
    console.error('❌ Error fetching sanctioned application:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

// PUT - Update sanctioned application status
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ appId: string }> }
) {
  try {
    const { appId } = await params;
    const body = await request.json();
    const { status, actor, remarks } = body;

    console.log(`📝 Updating sanctioned application status: ${appId} to ${status}`);

    if (!status || !actor) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Status and actor are required' 
        },
        { status: 400 }
      );
    }

    const updateSuccess = await SanctionedApplicationModel.updateSanctionedApplicationStatus(
      appId,
      status,
      actor,
      remarks
    );

    if (!updateSuccess) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Sanctioned application not found' 
        },
        { status: 404 }
      );
    }

    console.log(`✅ Updated sanctioned application: ${appId}`);

    // Get the updated application to return
    const updatedApplication = await SanctionedApplicationModel.getSanctionedApplicationByAppId(appId);

    return NextResponse.json({
      success: true,
      data: updatedApplication,
      message: 'Sanctioned application updated successfully'
    });

  } catch (error) {
    console.error('❌ Error updating sanctioned application:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

// DELETE - Delete a specific sanctioned application
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ appId: string }> }
) {
  try {
    const { appId } = await params;
    console.log(`🗑️ Deleting sanctioned application: ${appId}`);

    const deleted = await SanctionedApplicationModel.deleteSanctionedApplication(appId);

    if (!deleted) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Sanctioned application not found' 
        },
        { status: 404 }
      );
    }

    console.log(`✅ Deleted sanctioned application: ${appId}`);

    return NextResponse.json({
      success: true,
      message: `Sanctioned application ${appId} deleted successfully`
    });

  } catch (error) {
    console.error('❌ Error deleting sanctioned application:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}