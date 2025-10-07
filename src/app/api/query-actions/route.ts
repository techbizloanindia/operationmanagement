import { NextRequest, NextResponse } from 'next/server';
import { broadcastQueryUpdate } from '@/lib/eventStreamUtils';
import { logQueryUpdate } from '@/lib/queryUpdateLogger';
import { ChatStorageService } from '@/lib/services/ChatStorageService';
import { SanctionedApplicationModel } from '@/lib/models/SanctionedApplication';
import { QueryUpdateService } from '@/lib/services/QueryUpdateService';

interface QueryAction {
  queryId: number;
  action: 'approve' | 'deferral' | 'otc' | 'waiver' | 'revert' | 'assign-branch' | 'respond' | 'escalate';
  assignedTo?: string;
  assignedToBranch?: string;
  remarks?: string;
  operationTeamMember?: string;
  salesTeamMember?: string;
  creditTeamMember?: string;
  team?: string;
  actionBy?: string;
  responseText?: string;
  approvedBy?: string; // Person who approved the query (for sales/credit team actions)
}

interface QueryMessage {
  queryId: number;
  message: string;
  addedBy: string;
  team: 'Operations' | 'Sales' | 'Credit';
}

// In-memory storage for query actions
const queryActionsDatabase: any[] = [];

// REMOVED: Global message database to prevent cross-query contamination
// All messages now stored exclusively in MongoDB via ChatStorageService

// Global counter for sequential BIZLN IDs
declare global {
  var bizlnCounter: number | undefined;
}

// Reference to the queries database
let queriesDatabase: any[] = [];

// Archive chat history when query is approved
async function archiveChatOnApproval(queryId: number, queryData: any, action: string) {
  try {
    if (!queryData) return;

    const archiveReason = action === 'approve' ? 'approved' : 
                         action === 'deferral' ? 'approved' : 
                         action === 'otc' ? 'approved' : 
                         action === 'waiver' ? 'waived' : 'resolved';

    // REMOVED: Sync in-memory messages - no longer using global.queryMessagesDatabase
    // Messages are already in MongoDB via ChatStorageService

    // Archive the chat history directly from MongoDB
    const archived = await ChatStorageService.archiveQueryChat(
      queryId.toString(),
      {
        appNo: queryData.appNo || `APP-${queryId}`,
        customerName: queryData.customerName || 'Unknown Customer',
        queryTitle: queryData.title || queryData.queries?.[0]?.text || 'Query',
        queryStatus: archiveReason,
        markedForTeam: queryData.markedForTeam || queryData.team || 'unknown'
      },
      archiveReason
    );

    if (archived) {
      console.log(`✅ Chat history archived for query ${queryId} with reason: ${archiveReason}`);
    }

  } catch (error) {
    console.error(`Error archiving chat history for query ${queryId}:`, error);
  }
}

