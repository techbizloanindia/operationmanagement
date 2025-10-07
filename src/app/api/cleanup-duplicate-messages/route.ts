import { NextRequest, NextResponse } from 'next/server';
import { cleanupDuplicateMessages } from '@/lib/cleanupDuplicateMessages';

/**
 * API endpoint to clean up duplicate messages from MongoDB
 * This should be run once after deploying the chat isolation fix
 * 
 * Usage: POST /api/cleanup-duplicate-messages
 */

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Starting duplicate message cleanup via API...');
    
    const result = await cleanupDuplicateMessages();
    
    return NextResponse.json({
      success: true,
      message: 'Duplicate messages cleaned up successfully',
      details: result,
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    console.error('❌ Error cleaning up duplicates:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to clean up duplicate messages',
        details: error.stack
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    endpoint: '/api/cleanup-duplicate-messages',
    method: 'POST',
    description: 'Cleans up duplicate messages from MongoDB chat_messages collection',
    usage: 'Send POST request to this endpoint to run cleanup',
    note: 'Run this once after deploying the chat isolation fix'
  });
}
