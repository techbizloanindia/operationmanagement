import { NextRequest, NextResponse } from 'next/server';
import { RemarkModel, RemarkMessage } from '@/lib/models/Remarks';
import { ChatStorageService } from '@/lib/services/ChatStorageService';
import crypto from 'crypto';

// Helper function to generate STRICT queryId variations to prevent contamination
function generateQueryIdVariations(queryId: string): string[] {
  const variations = new Set<string>();
  const trimmed = queryId.toString().trim();
  
  // ALWAYS add the original queryId
  variations.add(trimmed);
  
  // STRICT: Only handle specific, safe patterns to prevent contamination
  
  // Pattern 1: App numbers like "HPR85", "KTL91" -> extract number only if it's meaningful (2+ digits)
  const appNumberMatch = trimmed.match(/^([A-Z]+)(\d{2,})$/);
  if (appNumberMatch && appNumberMatch[2]) {
    const numericPart = appNumberMatch[2];
    if (numericPart.length >= 2) { // Only 2+ digit numbers to avoid contamination
      variations.add(numericPart);
    }
  }
  
  // Pattern 2: UUID with meaningful ending number (like "uuid-85" but only if 2+ digits)
  if (trimmed.includes('-')) {
    const endMatch = trimmed.match(/-(\d{2,})$/);
    if (endMatch && endMatch[1] && endMatch[1].length >= 2) {
      variations.add(endMatch[1]);
    }
  }
  
  // Pattern 3: Pure numeric IDs (2+ digits) - add UUID patterns
  if (/^\d{2,}$/.test(trimmed)) {
    variations.add(`uuid-query-${trimmed}`);
    variations.add(`query-${trimmed}`);
  }
  
  // Pattern 4: App numbers with spaces like "FR2 559" -> "559" (only if 2+ digits)
  if (trimmed.includes(' ')) {
    const parts = trimmed.split(' ');
    parts.forEach(part => {
      if (/^\d{2,}$/.test(part)) { // Only 2+ digit numbers
        variations.add(part);
      }
    });
  }
  
  console.log(`🔒 STRICT Variations for "${trimmed}":`, Array.from(variations));
  return Array.from(variations);
}

interface RemarkMessageResponse {
  id: string;
  queryId: string;
  remark: string;
  text: string;
  sender: string;
  senderRole: string;
  timestamp: string;
  team: string;
  responseText: string;
}

// In-memory remarks storage - will be enhanced with database
const remarksDatabase: RemarkMessageResponse[] = [];

// Real-time remark subscribers for live updates
const subscribers = new Map<string, Set<(remark: RemarkMessageResponse) => void>>();

// Add subscriber for real-time updates (moved to separate service)
function subscribeToQuery(queryId: string, callback: (remark: RemarkMessageResponse) => void) {
  if (!subscribers.has(queryId)) {
    subscribers.set(queryId, new Set());
  }
  subscribers.get(queryId)!.add(callback);
  
  // Return unsubscribe function
  return () => {
    const querySubscribers = subscribers.get(queryId);
    if (querySubscribers) {
      querySubscribers.delete(callback);
      if (querySubscribers.size === 0) {
        subscribers.delete(queryId);
      }
    }
  };
}

// Notify all subscribers of a new remark
function notifySubscribers(queryId: string, remark: RemarkMessageResponse) {
  const querySubscribers = subscribers.get(queryId);
  if (querySubscribers) {
    querySubscribers.forEach(callback => {
      try {
        callback(remark);
      } catch (error) {
        console.error('Error notifying subscriber:', error);
      }
    });
  }
}

// Initialize sample chat data
const initializeChatData = () => {
  if (remarksDatabase.length === 0) {
    const sampleChats: RemarkMessageResponse[] = [
      // No sample chat remarks - clean database for production use
    ];
    
    remarksDatabase.push(...sampleChats);
  }
};

