import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Query from '@/lib/models/Query';
import { BranchApplicationService } from '@/lib/services/branchApplicationService';

// GET - Fetch queries for Operations team
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'pending';
    const type = searchParams.get('type') || 'all'; // all, created, assigned
    
    console.log('🏭 Operations Dashboard: Fetching queries...');
    
    let operationsQueries: any[] = [];
    
    // Try MongoDB first
    try {
      const { connectDB } = await import('@/lib/mongodb');
      const { db } = await connectDB();
      
      // Build query filter for operations team
      let filter: any = {};
      
      if (type === 'created') {
        // Queries created by operations team - include ALL queries submitted by operations regardless of current team
        filter = {
          $or: [
            { submittedBy: { $regex: /operations/i } },
            { 'messages.sender': { $regex: /operations/i } },
            { createdBy: { $regex: /operations/i } },
            // Include queries where operations team is the original creator
            { team: 'operations' },
            // Include queries that were originally created by operations but may have been reassigned
            { originalTeam: 'operations' }
          ]
        };
      } else if (type === 'assigned') {
        // Queries assigned to operations team (if any)
        filter = {
          $or: [
            { markedForTeam: 'operations' },
            { assignedTo: { $regex: /operations/i } }
          ]
        };
      } else {
        // All queries visible to operations team - include queries submitted by operations regardless of current team
        filter = {
          $or: [
            { team: 'operations' },
            { markedForTeam: 'operations' },
            { submittedBy: { $regex: /operations/i } },
            { 'messages.sender': { $regex: /operations/i } },
            // Include queries originally created by operations but now assigned to other teams
            { 'queries.sender': { $regex: /operations/i } },
            { originalTeam: 'operations' },
            // Include all queries that were created by operations team (for resolved queries view)
            { createdBy: { $regex: /operations/i } }
          ]
        };
      }
      
      if (status !== 'all') {
        if (status === 'resolved') {
          // For resolved status, match multiple resolution statuses
          filter.status = { 
            $in: ['resolved', 'approved', 'deferred', 'otc', 'waived', 'completed'] 
          };
        } else {
          filter.status = status;
        }
      }
      
      const queries = await db.collection('queries').find(filter).sort({ createdAt: -1 }).toArray();
      console.log(`🏭 Operations Dashboard: Found ${queries.length} queries in MongoDB`);
      
      // Convert to plain objects with proper date formatting
      operationsQueries = queries.map(query => ({
        ...query,
        id: query.id || query._id?.toString(),
        createdAt: query.createdAt?.toISOString ? query.createdAt.toISOString() : query.createdAt,
        submittedAt: query.submittedAt?.toISOString ? query.submittedAt.toISOString() : query.submittedAt || query.createdAt,
        resolvedAt: query.resolvedAt?.toISOString ? query.resolvedAt.toISOString() : query.resolvedAt,
        lastUpdated: query.lastUpdated?.toISOString ? query.lastUpdated.toISOString() : query.lastUpdated,
        remarks: query.remarks?.map((remark: any) => ({
          ...remark,
          timestamp: remark.timestamp?.toISOString ? remark.timestamp.toISOString() : remark.timestamp,
          editedAt: remark.editedAt?.toISOString ? remark.editedAt.toISOString() : remark.editedAt
        })) || []
      }));
      
    } catch (dbError) {
      console.error('❌ Operations Dashboard: MongoDB query failed, checking fallback:', dbError);
      
      // Fallback to main queries API
      try {
        const fallbackResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'}/api/queries?status=${status}&team=operations`);
        const fallbackResult = await fallbackResponse.json();
        
        if (fallbackResult.success) {
          operationsQueries = fallbackResult.data.filter((query: any) => 
            query.team === 'operations' || 
            query.markedForTeam === 'operations' ||
            query.submittedBy?.toLowerCase().includes('operations')
          );
          console.log(`🏭 Operations Dashboard: Found ${operationsQueries.length} queries via fallback API`);
        }
      } catch (fallbackError) {
        console.error('❌ Operations Dashboard: Fallback API also failed:', fallbackError);
      }
    }
    
    // Calculate statistics
    const stats = {
      total: operationsQueries.length,
      pending: operationsQueries.filter(q => q.status === 'pending').length,
      resolved: operationsQueries.filter(q => ['resolved', 'approved', 'deferred', 'otc', 'waived'].includes(q.status)).length,
      inProgress: operationsQueries.filter(q => q.status === 'in-progress').length
    };
    
    return NextResponse.json({
      success: true,
      data: operationsQueries,
      count: operationsQueries.length,
      team: 'operations',
      stats: stats,
      filters: { status, type }
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('💥 Operations Dashboard: Error fetching queries:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage,
        team: 'operations'
      },
      { status: 500 }
    );
  }
}

