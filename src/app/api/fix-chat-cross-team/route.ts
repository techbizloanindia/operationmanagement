import { NextRequest, NextResponse } from 'next/server';
import { ChatStorageService } from '@/lib/services/ChatStorageService';

// Helper function to generate queryId variations for cross-team compatibility
function generateQueryIdVariations(queryId: string): string[] {
  const variations = new Set<string>();
  const trimmed = queryId.toString().trim();
  
  // Add the original queryId
  variations.add(trimmed);
  
  // If it's a UUID format, extract numeric parts
  if (trimmed.includes('-')) {
    // Pattern 1: Extract from -query-NUMBER format
    const queryMatch = trimmed.match(/-query-(\d+)$/);
    if (queryMatch && queryMatch[1]) {
      variations.add(queryMatch[1]);
    }
    
    // Pattern 2: Extract from end -NUMBER format
    const endMatch = trimmed.match(/-(\d+)$/);
    if (endMatch && endMatch[1]) {
      variations.add(endMatch[1]);
    }
    
    // Pattern 3: Extract any sequence of digits
    const digitMatch = trimmed.match(/(\d+)/);
    if (digitMatch && digitMatch[1]) {
      variations.add(digitMatch[1]);
    }
  }
  
  // If it's numeric, create UUID-like variations that might exist
  if (/^\d+$/.test(trimmed)) {
    variations.add(`uuid-query-${trimmed}`);
  }
  
  return Array.from(variations);
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Starting cross-team chat compatibility fix...');
    
    const { connectToDatabase } = await import('@/lib/mongodb');
    const { db } = await connectToDatabase();
    
    // Get all chat messages
    const messagesCollection = db.collection('chat_messages');
    const allMessages = await messagesCollection.find({}).toArray();
    
    console.log(`📊 Found ${allMessages.length} total chat messages to analyze`);
    
    // Group messages by potential queryId variations
    const queryGroups = new Map<string, any[]>();
    const fixedMessages: any[] = [];
    
    for (const message of allMessages) {
      const messageQueryId = message.queryId?.toString().trim();
      if (!messageQueryId) continue;
      
      // Generate variations for this message's queryId
      const variations = generateQueryIdVariations(messageQueryId);
      
      // Find if this message belongs to an existing group
      let foundGroup = false;
      for (const [groupKey, groupMessages] of queryGroups.entries()) {
        const groupVariations = generateQueryIdVariations(groupKey);
        
        // Check if there's any overlap between variations
        const hasOverlap = variations.some(v => groupVariations.includes(v));
        
        if (hasOverlap) {
          groupMessages.push(message);
          foundGroup = true;
          break;
        }
      }
      
      // If no existing group found, create a new one
      if (!foundGroup) {
        queryGroups.set(messageQueryId, [message]);
      }
    }
    
    console.log(`📊 Grouped messages into ${queryGroups.size} logical query groups`);
    
    // Fix messages that have different queryId formats but belong to the same logical query
    let updatedCount = 0;
    
    for (const [groupKey, groupMessages] of queryGroups.entries()) {
      if (groupMessages.length <= 1) continue;
      
      // Find the most common queryId format in this group
      const queryIdCounts = new Map<string, number>();
      groupMessages.forEach(msg => {
        const qId = msg.queryId?.toString().trim();
        if (qId) {
          queryIdCounts.set(qId, (queryIdCounts.get(qId) || 0) + 1);
        }
      });
      
      // Get the most frequent queryId format
      let mostCommonQueryId = groupKey;
      let maxCount = 0;
      for (const [qId, count] of queryIdCounts.entries()) {
        if (count > maxCount) {
          maxCount = count;
          mostCommonQueryId = qId;
        }
      }
      
      console.log(`🔄 Processing group with ${groupMessages.length} messages, standardizing to queryId: "${mostCommonQueryId}"`);
      
      // Update messages that don't match the most common format
      for (const message of groupMessages) {
        const currentQueryId = message.queryId?.toString().trim();
        
        if (currentQueryId !== mostCommonQueryId) {
          console.log(`  📝 Updating message ${message._id}: "${currentQueryId}" -> "${mostCommonQueryId}"`);
          
          await messagesCollection.updateOne(
            { _id: message._id },
            {
              $set: {
                queryId: mostCommonQueryId,
                originalQueryId: currentQueryId,
                crossTeamCompatible: true,
                fixedAt: new Date(),
                fixReason: 'cross-team-compatibility'
              }
            }
          );
          
          updatedCount++;
          fixedMessages.push({
            messageId: message._id.toString(),
            oldQueryId: currentQueryId,
            newQueryId: mostCommonQueryId,
            sender: message.sender,
            team: message.team
          });
        }
      }
    }
    
    console.log(`✅ Cross-team chat fix completed: ${updatedCount} messages updated`);
    
    return NextResponse.json({
      success: true,
      message: `Cross-team chat compatibility fix completed successfully`,
      stats: {
        totalMessages: allMessages.length,
        queryGroups: queryGroups.size,
        messagesUpdated: updatedCount,
        fixedMessages: fixedMessages
      }
    });
    
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('❌ Error fixing cross-team chat compatibility:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: `Failed to fix cross-team chat compatibility: ${errorMessage}`
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Analyzing cross-team chat compatibility issues...');
    
    const { connectToDatabase } = await import('@/lib/mongodb');
    const { db } = await connectToDatabase();
    
    // Get all chat messages
    const messagesCollection = db.collection('chat_messages');
    const allMessages = await messagesCollection.find({}).toArray();
    
    // Analyze queryId patterns
    const queryIdPatterns = new Map<string, { count: number; examples: string[] }>();
    const potentialIssues: any[] = [];
    
    for (const message of allMessages) {
      const queryId = message.queryId?.toString().trim();
      if (!queryId) continue;
      
      // Detect pattern
      let pattern = 'unknown';
      if (/^\d+$/.test(queryId)) {
        pattern = 'numeric';
      } else if (queryId.includes('-')) {
        if (queryId.match(/-query-\d+$/)) {
          pattern = 'uuid-query-number';
        } else if (queryId.match(/-\d+$/)) {
          pattern = 'uuid-number';
        } else {
          pattern = 'uuid-complex';
        }
      }
      
      if (!queryIdPatterns.has(pattern)) {
        queryIdPatterns.set(pattern, { count: 0, examples: [] });
      }
      
      const patternData = queryIdPatterns.get(pattern)!;
      patternData.count++;
      if (patternData.examples.length < 5) {
        patternData.examples.push(queryId);
      }
      
      // Check for potential cross-team issues
      const variations = generateQueryIdVariations(queryId);
      if (variations.length > 1) {
        // Check if there are messages with different variations of the same logical query
        const relatedMessages = await messagesCollection.find({
          queryId: { $in: variations.filter(v => v !== queryId) }
        }).toArray();
        
        if (relatedMessages.length > 0) {
          potentialIssues.push({
            queryId,
            variations,
            relatedMessageCount: relatedMessages.length,
            teams: [...new Set([message.team, ...relatedMessages.map(m => m.team)])],
            senders: [...new Set([message.sender, ...relatedMessages.map(m => m.sender)])]
          });
        }
      }
    }
    
    return NextResponse.json({
      success: true,
      analysis: {
        totalMessages: allMessages.length,
        queryIdPatterns: Object.fromEntries(queryIdPatterns.entries()),
        potentialCrossTeamIssues: potentialIssues.length,
        issueDetails: potentialIssues.slice(0, 10) // Show first 10 issues
      }
    });
    
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('❌ Error analyzing cross-team chat compatibility:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: `Failed to analyze cross-team chat compatibility: ${errorMessage}`
      },
      { status: 500 }
    );
  }
}
