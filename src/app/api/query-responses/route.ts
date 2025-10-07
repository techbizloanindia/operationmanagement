import { NextRequest, NextResponse } from 'next/server';
import { ChatStorageService } from '@/lib/services/ChatStorageService';
import { broadcastQueryUpdate } from '@/lib/eventStreamUtils';

interface QueryResponse {
  queryId: string;
  appNo: string;
  responseText: string;
  team: 'Sales' | 'Credit' | 'Operations';
  respondedBy: string;
  timestamp?: string;
}

// In-memory storage for responses
// In a real app, this would be stored in a database
let responsesDatabase: any[] = [];

// REMOVED: Global message database storage to prevent cross-query contamination
// All chat messages are now stored exclusively in MongoDB for proper isolation
// This is critical for Vercel serverless deployment where global state is unreliable

function initializeData() {
  // No longer needed - using MongoDB exclusively for chat storage
  console.log('🔒 Chat isolation: Using MongoDB-only storage for perfect query isolation');
}

// POST - Submit new response
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { queryId, appNo, responseText, team, respondedBy, timestamp } = body;
    
    // Initialize data
    initializeData();
    
    if (!queryId || !responseText || !team) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required fields: queryId, responseText, team' 
        },
        { status: 400 }
      );
    }

    // Create response with timestamp
    const responseData = {
      id: `${Date.now().toString()}-${Math.random().toString(36).substring(2, 9)}`,
      queryId,
      appNo,
      responseText,
      team,
      respondedBy: respondedBy || `${team} Team Member`,
      timestamp: timestamp || new Date().toISOString(),
      isRead: false
    };

    // Store in our database
    responsesDatabase.push(responseData);
    
    // Create message data for chat history with proper isolation
    const messageData = {
      id: `${Date.now().toString()}-${Math.random().toString(36).substring(2, 9)}`,
      queryId: queryId.toString().trim(), // CRITICAL: Store as string for consistent comparison
      originalQueryId: queryId.toString().trim(),
      message: responseText,
      responseText: responseText,
      sender: respondedBy || `${team} Team Member`,
      senderRole: team.toLowerCase(),
      team: team,
      timestamp: timestamp || new Date().toISOString(),
      isolationKey: `query_${queryId}`,
      threadIsolated: true
    };
    
    // REMOVED: Global message database to prevent cross-query contamination
    // All messages now stored exclusively in MongoDB for proper isolation
    console.log(`✅ Message stored in MongoDB with ISOLATED queryId ${queryId} from ${team} team`);
    
    // Broadcast the reply to all connected clients (all dashboards)
    try {
      console.log(`📡 Broadcasting reply from ${team} team to all dashboards`);
      
      const broadcastData = {
        id: queryId,
        appNo: appNo || `APP-${queryId}`,
        customerName: 'Query Customer', // You may want to fetch this from query details
        action: 'message_added',
        team: team.toLowerCase(),
        markedForTeam: 'both', // Notify all teams
        newMessage: {
          id: messageData.id,
          text: responseText,
          author: respondedBy || `${team} Team Member`,
          authorTeam: team,
          timestamp: messageData.timestamp
        },
        broadcast: true, // Broadcast to all teams
        messageFrom: team,
        priority: 'high' // High priority for replies
      };
      
      // Broadcast to all teams
      broadcastQueryUpdate(broadcastData);
      
      // Also broadcast specifically to each team
      ['operations', 'sales', 'credit'].forEach(targetTeam => {
        if (targetTeam !== team.toLowerCase()) {
          const teamSpecificData = {
            ...broadcastData,
            markedForTeam: targetTeam
          };
          broadcastQueryUpdate(teamSpecificData);
        }
      });
      
      console.log(`🎯 Reply from ${team} team broadcasted successfully to all dashboards (operations, sales, credit)`);
      
    } catch (broadcastError) {
      console.error('❌ Error broadcasting reply update:', broadcastError);
      // Don't fail the request if broadcast fails
    }
    
    // Store in MongoDB using ChatStorageService
    try {
      const chatMessage = {
        queryId: queryId,
        message: responseText,
        responseText: responseText,
        sender: respondedBy || `${team} Team Member`,
        senderRole: team.toLowerCase(),
        team: team,
        timestamp: new Date(timestamp || Date.now()),
        isSystemMessage: false,
        actionType: 'message' as const
      };

      const stored = await ChatStorageService.storeChatMessage(chatMessage);
      if (stored) {
        console.log(`💾 Response stored to database: ${stored._id}`);
      }
    } catch (error) {
      console.error('Error storing response to database:', error);
      // Continue with existing flow
    }
    
    // Also make API call to query-actions to ensure consistency
    try {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || `${process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : 'https://' + (request.headers.get('host') || 'localhost')}`;
      const response = await fetch(`${baseUrl}/api/query-actions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'message',
          queryId: parseInt(queryId),
          message: responseText,
          addedBy: respondedBy || `${team} Team Member`,
          team: team
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.warn('Failed to add message via query-actions API:', errorData);
      } else {
        console.log('✅ Successfully added message via query-actions API');
      }
    } catch (error) {
      console.warn('Error adding message to query-actions:', error);
    }
    
    console.log('📝 New response submitted:', responseData);
    
    return NextResponse.json({
      success: true,
      data: responseData,
      message: 'Response submitted successfully'
    });

  } catch (error: any) {
    console.error('Error submitting response:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// GET - Retrieve responses and messages
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const queryId = searchParams.get('queryId');
    const appNo = searchParams.get('appNo');
    const team = searchParams.get('team');
    const unreadOnly = searchParams.get('unreadOnly') === 'true';
    const includeMessages = searchParams.get('includeMessages') === 'true';

    // Initialize data
    initializeData();

    // Filter based on parameters
    let filteredResponses = [...responsesDatabase];

    if (queryId) {
      filteredResponses = filteredResponses.filter(r => r.queryId === queryId);
    }

    if (appNo) {
      filteredResponses = filteredResponses.filter(r => r.appNo === appNo);
    }

    if (team) {
      filteredResponses = filteredResponses.filter(r => r.team === team);
    }

    if (unreadOnly) {
      filteredResponses = filteredResponses.filter(r => r.isRead === false);
    }

    // Sort by most recent first
    filteredResponses.sort((a, b) => 
      new Date(b.timestamp || b.respondedAt).getTime() - new Date(a.timestamp || a.respondedAt).getTime()
    );

    // Get messages from MongoDB using ChatStorageService for proper isolation
    let messages: any[] = [];
    if (includeMessages && queryId) {
      const queryIdStr = queryId.toString().trim();
      
      try {
        const chatMessages = await ChatStorageService.getChatMessages(queryIdStr);
        messages = chatMessages.map(msg => ({
          id: msg._id?.toString() || `msg_${Date.now()}`,
          queryId: queryIdStr,
          message: msg.message || msg.responseText,
          sender: msg.sender,
          senderRole: msg.senderRole,
          team: msg.team,
          timestamp: msg.timestamp.toISOString(),
          isSystemMessage: msg.isSystemMessage || false,
          actionType: msg.actionType
        })).sort((a, b) => 
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
        
        console.log(`✅ Retrieved ${messages.length} ISOLATED messages for query ${queryIdStr} from MongoDB`);
      } catch (error) {
        console.error('Failed to retrieve messages from MongoDB:', error);
        messages = [];
      }
    }

    return NextResponse.json({
      success: true,
      data: filteredResponses,
      messages: messages,
      count: filteredResponses.length,
      unreadCount: filteredResponses.filter(r => r.isRead === false).length
    });

  } catch (error: any) {
    console.error('Error fetching responses:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// PATCH - Mark responses as read
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { responseIds } = body;
    
    if (!responseIds || !Array.isArray(responseIds)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required field: responseIds (array)' 
        },
        { status: 400 }
      );
    }

    // Mark responses as read
    let updatedCount = 0;
    responsesDatabase = responsesDatabase.map(response => {
      if (responseIds.includes(response.id)) {
        updatedCount++;
        return { ...response, isRead: true };
      }
      return response;
    });
    
    return NextResponse.json({
      success: true,
      updatedCount,
      message: `Successfully marked ${updatedCount} response(s) as read.`
    });

  } catch (error: any) {
    console.error('Error marking responses as read:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
} 

// Make queryMessagesDatabase accessible globally
declare global {
  var queryMessagesDatabase: any[];
} 