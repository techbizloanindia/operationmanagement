import { NextRequest, NextResponse } from 'next/server';
import { SanctionedApplicationModel } from '@/lib/models/SanctionedApplication';

// GET - Fetch expiring sanctioned applications
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const days = searchParams.get('days');
    const daysFromNow = days ? parseInt(days) : 30;

    console.log(`📅 Fetching sanctioned applications expiring within ${daysFromNow} days...`);

    const applications = await SanctionedApplicationModel.getExpiringSanctionedApplications(daysFromNow);

    console.log(`✅ Found ${applications.length} expiring sanctioned applications`);

    return NextResponse.json({
      success: true,
      data: applications,
      count: applications.length,
      daysFromNow
    });

  } catch (error) {
    console.error('❌ Error fetching expiring sanctioned applications:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}