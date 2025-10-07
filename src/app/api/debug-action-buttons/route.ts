import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { queryId, action = 'debug' } = body;

    console.log('🔍 DEBUG ACTION BUTTONS - Received request:', { queryId, action });
    
    // Connect to MongoDB
    const { db } = await connectDB();
    
    // Find the query in MongoDB
    const mongoQuery = await db.collection('queries').findOne({ 'queries.id': queryId });
    console.log('🔍 MongoDB Query Found:', mongoQuery ? 'YES' : 'NO');
    
    if (mongoQuery) {
      console.log('📋 Query Details:', {
        appNo: mongoQuery.appNo,
        totalQueries: mongoQuery.queries?.length,
        queryStatuses: mongoQuery.queries?.map((q: any) => ({ id: q.id, status: q.status }))
      });
      
      const specificQuery = mongoQuery.queries?.find((q: any) => q.id === queryId);
      console.log('🎯 Specific Query:', specificQuery || 'NOT FOUND');
    }
    
    // Also try finding as direct query
    const directQuery = await db.collection('queries').findOne({ id: queryId });
    console.log('🔍 Direct Query Found:', directQuery ? 'YES' : 'NO');
    
    if (directQuery) {
      console.log('📋 Direct Query Details:', {
        appNo: directQuery.appNo,
        status: directQuery.status,
        id: directQuery.id
      });
    }
    
    return NextResponse.json({
      success: true,
      data: {
        queryId,
        action,
        mongoQueryFound: !!mongoQuery,
        directQueryFound: !!directQuery,
        mongoDetails: mongoQuery ? {
          appNo: mongoQuery.appNo,
          totalQueries: mongoQuery.queries?.length,
          queryStatuses: mongoQuery.queries?.map((q: any) => ({ id: q.id, status: q.status })),
          specificQuery: mongoQuery.queries?.find((q: any) => q.id === queryId)
        } : null,
        directDetails: directQuery ? {
          appNo: directQuery.appNo,
          status: directQuery.status,
          id: directQuery.id
        } : null
      }
    });
    
  } catch (error) {
    console.error('❌ DEBUG Action buttons error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}