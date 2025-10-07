import { ObjectId } from 'mongodb';
import { connectToDatabase } from '../mongodb';

export interface Application {
  _id?: ObjectId;
  appId: string;
  customerName: string;
  branch: string;
  status: 'pending' | 'approved' | 'rejected' | 'under_review' | 'sanctioned';
  amount?: number;
  appliedDate: Date;
  sanctionedDate?: Date;
  uploadedAt: Date;
  uploadedBy?: string;
  priority: 'high' | 'medium' | 'low';
  loanType?: string;
  customerPhone?: string;
  customerEmail?: string;
  documentStatus?: string;
  remarks?: string;
  assignedTo?: string;
  resolverName?: string;
  lastUpdated: Date;
  history: ApplicationHistoryItem[];
  // Enhanced fields for CSV upload
  loanNo?: string;
  appStatus?: string;
  loginFee?: number;
  sanctionAmount?: number;
  salesExec?: string;
}

export interface ApplicationHistoryItem {
  timestamp: Date;
  action: string;
  actor: string;
  details: string;
  resolverName?: string;
  previousStatus?: string;
  newStatus?: string;
}

export interface CreateApplicationData {
  appId: string;
  customerName: string;
  branch: string;
  status: 'pending' | 'approved' | 'rejected' | 'under_review' | 'sanctioned';
  amount?: number;
  appliedDate?: Date;
  priority?: 'high' | 'medium' | 'low';
  loanType?: string;
  customerPhone?: string;
  customerEmail?: string;
  documentStatus?: string;
  remarks?: string;
  uploadedBy?: string;
  // Enhanced fields for CSV upload
  loanNo?: string;
  appStatus?: string;
  loginFee?: number;
  sanctionAmount?: number;
  login?: string;
  assetType?: string;
  salesExec?: string;
}

export class ApplicationModel {
  private static collectionName = process.env.MONGODB_APPLICATIONS_COLLECTION || 'applications';

  // Create a new application
  static async createApplication(applicationData: CreateApplicationData): Promise<Application> {
    try {
      const { db } = await connectToDatabase();
      const collection = db.collection<Application>(this.collectionName);

      // Check if application already exists
      const existingApp = await collection.findOne({ appId: applicationData.appId });
      if (existingApp) {
        throw new Error(`Application with ID ${applicationData.appId} already exists`);
      }

      const newApplication: Application = {
        appId: applicationData.appId,
        customerName: applicationData.customerName,
        branch: applicationData.branch,
        status: applicationData.status || 'pending',
        amount: applicationData.amount || 0,
        appliedDate: applicationData.appliedDate || new Date(),
        uploadedAt: new Date(),
        uploadedBy: applicationData.uploadedBy || 'System',
        priority: applicationData.priority || 'medium',
        loanType: applicationData.loanType || 'Personal Loan',
        customerPhone: applicationData.customerPhone || '',
        customerEmail: applicationData.customerEmail || '',
        documentStatus: applicationData.documentStatus || 'Pending',
        remarks: applicationData.remarks || '',
        lastUpdated: new Date(),
        history: [{
          timestamp: new Date(),
          action: 'created',
          actor: applicationData.uploadedBy || 'System',
          details: 'Application created via bulk upload'
        }]
      };

      const result = await collection.insertOne(newApplication);
      return { ...newApplication, _id: result.insertedId };
    } catch (error) {
      console.error('Error creating application:', error);
      throw error;
    }
  }

  // Get all applications
  static async getAllApplications(filters?: {
    status?: string;
    branch?: string;
    priority?: string;
    limit?: number;
    skip?: number;
  }): Promise<Application[]> {
    try {
      const { db } = await connectToDatabase();
      const collection = db.collection<Application>(this.collectionName);
      
      const query: any = {};
      
      if (filters) {
        if (filters.status) query.status = filters.status;
        if (filters.branch) query.branch = filters.branch;
        if (filters.priority) query.priority = filters.priority;
      }

      let cursor = collection.find(query).sort({ uploadedAt: -1 });
      
      if (filters?.skip) cursor = cursor.skip(filters.skip);
      if (filters?.limit) cursor = cursor.limit(filters.limit);

      const applications = await cursor.toArray();
      return applications;
    } catch (error) {
      console.error('Error getting applications:', error);
      throw error;
    }
  }

  // Get applications by status
  static async getApplicationsByStatus(status: string): Promise<Application[]> {
    try {
      const { db } = await connectToDatabase();
      const collection = db.collection<Application>(this.collectionName);
      
      // Use type assertion to handle the string status
      const applications = await collection.find({ status: status as any }).sort({ uploadedAt: -1 }).toArray();
      return applications;
    } catch (error) {
      console.error('Error getting applications by status:', error);
      throw error;
    }
  }

  // Get applications by branch
  static async getApplicationsByBranch(branch: string): Promise<Application[]> {
    try {
      const { db } = await connectToDatabase();
      const collection = db.collection<Application>(this.collectionName);
      
      const applications = await collection.find({ branch }).sort({ uploadedAt: -1 }).toArray();
      return applications;
    } catch (error) {
      console.error('Error getting applications by branch:', error);
      throw error;
    }
  }

