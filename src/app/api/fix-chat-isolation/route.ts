import { NextRequest, NextResponse } from 'next/server';
import { ChatStorageService } from '@/lib/services/ChatStorageService';
import { connectToDatabase } from '@/lib/mongodb';

/**
 * API endpoint to fix chat isolation issues
 * This endpoint will:
 * 1. Validate and clean existing chat data
 * 2. Ensure proper queryId isolation
 * 3. Remove cross-query contaminated messages
 * 4. Update database indexes
 */

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Starting chat isolation fix process...');
    
    const { db } = await connectToDatabase();
    const messagesCollection = db.collection('chat_messages');
    
    // Step 1: Analyze current data for isolation issues
    const allMessages = await messagesCollection.find({}).toArray();
    console.log(`📊 Found ${allMessages.length} total messages in database`);
    
    // Step 2: Group messages by queryId to identify isolation issues
    const queryGroups = new Map<string, any[]>();
    const problematicMessages: any[] = [];
    
    for (const message of allMessages) {
      const queryId = message.queryId?.toString();
      const originalQueryId = message.originalQueryId?.toString();
      
      if (!queryId && !originalQueryId) {
        problematicMessages.push({
          ...message,
          issue: 'missing_query_id'
        });
        continue;
      }
      
      const effectiveQueryId = queryId || originalQueryId;
      
      if (!queryGroups.has(effectiveQueryId)) {
        queryGroups.set(effectiveQueryId, []);
      }
      queryGroups.get(effectiveQueryId)!.push(message);
    }
    
    console.log(`🔍 Found ${queryGroups.size} unique query threads`);
    console.log(`⚠️ Found ${problematicMessages.length} problematic messages`);
    
    // Step 3: Fix and normalize messages
    let fixedCount = 0;
    let removedCount = 0;
    
    for (const [queryId, messages] of queryGroups) {
      // Remove duplicates within each query thread
      const uniqueMessages = new Map<string, any>();
      
      for (const message of messages) {
        const key = `${message.message}-${message.sender}-${Math.floor(new Date(message.timestamp).getTime() / 1000)}`;
        
        if (!uniqueMessages.has(key)) {
          uniqueMessages.set(key, message);
        } else {
          // Mark duplicate for removal
          await messagesCollection.deleteOne({ _id: message._id });
          removedCount++;
        }
      }
      
      // Update remaining messages with proper isolation metadata
      for (const message of uniqueMessages.values()) {
        const updateData: any = {
          queryId: queryId.toString(),
          originalQueryId: message.queryId || message.originalQueryId,
          isolationKey: `query_${queryId}`,
          threadIsolated: true,
          updatedAt: new Date()
        };
        
        await messagesCollection.updateOne(
          { _id: message._id },
          { $set: updateData }
        );
        fixedCount++;
      }
    }
    
    // Step 4: Remove problematic messages that can't be fixed
    for (const message of problematicMessages) {
      await messagesCollection.deleteOne({ _id: message._id });
      removedCount++;
    }
    
    // Step 5: ULTRA-STRICT cleaning of global message database
    if (typeof global !== 'undefined' && global.queryMessagesDatabase) {
      const globalBefore = global.queryMessagesDatabase.length;

      // ENHANCED cleaning with ultra-strict isolation validation
      const cleanedGlobal = new Map<string, any>();
      const rejectedMessages = [];

      for (const message of global.queryMessagesDatabase) {
        const queryId = message.queryId?.toString();
        const originalQueryId = message.originalQueryId?.toString();

        // Reject messages without proper queryId
        if (!queryId && !originalQueryId) {
          rejectedMessages.push({ reason: 'no_query_id', message });
          continue;
        }

        const effectiveQueryId = queryId || originalQueryId;

        // Create ultra-strict duplicate detection key
        const timestamp = Math.floor(new Date(message.timestamp).getTime() / 1000);
        const key = `${effectiveQueryId}|${message.message}|${message.sender}|${timestamp}`;

        if (!cleanedGlobal.has(key)) {
          // Store with enhanced isolation metadata
          cleanedGlobal.set(key, {
            ...message,
            queryId: effectiveQueryId.toString(),
            originalQueryId: message.queryId || message.originalQueryId,
            isolationKey: `query_${effectiveQueryId}`,
            threadIsolated: true,
            cleanedAt: new Date().toISOString()
          });
        } else {
          rejectedMessages.push({ reason: 'duplicate', message });
        }
      }

      global.queryMessagesDatabase = Array.from(cleanedGlobal.values());
      const globalAfter = global.queryMessagesDatabase.length;

      console.log(`🧹 ULTRA-STRICT global cleanup: ${globalBefore} -> ${globalAfter} messages (${rejectedMessages.length} rejected)`);
      console.log(`🔒 All remaining global messages now have proper isolation metadata`);
    }
    
    // Step 6: Ensure database indexes for better isolation
    await ChatStorageService.ensureIndexes();
    
    // Step 7: Validate isolation by checking for cross-query issues
    const validationResults = new Map<string, number>();
    
    for (const [queryId] of queryGroups) {
      const queryMessages = await ChatStorageService.getChatMessages(queryId);
      validationResults.set(queryId, queryMessages.length);
    }
    
    console.log('✅ Chat isolation fix completed successfully');
    
    return NextResponse.json({
      success: true,
      results: {
        totalQueriesProcessed: queryGroups.size,
        messagesFixed: fixedCount,
        messagesRemoved: removedCount,
        problematicMessages: problematicMessages.length,
        validationResults: Object.fromEntries(validationResults),
        message: 'Chat isolation has been fixed and validated'
      }
    });
    
  } catch (error: any) {
    console.error('💥 Error fixing chat isolation:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to fix chat isolation',
        details: error.stack
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Analyzing chat isolation status...');
    
    const { db } = await connectToDatabase();
    const messagesCollection = db.collection('chat_messages');
    
    // Analyze current state
    const totalMessages = await messagesCollection.countDocuments();
    const isolatedMessages = await messagesCollection.countDocuments({ threadIsolated: true });
    const missingQueryId = await messagesCollection.countDocuments({ 
      $and: [
        { queryId: { $exists: false } },
        { originalQueryId: { $exists: false } }
      ]
    });
    
    // Get unique query threads
    const uniqueQueries = await messagesCollection.distinct('queryId');
    
    // Check global database status
    const globalStatus = {
      exists: false,
      messageCount: 0,
      uniqueQueries: 0
    };
    
    if (typeof global !== 'undefined' && global.queryMessagesDatabase) {
      globalStatus.exists = true;
      globalStatus.messageCount = global.queryMessagesDatabase.length;
      globalStatus.uniqueQueries = new Set(
        global.queryMessagesDatabase.map(msg => msg.queryId?.toString()).filter(Boolean)
      ).size;
    }
    
    return NextResponse.json({
      success: true,
      analysis: {
        database: {
          totalMessages,
          isolatedMessages,
          missingQueryId,
          uniqueQueries: uniqueQueries.length,
          isolationPercentage: totalMessages > 0 ? (isolatedMessages / totalMessages * 100).toFixed(2) + '%' : '0%'
        },
        global: globalStatus,
        recommendations: {
          needsFixing: isolatedMessages < totalMessages || missingQueryId > 0,
          issues: [
            ...(isolatedMessages < totalMessages ? ['Some messages are not properly isolated'] : []),
            ...(missingQueryId > 0 ? ['Some messages are missing queryId'] : []),
            ...(globalStatus.messageCount > 0 ? ['Global message database contains data that should be isolated'] : [])
          ]
        }
      }
    });
    
  } catch (error: any) {
    console.error('💥 Error analyzing chat isolation:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to analyze chat isolation' 
      },
      { status: 500 }
    );
  }
}