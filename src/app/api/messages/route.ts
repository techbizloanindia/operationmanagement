import { NextRequest, NextResponse } from 'next/server';
import { ChatStorageService } from '@/lib/services/ChatStorageService';
import { broadcastQueryUpdate } from '@/lib/eventStreamUtils';

interface MessageData {
  queryId: string;
  appNo?: string;
  message: string;
  sender: string;
  senderRole: string;
  team: string;
  type: 'message' | 'reply' | 'remark';
  customerName?: string;
}

// POST - Send a new message (universal endpoint for all message types)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      queryId, 
      appNo, 
      message, 
      sender, 
      senderRole, 
      team, 
      type = 'message',
      customerName
    }: MessageData = body;
    
    if (!queryId || !message || !sender || !senderRole || !team) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required fields: queryId, message, sender, senderRole, team' 
        },
        { status: 400 }
      );
    }

    const timestamp = new Date();
    
    // Create comprehensive message data
    const messageData = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      queryId: queryId.toString().trim(),
      appNo: appNo || `APP-${queryId}`,
      message,
      responseText: message,
      sender,
      senderRole,
      team: team.toLowerCase(),
      timestamp: timestamp.toISOString(),
      isSystemMessage: false,
      actionType: type
    };

    // REMOVED: Global message database storage to prevent cross-query contamination
    // All messages now stored exclusively in MongoDB for proper isolation

    // Store in MongoDB using ChatStorageService (PRIMARY AND ONLY STORAGE)
    try {
      const stored = await ChatStorageService.storeChatMessage({
        queryId: queryId.toString().trim(),
        message,
        responseText: message,
        sender,
        senderRole,
        team: team.toLowerCase(),
        timestamp,
        isSystemMessage: false,
        actionType: type as any
      });
      
      if (stored && stored._id) {
        console.log(`💾 Message stored to database: ${stored._id}`);
        messageData.id = stored._id.toString();
      }
    } catch (dbError) {
      console.error('Error storing message to database:', dbError);
      // Continue with broadcast even if DB storage fails
    }

    // 3. Broadcast to all dashboards
    try {
      console.log(`📡 Broadcasting ${type} from ${team} team to all dashboards`);
      
      const broadcastData = {
        id: queryId,
        appNo: messageData.appNo,
        customerName: customerName || 'Customer',
        action: 'message_added',
        team: team.toLowerCase(),
        markedForTeam: 'both', // Notify all teams
        newMessage: {
          id: messageData.id,
          text: message,
          author: sender,
          authorTeam: team,
          timestamp: messageData.timestamp
        },
        broadcast: true,
        messageFrom: team,
        priority: 'high'
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
      
      console.log(`🎯 ${type} from ${team} team broadcasted to all dashboards (operations, sales, credit)`);
      
    } catch (broadcastError) {
      console.error('❌ Error broadcasting message:', broadcastError);
    }

    console.log(`✅ ${type} processed successfully:`, {
      queryId,
      team,
      sender,
      messageLength: message.length
    });

    return NextResponse.json({
      success: true,
      data: messageData,
      message: `${type} sent successfully`
    });

  } catch (error: any) {
    console.error('💥 Error processing message:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to process message' },
      { status: 500 }
    );
  }
}

// GET - Retrieve all messages for a query
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const queryId = searchParams.get('queryId');
    const team = searchParams.get('team');
    const includeAll = searchParams.get('includeAll') === 'true';
    
    if (!queryId) {
      return NextResponse.json(
        { success: false, error: 'Missing queryId parameter' },
        { status: 400 }
      );
    }

    const normalizedQueryId = queryId.toString().trim();
    let messages: any[] = [];

    // Get from ChatStorageService (MongoDB) - PRIMARY AND ONLY SOURCE
    try {
      const chatMessages = await ChatStorageService.getChatMessages(normalizedQueryId);
      
      if (chatMessages && chatMessages.length > 0) {
        const dbMessages = chatMessages.map(msg => ({
          id: msg._id?.toString() || `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          queryId: normalizedQueryId,
          message: msg.message || msg.responseText,
          sender: msg.sender,
          senderRole: msg.senderRole,
          team: msg.team,
          timestamp: msg.timestamp.toISOString(),
          type: msg.actionType || 'message'
        }));
        
        messages = [...messages, ...dbMessages];
        console.log(`✅ Retrieved ${dbMessages.length} isolated messages for query ${normalizedQueryId} from MongoDB only`);
      }
    } catch (dbError) {
      console.error('Failed to load from ChatStorageService:', dbError);
      throw new Error('Failed to retrieve messages from database');
    }

    // REMOVED: Global message database query to prevent contamination
    // All messages now come exclusively from MongoDB

    // Remove duplicates
    const uniqueMessages = messages.filter((message, index, self) => 
      index === self.findIndex(m => 
        m.message === message.message && 
        m.sender === message.sender && 
        Math.abs(new Date(m.timestamp).getTime() - new Date(message.timestamp).getTime()) < 5000
      )
    );

    // Sort by timestamp
    uniqueMessages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    // Filter by team if specified
    const filteredMessages = team && !includeAll 
      ? uniqueMessages.filter(msg => msg.team?.toLowerCase() === team.toLowerCase())
      : uniqueMessages;

    return NextResponse.json({
      success: true,
      data: filteredMessages,
      count: filteredMessages.length,
      totalCount: uniqueMessages.length
    });

  } catch (error: any) {
    console.error('💥 Error fetching messages:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}

// Make queryMessagesDatabase accessible globally
declare global {
  var queryMessagesDatabase: any[];
}