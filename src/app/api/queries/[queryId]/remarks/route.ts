import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Query, { IRemark } from '@/lib/models/Query';
import { broadcastQueryUpdate } from '@/lib/eventStreamUtils';

// GET - Get all remarks for a specific query
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ queryId: string }> }
) {
  try {
    await connectDB();
    const { queryId } = await params;
    
    console.log(`🔍 Fetching remarks for query ID: ${queryId}`);
    
    const query = await Query.findOne({ id: queryId });
    
    if (!query) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Query with ID ${queryId} not found` 
        },
        { status: 404 }
      );
    }
    
    console.log(`✅ Found ${query.remarks?.length || 0} remarks for query ${queryId}`);
    
    return NextResponse.json({
      success: true,
      data: query.remarks || [],
      count: query.remarks?.length || 0
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('💥 Error fetching remarks:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: `Failed to fetch remarks: ${errorMessage}`
      },
      { status: 500 }
    );
  }
}

// POST - Add a new remark to a query
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ queryId: string }> }
) {
  try {
    await connectDB();
    const { queryId } = await params;
    const body = await request.json();
    const { text, author, authorRole, authorTeam } = body;
    
    if (!text || !author || !authorRole || !authorTeam) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Text, author, authorRole, and authorTeam are required' 
        },
        { status: 400 }
      );
    }
    
    console.log(`📝 Adding remark to query ${queryId} by ${author} (${authorTeam})`);
    
    const newRemark: Omit<IRemark, 'id'> = {
      text,
      author,
      authorRole,
      authorTeam,
      timestamp: new Date(),
      isEdited: false
    };
    
    const updatedQuery = await Query.addRemark(queryId, newRemark);
    
    if (!updatedQuery) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Query with ID ${queryId} not found` 
        },
        { status: 404 }
      );
    }
    
    const addedRemark = updatedQuery.remarks[updatedQuery.remarks.length - 1];
    console.log(`✅ Successfully added remark ${addedRemark.id} to query ${queryId}`);
    
    // Broadcast the message update to all connected clients (especially operations dashboard)
    try {
      console.log(`📡 Broadcasting remark update from ${authorTeam} team to Operations Dashboard`);
      
      const broadcastData = {
        id: updatedQuery.id,
        appNo: updatedQuery.appNo || `APP-${queryId}`,
        customerName: updatedQuery.customerName || updatedQuery.appNo,
        action: 'message_added',
        team: authorTeam.toLowerCase(),
        markedForTeam: 'both', // Notify all teams
        newMessage: {
          id: addedRemark.id,
          text: addedRemark.text,
          author: addedRemark.author,
          authorTeam: addedRemark.authorTeam,
          timestamp: addedRemark.timestamp
        },
        broadcast: true, // Broadcast to all teams
        messageFrom: authorTeam,
        priority: 'high' // High priority for remarks
      };
      
      // Broadcast to all teams
      broadcastQueryUpdate(broadcastData);
      
      // Also broadcast specifically to each team  
      ['operations', 'sales', 'credit'].forEach(targetTeam => {
        if (targetTeam !== authorTeam.toLowerCase()) {
          const teamSpecificData = {
            ...broadcastData,
            markedForTeam: targetTeam
          };
          broadcastQueryUpdate(teamSpecificData);
        }
      });
      
      console.log(`🎯 Message from ${authorTeam} team broadcasted successfully to all dashboards (operations, sales, credit)`);
      
    } catch (broadcastError) {
      console.error('❌ Error broadcasting remark update:', broadcastError);
      // Don't fail the request if broadcast fails
    }
    
    return NextResponse.json({
      success: true,
      data: addedRemark,
      message: 'Remark added successfully'
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('💥 Error adding remark:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: `Failed to add remark: ${errorMessage}`
      },
      { status: 500 }
    );
  }
}

// PUT - Update an existing remark
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ queryId: string }> }
) {
  try {
    await connectDB();
    const { queryId } = await params;
    const body = await request.json();
    const { remarkId, text } = body;
    
    if (!remarkId || !text) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Remark ID and text are required' 
        },
        { status: 400 }
      );
    }
    
    console.log(`✏️ Updating remark ${remarkId} in query ${queryId}`);
    
    const updatedQuery = await Query.updateRemark(queryId, remarkId, text);
    
    if (!updatedQuery) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Query or remark not found` 
        },
        { status: 404 }
      );
    }
    
    const updatedRemark = updatedQuery.remarks.find(r => r.id === remarkId);
    console.log(`✅ Successfully updated remark ${remarkId}`);
    
    return NextResponse.json({
      success: true,
      data: updatedRemark,
      message: 'Remark updated successfully'
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('💥 Error updating remark:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: `Failed to update remark: ${errorMessage}`
      },
      { status: 500 }
    );
  }
}

// DELETE - Delete a remark
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ queryId: string }> }
) {
  try {
    await connectDB();
    const { queryId } = await params;
    const { searchParams } = new URL(request.url);
    const remarkId = searchParams.get('remarkId');
    
    if (!remarkId) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Remark ID is required' 
        },
        { status: 400 }
      );
    }
    
    console.log(`🗑️ Deleting remark ${remarkId} from query ${queryId}`);
    
    const updatedQuery = await Query.deleteRemark(queryId, remarkId);
    
    if (!updatedQuery) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Query with ID ${queryId} not found` 
        },
        { status: 404 }
      );
    }
    
    console.log(`✅ Successfully deleted remark ${remarkId}`);
    
    return NextResponse.json({
      success: true,
      message: 'Remark deleted successfully'
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('💥 Error deleting remark:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: `Failed to delete remark: ${errorMessage}`
      },
      { status: 500 }
    );
  }
}
