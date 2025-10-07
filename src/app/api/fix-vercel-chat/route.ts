import { NextRequest, NextResponse } from 'next/server';
import { ChatStorageService } from '@/lib/services/ChatStorageService';
import { connectToDatabase } from '@/lib/mongodb';

/**
 * API endpoint to fix chat isolation issues specifically for Vercel deployment
 * This endpoint will:
 * 1. Clean up any global message database contamination
 * 2. Ensure all messages are properly stored in MongoDB only
 * 3. Fix any cross-query message contamination
 * 4. Optimize for serverless functions
 */

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Starting Vercel chat isolation fix...');
    
    const { db } = await connectToDatabase();
    const messagesCollection = db.collection('chat_messages');
    
    const fixResults = {
      globalCleared: 0,
      duplicatesRemoved: 0,
      crossQueryFixed: 0,
      totalMessages: 0,
      queryGroups: 0
    };

    // Step 1: Clear any global message database if it exists
    if (typeof global !== 'undefined' && global.queryMessagesDatabase) {
      const globalCount = global.queryMessagesDatabase.length;
      global.queryMessagesDatabase = [];
      fixResults.globalCleared = globalCount;
      console.log(`🧹 Cleared ${globalCount} messages from global database`);
    }

    // Step 2: Analyze and fix MongoDB messages
    const allMessages = await messagesCollection.find({}).toArray();
    fixResults.totalMessages = allMessages.length;
    console.log(`📊 Found ${allMessages.length} total messages in MongoDB`);

    // Step 3: Group messages by queryId and detect issues
    const queryGroups = new Map<string, any[]>();
    const problematicMessages: any[] = [];
    
    for (const message of allMessages) {
      const queryId = message.queryId?.toString()?.trim();
      const originalQueryId = message.originalQueryId?.toString()?.trim();
      
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
    
    fixResults.queryGroups = queryGroups.size;

    // Step 4: Remove duplicates within each query group
    let duplicatesRemoved = 0;
    for (const [queryId, messages] of queryGroups) {
      const uniqueMessages = new Map<string, any>();
      
      for (const message of messages) {
        // Create unique key based on content and timestamp
        const timestamp = Math.floor(new Date(message.timestamp).getTime() / 1000);
        const uniqueKey = `${message.message}|${message.sender}|${timestamp}`;
        
        if (!uniqueMessages.has(uniqueKey)) {
          // Ensure message has proper isolation metadata
          const fixedMessage = {
            ...message,
            queryId: queryId.toString(),
            isolationKey: `query_${queryId}`,
            threadIsolated: true,
            fixedAt: new Date().toISOString()
          };
          uniqueMessages.set(uniqueKey, fixedMessage);
        } else {
          // Mark for deletion
          await messagesCollection.deleteOne({ _id: message._id });
          duplicatesRemoved++;
        }
      }
      
      // Update remaining messages with proper isolation
      for (const [, message] of uniqueMessages) {
        await messagesCollection.updateOne(
          { _id: message._id },
          { 
            $set: {
              queryId: message.queryId,
              isolationKey: message.isolationKey,
              threadIsolated: message.threadIsolated,
              fixedAt: message.fixedAt
            }
          }
        );
      }
    }
    
    fixResults.duplicatesRemoved = duplicatesRemoved;

    // Step 5: Check for and fix cross-query contamination
    let crossQueryFixed = 0;
    for (const [queryId, messages] of queryGroups) {
      for (const message of messages) {
        const msgQueryId = message.queryId?.toString()?.trim();
        const msgOriginalQueryId = message.originalQueryId?.toString()?.trim();
        
        // Check if message belongs to wrong query
        if (msgQueryId && msgQueryId !== queryId && msgOriginalQueryId && msgOriginalQueryId !== queryId) {
          // This message belongs to a different query
          console.warn(`🚫 Found cross-query contamination: message in ${queryId} belongs to ${msgQueryId}/${msgOriginalQueryId}`);
          
          // Move to correct query or delete if uncertain
          if (queryGroups.has(msgQueryId)) {
            await messagesCollection.updateOne(
              { _id: message._id },
              { 
                $set: {
                  queryId: msgQueryId,
                  isolationKey: `query_${msgQueryId}`,
                  threadIsolated: true,
                  fixedCrossQuery: true,
                  fixedAt: new Date().toISOString()
                }
              }
            );
            crossQueryFixed++;
          } else {
            // Delete orphaned message
            await messagesCollection.deleteOne({ _id: message._id });
            crossQueryFixed++;
          }
        }
      }
    }
    
    fixResults.crossQueryFixed = crossQueryFixed;

    // Step 6: Ensure database indexes for optimal performance
    await ChatStorageService.ensureIndexes();

    // Step 7: Final validation
    const finalMessages = await messagesCollection.find({}).toArray();
    const finalQueryGroups = new Map<string, number>();
    
    for (const message of finalMessages) {
      const queryId = message.queryId?.toString()?.trim();
      if (queryId) {
        finalQueryGroups.set(queryId, (finalQueryGroups.get(queryId) || 0) + 1);
      }
    }

    console.log('✅ Vercel chat isolation fix completed successfully');

    return NextResponse.json({
      success: true,
      results: {
        ...fixResults,
        messagesAfterFix: finalMessages.length,
        queryGroupsAfterFix: finalQueryGroups.size,
        problematicMessagesFound: problematicMessages.length,
        finalValidation: Object.fromEntries(finalQueryGroups),
        message: 'Chat isolation has been fixed for Vercel deployment'
      }
    });
    
  } catch (error: any) {
    console.error('💥 Error fixing Vercel chat isolation:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to fix Vercel chat isolation'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { db } = await connectToDatabase();
    const messagesCollection = db.collection('chat_messages');
    
    // Analyze current state
    const allMessages = await messagesCollection.find({}).toArray();
    const queryGroups = new Map<string, number>();
    const issuesFound = [];
    
    // Check for global database
    let globalCount = 0;
    if (typeof global !== 'undefined' && global.queryMessagesDatabase) {
      globalCount = global.queryMessagesDatabase.length;
      if (globalCount > 0) {
        issuesFound.push({
          type: 'global_database',
          count: globalCount,
          severity: 'high',
          description: 'Global message database contains messages (can cause cross-query contamination)'
        });
      }
    }
    
    // Analyze MongoDB messages
    for (const message of allMessages) {
      const queryId = message.queryId?.toString()?.trim();
      if (queryId) {
        queryGroups.set(queryId, (queryGroups.get(queryId) || 0) + 1);
      } else {
        issuesFound.push({
          type: 'missing_query_id',
          messageId: message._id.toString(),
          severity: 'medium',
          description: 'Message without queryId found'
        });
      }
      
      // Check isolation metadata
      if (!message.threadIsolated) {
        issuesFound.push({
          type: 'missing_isolation_metadata',
          queryId: queryId,
          messageId: message._id.toString(),
          severity: 'low',
          description: 'Message missing isolation metadata'
        });
      }
    }
    
    return NextResponse.json({
      success: true,
      analysis: {
        totalMessages: allMessages.length,
        totalQueries: queryGroups.size,
        globalMessagesCount: globalCount,
        issuesFound: issuesFound.length,
        issues: issuesFound,
        queryDistribution: Object.fromEntries(queryGroups),
        recommendation: issuesFound.length > 0 ? 'Run POST /api/fix-vercel-chat to fix issues' : 'Chat isolation is healthy'
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