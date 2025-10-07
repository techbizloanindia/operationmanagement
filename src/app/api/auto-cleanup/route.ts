import { NextRequest, NextResponse } from 'next/server';
import { SanctionedApplicationModel } from '@/lib/models/SanctionedApplication';
import { QueryModel } from '@/lib/models/Query';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { appNo } = body;
    
    if (!appNo) {
      return NextResponse.json({
        success: false,
        error: 'Application number is required'
      }, { status: 400 });
    }
    
    console.log(`🔍 CLEANUP CHECK: Verifying query resolution status for application ${appNo}...`);
    
    // Get all queries for this application directly from database
    const queries = await QueryModel.findByAppNo(appNo);
    
    if (queries.length === 0) {
      console.log(`ℹ️ No queries found for application ${appNo}, proceeding with cleanup`);
    }
    
    // Check if all queries are resolved
    const resolvedStatuses = ['approved', 'deferred', 'otc', 'waived', 'resolved'];
    let allQueriesResolved = true;
    let totalQueries = 0;
    let resolvedQueries = 0;
    
    for (const queryGroup of queries) {
      // Check individual queries within the group
      if (queryGroup.queries && Array.isArray(queryGroup.queries)) {
        for (const individualQuery of queryGroup.queries) {
          totalQueries++;
          const status = (individualQuery.status || queryGroup.status || 'pending').toLowerCase();
          
          if (resolvedStatuses.includes(status)) {
            resolvedQueries++;
          } else {
            allQueriesResolved = false;
          }
        }
      } else {
        totalQueries++;
        const status = (queryGroup.status || 'pending').toLowerCase();
        
        if (resolvedStatuses.includes(status)) {
          resolvedQueries++;
        } else {
          allQueriesResolved = false;
        }
      }
    }
    
    console.log(`📊 Query status for ${appNo}: ${resolvedQueries}/${totalQueries} resolved`);
    
    if (allQueriesResolved || queries.length === 0) {
      console.log(`✅ All queries resolved for ${appNo}, proceeding with deletion...`);
      
      // Delete from sanctioned_applications collection
      const deleted = await SanctionedApplicationModel.deleteSanctionedApplication(appNo);
      
      if (deleted) {
        console.log(`✅ Successfully deleted application ${appNo} from sanctioned cases`);
        
        return NextResponse.json({
          success: true,
          message: `Application ${appNo} removed from sanctioned cases`,
          data: {
            appNo,
            totalQueries,
            resolvedQueries,
            deleted: true
          }
        });
      } else {
        console.log(`ℹ️ Application ${appNo} was not found in sanctioned cases`);
        
        return NextResponse.json({
          success: true,
          message: `Application ${appNo} was not found in sanctioned cases`,
          data: {
            appNo,
            totalQueries,
            resolvedQueries,
            deleted: false
          }
        });
      }
    } else {
      console.log(`❌ Not all queries resolved for ${appNo}: ${resolvedQueries}/${totalQueries}`);
      
      return NextResponse.json({
        success: false,
        message: `Not all queries are resolved for application ${appNo}`,
        data: {
          appNo,
          totalQueries,
          resolvedQueries,
          allResolved: false
        }
      });
    }
    
  } catch (error) {
    console.error('❌ Error in automatic cleanup:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}