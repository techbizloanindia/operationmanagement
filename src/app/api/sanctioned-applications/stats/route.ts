import { NextRequest, NextResponse } from 'next/server';
import { SanctionedApplicationModel } from '@/lib/models/SanctionedApplication';

// GET - Fetch sanctioned application statistics
export async function GET(request: NextRequest) {
  try {
    console.log('📊 Fetching sanctioned application statistics...');

    const stats = await SanctionedApplicationModel.getSanctionedApplicationStats();

    console.log('✅ Retrieved sanctioned application statistics');

    return NextResponse.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('❌ Error fetching sanctioned application statistics:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}