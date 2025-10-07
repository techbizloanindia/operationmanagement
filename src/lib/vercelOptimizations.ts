/**
 * Vercel-specific optimizations for serverless functions
 */

import { NextRequest, NextResponse } from 'next/server';

// Global variable cleanup for Vercel serverless functions
export function clearGlobalVariables() {
  try {
    // Clear query-related globals
    if (typeof global !== 'undefined') {
      if (global.globalQueriesDatabase) {
        global.globalQueriesDatabase = [];
      }
      if (global.globalQueryCounter) {
        global.globalQueryCounter = 0;
      }
      if (global.queryMessagesDatabase) {
        global.queryMessagesDatabase = [];
      }
    }
    console.log('🧹 Cleared global variables for Vercel serverless');
  } catch (error) {
    console.warn('⚠️ Failed to clear global variables:', error);
  }
}

// Vercel-optimized error handler
export function handleVercelError(error: unknown, context: string = 'API'): NextResponse {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
  
  console.error(`💥 ${context} Error:`, {
    message: errorMessage,
    stack: error instanceof Error ? error.stack : undefined,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    vercel: process.env.VERCEL ? 'true' : 'false'
  });

  // Return appropriate error response
  return NextResponse.json(
    { 
      success: false, 
      error: errorMessage,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV
    },
    { status: 500 }
  );
}

// Vercel timeout handler
export function withTimeout<T>(
  promise: Promise<T>, 
  timeoutMs: number = 25000, // 25 seconds for Vercel
  context: string = 'Operation'
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`${context} timed out after ${timeoutMs}ms (Vercel limit)`));
      }, timeoutMs);
    })
  ]);
}

// Memory usage monitor for Vercel
export function logMemoryUsage(context: string) {
  if (process.env.NODE_ENV === 'development' || process.env.VERCEL) {
    const usage = process.memoryUsage();
    console.log(`📊 Memory Usage (${context}):`, {
      heapUsed: `${Math.round(usage.heapUsed / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(usage.heapTotal / 1024 / 1024)}MB`,
      external: `${Math.round(usage.external / 1024 / 1024)}MB`,
      rss: `${Math.round(usage.rss / 1024 / 1024)}MB`
    });
  }
}

// Vercel-optimized database connection check
export async function ensureDatabaseConnection(): Promise<boolean> {
  try {
    const { connectDB } = await import('@/lib/mongodb');
    const { db } = await connectDB();
    
    // Quick ping test with timeout
    await withTimeout(
      db.admin().command({ ping: 1 }),
      5000,
      'Database ping'
    );
    
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
}

// Vercel environment detection
export function isVercelEnvironment(): boolean {
  return !!(process.env.VERCEL || process.env.VERCEL_ENV);
}

// Vercel-optimized response headers
export function getVercelOptimizedHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    'Content-Type': 'application/json',
  };

  if (isVercelEnvironment()) {
    headers['X-Vercel-Cache'] = 'MISS';
    headers['X-Vercel-Optimized'] = 'true';
  }

  return headers;
}

// Cleanup function to run before API responses
export function cleanupBeforeResponse() {
  // Force garbage collection if available
  if (global.gc && process.env.NODE_ENV === 'production') {
    try {
      global.gc();
    } catch (error) {
      // Ignore GC errors
    }
  }
  
  // Clear global variables
  clearGlobalVariables();
}