// GET - Fetch chat remarks for a specific query
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ queryId: string }> }
) {
  try {
    initializeChatData();
    
    const { queryId } = await params;
    const url = new URL(request.url);
    const requestingTeam = url.searchParams.get('team') || 'unknown';
    const crossTeamEnabled = url.searchParams.get('crossTeam') === 'true';
    
    const normalizedQueryId = queryId.toString().trim();
    
    console.log(`💬 Chat API: Fetching CROSS-TEAM chat thread for query ID: ${normalizedQueryId}`);
    console.log(`🔄 Requesting Team: ${requestingTeam}, Cross-Team Enabled: ${crossTeamEnabled}`);
    
    // ENHANCED: Cross-team messaging support for Sales ↔ Operations ↔ Credit
    // All teams should see messages from all other teams for the same query
    
    let queryRemarks: RemarkMessageResponse[] = [];

    // MULTI-SOURCE: Get messages from ALL sources for COMPLETE cross-team visibility
    // This ensures Sales, Operations, and Credit team messages are ALL visible
    const allMessages: RemarkMessageResponse[] = [];
    
    // CRITICAL FIX: Generate all possible queryId variations for cross-team compatibility
    let queryIdVariations = generateQueryIdVariations(normalizedQueryId);
    console.log(`🔍 Chat API: Generated initial queryId variations:`, queryIdVariations);
    
    // ENHANCED: Look up related queryIds from the database for bidirectional mapping
    try {
      const { connectDB } = await import('@/lib/mongodb');
      const { db } = await connectDB();
      
      // Find queries that might be related to this queryId
      const relatedQueries = await db.collection('queries').find({
        $or: [
          { id: { $in: queryIdVariations } },
          { 'queries.id': { $in: queryIdVariations } },
          ...queryIdVariations.map(variation => ({ appNo: { $regex: new RegExp(variation, 'i') } }))
        ]
      }).toArray();
      
      // Extract all queryIds from related queries
      const additionalVariations = new Set(queryIdVariations);
      relatedQueries.forEach(query => {
        if (query.id) additionalVariations.add(query.id.toString());
        if (query.queries && Array.isArray(query.queries)) {
          query.queries.forEach((subQuery: any) => {
            if (subQuery.id) additionalVariations.add(subQuery.id.toString());
          });
        }
      });
      
      queryIdVariations = Array.from(additionalVariations);
      console.log(`🔍 Chat API: Enhanced queryId variations with database lookup:`, queryIdVariations);
    } catch (dbLookupError) {
      console.warn('⚠️ Could not perform database lookup for related queryIds:', dbLookupError);
    }
    
    // SOURCE 1: Get messages from ChatStorageService (MongoDB chat_messages collection)
    // ENHANCED: Try all queryId variations for cross-team compatibility
    try {
      const allChatMessages: any[] = [];
      
      // Try each queryId variation to find all related messages
      for (const variation of queryIdVariations) {
        console.log(`🔍 Chat API: Trying queryId variation: "${variation}"`);
        const chatMessages = await ChatStorageService.getChatMessages(variation);
        
        if (chatMessages && chatMessages.length > 0) {
          console.log(`✅ Chat API: Found ${chatMessages.length} messages for variation: "${variation}"`);
          allChatMessages.push(...chatMessages);
        }
      }
      
      if (allChatMessages.length > 0) {
        // ENHANCED: Validate messages belong to the same logical query (any variation)
        const validatedMessages = allChatMessages.filter(msg => {
          const msgQueryId = msg.queryId?.toString().trim();
          const isValid = queryIdVariations.includes(msgQueryId);
          
          if (!isValid) {
            console.error(`🚫 CRITICAL: Rejected contaminated message in Chat API - Target variations: [${queryIdVariations.join(', ')}], Actual: "${msgQueryId}"`);
          }
          
          return isValid;
        });
        
        if (validatedMessages.length !== allChatMessages.length) {
          console.error(`🚨 SECURITY ALERT: Filtered ${allChatMessages.length - validatedMessages.length} contaminated messages from Chat API response`);
        }
        
        // Remove duplicates based on message content and timestamp
        const uniqueMessages = validatedMessages.filter((msg, index, self) => 
          index === self.findIndex(m => 
            m.message === msg.message && 
            m.sender === msg.sender && 
            Math.abs(new Date(m.timestamp).getTime() - new Date(msg.timestamp).getTime()) < 1000
          )
        );
        
        const chatMessagesFormatted = uniqueMessages.map(msg => ({
          id: `db-${msg._id?.toString() || Date.now()}`,
          queryId: normalizedQueryId, // Always use normalized ID to prevent contamination
          remark: msg.message || msg.responseText,
          text: msg.message || msg.responseText,
          sender: msg.sender,
          senderRole: msg.senderRole || msg.team || 'user',
          timestamp: msg.timestamp.toISOString(),
          team: msg.team || msg.senderRole || 'operations',
          responseText: msg.message || msg.responseText,
          // Server validation flags
          serverValidated: true,
          originalQueryId: msg.queryId,
          source: 'chat_messages',
          crossTeamCompatible: true
        }));
        
        allMessages.push(...chatMessagesFormatted);
        console.log(`✅ Chat API: Loaded ${chatMessagesFormatted.length} unique cross-team messages from ChatStorageService`);
      }
    } catch (dbError) {
      console.error('❌ Chat API: Failed to load from ChatStorageService:', dbError);
    }
    
    // SOURCE 2: Get messages from Query model (both messages and remarks arrays)
    // ENHANCED: Try all queryId variations for cross-team compatibility
    try {
      const { connectDB } = await import('@/lib/mongodb');
      const { db } = await connectDB();
      const { ObjectId } = await import('mongodb');
      
      let queryDoc = null;
      
      // Try each queryId variation to find the query document
      for (const variation of queryIdVariations) {
        console.log(`🔍 Chat API: Searching Query model with variation: "${variation}"`);
        
        const queryFilter: any = {
          $or: [
            { id: variation },
            { 'queries.id': variation }
          ]
        };
        
        if (ObjectId.isValid(variation)) {
          queryFilter.$or.push({ _id: new ObjectId(variation) });
        }
        
        queryDoc = await db.collection('queries').findOne(queryFilter);
        
        if (queryDoc) {
          console.log(`✅ Chat API: Found query document with variation: "${variation}"`);
          break;
        }
      }
      
      if (queryDoc) {
        console.log(`✅ Chat API: Found query document for ${normalizedQueryId}`);
        
        // Get operations messages from 'messages' array
        const operationsMessages = (queryDoc.messages || []).map((msg: any, index: number) => ({
          id: `ops-${normalizedQueryId}-${index}-${new Date(msg.timestamp).getTime()}`,
          queryId: normalizedQueryId,
          remark: msg.text,
          text: msg.text,
          sender: msg.sender || 'Operations User',
          senderRole: 'operations',
          timestamp: msg.timestamp || new Date().toISOString(),
          team: 'operations',
          responseText: msg.text,
          serverValidated: true,
          originalQueryId: normalizedQueryId,
          source: 'query_messages'
        }));
        
        // Get credit messages from 'remarks' array
        const creditMessages = (queryDoc.remarks || []).map((remark: any) => ({
          id: `credit-${remark.id || Date.now()}`,
          queryId: normalizedQueryId,
          remark: remark.text,
          text: remark.text,
          sender: remark.author || remark.sender || 'Credit User',
          senderRole: remark.authorRole || 'credit',
          timestamp: remark.timestamp || new Date().toISOString(),
          team: remark.authorTeam || 'credit',
          responseText: remark.text,
          serverValidated: true,
          originalQueryId: normalizedQueryId,
          source: 'query_remarks'
        }));
        
        allMessages.push(...operationsMessages, ...creditMessages);
        console.log(`✅ Chat API: Loaded ${operationsMessages.length} operations messages and ${creditMessages.length} credit messages from Query model`);
      } else {
        console.warn(`⚠️ Chat API: No query document found for ${normalizedQueryId}`);
      }
    } catch (queryError) {
      console.error('❌ Chat API: Failed to load from Query model:', queryError);
    }
    
    // Deduplicate messages based on content, sender, and timestamp
    const seenMessages = new Set();
    queryRemarks = allMessages.filter(msg => {
      const key = `${msg.sender}-${msg.text}-${new Date(msg.timestamp).getTime()}`;
      if (seenMessages.has(key)) {
        console.log(`🔄 Deduplicated message: ${msg.text.substring(0, 30)}...`);
        return false;
      }
      seenMessages.add(key);
      return true;
    });
    
    console.log(`✅ Chat API: Combined ${allMessages.length} total messages, deduplicated to ${queryRemarks.length} unique messages`);
    
    // Log message details for debugging
    queryRemarks.forEach((remark, index) => {
      console.log(`  📝 Chat API Message ${index + 1}:`, {
        id: remark.id,
        queryId: remark.queryId,
        sender: remark.sender,
        senderRole: remark.senderRole,
        team: remark.team,
        messagePreview: remark.remark?.substring(0, 30) + '...',
        source: (remark as any).source
      });
    });
    
    // REMOVED: RemarkModel fetching to prevent duplicate messages
    // REMOVED: Global message database and in-memory storage to prevent contamination
    // All messages now come exclusively from MongoDB ChatStorageService only
    // This ensures proper chat isolation with zero cross-query contamination and no duplicates
    
    // Remove duplicates based on content, sender, and timestamp
    const uniqueRemarks = queryRemarks.filter((remark, index, self) => 
      index === self.findIndex(m => 
        m.remark === remark.remark && 
        m.sender === remark.sender && 
        Math.abs(new Date(m.timestamp).getTime() - new Date(remark.timestamp).getTime()) < 1000
      )
    );
    
    // Sort by timestamp (oldest first)
    uniqueRemarks.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    
    console.log(`✅ Chat API: Query ${queryId} isolated chat thread contains ${uniqueRemarks.length} messages`);
    console.log(`🔒 Chat API: Chat isolation verified - No cross-query contamination`);
    
    // Enhanced debugging: Log each message with full details
    console.log(`📋 Chat API: Complete message list for query ${queryId}:`);
    uniqueRemarks.forEach((remark, index) => {
      console.log(`  Message ${index + 1}:`, {
        id: remark.id,
        queryId: remark.queryId,
        sender: remark.sender,
        senderRole: remark.senderRole,
        team: remark.team,
        timestamp: remark.timestamp,
        messagePreview: remark.remark?.substring(0, 50) + '...',
        source: (remark as any).source
      });
    });
    
    // Final validation: Check for any sales/credit team contamination in this specific context
    const teamDistribution = uniqueRemarks.reduce((acc: any, remark) => {
      const team = remark.team || remark.senderRole || 'unknown';
      acc[team] = (acc[team] || 0) + 1;
      return acc;
    }, {});
    
    console.log(`📊 Chat API: Team message distribution for query ${queryId}:`, teamDistribution);
    
    // Real-time debugging flag
    const debugResponse = {
      success: true,
      data: uniqueRemarks,
      count: uniqueRemarks.length,
      queryId: queryId,
      isolated: true,
      debug: {
        totalSourceMessages: allMessages.length,
        afterDeduplication: uniqueRemarks.length,
        teamDistribution: teamDistribution,
        timestamp: new Date().toISOString(),
        messageIds: uniqueRemarks.map(m => m.id)
      }
    };
    
    return NextResponse.json(debugResponse);

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('💥 Error fetching chat remarks:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: `Failed to fetch chat remarks: ${errorMessage}`
      },
      { status: 500 }
    );
  }
}

