import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';

export async function DELETE(request: NextRequest) {
  try {
    // Connect to database
    const { db } = await connectDB();
    
    // Clear chat messages collections
    const chatMessagesCollection = db.collection('chat_messages');
    const archivedChatsCollection = db.collection('archived_chats');
    const queryChatsCollection = db.collection('query_chats');
    
    // Delete all messages from collections
    const chatMessagesResult = await chatMessagesCollection.deleteMany({});
    const archivedChatsResult = await archivedChatsCollection.deleteMany({});
    const queryChatsResult = await queryChatsCollection.deleteMany({});
    
    // Clear global in-memory message storage
    if (typeof global !== 'undefined') {
      if (global.queryMessagesDatabase) {
        global.queryMessagesDatabase = [];
      }
    }
    
    const totalDeleted = chatMessagesResult.deletedCount + 
                        archivedChatsResult.deletedCount + 
                        queryChatsResult.deletedCount;
    
    console.log(`🗑️ Cleared message history:`);
    console.log(`  - Chat messages: ${chatMessagesResult.deletedCount}`);
    console.log(`  - Archived chats: ${archivedChatsResult.deletedCount}`);
    console.log(`  - Query chats: ${queryChatsResult.deletedCount}`);
    console.log(`  - Total: ${totalDeleted}`);
    
    return NextResponse.json({
      success: true,
      message: `Successfully cleared all message history`,
      details: {
        chatMessages: chatMessagesResult.deletedCount,
        archivedChats: archivedChatsResult.deletedCount,
        queryChats: queryChatsResult.deletedCount,
        total: totalDeleted
      }
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('Error clearing message history:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage
      },
      { status: 500 }
    );
  }
}