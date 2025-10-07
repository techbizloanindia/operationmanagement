import { ObjectId } from 'mongodb';
import { connectToDatabase } from '../mongodb';

const isBuildProcess = process.env.BUILDING === 'true';

export interface RemarkMessage {
  _id?: ObjectId;
  queryId: string;
  caseNumber: string;
  userId: string;
  userName: string;
  userRole: string;
  team: string;
  content: string;
  remarkType: 'query' | 'response' | 'resolution' | 'deferral' | 'otc';
  timestamp: Date;
  isResolution?: boolean;
  resolvedBy?: string;
  resolutionType?: 'approved' | 'deferral' | 'otc';
  attachments?: string[];
  metadata?: {
    [key: string]: any;
  };
}

export interface RemarkQuery {
  _id?: ObjectId;
  queryId: string;
  caseNumber: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  employeeId: string;
  title: string;
  description: string;
  status: 'pending' | 'resolved' | 'deferred' | 'otc';
  priority: 'low' | 'medium' | 'high' | 'critical';
  assignedTeam: string[];
  createdBy: string;
  createdByName: string;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
  resolvedBy?: string;
  resolutionType?: 'approved' | 'deferral' | 'otc';
  resolutionDetails?: string;
  tat?: string;
  branch: string;
  department: string;
  remarks: RemarkMessage[];
}

export interface CreateRemarkQueryData {
  caseNumber: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  employeeId: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  assignedTeam: string[];
  createdBy: string;
  createdByName: string;
  branch: string;
  department: string;
}

export class RemarkModel {
  private static collectionName = process.env.MONGODB_REMARKS_COLLECTION || 'remarks';