// Check if all queries for a SINGLE application are resolved and delete ONLY that application from sanctioned cases
async function checkAndDeleteFromSanctionedCases(appNo: string) {
  try {
    console.log(`🔍 SINGLE APPLICATION CHECK: Verifying if all queries for application ${appNo} are resolved...`);
    
    // Direct database access instead of HTTP fetch for Vercel compatibility
    const { QueryModel } = await import('@/lib/models/Query');
    
    let applicationQueries: any[] = [];
    
    try {
      // Get queries directly from database using the correct method
      applicationQueries = await QueryModel.findByAppNo(appNo);
      console.log(`📊 Found ${applicationQueries.length} query groups for application ${appNo} from database`);
    } catch (dbError) {
      console.log(`⚠️ Database query failed, falling back to HTTP fetch: ${dbError}`);
      
      // Fallback to HTTP fetch if database access fails
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'https://opsqueries-pxzq8scfy-techbizloanindias-projects.vercel.app';
      
      try {
        const response = await fetch(`${baseUrl}/api/queries?appNo=${encodeURIComponent(appNo)}`);
        
        if (response.ok) {
          const result = await response.json();
          if (result.success && Array.isArray(result.data)) {
            applicationQueries = result.data.filter((query: any) => query.appNo === appNo);
          }
        }
      } catch (fetchError) {
        console.log(`⚠️ HTTP fetch also failed: ${fetchError}`);
        return false;
      }
    }
    
    if (applicationQueries.length === 0) {
      console.log(`ℹ️ No queries found for application ${appNo}, proceeding with sanctioned case removal`);
      // If no queries exist, we can safely remove from sanctioned cases
    } else {
      console.log(`📊 Found ${applicationQueries.length} query groups for application ${appNo}`);
    }
    
    // Check if ALL queries are resolved for this specific application
    let allQueriesResolved = true;
    let totalIndividualQueries = 0;
    let resolvedIndividualQueries = 0;
    const resolvedStatuses = ['approved', 'deferred', 'otc', 'waived', 'resolved'];
    
    for (const queryGroup of applicationQueries) {
      console.log(`   📋 Checking query group ${queryGroup.id || queryGroup._id} with status: ${queryGroup.status}`);
      
      // Check individual queries within the group (PRIORITY CHECK)
      if (queryGroup.queries && Array.isArray(queryGroup.queries) && queryGroup.queries.length > 0) {
        // If there are individual sub-queries, check each one
        for (const individualQuery of queryGroup.queries) {
          totalIndividualQueries++;
          const queryStatus = (individualQuery.status || queryGroup.status || 'pending').toLowerCase();
          
          if (resolvedStatuses.includes(queryStatus)) {
            resolvedIndividualQueries++;
            console.log(`   ✅ Individual query ${individualQuery.id} resolved (${queryStatus})`);
          } else {
            console.log(`   ❌ Individual query ${individualQuery.id} NOT resolved (${queryStatus})`);
            allQueriesResolved = false;
            break;
          }
        }
      } else {
        // No individual queries, check the main query group status only
        totalIndividualQueries++;
        const mainStatus = (queryGroup.status || 'pending').toLowerCase();
        
        if (resolvedStatuses.includes(mainStatus)) {
          resolvedIndividualQueries++;
          console.log(`   ✅ Query group ${queryGroup.id || queryGroup._id} resolved (${mainStatus})`);
        } else {
          console.log(`   ❌ Query group ${queryGroup.id || queryGroup._id} NOT resolved (status: ${mainStatus})`);
          allQueriesResolved = false;
          break;
        }
      }
      
      if (!allQueriesResolved) break;
    }
    
    console.log(`📈 Query Resolution Summary for ${appNo}:`);
    console.log(`   Total individual queries: ${totalIndividualQueries}`);
    console.log(`   Resolved individual queries: ${resolvedIndividualQueries}`);
    console.log(`   All queries resolved: ${allQueriesResolved}`);
    
    if (allQueriesResolved) {
      console.log(`🎯 SINGLE APPLICATION DELETION: All queries for application ${appNo} are resolved. Removing ONLY this application from sanctioned cases...`);
      
      let deletionSuccess = false;
      
      try {
        // Method 1: Delete from dedicated sanctioned_applications collection (PRIMARY)
        console.log(`🗑️ Attempting to delete application ${appNo} from sanctioned_applications collection...`);
        const deleted = await SanctionedApplicationModel.deleteSanctionedApplication(appNo);
        if (deleted) {
          console.log(`✅ Successfully deleted application ${appNo} from sanctioned_applications collection`);
          deletionSuccess = true;
        } else {
          console.log(`ℹ️ Application ${appNo} was not found in sanctioned_applications collection`);
        }
      } catch (deleteError) {
        console.error(`❌ Error deleting from sanctioned_applications collection:`, deleteError);
      }
      
      try {
        // Method 2: Update application status in main applications collection (SECONDARY)
        console.log(`🔄 Attempting to update application ${appNo} status in applications collection...`);
        const { ApplicationModel } = await import('@/lib/models/Application');
        
        const updatedApp = await ApplicationModel.updateApplicationStatus(
          appNo,
          'QUERY_RESOLVED', // This status excludes it from sanctioned cases filter
          'System - Auto Cleanup',
          `All ${totalIndividualQueries} queries resolved - automatic removal from sanctioned cases`
        );
        
        if (updatedApp) {
          console.log(`✅ Successfully updated application ${appNo} status to QUERY_RESOLVED in applications collection`);
          deletionSuccess = true;
        } else {
          console.log(`⚠️ Application ${appNo} was not found in applications collection`);
        }
        
      } catch (updateError) {
        console.error(`❌ Error updating application ${appNo} status in applications collection:`, updateError);
      }
      
      if (deletionSuccess) {
        console.log(`🎉 SINGLE APPLICATION SUCCESSFULLY REMOVED: Application ${appNo} has been deleted from sanctioned cases`);
        
        // Verify deletion by checking if application still exists
        try {
          const stillExists = await SanctionedApplicationModel.getSanctionedApplicationByAppId(appNo);
          if (stillExists) {
            console.log(`⚠️ Verification failed: Application ${appNo} still exists in sanctioned_applications collection`);
          } else {
            console.log(`✅ Deletion verified: Application ${appNo} successfully removed from sanctioned_applications collection`);
          }
        } catch (verifyError) {
          console.log(`ℹ️ Could not verify deletion for application ${appNo}:`, verifyError);
        }
        
        return true;
      } else {
        console.log(`⚠️ Could not remove application ${appNo} from sanctioned cases - no changes made`);
        return false;
      }
      
    } else {
      console.log(`ℹ️ KEEPING APPLICATION: Not all queries for application ${appNo} are resolved yet (${resolvedIndividualQueries}/${totalIndividualQueries}). Keeping in sanctioned cases.`);
      return false;
    }
    
  } catch (error) {
    console.error(`❌ Error in single application deletion check for ${appNo}:`, error);
    
    // Retry mechanism for Vercel reliability
    console.log(`🔄 Retrying deletion check for application ${appNo} in 2 seconds...`);
    setTimeout(async () => {
      try {
        await checkAndDeleteFromSanctionedCases(appNo);
      } catch (retryError) {
        console.error(`❌ Retry also failed for application ${appNo}:`, retryError);
      }
    }, 2000);
    
    return false;
  }
}

