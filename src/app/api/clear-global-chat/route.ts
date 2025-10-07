import { NextRequest, NextResponse } from 'next/server';

/**
 * Emergency API endpoint to clear in-memory global message database
 * This should be called after running the database cleanup script
 * 
 * Usage: POST /api/clear-global-chat
 */

export async function POST(request: NextRequest) {
  try {
    console.log('🚨 EMERGENCY: Clearing global message database...');
    
    // Store count before clearing
    const beforeCount = typeof global !== 'undefined' && global.queryMessagesDatabase 
      ? global.queryMessagesDatabase.length 
      : 0;
    
    // Clear the global message database
    if (typeof global !== 'undefined') {
      global.queryMessagesDatabase = [];
      console.log(`✅ Cleared ${beforeCount} messages from global in-memory database`);
    }
    
    return NextResponse.json({
      success: true,
      message: 'Global message database cleared successfully',
      clearedCount: beforeCount,
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    console.error('❌ Error clearing global message database:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to clear global message database'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const count = typeof global !== 'undefined' && global.queryMessagesDatabase 
      ? global.queryMessagesDatabase.length 
      : 0;
    
    const uniqueQueries = typeof global !== 'undefined' && global.queryMessagesDatabase
      ? [...new Set(global.queryMessagesDatabase.map(msg => msg.queryId?.toString()))]
      : [];
    
    return NextResponse.json({
      success: true,
      messageCount: count,
      uniqueQueryCount: uniqueQueries.length,
      uniqueQueries: uniqueQueries.slice(0, 10), // First 10 for preview
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    console.error('❌ Error checking global message database:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to check global message database'
      },
      { status: 500 }
    );
  }
}