  // Get single application by App ID
  static async getApplicationByAppId(appId: string): Promise<Application | null> {
    try {
      const { db } = await connectToDatabase();
      const collection = db.collection<Application>(this.collectionName);
      
      console.log(`🔍 Searching for application with App.No: "${appId}"`);
      
      // First try exact match
      let application = await collection.findOne({ appId: appId });
      
      // If not found, try case-insensitive search
      if (!application) {
        application = await collection.findOne({ 
          appId: { $regex: new RegExp(`^${appId}$`, 'i') } 
        });
      }
    
      // If still not found, try trimmed version
      if (!application && appId.trim() !== appId) {
        application = await collection.findOne({ appId: appId.trim() });
      }
      
      // If still not found, try normalized space version (remove extra spaces)
      if (!application) {
        const normalizedAppId = appId.replace(/\s+/g, ' ').trim();
        application = await collection.findOne({ 
          appId: { $regex: new RegExp(`^${normalizedAppId.replace(/\s/g, '\\s+')}$`, 'i') } 
        });
      }
      
      // If still not found, try searching for pattern with flexible spacing
      if (!application) {
        // Create a pattern that matches the same letters/numbers with any amount of spaces
        const flexiblePattern = appId.replace(/\s+/g, '\\s+').replace(/[^a-zA-Z0-9\\s]/g, '');
        application = await collection.findOne({ 
          appId: { $regex: new RegExp(`^${flexiblePattern}$`, 'i') } 
        });
      }
      
      // If still not found, try searching without any spaces
      if (!application) {
        const noSpaceAppId = appId.replace(/\s/g, '');
        application = await collection.findOne({ 
          appId: { $regex: new RegExp(`^${noSpaceAppId.replace(/(.)/g, '$1\\s*')}$`, 'i') } 
        });
      }
      
      if (application) {
        console.log(`✅ Found application: "${application.appId}" - ${application.customerName}`);
      } else {
        console.log(`❌ Application not found for App.No: "${appId}"`);
        
        // Log some sample applications to help debugging
        const sampleApps = await collection.find({}).limit(5).toArray();
        console.log('📋 Sample applications in database:');
        sampleApps.forEach(app => {
          console.log(`  - "${app.appId}" (${app.customerName})`);
        });
      }
      
      return application;
    } catch (error) {
      console.error('Error getting application by App ID:', error);
      throw error;
    }
  }

  // Find similar applications for intelligent fallback data
  static async findSimilarApplications(appId: string): Promise<Application[]> {
    try {
      const { db } = await connectToDatabase();
      const collection = db.collection<Application>(this.collectionName);
      
      console.log(`🔍 Searching for similar applications to: "${appId}"`);
      
      // Extract pattern from appId (e.g., "SNP 13" -> "SNP", "APP123" -> "APP")
      const pattern = appId.replace(/[0-9\s]/g, '').trim();
      
      if (pattern) {
        // Find applications with similar patterns
        const similarApps = await collection.find({
          appId: { $regex: new RegExp(`^${pattern}`, 'i') }
        })
        .sort({ uploadedAt: -1 }) // Get most recent first
        .limit(5)
        .toArray();
        
        console.log(`✅ Found ${similarApps.length} similar applications with pattern "${pattern}"`);
        return similarApps;
      } else {
        // If no pattern found, get some recent applications from same branch or recent ones
        const recentApps = await collection.find({})
          .sort({ uploadedAt: -1 })
          .limit(3)
          .toArray();
        
        console.log(`✅ Found ${recentApps.length} recent applications as fallback`);
        return recentApps;
      }
    } catch (error) {
      console.error('Error finding similar applications:', error);
      return [];
    }
  }

  // Update application status
  static async updateApplicationStatus(
    appId: string, 
    newStatus: string, 
    actor: string, 
    remarks?: string
  ): Promise<Application | null> {
    try {
      const { db } = await connectToDatabase();
      const collection = db.collection<Application>(this.collectionName);
      
      // Get current application
      const currentApp = await collection.findOne({ appId });
      if (!currentApp) return null;

      // Create history entry
      const historyEntry: ApplicationHistoryItem = {
        timestamp: new Date(),
        action: 'status_updated',
        actor,
        details: remarks || `Status changed from ${currentApp.status} to ${newStatus}`,
        previousStatus: currentApp.status,
        newStatus
      };

      // Update data
      const updateData: any = {
        status: newStatus,
        lastUpdated: new Date(),
        $push: { history: historyEntry }
      };

      if (newStatus === 'sanctioned' && !currentApp.sanctionedDate) {
        updateData.sanctionedDate = new Date();
      }

      if (remarks) {
        updateData.remarks = remarks;
      }

      const result = await collection.findOneAndUpdate(
        { appId },
        updateData,
        { returnDocument: 'after' }
      );
      
      return result;
    } catch (error) {
      console.error('Error updating application status:', error);
      throw error;
    }
  }

