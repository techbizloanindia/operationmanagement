import { NextRequest, NextResponse } from 'next/server';
import { ChatStorageService } from '@/lib/services/ChatStorageService';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const queryId = searchParams.get('queryId');
    
    if (!queryId) {
      return NextResponse.json(
        { success: false, error: 'Query ID is required' },
        { status: 400 }
      );
    }

    // Check messages in chat_messages collection
    const { db } = await connectToDatabase();
    const messagesCollection = db.collection('chat_messages');
    
    // Get all messages for this queryId (with various formats)
    const allMessages = await messagesCollection.find({
      $or: [
        { queryId: queryId },
        { queryId: queryId.toString() },
        { originalQueryId: queryId },
        { originalQueryId: queryId.toString() },
        { queryId: { $regex: queryId, $options: 'i' } }
      ]
    }).toArray();

    // Also check the queries collection to see if this query exists
    const queriesCollection = db.collection('queries');
    
    // Build query filter with proper ObjectId handling
    const queryFilter: any[] = [
      { appNo: queryId },
      { id: queryId }
    ];
    
    // Only add _id filter if queryId is a valid ObjectId
    if (ObjectId.isValid(queryId)) {
      queryFilter.push({ _id: new ObjectId(queryId) });
    }
    
    const queryExists = await queriesCollection.findOne({
      $or: queryFilter
    });

    // Get chat messages via ChatStorageService
    const chatMessages = await ChatStorageService.getChatMessages(queryId);

    return NextResponse.json({
      success: true,
      queryId: queryId,
      queryExists: !!queryExists,
      queryData: queryExists,
      directMessages: allMessages,
      chatServiceMessages: chatMessages,
      counts: {
        direct: allMessages.length,
        chatService: chatMessages.length
      },
      debug: {
        queryIdType: typeof queryId,
        queryIdLength: queryId.length,
        searchVariations: [
          queryId,
          queryId.toString(),
          queryId.trim()
        ]
      }
    });

  } catch (error) {
    console.error('Debug chat history error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}