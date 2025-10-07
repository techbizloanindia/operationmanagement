import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';

export async function DELETE(request: NextRequest) {
  try {
    // Connect to database
    const { db } = await connectDB();
    const collection = db.collection('queries');
    
    // Delete all queries from database
    const result = await collection.deleteMany({});
    
    // Clear in-memory storage
    if (typeof global.globalQueriesDatabase !== 'undefined') {
      global.globalQueriesDatabase = [];
    }
    
    console.log(`🗑️ Cleared ${result.deletedCount} queries from database`);
    
    return NextResponse.json({
      success: true,
      message: `Successfully cleared ${result.deletedCount} queries`,
      deletedCount: result.deletedCount
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('Error clearing queries:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage
      },
      { status: 500 }
    );
  }
}