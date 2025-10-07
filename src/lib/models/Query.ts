// Remark interface
export interface IRemark {
  id: string;
  text: string;
  author: string;
  authorRole: string;
  authorTeam: string;
  timestamp: Date;
  editedAt?: Date;
  isEdited?: boolean;
}

// Query interface
export interface IQuery {
  id: string;
  appNo: string;
  title: string;
  tat: string;
  team: string;
  messages: Array<{
    sender: string;
    text: string;
    timestamp: string;
    isSent: boolean;
  }>;
  markedForTeam: string;
  allowMessaging: boolean;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'resolved' | 'approved' | 'deferred' | 'otc' | 'waived' | 'request-approved' | 'request-deferral' | 'request-otc' | 'pending-approval';
  customerName: string;
  caseId: string;
  createdAt: Date;
  submittedAt: Date;
  submittedBy: string;
  branch: string;
  branchCode: string;
  queries: Array<{
    id: string;
    text: string;
    timestamp: string;
    sender: string;
    status: string;
    queryNumber?: number;
    proposedAction?: string;
    sentTo?: string[];
    tat?: string;
  }>;
  sendTo: string[];
  sendToSales?: boolean;
  sendToCredit?: boolean;
  resolvedAt?: Date;
  resolvedBy?: string;
  resolutionReason?: string;
  lastUpdated?: Date;
  assignedTo?: string;
  assignedToBranch?: string;
  remarks: IRemark[]; // Array of remarks instead of single string
  approvalRequestId?: string;
  proposedAction?: string;
  proposedBy?: string;
  proposedAt?: Date;
  revertedAt?: Date;
  revertedBy?: string;
  revertReason?: string;
  isResolved?: boolean;
  isIndividualQuery?: boolean;
  approverComment?: string;
  // New approval tracking fields
  approvedBy?: string; // Name of the approver
  approvedAt?: Date; // Timestamp when approved
  approvalDate?: Date; // Date of approval (for reports)
  approvalStatus?: 'approved' | 'otc' | 'deferral'; // Final approval status
}

// MongoDB operations class
export class QueryModel {
  private static collectionName = 'queries';

  // Helper to get collection
  private static async getCollection() {
    const { connectDB } = await import('@/lib/mongodb');
    const { db } = await connectDB();
    return db.collection(this.collectionName);
  }

  // Find queries by application number
  static async findByAppNo(appNo: string): Promise<IQuery[]> {
    try {
      const collection = await this.getCollection();
      const queries = await collection.find({ appNo }).sort({ createdAt: -1 }).toArray();
      return queries.map(this.transformQuery);
    } catch (error) {
      console.error('Error finding queries by appNo:', error);
      return [];
    }
  }

  // Find queries by team
  static async findByTeam(team: string): Promise<IQuery[]> {
    try {
      const collection = await this.getCollection();
      const queries = await collection.find({
        $or: [
          { team },
          { markedForTeam: team },
          { markedForTeam: 'both' }
        ]
      }).sort({ createdAt: -1 }).toArray();
      return queries.map(this.transformQuery);
    } catch (error) {
      console.error('Error finding queries by team:', error);
      return [];
    }
  }

  // Find all queries with optional filter
  static async find(filter: any = {}): Promise<IQuery[]> {
    try {
      const collection = await this.getCollection();
      const queries = await collection.find(filter).sort({ createdAt: -1 }).toArray();
      return queries.map(this.transformQuery);
    } catch (error) {
      console.error('Error finding queries:', error);
      return [];
    }
  }

  // Find one query by ID
  static async findOne(filter: any): Promise<IQuery | null> {
    try {
      const collection = await this.getCollection();
      const query = await collection.findOne(filter);
      return query ? this.transformQuery(query) : null;
    } catch (error) {
      console.error('Error finding query:', error);
      return null;
    }
  }

  // Update one query with approval tracking
  static async updateOne(filter: any, update: any): Promise<{ modifiedCount: number }> {
    try {
      const collection = await this.getCollection();
      
      // Add approval tracking fields if status is being approved
      const enhancedUpdate = { ...update };
      if (update.status && ['approved', 'request-approved', 'request-otc', 'request-deferral'].includes(update.status)) {
        if (update.resolvedBy && !update.approvedBy) {
          enhancedUpdate.approvedBy = update.resolvedBy;
        }
        if (update.resolvedAt && !update.approvedAt) {
          enhancedUpdate.approvedAt = update.resolvedAt;
          enhancedUpdate.approvalDate = update.resolvedAt;
        }
        // Set approval status based on the status
        if (update.status.includes('approved')) {
          enhancedUpdate.approvalStatus = 'approved';
        } else if (update.status.includes('otc')) {
          enhancedUpdate.approvalStatus = 'otc';
        } else if (update.status.includes('deferral')) {
          enhancedUpdate.approvalStatus = 'deferral';
        }
      }
      
      const result = await collection.updateOne(
        filter,
        { $set: { ...enhancedUpdate, lastUpdated: new Date() } }
      );
      return { modifiedCount: result.modifiedCount || 0 };
    } catch (error) {
      console.error('Error updating query:', error);
      return { modifiedCount: 0 };
    }
  }

