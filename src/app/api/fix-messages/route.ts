import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, sourceQueryId, targetQueryId } = body;
    
    if (action === 'move-messages') {
      if (!sourceQueryId || !targetQueryId) {
        return NextResponse.json({
          error: 'sourceQueryId and targetQueryId are required'
        }, { status: 400 });
      }
      
      console.log(`🔧 Moving messages from ${sourceQueryId} to ${targetQueryId}`);
      
      const { connectToDatabase } = await import('@/lib/mongodb');
      const { db } = await connectToDatabase();
      const messagesCollection = db.collection('chat_messages');
      
      // Update all messages from source to target queryId
      const result = await messagesCollection.updateMany(
        { queryId: sourceQueryId },
        { 
          $set: { 
            queryId: targetQueryId.toString(),
            originalQueryId: sourceQueryId 
          }
        }
      );
      
      console.log(`✅ Updated ${result.modifiedCount} messages`);
      
      return NextResponse.json({
        success: true,
        moved: result.modifiedCount,
        from: sourceQueryId,
        to: targetQueryId
      });
    }
    
    if (action === 'delete-messages') {
      if (!sourceQueryId) {
        return NextResponse.json({
          error: 'sourceQueryId is required'
        }, { status: 400 });
      }
      
      console.log(`🗑️ Deleting messages from ${sourceQueryId}`);
      
      const { connectToDatabase } = await import('@/lib/mongodb');
      const { db } = await connectToDatabase();
      const messagesCollection = db.collection('chat_messages');
      
      // Delete all messages from source queryId
      const result = await messagesCollection.deleteMany({
        queryId: sourceQueryId
      });
      
      console.log(`✅ Deleted ${result.deletedCount} messages`);
      
      return NextResponse.json({
        success: true,
        deleted: result.deletedCount,
        from: sourceQueryId
      });
    }
    
    return NextResponse.json({
      error: 'Invalid action. Use "move-messages" or "delete-messages"'
    }, { status: 400 });
    
  } catch (error) {
    console.error('Fix Messages Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}