import { NextRequest, NextResponse } from 'next/server';
import { ChatStorageService } from '@/lib/services/ChatStorageService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const queryId = searchParams.get('queryId');
    
    if (action === 'test-credit-operations-connection') {
      if (!queryId) {
        return NextResponse.json({
          error: 'queryId parameter is required for connection test'
        }, { status: 400 });
      }
      
      console.log(`🧪 Testing Credit-Operations Chat Connection for query ${queryId}`);
      
      // Step 1: Create a test message from Credit team
      const testMessage = {
        queryId: queryId.toString(),
        message: `[TEST MESSAGE] Credit team response at ${new Date().toISOString()}`,
        responseText: `[TEST MESSAGE] Credit team response at ${new Date().toISOString()}`,
        sender: 'Credit Test User',
        senderRole: 'credit',
        team: 'Credit',
        timestamp: new Date(),
        isSystemMessage: false,
        actionType: 'message' as const
      };
      
      // Store the test message
      const storedMessage = await ChatStorageService.storeChatMessage(testMessage);
      
      if (!storedMessage) {
        return NextResponse.json({
          success: false,
          error: 'Failed to store test message'
        }, { status: 500 });
      }
      
      console.log(`✅ Test message stored: ${storedMessage._id}`);
      
      // Step 2: Retrieve messages to verify isolation
      const retrievedMessages = await ChatStorageService.getChatMessages(queryId);
      
      // Step 3: Check if our test message is in the retrieved messages
      const testMessageFound = retrievedMessages.find(msg => 
        msg.sender === 'Credit Test User' && 
        msg.message?.includes('[TEST MESSAGE]')
      );
      
      return NextResponse.json({
        success: true,
        test: {
          queryId,
          messageStored: !!storedMessage,
          messageId: storedMessage._id?.toString(),
          totalMessagesForQuery: retrievedMessages.length,
          testMessageFound: !!testMessageFound,
          testMessageDetails: testMessageFound ? {
            id: testMessageFound._id?.toString(),
            queryId: testMessageFound.queryId,
            sender: testMessageFound.sender,
            team: testMessageFound.team,
            message: testMessageFound.message
          } : null,
          
          allMessages: retrievedMessages.map(msg => ({
            id: msg._id?.toString(),
            queryId: msg.queryId,
            sender: msg.sender,
            team: msg.team,
            senderRole: msg.senderRole,
            message: msg.message?.substring(0, 100) + '...',
            timestamp: msg.timestamp
          }))
        }
      });
    }
    
    if (action === 'cleanup-test-messages') {
      // Clean up test messages
      const { connectToDatabase } = await import('@/lib/mongodb');
      const { db } = await connectToDatabase();
      const messagesCollection = db.collection('chat_messages');
      
      const result = await messagesCollection.deleteMany({
        message: { $regex: '\\[TEST MESSAGE\\]' }
      });
      
      return NextResponse.json({
        success: true,
        cleaned: result.deletedCount
      });
    }
    
    // Default: Show all chat messages grouped by query
    const { connectToDatabase } = await import('@/lib/mongodb');
    const { db } = await connectToDatabase();
    const messagesCollection = db.collection('chat_messages');
    
    const allMessages = await messagesCollection.find({}).sort({ timestamp: -1 }).limit(50).toArray();
    
    const messagesByQuery = allMessages.reduce((acc: any, msg) => {
      const queryId = msg.queryId?.toString() || 'unknown';
      if (!acc[queryId]) {
        acc[queryId] = [];
      }
      acc[queryId].push({
        id: msg._id?.toString(),
        sender: msg.sender,
        team: msg.team,
        senderRole: msg.senderRole,
        message: msg.message?.substring(0, 100) + '...',
        timestamp: msg.timestamp
      });
      return acc;
    }, {});
    
    return NextResponse.json({
      success: true,
      totalMessages: allMessages.length,
      messagesByQuery,
      
      summary: Object.keys(messagesByQuery).map(queryId => ({
        queryId,
        messageCount: messagesByQuery[queryId].length,
        teams: [...new Set(messagesByQuery[queryId].map((m: any) => m.team))],
        latestMessage: messagesByQuery[queryId][0]?.timestamp
      }))
    });
    
  } catch (error) {
    console.error('Debug Chat Connection Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}