  // Create a new remark query
  static async createRemarkQuery(queryData: CreateRemarkQueryData): Promise<RemarkQuery> {
    if (isBuildProcess) {
      console.log('Build process: Mocking createRemarkQuery');
      const mockQuery: RemarkQuery = {
        _id: new ObjectId(),
        queryId: `Q${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        ...queryData,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
        remarks: []
      };
      return mockQuery;
    }
    try {
      const { db } = await connectToDatabase();
      const collection = db.collection<RemarkQuery>(this.collectionName);

      // Generate unique query ID
      const queryId = `Q${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const newQuery: RemarkQuery = {
        queryId,
        caseNumber: queryData.caseNumber,
        customerName: queryData.customerName,
        customerEmail: queryData.customerEmail,
        customerPhone: queryData.customerPhone,
        employeeId: queryData.employeeId,
        title: queryData.title,
        description: queryData.description,
        status: 'pending',
        priority: queryData.priority,
        assignedTeam: queryData.assignedTeam,
        createdBy: queryData.createdBy,
        createdByName: queryData.createdByName,
        createdAt: new Date(),
        updatedAt: new Date(),
        branch: queryData.branch,
        department: queryData.department,
        remarks: []
      };

      // Add initial message
      const initialRemark: RemarkMessage = {
        queryId,
        caseNumber: queryData.caseNumber,
        userId: queryData.createdBy,
        userName: queryData.createdByName,
        userRole: 'operations',
        team: 'Operations',
        content: queryData.description,
        remarkType: 'query',
        timestamp: new Date()
      };

      newQuery.remarks.push(initialRemark);

      const result = await collection.insertOne(newQuery);
      return { ...newQuery, _id: result.insertedId };
    } catch (error) {
      console.error('Error creating remark query:', error);
      throw error;
    }
  }

  // Add message to remark with enhanced isolation
  static async addRemark(queryId: string, messageData: Omit<RemarkMessage, '_id' | 'queryId' | 'timestamp'>): Promise<RemarkMessage> {
    if (isBuildProcess) {
      console.log('Build process: Mocking addRemark');
      return {
        _id: new ObjectId(),
        queryId,
        ...messageData,
        timestamp: new Date()
      };
    }
    try {
      const { db } = await connectToDatabase();
      const collection = db.collection<RemarkQuery>(this.collectionName);

      // Ensure queryId is properly formatted for isolation
      const normalizedQueryId = queryId.toString();
      
      const newRemark: RemarkMessage = {
        queryId: normalizedQueryId,
        ...messageData,
        timestamp: new Date(),
        metadata: {
          ...messageData.metadata,
          isolationKey: `query_${normalizedQueryId}`,
          threadIsolated: true
        }
      };

      // Check for duplicates within the same query thread
      const existingQuery = await collection.findOne({ queryId: normalizedQueryId });
      
      if (existingQuery) {
        const isDuplicate = existingQuery.remarks?.some(remark => 
          remark.content === newRemark.content &&
          remark.userId === newRemark.userId &&
          Math.abs(new Date(remark.timestamp).getTime() - newRemark.timestamp.getTime()) < 5000
        );
        
        if (isDuplicate) {
          console.log(`🔒 Duplicate remark detected for query ${normalizedQueryId}, skipping`);
          const duplicateRemark = existingQuery.remarks!.find(remark => 
            remark.content === newRemark.content &&
            remark.userId === newRemark.userId
          )!;
          return duplicateRemark;
        }
      }

      const result = await collection.findOneAndUpdate(
        { queryId: normalizedQueryId },
        { 
          $push: { remarks: newRemark },
          $set: { updatedAt: new Date() }
        },
        { returnDocument: 'after' }
      );

      if (!result) {
        throw new Error(`Query ${normalizedQueryId} not found`);
      }

      console.log(`✅ Added remark to isolated thread for query ${normalizedQueryId}`);
      return newRemark;
    } catch (error) {
      console.error('Error adding message:', error);
      throw error;
    }
  }

  // Get remark query by ID
  static async getRemarkQueryById(queryId: string): Promise<RemarkQuery | null> {
    if (isBuildProcess) {
      console.log('Build process: Mocking getRemarkQueryById');
      return null;
    }
    try {
      const { db } = await connectToDatabase();
      const collection = db.collection<RemarkQuery>(this.collectionName);
      
      const query = await collection.findOne({ queryId });
      return query;
    } catch (error) {
      console.error('Error getting remark query:', error);
      throw error;
    }
  }

  // Get all remark queries
  static async getAllRemarkQueries(filters?: {
    status?: string;
    assignedTeam?: string;
    branch?: string;
    priority?: string;
    createdBy?: string;
  }): Promise<RemarkQuery[]> {
    if (isBuildProcess) {
      console.log('Build process: Mocking getAllRemarkQueries');
      return [];
    }
    try {
      const { db } = await connectToDatabase();
      const collection = db.collection<RemarkQuery>(this.collectionName);
      
      const query: any = {};
      
      if (filters) {
        if (filters.status) query.status = filters.status;
        if (filters.assignedTeam) query.assignedTeam = { $in: [filters.assignedTeam] };
        if (filters.branch) query.branch = filters.branch;
        if (filters.priority) query.priority = filters.priority;
        if (filters.createdBy) query.createdBy = filters.createdBy;
      }

      const queries = await collection.find(query).sort({ createdAt: -1 }).toArray();
      return queries;
    } catch (error) {
      console.error('Error getting remark queries:', error);
      throw error;
    }
  }

  // Update query status
  static async updateQueryStatus(
    queryId: string, 
    status: 'pending' | 'resolved' | 'deferred' | 'otc',
    resolvedBy?: string,
    resolutionType?: 'approved' | 'deferral' | 'otc',
    resolutionDetails?: string
  ): Promise<RemarkQuery | null> {
    if (isBuildProcess) {
      console.log('Build process: Mocking updateQueryStatus');
      return null;
    }
    try {
      const { db } = await connectToDatabase();
      const collection = db.collection<RemarkQuery>(this.collectionName);
      
      const updateData: any = {
        status,
        updatedAt: new Date()
      };

      if (status === 'resolved' || status === 'deferred' || status === 'otc') {
        updateData.resolvedAt = new Date();
        updateData.resolvedBy = resolvedBy;
        updateData.resolutionType = resolutionType;
        updateData.resolutionDetails = resolutionDetails;
      }

      const result = await collection.findOneAndUpdate(
        { queryId },
        { $set: updateData },
        { returnDocument: 'after' }
      );

      return result;
    } catch (error) {
      console.error('Error updating query status:', error);
      throw error;
    }
  }

  // Get remark remarks for a query with enhanced isolation
  static async getRemarks(queryId: string): Promise<RemarkMessage[]> {
    if (isBuildProcess) {
      console.log('Build process: Mocking getRemarks');
      return [];
    }
    try {
      const { db } = await connectToDatabase();
      const collection = db.collection<RemarkQuery>(this.collectionName);
      
      // CRITICAL: Ensure queryId is properly formatted for isolation with trimming
      const normalizedQueryId = queryId.toString().trim();
      
      // ULTRA-STRICT: Exact match only
      const query = await collection.findOne({ 
        queryId: normalizedQueryId
      });
      
      const remarks = query?.remarks || [];
      
      // Additional validation: Ensure all remarks belong to this query
      const validatedRemarks = remarks.filter(remark => {
        const remarkQueryId = remark.queryId?.toString().trim();
        return remarkQueryId === normalizedQueryId;
      });
      
      if (validatedRemarks.length !== remarks.length) {
        console.warn(`⚠️ Filtered out ${remarks.length - validatedRemarks.length} remarks due to isolation validation`);
      }
      
      console.log(`🔒 Retrieved ${validatedRemarks.length} isolated remarks for query ${normalizedQueryId}`);
      return validatedRemarks;
    } catch (error) {
      console.error('Error getting remark remarks:', error);
      throw error;
    }
  }

  // Search remark queries
  static async searchRemarkQueries(searchTerm: string): Promise<RemarkQuery[]> {
    if (isBuildProcess) {
      console.log('Build process: Mocking searchRemarkQueries');
      return [];
    }
    try {
      const { db } = await connectToDatabase();
      const collection = db.collection<RemarkQuery>(this.collectionName);
      
      const queries = await collection.find({
        $or: [
          { title: { $regex: searchTerm, $options: 'i' } },
          { description: { $regex: searchTerm, $options: 'i' } },
          { caseNumber: { $regex: searchTerm, $options: 'i' } },
          { customerName: { $regex: searchTerm, $options: 'i' } },
          { employeeId: { $regex: searchTerm, $options: 'i' } }
        ]
      }).sort({ createdAt: -1 }).toArray();
      
      return queries;
    } catch (error) {
      console.error('Error searching remark queries:', error);
      throw error;
    }
  }

  // Get queries by case number
  static async getQueriesByCaseNumber(caseNumber: string): Promise<RemarkQuery[]> {
    if (isBuildProcess) {
      console.log('Build process: Mocking getQueriesByCaseNumber');
      return [];
    }
    try {
      const { db } = await connectToDatabase();
      const collection = db.collection<RemarkQuery>(this.collectionName);
      
      const queries = await collection.find({ caseNumber }).sort({ createdAt: -1 }).toArray();
      return queries;
    } catch (error) {
      console.error('Error getting queries by case number:', error);
      throw error;
    }
  }

  // Get query statistics
  static async getQueryStatistics(filters?: {
    branch?: string;
    team?: string;
    dateFrom?: Date;
    dateTo?: Date;
  }): Promise<{
    total: number;
    pending: number;
    resolved: number;
    deferred: number;
    otc: number;
    byPriority: { [key: string]: number };
    byTeam: { [key: string]: number };
  }> {
    if (isBuildProcess) {
      console.log('Build process: Mocking getQueryStatistics');
      return {
        total: 0,
        pending: 0,
        resolved: 0,
        deferred: 0,
        otc: 0,
        byPriority: {},
        byTeam: {}
      };
    }
    try {
      const { db } = await connectToDatabase();
      const collection = db.collection<RemarkQuery>(this.collectionName);
      
      const matchQuery: any = {};
      
      if (filters) {
        if (filters.branch) matchQuery.branch = filters.branch;
        if (filters.team) matchQuery.assignedTeam = { $in: [filters.team] };
        if (filters.dateFrom || filters.dateTo) {
          matchQuery.createdAt = {};
          if (filters.dateFrom) matchQuery.createdAt.$gte = filters.dateFrom;
          if (filters.dateTo) matchQuery.createdAt.$lte = filters.dateTo;
        }
      }

      const stats = await collection.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
            resolved: { $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] } },
            deferred: { $sum: { $cond: [{ $eq: ['$status', 'deferred'] }, 1, 0] } },
            otc: { $sum: { $cond: [{ $eq: ['$status', 'otc'] }, 1, 0] } },
            priorities: { $push: '$priority' },
            teams: { $push: '$assignedTeam' }
          }
        }
      ]).toArray();

      const result = stats[0] || {
        total: 0,
        pending: 0,
        resolved: 0,
        deferred: 0,
        otc: 0,
        priorities: [],
        teams: []
      };

      // Count by priority
      const byPriority: { [key: string]: number } = {};
      result.priorities.forEach((priority: string) => {
        byPriority[priority] = (byPriority[priority] || 0) + 1;
      });

      // Count by team
      const byTeam: { [key: string]: number } = {};
      result.teams.forEach((teamArray: string[]) => {
        teamArray.forEach((team: string) => {
          byTeam[team] = (byTeam[team] || 0) + 1;
        });
      });

      return {
        total: result.total,
        pending: result.pending,
        resolved: result.resolved,
        deferred: result.deferred,
        otc: result.otc,
        byPriority,
        byTeam
      };
    } catch (error) {
      console.error('Error getting query statistics:', error);
      throw error;
    }
  }
}
