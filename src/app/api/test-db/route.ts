import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    // Test without importing MongoDB during build
    if (process.env.BUILDING === 'true') {
      return NextResponse.json({ 
        status: 'build-mode', 
        message: 'Build mode - skipping database test' 
      });
    }

    // Dynamic import to avoid build-time issues
    const { connectToDatabase } = await import('@/lib/mongodb');
    
    const { client, db } = await connectToDatabase();
    
    // Simple ping test
    await client.db("admin").command({ ping: 1 });
    
    return NextResponse.json({ 
      status: 'success', 
      message: 'Database connection successful',
      database: process.env.MONGODB_DATABASE || 'default'
    });
  } catch (error) {
    console.error('Database test error:', error);
    return NextResponse.json({ 
      status: 'error', 
      message: error instanceof Error ? error.message : 'Unknown error',
      env: process.env.NODE_ENV
    }, { status: 500 });
  }
}