// Initialize the queriesDatabase from the queries API route
const initializeQueriesDatabase = async () => {
  try {
    // Skip initialization in build mode or production
    if (process.env.NODE_ENV === 'production' || process.env.BUILDING === 'true') {
      console.log('Skipping database initialization in production/build mode');
      return;
    }
    
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : '');
    const response = await fetch(`${baseUrl}/api/queries`);
    if (response.ok) {
      const data = await response.json();
      if (data.success && Array.isArray(data.data)) {
        queriesDatabase = data.data;
      }
    }
  } catch (error) {
    console.error('Error initializing queries database:', error);
  }
};

// Initialize sample data
const initializeData = () => {
  // REMOVED: Global message database initialization
  // All messages now stored exclusively in MongoDB via ChatStorageService
  console.log('Query actions initialized - using MongoDB for all chat messages');
};

// POST - Handle query actions, messages, and reverts
export async function POST(request: NextRequest) {
  try {
    // Initialize data
    initializeData();
    
    // Skip problematic database initialization that can cause 500 errors in serverless environments
    // await initializeQueriesDatabase();
    
    const body = await request.json();
    console.log('📥 Received POST request body:', JSON.stringify(body, null, 2));
    
    // Extract fields - don't limit to just these fields since we need to pass the full body
    const { type, queryId, action, remarks, sentTo } = body;

    console.log('🔍 Extracted fields:', { type, queryId, action, remarks, sentTo });

    // Handle direct query actions without type field (for backward compatibility)
    if (!type && queryId && action) {
      console.log(`⚡ Handling direct query action: ${action} for query ${queryId}`);
      
      // Map request actions to direct actions (approval workflow removed)
      let mappedAction = action;
      if (action === 'request-approved') mappedAction = 'approve';
      else if (action === 'request-deferral') mappedAction = 'deferral';
      else if (action === 'request-otc') mappedAction = 'otc';
      
      return handleQueryAction({
        ...body, // Pass the full body to preserve all fields
        type: 'action',
        action: mappedAction
      });
    }

    if (type === 'action') {
      console.log('⚡ Handling action type');
      return handleQueryAction(body);
    } else if (type === 'message') {
      console.log('💬 Handling message type');
      return handleAddMessage(body);
    } else if (type === 'revert') {
      console.log('🔄 Handling revert type');
      return handleRevertAction(body);
    } else {
      console.log('❌ Invalid request type received:', type);
      return NextResponse.json(
        { success: false, error: 'Invalid request type' },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error('Error handling query action:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// Create approval request for operations team actions
// Handle query actions
async function handleQueryAction(body: QueryAction & { type: string; status?: string }) {
  console.log('🔍 Full body received in handleQueryAction:', JSON.stringify(body, null, 2));
  
  const { queryId, action, assignedTo, assignedToBranch, remarks, operationTeamMember, salesTeamMember, creditTeamMember, team, responseText, status, approvedBy } = body;
  
  console.log('🎯 handleQueryAction called with extracted fields:', {
    queryId,
    action,
    team,
    teamMember: creditTeamMember || salesTeamMember || operationTeamMember,
    hasRemarks: !!remarks,
    timestamp: new Date().toISOString()
  });
  
  // Enhanced validation for queryId and action with better ID handling
  // Allow queryId to be 0 (valid) but reject null, undefined, empty string
  if ((queryId !== 0 && !queryId) || (typeof queryId === 'string' && (queryId as string).trim() === '') || !action) {
    console.error('❌ Missing required fields:', { 
      queryId, 
      action,
      queryIdType: typeof queryId,
      actionType: typeof action,
      bodyKeys: Object.keys(body),
      fullBody: body
    });
    return NextResponse.json(
      { success: false, error: 'Query ID and action are required' },
      { status: 400 }
    );
  }

  // Enhanced queryId validation and conversion - handle both numeric and UUID formats
  let numericQueryId: number;
  const queryIdStr = String(queryId);
  
  // For UUID-based IDs, try to extract numeric part for message storage compatibility
  // but keep the original UUID for database operations
  if (queryIdStr.includes('-')) {
    // Try to extract numeric ID from UUID format for compatibility with message system
    // Pattern 1: Look for -query-NUMBER at the end
    const queryMatch = queryIdStr.match(/-query-(\d+)$/);
    if (queryMatch && queryMatch[1]) {
      numericQueryId = Number(queryMatch[1]);
    } else {
      // Pattern 2: Look for any number at the end after a dash
      const endMatch = queryIdStr.match(/-(\d+)$/);
      if (endMatch && endMatch[1]) {
        numericQueryId = Number(endMatch[1]);
      } else {
        // Pattern 3: Extract first sequence of digits
        const digitMatch = queryIdStr.match(/(\d+)/);
        if (digitMatch && digitMatch[1]) {
          numericQueryId = Number(digitMatch[1]);
        } else {
          // For complex UUIDs without clear numeric pattern, use a hash or fallback
          numericQueryId = Math.abs(queryIdStr.split('').reduce((a, b) => {
            a = ((a << 5) - a) + b.charCodeAt(0);
            return a & a;
          }, 0));
          console.log('⚠️ Using hash-based numeric ID for UUID:', {
            original: queryIdStr,
            generated: numericQueryId
          });
        }
      }
    }
  } else {
    // It's already a numeric ID
    numericQueryId = Number(queryIdStr);
    if (isNaN(numericQueryId)) {
      console.error('❌ Could not convert queryId to number:', { 
        queryId: queryIdStr
      });
      return NextResponse.json(
        { success: false, error: `Invalid query ID format: ${queryIdStr}` },
        { status: 400 }
      );
    }
  }

  console.log('✅ Successfully processed query ID:', {
    original: queryIdStr,
    extracted: numericQueryId,
    type: typeof numericQueryId,
    willUseOriginalForDB: queryIdStr.includes('-')
  });

      // Determine the team first
      const actionTeam = team || (creditTeamMember ? 'Credit' : salesTeamMember ? 'Sales' : 'Operations');
      
      // Determine the team member and approver
      // When approvedBy is set (for sales/credit actions), use it as the approver
      // Otherwise use the team member who performed the action
      const teamMember = creditTeamMember || salesTeamMember || operationTeamMember || 'System User';
      const actualApprover = approvedBy || teamMember;
      
      console.log('👤 Approval tracking:', {
        teamMember,
        approvedBy,
        actualApprover,
        action,
        team: actionTeam
      });
  // Debug logging for waiver actions
  if (action === 'waiver') {
    console.log('🔍 WAIVER DEBUG - Action details:');
    console.log(`- Action: ${action}`);
    console.log(`- Team Member: ${teamMember}`);
    console.log(`- Action Team: ${actionTeam}`);
    console.log(`- Query ID: ${queryId}`);
    console.log(`- Remarks: ${remarks}`);
    console.log(`- Processing directly (no approval workflow)`);
  }

  // All actions are now processed directly (approval workflow removed)
  console.log(`✅ DIRECT PATH: ${action} action for team ${actionTeam} being processed immediately`);

  // For non-approval actions, continue with the original flow
  // Create action record with resolver name using the original queryId for reference
  const actionRecord = {
    id: `${Date.now().toString()}-${Math.random().toString(36).substring(2, 9)}`,
    queryId: numericQueryId, // Use extracted numeric ID
    originalQueryId: queryId, // Keep original for reference
    action,
    assignedTo,
    assignedToBranch,
    remarks,
    teamMember,
    team: actionTeam,
    responseText,
    actionDate: new Date().toISOString(),
    status: 'completed'
  };

  // Store the action
  queryActionsDatabase.push(actionRecord);

  // Update the query status in the queries database
  try {
    // For resolution actions (approve, deferral, otc, waiver), set specific status
    const isResolutionAction = ['approve', 'deferral', 'otc', 'waiver'].includes(action);
    const resolvedStatus = status || (
      action === 'approve' ? 'approved' :
      action === 'deferral' ? 'deferred' :
      action === 'otc' ? 'otc' :
      action === 'waiver' ? 'waived' :
      isResolutionAction ? 'resolved' :
      action
    );
    
    // Try to update via API call first for better consistency
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : '');
    
    const now = new Date();
    const updateData = {
      queryId: queryId, // Use original query ID (UUID format) for API call
      numericQueryId: numericQueryId, // Keep extracted numeric ID for reference
      originalQueryId: queryId, // Keep original for reference
      status: resolvedStatus,
      resolvedAt: now.toISOString(),
      resolvedBy: teamMember,
      resolvedByTeam: actionTeam, // Track which team resolved the query
      resolutionTeam: actionTeam, // Also track resolution team
      resolutionReason: remarks || action, // UPDATED: Use remarks as resolutionReason, fallback to action
      resolutionStatus: action, // Additional field to specifically track the resolution type
      assignedTo: assignedTo || null,
      assignedToBranch: assignedToBranch || null,
      remarks: remarks || '', // Keep remarks field for backward compatibility
      // Always mark as resolved when action is taken directly
      isResolved: true, // Force resolved to true for all resolution actions
      isIndividualQuery: true, // Most actions are on individual queries
      // Add approval tracking for direct actions
      approvedBy: actualApprover, // Use the actual approver (could be from approvedBy field or teamMember)
      approvedAt: now.toISOString(),
      approvalDate: now.toISOString(),
      approvalStatus: isResolutionAction ? action : (
        action === 'approve' ? 'approved' :
        action === 'deferral' ? 'deferred' :
        action === 'otc' ? 'otc' :
        action === 'waiver' ? 'waived' : null
      ),
      // Add approverName for tracking who processed the action
      approverName: actualApprover
    };
    
    console.log('📝 Sending update to QueryUpdateService:', updateData);
    console.log('🔧 Using direct database service instead of HTTP call');
    
    const successData = await QueryUpdateService.updateQuery(queryId, updateData);
    
    console.log('📡 QueryUpdateService response received!');
    console.log('📡 Service response details:', {
      success: successData.success,
      hasData: !!successData.data,
      error: successData.error
    });
    
    if (successData.success) {
      console.log('✅ Query status updated successfully via service:', successData);
      console.log('🔍 PATCH success data details:', JSON.stringify(successData, null, 2));
      
      // Verify that the query was actually updated by checking the returned data
      if (successData.success && successData.data) {
        const updatedQuery = successData.data;
        const hasCorrectStatus = updatedQuery.status === resolvedStatus || 
                               (updatedQuery.queries && updatedQuery.queries.some((q: any) => q.status === resolvedStatus));
        
        console.log('🔍 PATCH verification:', {
          expectedStatus: resolvedStatus,
          queryMainStatus: updatedQuery.status,
          hasSubQueries: !!updatedQuery.queries,
          subQueryStatuses: updatedQuery.queries?.map((q: any) => ({ id: q.id, status: q.status })),
          updateVerified: hasCorrectStatus
        });
        
        if (!hasCorrectStatus) {
          console.error('❌ PATCH update verification failed - status was not updated correctly');
          throw new Error(`Query status update failed - expected ${resolvedStatus} but got ${updatedQuery.status}`);
        }
      } else {
        console.error('❌ PATCH response indicates failure:', successData);
        throw new Error(`Query update failed: ${successData.error || 'Unknown error'}`);
      }
      
      // Special logging for waiver actions
      if (action === 'waiver') {
        console.log('🔍 WAIVER SUCCESS - Query resolved:', {
          queryId: queryId,
          status: resolvedStatus,
          isResolved: true,
          teamMember: teamMember,
          actionTeam: actionTeam
        });
      }
      
      // Archive chat history if this is an approval action
      if (['approve', 'deferral', 'otc', 'waiver'].includes(action) && successData.data) {
        await archiveChatOnApproval(numericQueryId, successData.data, action);
      }
      
      // SINGLE APPLICATION DELETION: Check if all queries for this specific application are resolved
      if (['approve', 'deferral', 'otc', 'waiver'].includes(action) && successData.data?.appNo) {
        console.log(`🎯 TRIGGER: Query ${action} action completed for application ${successData.data.appNo}. Checking for single application deletion...`);
        
        const wasDeleted = await checkAndDeleteFromSanctionedCases(successData.data.appNo);
        
        // Only broadcast if application was actually removed
        if (wasDeleted) {
          try {
            broadcastQueryUpdate({
              id: `sanctioned-${successData.data.appNo}`,
              appNo: successData.data.appNo,
              customerName: successData.data.customerName,
              branch: successData.data.branch,
              status: 'sanctioned_case_removed',
              priority: 'high',
              team: 'Operations',
              markedForTeam: 'operations',
              createdAt: new Date().toISOString(),
              submittedBy: 'System - Single App Auto Deletion',
              action: 'sanctioned_case_removed'
            });
            console.log('📡 SUCCESS: Broadcasted single application removal for:', successData.data.appNo);
          } catch (error) {
            console.warn('Failed to broadcast single application removal:', error);
          }
        } else {
          console.log(`ℹ️ Application ${successData.data.appNo} not deleted - still has unresolved queries`);
        }
      }
      
      // Broadcast real-time update when query action is successful
      if (successData.data) {
        const query = successData.data;
        
        try {
          // Log the update for polling fallback
          logQueryUpdate({
            queryId: query.id,
            appNo: query.appNo,
            customerName: query.customerName,
            branch: query.branch,
            status: query.status,
            priority: query.priority,
            team: query.team,
            markedForTeam: query.markedForTeam,
            createdAt: query.createdAt,
            submittedBy: query.submittedBy,
            action: query.status === 'resolved' ? 'resolved' : 'updated'
          });
          
          // Broadcast via SSE
          broadcastQueryUpdate({
            id: query.id,
            appNo: query.appNo,
            customerName: query.customerName,
            branch: query.branch,
            status: query.status,
            priority: query.priority,
            team: query.team,
            markedForTeam: query.markedForTeam,
            createdAt: query.createdAt,
            submittedBy: query.submittedBy,
            action: query.status === 'resolved' ? 'resolved' : 'updated'
          });
          console.log('📡 Broadcasted query action update:', query.appNo);
        } catch (error) {
          console.warn('Failed to broadcast query action update:', error);
        }
      }
    } else {
      console.warn('⚠️ Failed to update query status via service:', successData.error);
      
      // Return error response
      return NextResponse.json(
        { 
          success: false, 
          error: successData.error || 'Failed to update query status',
          searchedIds: (successData as any).searchedIds
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error updating query status:', error);
  }

  console.log('📋 Query action recorded:', actionRecord);

  // Create appropriate message based on action and assigned person
  let message = '';
  const timestamp = new Date().toISOString();
  const actorName = teamMember; // Person who performed the action
  const approverName = actualApprover; // Person who actually approved (could be different)
  
  // For approval-type actions, show the approver name if different from actor
  const displayName = (approvedBy && approvedBy !== teamMember) ? 
    `${approverName} (via ${actorName})` : approverName;
  
  switch (action) {
    case 'approve':
      message = `✅ Query APPROVED by ${displayName}\n\n📝 Remarks: ${remarks || 'No additional remarks'}\n\n🕒 Approved on: ${new Date(timestamp).toLocaleString('en-US', {
        year: 'numeric',
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      })}\n\n✅ Query has been moved to Query Resolved section.`;
      break;
    case 'deferral':
      message = `⏸️ Query DEFERRED by ${displayName}\n\n👤 Processed by: ${approverName}\n📝 Remarks: ${remarks || 'No additional remarks'}\n\n🕒 Deferred on: ${new Date(timestamp).toLocaleString('en-US', {
        year: 'numeric',
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      })}\n\n✅ Query has been deferred and moved to Query Resolved section.`;
      break;
    case 'otc':
      message = `🔄 Query marked as OTC by ${displayName}\n\n👤 Processed by: ${approverName}\n📝 Remarks: ${remarks || 'No additional remarks'}\n\n🕒 Processed on: ${new Date(timestamp).toLocaleString('en-US', {
        year: 'numeric',
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      })}\n\n✅ Query has been processed as OTC and moved to Query Resolved section.`;
      break;
    case 'waiver':
      message = `🚫 Single Query WAIVED by ${displayName}\n\n📝 Remarks: ${remarks || 'No additional remarks'}\n\n🕒 Waived on: ${new Date(timestamp).toLocaleString('en-US', {
        year: 'numeric',
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      })}\n\n✅ Single query has been waived and moved to Query Resolved section.`;
      break;
    case 'assign-branch':
      message = `🏢 Query ASSIGNED TO BRANCH by ${actorName}\n\n🏢 Assigned to Branch: ${assignedToBranch || 'Not specified'}\n📝 Remarks: ${remarks || 'No additional remarks'}\n\n🕒 Assigned on: ${new Date(timestamp).toLocaleString('en-US', {
        year: 'numeric',
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      })}\n\n📤 Branch assignment completed by Sales team.`;
      break;
    case 'respond':
      message = `📧 RESPONSE SENT by ${actorName}\n\n💬 Response: ${responseText || 'No response text'}\n📝 Remarks: ${remarks || 'No additional remarks'}\n\n🕒 Responded on: ${new Date(timestamp).toLocaleString('en-US', {
        year: 'numeric',
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      })}\n\n📤 Response sent by Sales team.`;
      break;
    case 'escalate':
      message = `🚀 Query ESCALATED by ${actorName}\n\n📝 Remarks: ${remarks || 'No additional remarks'}\n\n🕒 Escalated on: ${new Date(timestamp).toLocaleString('en-US', {
        year: 'numeric',
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      })}\n\n⬆️ Query escalated by Sales team for further review.`;
      break;
  }

  // Add a comprehensive system message to the global chat history
  // CRITICAL: Normalize queryId to prevent cross-query contamination
  const normalizedQueryId = queryId.toString().trim();
  
  const systemMessage = {
    id: `${Date.now().toString()}-system-${Math.random().toString(36).substring(2, 9)}`,
    queryId: normalizedQueryId, // Use normalized queryId for consistent storage
    originalQueryId: normalizedQueryId, // Keep consistent with normalization
    message: message,
    responseText: message,
    sender: approverName, // Use the actual approver name
    senderRole: actionTeam.toLowerCase(),
    team: actionTeam,
    timestamp: timestamp,
    isSystemMessage: true,
    actionType: action,
    assignedTo: assignedTo || null,
    assignedToBranch: assignedToBranch || null,
    remarks: remarks || '',
    approvedBy: actualApprover, // Track who actually approved
    performedBy: actorName, // Track who performed the action
    isolationKey: `query_${normalizedQueryId}`,
    threadIsolated: true
  };
  
  // REMOVED: global.queryMessagesDatabase.push() - prevents contamination
  // Store system message in MongoDB only via ChatStorageService
  try {
    const chatMessageForStorage = {
      queryId: normalizedQueryId,
      message: message,
      responseText: message,
      sender: approverName,
      senderRole: actionTeam.toLowerCase(),
      team: actionTeam,
      timestamp: new Date(timestamp),
      isSystemMessage: true,
      actionType: action as 'approval' | 'resolution',
      metadata: {
        assignedTo: assignedTo || undefined,
        assignedToBranch: assignedToBranch || undefined,
        remarks: remarks || '',
        approvedBy: actualApprover,
        performedBy: actorName
      }
    };
    
    await ChatStorageService.storeChatMessage(chatMessageForStorage);
    console.log(`✅ System message stored to MongoDB for query ${normalizedQueryId}`);
  } catch (error) {
    console.error('Failed to store system message:', error);
  }

  return NextResponse.json({
    success: true,
    data: actionRecord,
    message,
    systemMessage
  });
}

// Handle revert actions
async function handleRevertAction(body: any) {
  const { queryId, remarks, team, actionBy, timestamp } = body;
  
  if (!queryId) {
    return NextResponse.json(
      { success: false, error: 'Query ID is required' },
      { status: 400 }
    );
  }

  if (!remarks) {
    return NextResponse.json(
      { success: false, error: 'Remarks are required for revert action' },
      { status: 400 }
    );
  }

  // Create revert action record
  const revertRecord = {
    id: `${Date.now().toString()}-${Math.random().toString(36).substring(2, 9)}`,
    queryId: parseInt(queryId),
    action: 'revert',
    remarks,
    team: team || 'Unknown Team',
    actionBy: actionBy || 'Team Member',
    actionDate: timestamp || new Date().toISOString(),
    status: 'completed'
  };

  // Store the revert action
  queryActionsDatabase.push(revertRecord);

  // Update the query status in the queries database
  try {
    // Find the query in the database
    const queryIndex = queriesDatabase.findIndex(q => q.id === parseInt(queryId));
    
    if (queryIndex !== -1) {
      // Update the query to revert it back to pending status
      queriesDatabase[queryIndex] = {
        ...queriesDatabase[queryIndex],
        status: 'pending',
        revertedAt: new Date().toISOString(),
        revertedBy: actionBy || 'Team Member',
        revertReason: remarks,
        lastUpdated: new Date().toISOString(),
        // Remove resolution fields since it's reverted
        resolvedAt: undefined,
        resolvedBy: undefined,
        resolutionReason: undefined
      };
      
      console.log(`✅ Query ${queryId} reverted back to pending status`);
    } else {
      console.warn(`⚠️ Query ${queryId} not found in database`);
    }
    
    // Also make the API call to ensure consistency
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : '');
    const updateData = {
      queryId,
      status: 'pending',
      revertedAt: new Date().toISOString(),
      revertedBy: actionBy || 'Team Member',
      revertReason: remarks
    };
    
    console.log('📝 Sending revert update to queries API:', updateData);
    
    const response = await fetch(`${baseUrl}/api/queries`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updateData),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.warn('Failed to update query status via API:', errorData);
    } else {
      const successData = await response.json();
      console.log('✅ Query revert status updated via API:', successData);
    }
  } catch (error) {
    console.warn('Error updating query revert status:', error);
  }

  console.log('📋 Query revert action recorded:', revertRecord);

  // Create a better formatted system message for the revert action
  const teamName = team ? `${team} Team` : 'Team';
  const actionByName = actionBy || 'Team Member';
  
  // Build comprehensive revert message with structured format
  const revertMessage = `🔄 Query Reverted by ${teamName}

👤 Reverted by: ${actionByName}
📅 Reverted on: ${new Date().toLocaleString('en-US', {
    year: 'numeric',
    month: 'long', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  })}
📝 Reason: ${remarks}

ℹ️ This query has been reverted back to pending status and will need to be processed again by the appropriate team.`;

  // Add a system message to the global chat history
  // CRITICAL: Normalize queryId to prevent cross-query contamination
  const normalizedQueryId = queryId.toString().trim();
  
  const systemMessage = {
    id: `${Date.now().toString()}-revert-${Math.random().toString(36).substring(2, 9)}`,
    queryId: normalizedQueryId, // Use normalized queryId for consistent storage
    originalQueryId: normalizedQueryId, // Keep consistent with normalization
    message: revertMessage,
    responseText: revertMessage,
    sender: actionByName,
    senderRole: team ? team.toLowerCase() : 'team',
    team: teamName,
    timestamp: timestamp || new Date().toISOString(),
    isSystemMessage: true,
    actionType: 'revert',
    revertReason: remarks,
    revertedBy: actionByName,
    isolationKey: `query_${normalizedQueryId}`,
    threadIsolated: true
  };
  
  // REMOVED: global.queryMessagesDatabase.push() - prevents contamination
  // Store revert message in MongoDB only via ChatStorageService
  try {
    const chatMessageForStorage = {
      queryId: normalizedQueryId,
      message: revertMessage,
      responseText: revertMessage,
      sender: actionByName,
      senderRole: team ? team.toLowerCase() : 'team',
      team: teamName,
      timestamp: new Date(timestamp || Date.now()),
      isSystemMessage: true,
      actionType: 'revert' as const,
      metadata: {
        revertReason: remarks,
        revertedBy: actionByName
      }
    };
    
    await ChatStorageService.storeChatMessage(chatMessageForStorage);
    console.log(`✅ Revert message stored to MongoDB for query ${normalizedQueryId}`);
  } catch (error) {
    console.error('Failed to store revert message:', error);
  }

  return NextResponse.json({
    success: true,
    data: revertRecord,
    message: revertMessage,
    systemMessage: systemMessage
  });
}

// Handle adding messages to queries
async function handleAddMessage(body: QueryMessage & { type: string }) {
  const { queryId, message, addedBy, team } = body;
  
  if (!queryId || !message) {
    return NextResponse.json(
      { success: false, error: 'Query ID and message are required' },
      { status: 400 }
    );
  }

  // CRITICAL: Normalize queryId to prevent cross-query contamination
  const normalizedQueryId = queryId.toString().trim();

  const messageRecord = {
    id: `${Date.now().toString()}-${Math.random().toString(36).substring(2, 9)}`,
    queryId: normalizedQueryId, // Store trimmed string
    originalQueryId: normalizedQueryId, // Keep consistent
    message,
    responseText: message,
    sender: addedBy || `${team} Team Member`,
    senderRole: team ? team.toLowerCase() : 'operations',
    team: team || 'Operations',
    timestamp: new Date().toISOString(),
    isolationKey: `query_${normalizedQueryId}`,
    threadIsolated: true
  };

  // REMOVED: global.queryMessagesDatabase.push() - prevents contamination
  // Store message in MongoDB only via ChatStorageService
  try {
    const chatMessage = {
      queryId: normalizedQueryId,
      message,
      responseText: message,
      sender: addedBy || `${team} Team Member`,
      senderRole: team ? team.toLowerCase() : 'operations',
      team: team || 'Operations',
      timestamp: new Date(),
      isSystemMessage: false,
      actionType: 'message' as const
    };

    const stored = await ChatStorageService.storeChatMessage(chatMessage);
    if (stored) {
      console.log(`💾 Message stored to database with ISOLATED queryId ${normalizedQueryId}: ${stored._id}`);
    }
  } catch (error) {
    console.error('Error storing message to database:', error);
    // Continue with in-memory storage as fallback
  }

  console.log(`💬 Message from ${team} added to ISOLATED thread for query ${normalizedQueryId}:`, messageRecord);

  return NextResponse.json({
    success: true,
    data: messageRecord,
    message: 'Message added successfully'
  });
}

// GET - Retrieve query actions and messages
export async function GET(request: NextRequest) {
  try {
    // Initialize data
    initializeData();
    
    // Skip problematic database initialization that can cause 500 errors in serverless environments
    // await initializeQueriesDatabase();
    
    const { searchParams } = new URL(request.url);
    const queryId = searchParams.get('queryId');
    const type = searchParams.get('type'); // 'actions' or 'messages'

    if (type === 'actions') {
      let actions = [...queryActionsDatabase];
      if (queryId) {
        actions = actions.filter(a => a.queryId === parseInt(queryId));
      }
      
      return NextResponse.json({
        success: true,
        data: actions,
        count: actions.length
      });
    } else if (type === 'messages') {
      // REMOVED: Global message database query - prevents contamination
      // Fetch messages from MongoDB only via ChatStorageService
      let messages: any[] = [];
      
      if (queryId) {
        const queryIdStr = queryId.toString().trim();
        
        try {
          const chatMessages = await ChatStorageService.getChatMessages(queryIdStr);
          messages = chatMessages.map(msg => ({
            id: msg._id?.toString() || `msg_${Date.now()}`,
            queryId: queryIdStr,
            message: msg.message || msg.responseText,
            responseText: msg.message || msg.responseText,
            sender: msg.sender,
            senderRole: msg.senderRole,
            team: msg.team,
            timestamp: msg.timestamp.toISOString(),
            isSystemMessage: msg.isSystemMessage || false,
            actionType: msg.actionType
          }));
          
          console.log(`✅ Retrieved ${messages.length} isolated messages for query ${queryIdStr} from MongoDB`);
        } catch (error) {
          console.error('Failed to retrieve messages from MongoDB:', error);
          return NextResponse.json(
            { success: false, error: 'Failed to retrieve messages' },
            { status: 500 }
          );
        }
      } else {
        // If no queryId specified, return empty array (don't leak all messages)
        console.warn('⚠️ No queryId specified for messages request');
        messages = [];
      }
      
      return NextResponse.json({
        success: true,
        data: messages,
        count: messages.length
      });
    } else {
      // Default: Return both actions and messages for a query
      const queryIdStr = queryId?.toString().trim();
      
      if (!queryIdStr) {
        return NextResponse.json(
          { success: false, error: 'Query ID is required' },
          { status: 400 }
        );
      }
      
      // Get actions from in-memory storage
      const actions = queryActionsDatabase.filter(a => 
        a.queryId === parseInt(queryIdStr)
      );
      
      // Get messages from MongoDB only
      let messages: any[] = [];
      try {
        const chatMessages = await ChatStorageService.getChatMessages(queryIdStr);
        messages = chatMessages.map(msg => ({
          id: msg._id?.toString() || `msg_${Date.now()}`,
          queryId: queryIdStr,
          message: msg.message || msg.responseText,
          responseText: msg.message || msg.responseText,
          sender: msg.sender,
          senderRole: msg.senderRole,
          team: msg.team,
          timestamp: msg.timestamp.toISOString(),
          isSystemMessage: msg.isSystemMessage || false,
          actionType: msg.actionType
        }));
      } catch (error) {
        console.error('Failed to retrieve messages:', error);
      }

      // Sort messages by timestamp (oldest first)
      messages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      
      return NextResponse.json({
        success: true,
        data: {
          actions,
          messages
        },
        count: {
          actions: actions.length,
          messages: messages.length
        }
      });
    }
  } catch (error: any) {
    console.error('Error fetching query actions:', error);
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
