import { NextResponse } from 'next/server';
import { SanctionedApplicationModel } from '@/lib/models/SanctionedApplicationClean';

export async function POST() {
  try {
    console.log('Adding sample sanctioned applications...');
    
    const result = await SanctionedApplicationModel.addSampleData();

    return NextResponse.json({
      success: true,
      message: 'Sample sanctioned applications added successfully',
      stats: {
        created: result.success,
        failed: result.failed,
        errors: result.errors
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Error adding sample sanctioned applications:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: `Failed to add sample data: ${error instanceof Error ? error.message : 'Unknown error'}` 
      },
      { status: 500 }
    );
  }
}