  // Create or update a query
  static async findOneAndUpdate(filter: any, update: any, options: any = {}): Promise<IQuery | null> {
    try {
      const collection = await this.getCollection();
      const result = await collection.findOneAndUpdate(
        filter,
        { $set: { ...update, lastUpdated: new Date() } },
        { upsert: options.upsert || false, returnDocument: 'after' }
      );
      return result ? this.transformQuery(result) : null;
    } catch (error) {
      console.error('Error updating query:', error);
      return null;
    }
  }

  // Add a remark to a query
  static async addRemark(queryId: string, remark: Omit<IRemark, 'id'>): Promise<IQuery | null> {
    const newRemark: IRemark = {
      ...remark,
      id: `remark_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
    
    try {
      const collection = await this.getCollection();
      const result = await collection.findOneAndUpdate(
        { id: queryId },
        { 
          $push: { remarks: newRemark } as any,
          $set: { lastUpdated: new Date() }
        },
        { returnDocument: 'after' }
      );
      return result ? this.transformQuery(result) : null;
    } catch (error) {
      console.error('Error adding remark:', error);
      return null;
    }
  }

  // Update a remark
  static async updateRemark(queryId: string, remarkId: string, text: string): Promise<IQuery | null> {
    try {
      const collection = await this.getCollection();
      const result = await collection.findOneAndUpdate(
        { 
          id: queryId,
          'remarks.id': remarkId 
        },
        { 
          $set: { 
            'remarks.$.text': text,
            'remarks.$.editedAt': new Date(),
            'remarks.$.isEdited': true,
            lastUpdated: new Date()
          }
        },
        { returnDocument: 'after' }
      );
      return result ? this.transformQuery(result) : null;
    } catch (error) {
      console.error('Error updating remark:', error);
      return null;
    }
  }

  // Delete a remark
  static async deleteRemark(queryId: string, remarkId: string): Promise<IQuery | null> {
    try {
      const collection = await this.getCollection();
      const result = await collection.findOneAndUpdate(
        { id: queryId },
        { 
          $pull: { remarks: { id: remarkId } } as any,
          $set: { lastUpdated: new Date() }
        },
        { returnDocument: 'after' }
      );
      return result ? this.transformQuery(result) : null;
    } catch (error) {
      console.error('Error deleting remark:', error);
      return null;
    }
  }

  // Transform MongoDB document to IQuery with approval fields
  private static transformQuery(doc: any): IQuery {
    return {
      ...doc,
      _id: undefined, // Remove MongoDB _id
      createdAt: doc.createdAt instanceof Date ? doc.createdAt : new Date(doc.createdAt),
      submittedAt: doc.submittedAt instanceof Date ? doc.submittedAt : new Date(doc.submittedAt || doc.createdAt),
      resolvedAt: doc.resolvedAt ? (doc.resolvedAt instanceof Date ? doc.resolvedAt : new Date(doc.resolvedAt)) : undefined,
      lastUpdated: doc.lastUpdated ? (doc.lastUpdated instanceof Date ? doc.lastUpdated : new Date(doc.lastUpdated)) : undefined,
      proposedAt: doc.proposedAt ? (doc.proposedAt instanceof Date ? doc.proposedAt : new Date(doc.proposedAt)) : undefined,
      revertedAt: doc.revertedAt ? (doc.revertedAt instanceof Date ? doc.revertedAt : new Date(doc.revertedAt)) : undefined,
      // Transform approval tracking fields
      approvedAt: doc.approvedAt ? (doc.approvedAt instanceof Date ? doc.approvedAt : new Date(doc.approvedAt)) : undefined,
      approvalDate: doc.approvalDate ? (doc.approvalDate instanceof Date ? doc.approvalDate : new Date(doc.approvalDate)) : undefined,
      approvedBy: doc.approvedBy,
      approvalStatus: doc.approvalStatus,
      remarks: (doc.remarks || []).map((remark: any) => ({
        ...remark,
        timestamp: remark.timestamp instanceof Date ? remark.timestamp : new Date(remark.timestamp),
        editedAt: remark.editedAt ? (remark.editedAt instanceof Date ? remark.editedAt : new Date(remark.editedAt)) : undefined
      }))
    };
  }
}

// Export default as the QueryModel for backward compatibility
const Query = QueryModel;
export default Query;
