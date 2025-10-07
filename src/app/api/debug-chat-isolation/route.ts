import { NextRequest, NextResponse } from 'next/server';
import { ChatStorageService } from '@/lib/services/ChatStorageService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const queryId = searchParams.get('queryId');
    
    if (!queryId) {
      return NextResponse.json({
        error: 'queryId parameter is required'
      }, { status: 400 });
    }
    
    console.log(`🔍 Debug Chat Isolation: Checking messages for query ${queryId}`);
    
    // Get messages using ChatStorageService
    const messages = await ChatStorageService.getChatMessages(queryId);
    
    // Get all messages in database for comparison
    const { connectToDatabase } = await import('@/lib/mongodb');
    const { db } = await connectToDatabase();
    const messagesCollection = db.collection('chat_messages');
    
    const allMessages = await messagesCollection.find({}).toArray();
    
    // Analyze potential contamination
    const queryIdStr = queryId.toString();
    const potentialContamination = allMessages.filter(msg => {
      const msgQueryId = msg.queryId?.toString();
      return msgQueryId && msgQueryId.includes(queryIdStr) && msgQueryId !== queryIdStr;
    });
    
    const exactMatches = allMessages.filter(msg => {
      const msgQueryId = msg.queryId?.toString();
      return msgQueryId === queryIdStr;
    });
    
    return NextResponse.json({
      success: true,
      debug: {
        targetQueryId: queryId,
        messagesFromServiceCount: messages.length,
        exactMatchesInDBCount: exactMatches.length,
        potentialContaminationCount: potentialContamination.length,
        totalMessagesInDB: allMessages.length,
        
        messagesFromServiceDetails: messages.map(msg => ({
          id: msg._id?.toString(),
          queryId: msg.queryId,
          sender: msg.sender,
          team: msg.team,
          message: msg.message?.substring(0, 50) + '...',
          timestamp: msg.timestamp
        })),
        
        exactMatchesDetails: exactMatches.map(msg => ({
          id: msg._id?.toString(),
          queryId: msg.queryId,
          sender: msg.sender,
          team: msg.team,
          message: msg.message?.substring(0, 50) + '...',
          timestamp: msg.timestamp
        })),
        
        potentialContaminationDetails: potentialContamination.map(msg => ({
          id: msg._id?.toString(),
          queryId: msg.queryId,
          sender: msg.sender,
          team: msg.team,
          message: msg.message?.substring(0, 50) + '...',
          timestamp: msg.timestamp,
          reason: `Contains "${queryIdStr}" but not exact match`
        }))
      }
    });
    
  } catch (error) {
    console.error('Debug Chat Isolation Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;
    
    if (action === 'cleanup') {
      // Clean up duplicate messages
      const { connectToDatabase } = await import('@/lib/mongodb');
      const { db } = await connectToDatabase();
      const messagesCollection = db.collection('chat_messages');
      
      // Find and remove duplicate messages
      const pipeline = [
        {
          $group: {
            _id: {
              queryId: '$queryId',
              message: '$message',
              sender: '$sender',
              timestamp: '$timestamp'
            },
            ids: { $addToSet: '$_id' },
            count: { $sum: 1 }
          }
        },
        {
          $match: {
            count: { $gt: 1 }
          }
        }
      ];
      
      const duplicates = await messagesCollection.aggregate(pipeline).toArray();
      let removedCount = 0;
      
      for (const duplicate of duplicates) {
        // Keep the first message, remove the rest
        const idsToRemove = duplicate.ids.slice(1);
        await messagesCollection.deleteMany({
          _id: { $in: idsToRemove }
        });
        removedCount += idsToRemove.length;
      }
      
      return NextResponse.json({
        success: true,
        message: `Removed ${removedCount} duplicate messages`,
        duplicatesFound: duplicates.length
      });
    }
    
    return NextResponse.json({
      error: 'Invalid action'
    }, { status: 400 });
    
  } catch (error) {
    console.error('Debug Chat Cleanup Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}