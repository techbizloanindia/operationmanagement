import { NextRequest, NextResponse } from 'next/server';
import { SanctionedApplicationModel } from '@/lib/models/SanctionedApplication';

// POST - Bulk create sanctioned applications
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { applications } = body;

    if (!applications || !Array.isArray(applications)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Applications array is required' 
        },
        { status: 400 }
      );
    }

    console.log(`📦 Bulk creating ${applications.length} sanctioned applications...`);

    const result = await SanctionedApplicationModel.bulkCreateSanctionedApplications(applications);

    console.log(`✅ Bulk creation completed - Success: ${result.success}, Failed: ${result.failed}, Duplicates: ${result.duplicates}`);

    return NextResponse.json({
      success: true,
      data: result,
      message: `Bulk creation completed - ${result.success} successful, ${result.failed} failed, ${result.duplicates} duplicates`
    });

  } catch (error) {
    console.error('❌ Error in bulk sanctioned application creation:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}