  // Delete an application by appId
  static async deleteApplication(appId: string): Promise<boolean> {
    try {
      const { db } = await connectToDatabase();
      const collection = db.collection<Application>(this.collectionName);
      
      console.log(`🗑️ Attempting to delete application: ${appId}`);
      
      // First try exact match
      let result = await collection.deleteOne({ appId: appId });
      
      // If not found, try case-insensitive search
      if (result.deletedCount === 0) {
        result = await collection.deleteOne({ 
          appId: { $regex: new RegExp(`^${appId}$`, 'i') } 
        });
      }
      
      // If still not found, try trimmed version
      if (result.deletedCount === 0 && appId.trim() !== appId) {
        result = await collection.deleteOne({ appId: appId.trim() });
      }
      
      if (result.deletedCount > 0) {
        console.log(`✅ Successfully deleted application: ${appId}`);
        return true;
      } else {
        console.log(`⚠️ Application not found for deletion: ${appId}`);
        return false;
      }
    } catch (error) {
      console.error('Error deleting application:', error);
      throw error;
    }
  }

  // Bulk create applications (for bulk upload)
  static async bulkCreateApplications(applications: CreateApplicationData[]): Promise<{
    success: number;
    failed: number;
    errors: string[];
    duplicates: number;
  }> {
    try {
      const { db } = await connectToDatabase();
      const collection = db.collection<Application>(this.collectionName);
      
      let success = 0;
      let failed = 0;
      const duplicates = 0; // No duplicates since database is cleared first
      const errors: string[] = [];

      // Since database is cleared before upload, no need to check for duplicates
      for (const appData of applications) {
        try {
          // Create new application with enhanced fields
          const newApplication: Application = {
            appId: appData.appId,
            customerName: appData.customerName,
            branch: appData.branch,
            status: appData.status || 'pending',
            amount: appData.amount || 0,
            appliedDate: appData.appliedDate || new Date(),
            uploadedAt: new Date(),
            uploadedBy: appData.uploadedBy || 'System',
            priority: appData.priority || 'medium',
            loanType: appData.loanType || 'Personal Loan',
            customerPhone: appData.customerPhone || '',
            customerEmail: appData.customerEmail || '',
            documentStatus: appData.documentStatus || 'Pending',
            remarks: appData.remarks || '',
            lastUpdated: new Date(),
            history: [{
              timestamp: new Date(),
              action: 'created',
              actor: appData.uploadedBy || 'System',
              details: 'Application created via bulk upload'
            }],
            // Enhanced fields for CSV upload
            loanNo: appData.loanNo,
            appStatus: appData.appStatus,
            loginFee: appData.loginFee,
            sanctionAmount: appData.sanctionAmount,
            salesExec: appData.salesExec
          };

          await collection.insertOne(newApplication);
          success++;
          console.log(`✅ Created application: ${appData.appId}`);
        } catch (error: any) {
          failed++;
          errors.push(`${appData.appId}: ${error.message}`);
          console.log(`❌ Failed to create application ${appData.appId}: ${error.message}`);
        }
      }

      return { success, failed, errors, duplicates };
    } catch (error) {
      console.error('Error bulk creating applications:', error);
      throw error;
    }
  }

  // Clear all applications from database
  static async clearAllApplications(): Promise<{ deletedCount: number }> {
    try {
      const { db } = await connectToDatabase();
      const collection = db.collection<Application>(this.collectionName);
      
      console.log('🗑️ Clearing all applications from database...');
      const result = await collection.deleteMany({});
      
      console.log(`✅ Cleared ${result.deletedCount} applications from database`);
      return { deletedCount: result.deletedCount };
    } catch (error) {
      console.error('Error clearing applications:', error);
      throw error;
    }
  }

  // Get application statistics
  static async getApplicationStats(): Promise<{
    total: number;
    byStatus: { [key: string]: number };
    byBranch: { [key: string]: number };
    byPriority: { [key: string]: number };
    recentCount: number;
  }> {
    try {
      const { db } = await connectToDatabase();
      const collection = db.collection<Application>(this.collectionName);
      
      const [totalResult, statusResult, branchResult, priorityResult, recentResult] = await Promise.all([
        collection.countDocuments(),
        collection.aggregate([
          { $group: { _id: '$status', count: { $sum: 1 } } }
        ]).toArray(),
        collection.aggregate([
          { $group: { _id: '$branch', count: { $sum: 1 } } }
        ]).toArray(),
        collection.aggregate([
          { $group: { _id: '$priority', count: { $sum: 1 } } }
        ]).toArray(),
        collection.countDocuments({
          uploadedAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
        })
      ]);

      const byStatus: { [key: string]: number } = {};
      statusResult.forEach((item: any) => {
        byStatus[item._id] = item.count;
      });

      const byBranch: { [key: string]: number } = {};
      branchResult.forEach((item: any) => {
        byBranch[item._id] = item.count;
      });

      const byPriority: { [key: string]: number } = {};
      priorityResult.forEach((item: any) => {
        byPriority[item._id] = item.count;
      });

      return {
        total: totalResult,
        byStatus,
        byBranch,
        byPriority,
        recentCount: recentResult
      };
    } catch (error) {
      console.error('Error getting application stats:', error);
      throw error;
    }
  }
}
