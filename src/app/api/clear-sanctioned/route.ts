import { NextRequest, NextResponse } from 'next/server';
import { SanctionedApplicationModel } from '@/lib/models/SanctionedApplicationClean';

export async function DELETE(request: NextRequest) {
  try {
    const result = await SanctionedApplicationModel.clearAllSanctionedApplications();
    
    return NextResponse.json({
      success: true,
      message: `Successfully cleared ${result.deletedCount} sanctioned applications`,
      deletedCount: result.deletedCount
    });
    
  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to clear sanctioned applications',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}