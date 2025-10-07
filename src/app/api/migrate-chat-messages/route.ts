import { NextRequest, NextResponse } from 'next/server';

// Utility function to extract numeric queryId from UUID format (same as in credit component)
const extractNumericQueryId = (queryId: string): number => {
  const queryIdStr = String(queryId);
  console.log('🔍 Extracting numeric queryId from:', queryIdStr);
  
  // If it's already a number, return it
  if (!isNaN(Number(queryIdStr)) && !queryIdStr.includes('-')) {
    return Number(queryIdStr);
  }
  
  // Extract number from UUID format (e.g., 'uuid-query-3' -> 3 or 'uuid-abc-def-3' -> 3)
  const match = queryIdStr.match(/-query-(\d+)$/);
  if (match && match[1]) {
    const numericId = Number(match[1]);
    console.log('✅ Extracted numeric queryId from -query- pattern:', numericId);
    return numericId;
  }
  
  // Try to extract number from end of UUID (e.g., '196772eb-acb0-48a4-a76b-1448326e06ae-3' -> 3)
  const endMatch = queryIdStr.match(/-(\d+)$/);
  if (endMatch && endMatch[1]) {
    const numericId = Number(endMatch[1]);
    console.log('✅ Extracted numeric queryId from end pattern:', numericId);
    return numericId;
  }
  
  // Try to extract any sequence of digits from the string
  const digitMatch = queryIdStr.match(/(\d+)/);
  if (digitMatch && digitMatch[1]) {
    const numericId = Number(digitMatch[1]);
    console.log('✅ Extracted numeric queryId from first digits:', numericId);
    return numericId;
  }
  
  console.error('❌ Failed to extract numeric queryId from:', queryIdStr);
  return 0; // Fallback
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;
    
    if (action === 'migrate-uuid-messages') {
      console.log('🔧 Starting migration of UUID format messages to numeric format...');
      
      const { connectToDatabase } = await import('@/lib/mongodb');
      const { db } = await connectToDatabase();
      const messagesCollection = db.collection('chat_messages');
      
      // Find all messages with UUID format queryIds
      const uuidMessages = await messagesCollection.find({
        queryId: { $regex: '-' } // Contains dash (UUID format)
      }).toArray();
      
      console.log(`📊 Found ${uuidMessages.length} messages with UUID format queryIds`);
      
      let migratedCount = 0;
      let errorCount = 0;
      const migrationLog = [];
      
      for (const message of uuidMessages) {
        try {
          const originalQueryId = message.queryId;
          const numericQueryId = extractNumericQueryId(originalQueryId);
          
          if (numericQueryId > 0) {
            // Update the message to use numeric queryId
            await messagesCollection.updateOne(
              { _id: message._id },
              { 
                $set: { 
                  queryId: numericQueryId.toString(),
                  originalQueryId: originalQueryId // Keep for reference
                }
              }
            );
            
            migratedCount++;
            migrationLog.push({
              messageId: message._id.toString(),
              from: originalQueryId,
              to: numericQueryId.toString(),
              sender: message.sender,
              team: message.team
            });
            
            console.log(`✅ Migrated message ${message._id}: ${originalQueryId} → ${numericQueryId}`);
          } else {
            console.warn(`⚠️ Could not extract numeric ID from: ${originalQueryId}`);
            errorCount++;
          }
        } catch (error) {
          console.error(`❌ Error migrating message ${message._id}:`, error);
          errorCount++;
        }
      }
      
      return NextResponse.json({
        success: true,
        migration: {
          totalFound: uuidMessages.length,
          migrated: migratedCount,
          errors: errorCount,
          migrationLog: migrationLog
        }
      });
    }
    
    if (action === 'cleanup-duplicate-messages') {
      console.log('🧹 Starting cleanup of duplicate messages...');
      
      const { connectToDatabase } = await import('@/lib/mongodb');
      const { db } = await connectToDatabase();
      const messagesCollection = db.collection('chat_messages');
      
      // Find duplicates based on queryId, message, sender, and timestamp (within 1 minute)
      const pipeline = [
        {
          $group: {
            _id: {
              queryId: '$queryId',
              message: '$message',
              sender: '$sender'
            },
            ids: { $addToSet: '$_id' },
            count: { $sum: 1 },
            timestamps: { $addToSet: '$timestamp' }
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
        // Keep the most recent message, remove the rest
        const messages = await messagesCollection
          .find({ _id: { $in: duplicate.ids } })
          .sort({ timestamp: -1 })
          .toArray();
        
        // Keep the first (most recent), remove the rest
        const idsToRemove = messages.slice(1).map(m => m._id);
        
        if (idsToRemove.length > 0) {
          await messagesCollection.deleteMany({
            _id: { $in: idsToRemove }
          });
          removedCount += idsToRemove.length;
        }
      }
      
      return NextResponse.json({
        success: true,
        cleanup: {
          duplicateGroups: duplicates.length,
          messagesRemoved: removedCount
        }
      });
    }
    
    return NextResponse.json({
      error: 'Invalid action. Use "migrate-uuid-messages" or "cleanup-duplicate-messages"'
    }, { status: 400 });
    
  } catch (error) {
    console.error('Migration Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}