import { connectDB } from '@/lib/mongodb';
import Query from '@/lib/models/Query';
import { ObjectId } from 'mongodb';

// Direct database update service to avoid internal API calls
export class QueryUpdateService {
  static async updateQuery(queryId: number | string, updateData: any) {
    try {
      console.log('🎯 QueryUpdateService: Starting direct database update');
      console.log('🔍 QueryUpdateService: QueryID:', queryId, 'Type:', typeof queryId);
      console.log('📝 QueryUpdateService: Update data:', updateData);

      // Connect to MongoDB
      const { db } = await connectDB();
      
      // Handle both numeric and UUID-based query IDs
      const searchIds = [queryId];
      const numericQueryId = Number(queryId);
      const stringQueryId = String(queryId);
      
      // Add more search variations
      if (!isNaN(numericQueryId)) {
        searchIds.push(numericQueryId);
      }
      if (stringQueryId !== queryId.toString()) {
        searchIds.push(stringQueryId);
      }
      
      // Remove duplicates
      const uniqueSearchIds = [...new Set(searchIds)];
      
      console.log('🔍 QueryUpdateService: Will search with IDs:', uniqueSearchIds);
      
      let mongoUpdated = false;
      let mongoQuery = null;
      
      // Try to update as individual query (sub-query within a group)
      if (updateData.isIndividualQuery) {
        const updateFields: any = {
          'queries.$.status': updateData.status,
          'queries.$.proposedAction': updateData.proposedAction,
          'queries.$.proposedBy': updateData.proposedBy,
          'queries.$.proposedAt': updateData.proposedAt ? new Date(updateData.proposedAt) : undefined,
          'queries.$.resolvedAt': updateData.resolvedAt ? new Date(updateData.resolvedAt) : undefined,
          'queries.$.resolvedBy': updateData.resolvedBy,
          'queries.$.resolutionReason': updateData.resolutionReason,
          'queries.$.resolutionStatus': updateData.resolutionStatus,
          'queries.$.approverComment': updateData.approverComment,
          'queries.$.approverName': updateData.approverName,
          'queries.$.isResolved': updateData.isResolved || ['approved', 'deferred', 'otc', 'waived', 'resolved'].includes(updateData.status),
          lastUpdated: new Date()
        };
        
        // Add approval tracking fields if query is being approved
        if (updateData.status && ['approved', 'deferred', 'otc', 'waived', 'request-approved', 'request-deferral', 'request-otc'].includes(updateData.status)) {
          updateFields['queries.$.approvedBy'] = updateData.approvedBy || updateData.resolvedBy;
          updateFields['queries.$.approvedAt'] = updateData.approvedAt || updateData.resolvedAt ? new Date(updateData.approvedAt || updateData.resolvedAt) : new Date();
          updateFields['queries.$.approvalDate'] = updateData.approvalDate || updateData.resolvedAt ? new Date(updateData.approvalDate || updateData.resolvedAt) : new Date();
          updateFields['queries.$.approvalStatus'] = updateData.approvalStatus || updateData.status;
        }
        
        // Try each search ID
        for (const searchId of uniqueSearchIds) {
          if (mongoUpdated) break;
          
          console.log(`🔍 QueryUpdateService: Trying MongoDB update with ID: "${searchId}"`);
          const result = await db.collection('queries').updateOne(
            { 'queries.id': searchId },
            { $set: updateFields }
          );
          
          if (result.modifiedCount > 0) {
            mongoUpdated = true;
            console.log(`✅ QueryUpdateService: Successfully updated query with ID: ${searchId}`);
            mongoQuery = await db.collection('queries').findOne({ 'queries.id': searchId });
            break;
          }
        }
        
        // If no sub-query found, try direct document update
        if (!mongoUpdated) {
          console.log('🔍 QueryUpdateService: No sub-query found, trying direct document update');
          const directUpdateFields: any = {
            status: updateData.status,
            proposedAction: updateData.proposedAction,
            proposedBy: updateData.proposedBy,
            proposedAt: updateData.proposedAt ? new Date(updateData.proposedAt) : undefined,
            resolvedAt: updateData.resolvedAt ? new Date(updateData.resolvedAt) : undefined,
            resolvedBy: updateData.resolvedBy,
            resolutionReason: updateData.resolutionReason,
            resolutionStatus: updateData.resolutionStatus,
            approverComment: updateData.approverComment,
            approverName: updateData.approverName,
            isResolved: updateData.isResolved || ['approved', 'deferred', 'otc', 'waived', 'resolved'].includes(updateData.status),
            lastUpdated: new Date()
          };
          
          // Add approval tracking for direct documents
          if (updateData.status && ['approved', 'deferred', 'otc', 'waived', 'request-approved', 'request-deferral', 'request-otc'].includes(updateData.status)) {
            directUpdateFields.approvedBy = updateData.approvedBy || updateData.resolvedBy;
            directUpdateFields.approvedAt = updateData.approvedAt || updateData.resolvedAt ? new Date(updateData.approvedAt || updateData.resolvedAt) : new Date();
            directUpdateFields.approvalDate = updateData.approvalDate || updateData.resolvedAt ? new Date(updateData.approvalDate || updateData.resolvedAt) : new Date();
            directUpdateFields.approvalStatus = updateData.approvalStatus || updateData.status;
          }
          
          for (const searchId of uniqueSearchIds) {
            if (mongoUpdated) break;
            
            console.log(`🔍 QueryUpdateService: Trying direct document update with ID: "${searchId}"`);
            
            // Try to convert to ObjectId if it's a valid ObjectId string
            let filter: any = { _id: searchId };
            if (typeof searchId === 'string' && ObjectId.isValid(searchId)) {
              filter = { _id: new ObjectId(searchId) };
            }
            
            const result = await db.collection('queries').updateOne(
              filter,
              { $set: directUpdateFields }
            );
            
            if (result.modifiedCount > 0) {
              mongoUpdated = true;
              console.log(`✅ QueryUpdateService: Successfully updated direct document with ID: ${searchId}`);
              mongoQuery = await db.collection('queries').findOne(filter);
              break;
            }
          }
        }
      }
      
      if (!mongoUpdated) {
        console.log('❌ QueryUpdateService: No query found to update');
        return {
          success: false,
          error: 'Query not found',
          searchedIds: uniqueSearchIds
        };
      }
      
      console.log('✅ QueryUpdateService: Database update completed successfully');
      return {
        success: true,
        data: mongoQuery,
        message: 'Query updated successfully'
      };
      
    } catch (error) {
      console.error('❌ QueryUpdateService error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }
}