import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includeMemory = searchParams.get('memory') === 'true';
    const includeDB = searchParams.get('db') === 'true' || !searchParams.get('db');
    
    const debugInfo: any = {
      timestamp: new Date().toISOString(),
      mongodb: { status: 'unknown', queries: [], error: null },
      memory: { status: 'unknown', queries: [], error: null },
      apis: {
        main: { status: 'unknown', count: 0, error: null },
        sales: { status: 'unknown', count: 0, error: null },
        credit: { status: 'unknown', count: 0, error: null }
      }
    };
    
    // Test MongoDB connection and queries
    if (includeDB) {
      try {
        const { connectDB } = await import('@/lib/mongodb');
        const { db } = await connectDB();
        
        const mongoQueries = await db.collection('queries').find({}).toArray();
        debugInfo.mongodb = {
          status: 'connected',
          queries: mongoQueries.map(q => ({
            id: q.id || q._id?.toString(),
            appNo: q.appNo,
            status: q.status,
            markedForTeam: q.markedForTeam,
            sendToSales: q.sendToSales,
            sendToCredit: q.sendToCredit,
            createdAt: q.createdAt
          })),
          error: null
        };
        
        console.log(`🔍 Debug: Found ${mongoQueries.length} queries in MongoDB`);
        
      } catch (dbError) {
        debugInfo.mongodb = {
          status: 'error',
          queries: [],
          error: dbError instanceof Error ? dbError.message : 'Unknown DB error'
        };
        console.error('🔍 Debug: MongoDB error:', dbError);
      }
    }
    
    // Test in-memory storage
    if (includeMemory) {
      try {
        // Initialize memory data if needed
        if (typeof global.globalQueriesDatabase === 'undefined') {
          global.globalQueriesDatabase = [];
        }
        
        const memoryQueries = global.globalQueriesDatabase || [];
        debugInfo.memory = {
          status: 'available',
          queries: memoryQueries.map((q: any) => ({
            id: q.id,
            appNo: q.appNo,
            status: q.status,
            markedForTeam: q.markedForTeam,
            sendToSales: q.sendToSales,
            sendToCredit: q.sendToCredit,
            createdAt: q.createdAt
          })),
          error: null
        };
        
        console.log(`🔍 Debug: Found ${memoryQueries.length} queries in memory`);
        
      } catch (memError) {
        debugInfo.memory = {
          status: 'error',
          queries: [],
          error: memError instanceof Error ? memError.message : 'Unknown memory error'
        };
      }
    }
    
    // Test API endpoints
    try {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001';
      
      // Test main queries API
      try {
        const mainResponse = await fetch(`${baseUrl}/api/queries?status=pending`);
        const mainResult = await mainResponse.json();
        debugInfo.apis.main = {
          status: mainResult.success ? 'working' : 'failed',
          count: mainResult.data?.length || 0,
          error: mainResult.success ? null : mainResult.error
        };
      } catch (mainError) {
        debugInfo.apis.main = {
          status: 'error',
          count: 0,
          error: mainError instanceof Error ? mainError.message : 'Unknown API error'
        };
      }
      
      // Test sales API
      try {
        const salesResponse = await fetch(`${baseUrl}/api/queries/sales?status=pending`);
        const salesResult = await salesResponse.json();
        debugInfo.apis.sales = {
          status: salesResult.success ? 'working' : 'failed',
          count: salesResult.data?.length || 0,
          error: salesResult.success ? null : salesResult.error
        };
      } catch (salesError) {
        debugInfo.apis.sales = {
          status: 'error',
          count: 0,
          error: salesError instanceof Error ? salesError.message : 'Unknown API error'
        };
      }
      
      // Test credit API
      try {
        const creditResponse = await fetch(`${baseUrl}/api/queries/credit?status=pending`);
        const creditResult = await creditResponse.json();
        debugInfo.apis.credit = {
          status: creditResult.success ? 'working' : 'failed',
          count: creditResult.data?.length || 0,
          error: creditResult.success ? null : creditResult.error
        };
      } catch (creditError) {
        debugInfo.apis.credit = {
          status: 'error',
          count: 0,
          error: creditError instanceof Error ? creditError.message : 'Unknown API error'
        };
      }
      
    } catch (apiError) {
      console.error('🔍 Debug: API testing error:', apiError);
    }
    
    return NextResponse.json({
      success: true,
      debug: debugInfo,
      summary: {
        mongodbQueries: debugInfo.mongodb.queries.length,
        memoryQueries: debugInfo.memory.queries.length,
        mainAPI: debugInfo.apis.main.count,
        salesAPI: debugInfo.apis.sales.count,
        creditAPI: debugInfo.apis.credit.count
      }
    });
    
  } catch (error) {
    console.error('🔍 Debug endpoint error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown debug error'
    }, { status: 500 });
  }
}