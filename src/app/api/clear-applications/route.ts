import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';

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

    console.log('🗑️ Clearing all applications from database...');

    const { db } = await connectToDatabase();
    
    // Clear the applications collection
    const applicationsResult = await db.collection('applications').deleteMany({});
    console.log(`✅ Cleared ${applicationsResult.deletedCount} applications`);

    return NextResponse.json({
      success: true,
      data: {
        applicationsDeleted: applicationsResult.deletedCount
      },
      message: `Successfully cleared ${applicationsResult.deletedCount} applications from the database. The system now uses sanctioned_applications collection instead.`
    });

  } catch (error) {
    console.error('❌ Error clearing applications:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}