// POST - Create new query from Operations team
export async function POST(request: NextRequest) {
  try {
    console.log('🏭 Operations: Creating new query...');
    
    const { connectDB } = await import('@/lib/mongodb');
    const { db } = await connectDB();
    
    const body = await request.json();
    const { appNo, queries: queryTexts, sendTo, customerName, branch, branchCode } = body;
    
    console.log('📝 Operations: Query creation data:', { appNo, queriesCount: queryTexts?.length, sendTo });
    
    // Validate required fields
    if (!appNo || !queryTexts || queryTexts.length === 0 || !sendTo) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required fields: appNo, queries, or sendTo' 
        },
        { status: 400 }
      );
    }

    // Generate query numbers
    const generateQueryNumber = async (): Promise<number> => {
      const pipeline = [
        { $unwind: '$queries' },
        { $group: { _id: null, maxQueryNumber: { $max: '$queries.queryNumber' } } }
      ];
      
      const result = await db.collection('queries').aggregate(pipeline).toArray();
      const maxNumber = result.length > 0 && result[0].maxQueryNumber ? result[0].maxQueryNumber : 0;
      return maxNumber + 1;
    };

    // Get application details from sanctioned applications
    let applicationDetails = null;
    try {
      const sanctionedApp = await db.collection('sanctioned_applications').findOne({ appNo });
      if (sanctionedApp) {
        applicationDetails = sanctionedApp;
      }
    } catch (error) {
      console.log('📊 Could not fetch application details:', error);
    }

    // Create the queries
    const baseId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const createdQueries = [];

    for (let i = 0; i < queryTexts.length; i++) {
      const queryText = queryTexts[i];
      const queryNumber = await generateQueryNumber();
      
      // Determine team assignment
      let teamAssignment = 'operations';
      let markedForTeam = 'operations';

      if (sendTo.toLowerCase() === 'sales') {
        teamAssignment = 'sales';
        markedForTeam = 'sales';
      } else if (sendTo.toLowerCase() === 'credit') {
        teamAssignment = 'credit';
        markedForTeam = 'credit';
      }

      // Get proper branch information using BranchApplicationService
      let finalBranch = branch || applicationDetails?.branchName || 'Faridabad';
      let finalBranchCode = branchCode || applicationDetails?.branchCode || 'FRI';
      
      try {
        const branchData = await BranchApplicationService.getApplicationBranchData(appNo);
        if (branchData.branch.isValid) {
          finalBranch = branchData.branch.branchName;
          finalBranchCode = branchData.branch.branchCode;
          console.log(`✅ Enhanced branch detection for ${appNo}: ${finalBranch} (${finalBranchCode})`);
        }
      } catch (error) {
        console.log(`⚠️ Could not enhance branch detection for ${appNo}, using defaults`);
      }

      const newQuery = {
        id: `${baseId}-${i}`,
        appNo: appNo,
        title: `Query ${queryNumber} - ${appNo}`,
        tat: '24 hours',
        team: teamAssignment,
        markedForTeam: markedForTeam,
        messages: [{
          sender: 'Operations User',
          text: queryText,
          timestamp: new Date().toISOString(),
          isSent: true
        }],
        allowMessaging: true,
        priority: 'medium',
        status: 'pending',
        customerName: customerName || applicationDetails?.customerName || 'Unknown Customer',
        caseId: appNo,
        createdAt: new Date(),
        submittedAt: new Date(),
        submittedBy: 'Operations User',
        branch: finalBranch,
        branchCode: finalBranchCode,
        queries: [{
          id: `${baseId}-query-${i}`,
          text: queryText,
          timestamp: new Date().toISOString(),
          sender: 'Operations User',
          status: 'pending',
          queryNumber: queryNumber,
          sentTo: [sendTo],
          tat: '24 hours'
        }],
        sendTo: [sendTo],
        sendToSales: sendTo.toLowerCase() === 'sales',
        sendToCredit: sendTo.toLowerCase() === 'credit',
        remarks: [],
        applicationBranch: finalBranch,
        applicationBranchCode: finalBranchCode
      };

      // Insert into MongoDB
      const result = await db.collection('queries').insertOne(newQuery);
      
      if (result.insertedId) {
        createdQueries.push({
          ...newQuery,
          _id: result.insertedId,
          id: newQuery.id
        });
        console.log(`✅ Operations: Query ${queryNumber} created successfully`);
      }
    }

    // Broadcast query updates if available
    try {
      const { broadcastQueryUpdate } = await import('@/lib/eventStreamUtils');
      for (const query of createdQueries) {
        await broadcastQueryUpdate({
          appNo: query.appNo,
          action: 'query_created',
          team: query.markedForTeam,
          queryId: query.id,
          timestamp: new Date().toISOString()
        });
      }
    } catch (broadcastError) {
      console.warn('⚠️ Failed to broadcast query updates:', broadcastError);
    }

    return NextResponse.json({
      success: true,
      data: createdQueries,
      message: `${createdQueries.length} queries created successfully by Operations team`,
      team: 'operations',
      count: createdQueries.length
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('💥 Operations: Error creating query:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage,
        team: 'operations'
      },
      { status: 500 }
    );
  }
}

