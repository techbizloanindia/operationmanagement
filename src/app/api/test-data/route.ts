import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Query from '@/lib/models/Query';

export async function POST() {
  try {
    await connectDB();
    
    // Create a test query with sample data
    const testQuery = {
      id: `test-query-${Date.now()}`,
      appNo: `APP-TEST-${Date.now()}`,
      title: 'Test Query for Message Visibility',
      tat: '2 days',
      team: 'operations',
      messages: [],
      markedForTeam: 'both', // Both sales and credit
      allowMessaging: true,
      priority: 'medium' as const,
      status: 'pending' as const,
      customerName: 'Test Customer',
      caseId: `CASE-${Date.now()}`,
      createdAt: new Date(),
      submittedAt: new Date(),
      submittedBy: 'test-user',
      branch: 'Test Branch',
      branchCode: 'TEST001',
      queries: [{
        id: `query-${Date.now()}`,
        text: 'This is a test query for message visibility testing',
        timestamp: new Date().toISOString(),
        sender: 'test-user',
        status: 'pending' as const,
        queryNumber: 1,
        proposedAction: 'Please review',
        sentTo: ['sales', 'credit'],
        tat: '2 days'
      }],
      sendTo: ['sales', 'credit'],
      sendToSales: true,
      sendToCredit: true,
      remarks: [
        {
          id: `remark-${Date.now()}-1`,
          text: 'This is a test message from Sales team',
          author: 'Sales User',
          authorRole: 'sales',
          authorTeam: 'sales',
          timestamp: new Date(),
          isEdited: false
        },
        {
          id: `remark-${Date.now()}-2`,
          text: 'This is a test reply from Credit team',
          author: 'Credit User',
          authorRole: 'credit',
          authorTeam: 'credit',
          timestamp: new Date(),
          isEdited: false
        }
      ]
    };
    
    console.log('🧪 Creating test query with remarks:', testQuery.appNo);
    
    const result = await Query.findOneAndUpdate(
      { id: testQuery.id },
      testQuery,
      { upsert: true }
    );
    
    console.log('✅ Test query created successfully');
    
    return NextResponse.json({
      success: true,
      message: 'Test query with remarks created successfully',
      data: result
    });
    
  } catch (error) {
    console.error('❌ Error creating test data:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to create test data'
    }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    await connectDB();
    
    // Delete all test queries
    const { db } = await connectDB();
    const collection = db.collection('queries');
    
    const result = await collection.deleteMany({
      appNo: { $regex: /^APP-TEST-/ }
    });
    
    console.log(`🗑️ Deleted ${result.deletedCount} test queries`);
    
    return NextResponse.json({
      success: true,
      message: `Deleted ${result.deletedCount} test queries`,
      deletedCount: result.deletedCount
    });
    
  } catch (error) {
    console.error('❌ Error deleting test data:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to delete test data'
    }, { status: 500 });
  }
}