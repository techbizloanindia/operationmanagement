import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log('🔗 Linking related queryIds for cross-team compatibility...');
    
    const { connectDB } = await import('@/lib/mongodb');
    const { db } = await connectDB();
    
    // Get all queries to find relationships
    const allQueries = await db.collection('queries').find({}).toArray();
    console.log(`Found ${allQueries.length} queries to analyze`);
    
    // Get all chat messages
    const allChatMessages = await db.collection('chat_messages').find({}).toArray();
    console.log(`Found ${allChatMessages.length} chat messages to analyze`);
    
    // Create a mapping of related queryIds
    const queryIdMappings = new Map<string, Set<string>>();
    
    // Process each query to find relationships
    allQueries.forEach(query => {
      const relatedIds = new Set<string>();
      
      // Add main query ID
      if (query.id) relatedIds.add(query.id.toString());
      
      // Add sub-query IDs
      if (query.queries && Array.isArray(query.queries)) {
        query.queries.forEach((subQuery: any) => {
          if (subQuery.id) relatedIds.add(subQuery.id.toString());
        });
      }
      
      // Add app number variations
      if (query.appNo) {
        const appNo = query.appNo.toString();
        relatedIds.add(appNo);
        
        // Extract numbers from app number
        const numbers = appNo.match(/\d+/g);
        if (numbers) {
          numbers.forEach((num: string) => relatedIds.add(num));
        }
      }
      
      // Link all related IDs together
      const allRelatedIds = Array.from(relatedIds);
      allRelatedIds.forEach(id => {
        if (!queryIdMappings.has(id)) {
          queryIdMappings.set(id, new Set());
        }
        allRelatedIds.forEach(relatedId => {
          queryIdMappings.get(id)!.add(relatedId);
        });
      });
    });
    
    // Now update chat messages to use consistent queryIds
    let updatedCount = 0;
    const updates: any[] = [];
    
    for (const message of allChatMessages) {
      const currentQueryId = message.queryId?.toString();
      if (!currentQueryId) continue;
      
      // Find all related queryIds for this message
      const relatedIds = queryIdMappings.get(currentQueryId);
      if (relatedIds && relatedIds.size > 1) {
        // Choose the most "canonical" queryId (shortest numeric one if available)
        const sortedIds = Array.from(relatedIds).sort((a, b) => {
          // Prefer numeric IDs
          const aIsNumeric = /^\d+$/.test(a);
          const bIsNumeric = /^\d+$/.test(b);
          
          if (aIsNumeric && !bIsNumeric) return -1;
          if (!aIsNumeric && bIsNumeric) return 1;
          
          // If both numeric, prefer shorter
          if (aIsNumeric && bIsNumeric) {
            return a.length - b.length || parseInt(a) - parseInt(b);
          }
          
          // If both non-numeric, prefer shorter
          return a.length - b.length;
        });
        
        const canonicalId = sortedIds[0];
        
        if (currentQueryId !== canonicalId) {
          console.log(`🔄 Updating message ${message._id}: "${currentQueryId}" -> "${canonicalId}"`);
          
          await db.collection('chat_messages').updateOne(
            { _id: message._id },
            {
              $set: {
                queryId: canonicalId,
                originalQueryId: currentQueryId,
                relatedQueryIds: Array.from(relatedIds),
                linkedAt: new Date(),
                linkReason: 'cross-team-compatibility'
              }
            }
          );
          
          updatedCount++;
          updates.push({
            messageId: message._id.toString(),
            oldQueryId: currentQueryId,
            newQueryId: canonicalId,
            allRelatedIds: Array.from(relatedIds),
            sender: message.sender,
            team: message.team
          });
        }
      }
    }
    
    console.log(`✅ QueryId linking completed: ${updatedCount} messages updated`);
    
    return NextResponse.json({
      success: true,
      message: `QueryId linking completed successfully`,
      stats: {
        totalQueries: allQueries.length,
        totalChatMessages: allChatMessages.length,
        queryIdMappings: queryIdMappings.size,
        messagesUpdated: updatedCount
      },
      updates: updates,
      mappings: Object.fromEntries(
        Array.from(queryIdMappings.entries()).slice(0, 10).map(([key, value]) => [key, Array.from(value)])
      )
    });
    
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('❌ Error linking queryIds:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: `Failed to link queryIds: ${errorMessage}`
      },
      { status: 500 }
    );
  }
}