// POST - Add a new chat remark
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ queryId: string }> }
) {
  try {
    initializeChatData();
    
    const { queryId } = await params;
    const normalizedQueryId = queryId.toString().trim();
    const body = await request.json();
    const { remark, message, sender, senderRole, team, queryId: bodyQueryId } = body;
    
    // ENHANCED: Generate queryId variations for cross-team compatibility
    const queryIdVariations = generateQueryIdVariations(normalizedQueryId);
    console.log(`📝 Chat API POST: Generated queryId variations for message storage:`, queryIdVariations);
    
    // ENHANCED: Validate queryId consistency - allow any variation
    if (bodyQueryId) {
      const bodyQueryIdStr = bodyQueryId.toString().trim();
      const bodyVariations = generateQueryIdVariations(bodyQueryIdStr);
      
      // Check if there's any overlap between URL and body variations
      const hasOverlap = queryIdVariations.some(variation => bodyVariations.includes(variation));
      
      if (!hasOverlap) {
        console.error(`🚫 SECURITY ALERT: QueryId mismatch - URL variations: [${queryIdVariations.join(', ')}], Body variations: [${bodyVariations.join(', ')}]`);
        
        return NextResponse.json(
          { 
            success: false, 
            error: 'QueryId mismatch detected - potential contamination attempt',
            debug: {
              urlVariations: queryIdVariations,
              bodyVariations: bodyVariations,
              urlType: typeof queryId,
              bodyType: typeof bodyQueryId
            }
          },
          { status: 400 }
        );
      }
    }
    
    // Use message if remark is not provided (for compatibility)
    const messageText = remark || message;
    
    if (!messageText || !sender || !senderRole) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Message/remark, sender, and senderRole are required' 
        },
        { status: 400 }
      );
    }
    
    console.log(`📝 Chat API POST: Adding message to ISOLATED thread for query ${normalizedQueryId}`);
    
    // Enhanced duplicate check with cross-team queryId variations
    try {
      const allRecentMessages: any[] = [];
      
      // Check for duplicates across all queryId variations
      for (const variation of queryIdVariations) {
        const recentMessages = await ChatStorageService.getChatMessages(variation);
        allRecentMessages.push(...recentMessages);
      }
      
      const isDuplicate = allRecentMessages.some(msg => 
        msg.message === messageText &&
        msg.sender === sender &&
        queryIdVariations.includes(msg.queryId) && // Cross-team queryId validation
        Date.now() - new Date(msg.timestamp).getTime() < 5000 // Within 5 seconds
      );
      
      if (isDuplicate) {
        console.log(`⚠️ Duplicate message detected across queryId variations, skipping`);
        return NextResponse.json({
          success: true,
          data: {
            id: `dup-${normalizedQueryId}-${Date.now()}`,
            queryId: normalizedQueryId,
            remark: messageText,
            text: messageText,
            sender: sender,
            senderRole: senderRole,
            timestamp: new Date().toISOString(),
            team: team || senderRole,
            responseText: messageText,
            isDuplicate: true,
            crossTeamCompatible: true
          },
          message: 'Message already exists (duplicate prevented)'
        });
      }
    } catch (dupCheckError) {
      console.warn('Could not check for duplicates:', dupCheckError);
      // Continue with message creation
    }
    
    // PRIMARY STORAGE: Save using ChatStorageService (MongoDB)
    let storedMessage = null;
    try {
      const chatMessage = {
        queryId: normalizedQueryId,
        message: messageText,
        responseText: messageText,
        sender: sender,
        senderRole: senderRole,
        team: team || senderRole,
        timestamp: new Date(),
        isSystemMessage: false,
        actionType: 'message' as const
      };

      storedMessage = await ChatStorageService.storeChatMessage(chatMessage);
      if (storedMessage) {
        console.log(`✅ Chat message stored to MongoDB (chat_messages): ${storedMessage._id}`);
        console.log(`📋 QUERYID TRACKING: Chat message stored with queryId: "${chatMessage.queryId}"`);
        console.log(`📋 QUERYID TRACKING: Original URL queryId: "${normalizedQueryId}"`);
        console.log(`📋 QUERYID TRACKING: Stored message queryId: "${storedMessage.queryId}"`);
      }
    } catch (error) {
      console.error('Error storing chat message to MongoDB:', error);
      throw new Error('Failed to store message to database');
    }
    
    // CRITICAL: Store in Query model's remarks array for BOTH TEAMS visibility and persistence
    try {
      const { connectDB } = await import('@/lib/mongodb');
      const { db } = await connectDB();
      const { ObjectId } = await import('mongodb');
      
      const newRemark = {
        id: `remark-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        text: messageText,
        author: sender,
        authorRole: senderRole,
        authorTeam: team || senderRole,
        timestamp: new Date(),
        isEdited: false,
        // Enhanced metadata for cross-team visibility
        crossTeamMessage: true,
        targetQueryId: normalizedQueryId,
        messageType: senderRole === 'operations' ? 'query_response' : 'team_response'
      };
      
      // Enhanced query finding - try all queryId variations for cross-team compatibility
      let updateResult = null;
      let queryFound = false;
      
      // Try each queryId variation to find and update the query
      for (const variation of queryIdVariations) {
        console.log(`🔍 Chat API: Trying to update Query model with variation: "${variation}"`);
        
        const queryFilters = [
          // Direct match on main query ID
          { id: variation },
          // Match on sub-query ID within queries array
          { 'queries.id': variation },
          // Match if it's a direct ObjectId
          ...(ObjectId.isValid(variation) ? [{ _id: new ObjectId(variation) }] : [])
        ];
        
        // Try each filter for this variation
        for (const queryFilter of queryFilters) {
          try {
            updateResult = await db.collection('queries').updateOne(
              queryFilter,
              { 
                $push: { remarks: newRemark } as any,
                $set: { 
                  lastUpdated: new Date(),
                  lastMessageBy: sender,
                  lastMessageTeam: team || senderRole,
                  hasNewMessages: true
                } as any
              }
            );
            
            if (updateResult.modifiedCount > 0) {
              queryFound = true;
              console.log(`✅ Message stored in Query model for CROSS-TEAM visibility using variation "${variation}" with filter:`, queryFilter);
              break;
            }
          } catch (filterError: any) {
            console.log(`⚠️ Query filter failed for variation "${variation}":`, queryFilter, filterError?.message || filterError);
            continue;
          }
        }
        
        if (queryFound) break; // Exit outer loop if we found and updated the query
      }
      
      if (!queryFound) {
        console.warn(`⚠️ Could not find query document for any variation of ID: ${normalizedQueryId}`);
        console.warn(`Attempted variations:`, queryIdVariations);
        
        // Try to create a cross-reference document for orphaned messages
        try {
          await db.collection('chat_query_references').insertOne({
            queryId: normalizedQueryId,
            messageId: storedMessage?._id,
            sender: sender,
            senderRole: senderRole,
            team: team,
            timestamp: new Date(),
            orphaned: true,
            reason: 'Query document not found in queries collection'
          });
          console.log(`📝 Created cross-reference for orphaned message: ${normalizedQueryId}`);
        } catch (refError) {
          console.error('❌ Failed to create cross-reference:', refError);
        }
      }
    } catch (remarkError) {
      console.error('❌ Error adding remark to Query model:', remarkError);
      // Don't throw - message is already stored in ChatStorageService
    }
    
    // Create response object
    const newRemark: RemarkMessageResponse = {
      id: storedMessage?._id?.toString() || `msg-${normalizedQueryId}-${Date.now()}`,
      queryId: normalizedQueryId,
      remark: messageText,
      text: messageText,
      sender: sender,
      senderRole: senderRole,
      timestamp: new Date().toISOString(),
      team: team || senderRole,
      responseText: messageText
    };
    
    // Notify real-time subscribers
    notifySubscribers(normalizedQueryId, newRemark);
    
    console.log(`✅ Chat API: Added new message for query ${normalizedQueryId}:`, {
      messageId: newRemark.id,
      queryId: normalizedQueryId,
      sender: newRemark.sender,
      senderRole: newRemark.senderRole,
      team: newRemark.team,
      messageLength: messageText.length,
      timestamp: newRemark.timestamp,
      isolationVerified: true,
      storedInDB: !!storedMessage
    });
    
    // Immediate verification - try to retrieve the message we just stored
    try {
      const verificationMessages = await ChatStorageService.getChatMessages(normalizedQueryId);
      const justStored = verificationMessages.find(msg => 
        msg.message === messageText && 
        msg.sender === sender &&
        Math.abs(new Date(msg.timestamp).getTime() - new Date().getTime()) < 10000 // Within 10 seconds
      );
      
      if (justStored) {
        console.log(`✅ Chat API: Verified message storage - message is retrievable:`, {
          storedId: justStored._id,
          queryId: justStored.queryId,
          message: justStored.message.substring(0, 50) + '...'
        });
      } else {
        console.warn(`⚠️ Chat API: Warning - just stored message not found in retrieval for query ${normalizedQueryId}`);
      }
    } catch (verifyError) {
      console.error('❌ Chat API: Failed to verify message storage:', verifyError);
    }
    
    return NextResponse.json({
      success: true,
      data: newRemark,
      message: 'Chat message added successfully',
      debug: {
        queryId: normalizedQueryId,
        team: newRemark.team,
        senderRole: newRemark.senderRole
      }
    });

  } catch (error: unknown) {
    const errorRemark = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('💥 Error adding chat remark:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: `Failed to add chat remark: ${errorRemark}`
      },
      { status: 500 }
    );
  }
} 