// PATCH - Update query status from Operations team
export async function PATCH(request: NextRequest) {
  try {
    const { connectDB } = await import('@/lib/mongodb');
    const { db } = await connectDB();
    
    const body = await request.json();
    const { queryId, action, remarks, assignedTo } = body;
    
    console.log('🏭 Operations: Updating query:', { queryId, action });
    
    // Find the query in MongoDB
    const query = await db.collection('queries').findOne({ 
      $or: [
        { id: queryId },
        { 'queries.id': queryId }
      ]
    });
    
    if (!query) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Query not found',
          team: 'operations'
        },
        { status: 404 }
      );
    }
    
    // Update the query based on action
    const updateData: any = {
      lastUpdated: new Date(),
      [`remarks`]: [
        ...(query.remarks || []),
        {
          text: remarks || `Query ${action} by Operations team`,
          author: 'Operations User',
          timestamp: new Date(),
          action: action
        }
      ]
    };
    
    if (action === 'resolve') {
      updateData.status = 'resolved';
      updateData.resolvedAt = new Date();
      updateData.resolvedBy = 'Operations User';
    } else if (action === 'reassign' && assignedTo) {
      updateData.assignedTo = assignedTo;
      updateData.status = 'assigned';
    }
    
    // Update the main query
    const result = await db.collection('queries').updateOne(
      { 
        $or: [
          { id: queryId },
          { 'queries.id': queryId }
        ]
      },
      { $set: updateData }
    );
    
    if (result.matchedCount > 0) {
      console.log('✅ Operations: Query updated successfully');
      
      // Broadcast update if available
      try {
        const { broadcastQueryUpdate } = await import('@/lib/eventStreamUtils');
        await broadcastQueryUpdate({
          appNo: query.appNo,
          action: action,
          team: 'operations',
          queryId: queryId,
          timestamp: new Date().toISOString()
        });
      } catch (broadcastError) {
        console.warn('⚠️ Failed to broadcast query update:', broadcastError);
      }
      
      // Get updated query
      const updatedQuery = await db.collection('queries').findOne({ 
        $or: [
          { id: queryId },
          { 'queries.id': queryId }
        ]
      });
      
      return NextResponse.json({
        success: true,
        data: updatedQuery,
        message: 'Query updated successfully by Operations team',
        team: 'operations'
      });
    } else {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to update query',
          team: 'operations'
        },
        { status: 400 }
      );
    }

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('💥 Operations: Error updating query:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage,
        team: 'operations'
      },
      { status: 500 }
    );
  }
}