// Script to clean up duplicate messages from MongoDB
// Run this once after deploying the fix

import { connectToDatabase } from '@/lib/mongodb';

async function cleanupDuplicateMessages() {
  try {
    console.log('🧹 Starting duplicate message cleanup...');
    
    const { db } = await connectToDatabase();
    const messagesCollection = db.collection('chat_messages');
    
    // Get all messages
    const allMessages = await messagesCollection.find({}).toArray();
    console.log(`📊 Found ${allMessages.length} total messages`);
    
    // Group by queryId
    const messagesByQuery = new Map<string, any[]>();
    
    for (const msg of allMessages) {
      const queryId = msg.queryId?.toString() || 'unknown';
      if (!messagesByQuery.has(queryId)) {
        messagesByQuery.set(queryId, []);
      }
      messagesByQuery.get(queryId)!.push(msg);
    }
    
    console.log(`📋 Found messages for ${messagesByQuery.size} unique queries`);
    
    // Find and remove duplicates
    let duplicatesRemoved = 0;
    
    for (const [queryId, messages] of messagesByQuery) {
      if (messages.length <= 1) continue;
      
      // Sort by timestamp
      messages.sort((a, b) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
      
      const seen = new Set<string>();
      const toDelete: any[] = [];
      
      for (const msg of messages) {
        // Create unique key: message + sender + timestamp (within 1 second)
        const timestamp = Math.floor(new Date(msg.timestamp).getTime() / 1000);
        const key = `${msg.message}-${msg.sender}-${timestamp}`;
        
        if (seen.has(key)) {
          // This is a duplicate
          toDelete.push(msg._id);
          console.log(`   🗑️ Marking duplicate: ${msg.message.substring(0, 30)}... by ${msg.sender}`);
        } else {
          seen.add(key);
        }
      }
      
      // Delete duplicates for this query
      if (toDelete.length > 0) {
        const result = await messagesCollection.deleteMany({
          _id: { $in: toDelete }
        });
        
        duplicatesRemoved += result.deletedCount;
        console.log(`✅ Removed ${result.deletedCount} duplicates from query ${queryId}`);
      }
    }
    
    console.log(`\n🎉 Cleanup complete!`);
    console.log(`   Total messages before: ${allMessages.length}`);
    console.log(`   Duplicates removed: ${duplicatesRemoved}`);
    console.log(`   Messages remaining: ${allMessages.length - duplicatesRemoved}`);
    
    return {
      success: true,
      before: allMessages.length,
      duplicatesRemoved,
      after: allMessages.length - duplicatesRemoved
    };
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    throw error;
  }
}

// Export for API route
export { cleanupDuplicateMessages };
