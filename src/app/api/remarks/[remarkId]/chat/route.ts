import { NextRequest, NextResponse } from 'next/server';

interface RemarkChatMessage {
  id: string;
  remarkId: string;
  message: string;
  sender: string;
  senderRole: string;
  timestamp: string;
  team?: string;
  queryId?: string;
}

// In-memory storage for remark chat messages - should be replaced with database in production
const remarkChatDatabase: RemarkChatMessage[] = [];

// GET - Fetch chat messages for a specific remark
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ remarkId: string }> }
) {
  try {
    const { remarkId } = await params;
    
    if (!remarkId || remarkId === 'undefined' || remarkId === 'null') {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid remark ID provided'
        },
        { status: 400 }
      );
    }
    
    console.log(`💬 Fetching remark chat messages for remark ID: ${remarkId}`);
    
    // Filter messages for this specific remark
    const remarkMessages = remarkChatDatabase.filter(msg => 
      msg && msg.remarkId === remarkId
    );
    
    // Sort by timestamp (oldest first)
    remarkMessages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    
    console.log(`✅ Found ${remarkMessages.length} chat messages for remark ${remarkId}`);
    
    return NextResponse.json({
      success: true,
      data: remarkMessages,
      count: remarkMessages.length
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('💥 Error fetching remark chat messages:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: `Failed to fetch remark chat messages: ${errorMessage}`
      },
      { status: 500 }
    );
  }
}

// POST - Add a new chat message to a remark
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ remarkId: string }> }
) {
  try {
    const { remarkId } = await params;
    
    if (!remarkId || remarkId === 'undefined' || remarkId === 'null') {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid remark ID provided'
        },
        { status: 400 }
      );
    }
    
    const body = await request.json();
    const { message, sender, senderRole, team, queryId } = body;
    
    if (!message || !sender || !senderRole) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Message, sender, and senderRole are required' 
        },
        { status: 400 }
      );
    }
    
    if (typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Message must be a non-empty string' 
        },
        { status: 400 }
      );
    }
    
    // Create new remark chat message
    const newMessage: RemarkChatMessage = {
      id: `remark-chat-${remarkId}-${Date.now()}`,
      remarkId: remarkId,
      message: message,
      sender: sender,
      senderRole: senderRole,
      timestamp: new Date().toISOString(),
      team: team || senderRole,
      queryId: queryId
    };
    
    // Add to remark chat database
    remarkChatDatabase.push(newMessage);
    
    console.log(`💬 Added new remark chat message for remark ${remarkId}:`, newMessage);
    
    // In a real application, you would also:
    // 1. Save to database
    // 2. Send real-time notifications
    // 3. Update remark status if needed
    
    try {
      // Attempt to save to database (mock implementation)
      await saveRemarkChatToDatabase(newMessage);
    } catch (dbError) {
      console.warn('Failed to save remark chat to database:', dbError);
      // Continue with in-memory storage
    }
    
    return NextResponse.json({
      success: true,
      data: newMessage,
      message: 'Remark chat message added successfully'
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('💥 Error adding remark chat message:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: `Failed to add remark chat message: ${errorMessage}`
      },
      { status: 500 }
    );
  }
}

// Mock function to save remark chat to database
async function saveRemarkChatToDatabase(message: RemarkChatMessage): Promise<void> {
  // In a real implementation, this would save to MongoDB or another database
  // For now, we'll just simulate the operation
  console.log('📝 Saving remark chat message to database:', message.id);
  
  // Simulate database operation delay
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // In a real implementation, you might:
  // 1. Use MongoDB to store the message
  // 2. Associate it with the specific remark
  // 3. Update remark metadata (last activity, message count, etc.)
  // 4. Trigger real-time notifications to relevant users
  
  console.log('✅ Remark chat message saved to database successfully');
}