import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { connectDB } from '@/lib/mongodb';

/**
 * Fix waiver queries that are stuck in "proposed action" state
 * This endpoint will find all queries with proposedAction: 'waiver' and process them immediately
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Starting waiver queries fix...');
    
    const { db } = await connectDB();
    const collection = db.collection('queries');
    
    // Find all queries with proposedAction: 'waiver'
    const stuckWaiverQueries = await collection.find({
      'queries.proposedAction': 'waiver',
      'queries.status': 'waiting for approval'
    }).toArray();
    
    console.log(`Found ${stuckWaiverQueries.length} queries with stuck waiver actions`);
    
    let fixedCount = 0;
    let errorCount = 0;
    const fixedQueries = [];
    
    for (const queryDoc of stuckWaiverQueries) {
      try {
        // Process each individual query that has waiver proposed action
        for (let i = 0; i < queryDoc.queries.length; i++) {
          const individualQuery = queryDoc.queries[i];
          
          if (individualQuery.proposedAction === 'waiver' && individualQuery.status === 'waiting for approval') {
            console.log(`Fixing waiver for query ${queryDoc.id}, individual query ${i}`);
            
            // Update the individual query to be waived immediately
            const updateResult = await collection.updateOne(
              { 
                _id: new ObjectId(queryDoc._id),
                [`queries.${i}.proposedAction`]: 'waiver'
              },
              {
                $set: {
                  [`queries.${i}.status`]: 'waived',
                  [`queries.${i}.isResolved`]: true,
                  [`queries.${i}.resolvedAt`]: new Date().toISOString(),
                  [`queries.${i}.resolvedBy`]: 'System (Auto-fix)',
                  [`queries.${i}.resolutionReason`]: 'waiver',
                  [`queries.${i}.approvalStatus`]: 'waived',
                  [`queries.${i}.approvedAt`]: new Date().toISOString(),
                  [`queries.${i}.approvedBy`]: 'System (Auto-fix)',
                  [`queries.${i}.remarks`]: (individualQuery.remarks || '') + ' [Auto-fixed: Waiver processed immediately]'
                },
                $unset: {
                  [`queries.${i}.proposedAction`]: ""
                }
              }
            );
            
            if (updateResult.modifiedCount > 0) {
              fixedCount++;
              fixedQueries.push({
                appNo: queryDoc.appNo,
                queryIndex: i,
                queryText: individualQuery.text,
                previousStatus: individualQuery.status,
                newStatus: 'waived'
              });
            }
          }
        }
      } catch (error) {
        console.error(`Error fixing query ${queryDoc.id}:`, error);
        errorCount++;
      }
    }
    
    console.log(`✅ Waiver fix completed: ${fixedCount} queries fixed, ${errorCount} errors`);
    
    return NextResponse.json({
      success: true,
      message: `Fixed ${fixedCount} stuck waiver queries`,
      fixedCount,
      errorCount,
      fixedQueries
    });
    
  } catch (error) {
    console.error('❌ Error fixing waiver queries:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fix waiver queries',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET endpoint to check for stuck waiver queries without fixing them
export async function GET(request: NextRequest) {
  try {
    const { db } = await connectDB();
    const collection = db.collection('queries');
    
    // Find all queries with proposedAction: 'waiver'
    const stuckWaiverQueries = await collection.find({
      'queries.proposedAction': 'waiver'
    }).toArray();
    
    const stuckQueries = [];
    
    for (const queryDoc of stuckWaiverQueries) {
      for (let i = 0; i < queryDoc.queries.length; i++) {
        const individualQuery = queryDoc.queries[i];
        if (individualQuery.proposedAction === 'waiver') {
          stuckQueries.push({
            appNo: queryDoc.appNo,
            queryIndex: i,
            queryText: individualQuery.text,
            status: individualQuery.status,
            proposedAction: individualQuery.proposedAction,
            createdAt: individualQuery.createdAt
          });
        }
      }
    }
    
    return NextResponse.json({
      success: true,
      stuckQueriesCount: stuckQueries.length,
      stuckQueries
    });
    
  } catch (error) {
    console.error('❌ Error checking stuck waiver queries:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to check stuck waiver queries',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}