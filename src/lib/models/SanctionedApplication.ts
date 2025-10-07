import { ObjectId } from 'mongodb';
import { connectToDatabase } from '../mongodb';

export interface SanctionedApplication {
  _id?: ObjectId;
  appId: string;
  customerName: string;
  branch: string;
  sanctionedAmount: number;
  sanctionedDate: Date;
  validityPeriod?: number;
  loanType: string;
  interestRate?: number;
  processingFee?: number;
  customerPhone?: string;
  customerEmail?: string;
  sanctionedBy: string;
  approvedBy?: string;
  remarks?: string;
  conditions?: string[];
  status: 'active' | 'expired' | 'utilized' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
  originalAppId?: string;
  loanNo?: string;
  salesExec?: string;
}

export interface CreateSanctionedApplicationData {
  appId: string;
  customerName: string;
  branch: string;
  sanctionedAmount: number;
  validityPeriod?: number;
  loanType: string;
  interestRate?: number;
  processingFee?: number;
  customerPhone?: string;
  customerEmail?: string;
  sanctionedBy: string;
  approvedBy?: string;
  remarks?: string;
  conditions?: string[];
  originalAppId?: string;
  loanNo?: string;
  salesExec?: string;
}

export class SanctionedApplicationModel {
  private static collectionName = 'sanctioned_applications';

  static async createSanctionedApplication(applicationData: CreateSanctionedApplicationData): Promise<SanctionedApplication> {
    try {
      const { db } = await connectToDatabase();
      const collection = db.collection<SanctionedApplication>(this.collectionName);

      const existingApp = await collection.findOne({ appId: applicationData.appId });
      if (existingApp) {
        throw new Error(`Sanctioned application with ID ${applicationData.appId} already exists`);
      }

      const newSanctionedApplication: SanctionedApplication = {
        appId: applicationData.appId,
        customerName: applicationData.customerName,
        branch: applicationData.branch,
        sanctionedAmount: applicationData.sanctionedAmount,
        sanctionedDate: new Date(),
        validityPeriod: applicationData.validityPeriod || 6,
        loanType: applicationData.loanType,
        interestRate: applicationData.interestRate,
        processingFee: applicationData.processingFee,
        customerPhone: applicationData.customerPhone || '',
        customerEmail: applicationData.customerEmail || '',
        sanctionedBy: applicationData.sanctionedBy,
        approvedBy: applicationData.approvedBy,
        remarks: applicationData.remarks || '',
        conditions: applicationData.conditions || [],
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
        originalAppId: applicationData.originalAppId,
        loanNo: applicationData.loanNo,
        salesExec: applicationData.salesExec
      };

      const result = await collection.insertOne(newSanctionedApplication);
      return { ...newSanctionedApplication, _id: result.insertedId };
    } catch (error) {
      console.error('Error creating sanctioned application:', error);
      throw error;
    }
  }

  static async getAllSanctionedApplications(filters?: {
    status?: string;
    branch?: string;
    loanType?: string;
    limit?: number;
    skip?: number;
  }): Promise<SanctionedApplication[]> {
    try {
      const { db } = await connectToDatabase();
      const collection = db.collection<SanctionedApplication>(this.collectionName);
      
      const query: any = {};
      
      if (filters) {
        if (filters.status) query.status = filters.status;
        if (filters.branch) query.branch = filters.branch;
        if (filters.loanType) query.loanType = filters.loanType;
      }

      let cursor = collection.find(query).sort({ sanctionedDate: -1 });
      
      if (filters?.skip) cursor = cursor.skip(filters.skip);
      if (filters?.limit) cursor = cursor.limit(filters.limit);

      const applications = await cursor.toArray();
      return applications;
    } catch (error) {
      console.error('Error getting sanctioned applications:', error);
      throw error;
    }
  }

  static async clearAllSanctionedApplications(): Promise<{ deletedCount: number }> {
    try {
      const { db } = await connectToDatabase();
      const collection = db.collection<SanctionedApplication>(this.collectionName);
      
      console.log('Clearing all sanctioned applications from database...');
      const result = await collection.deleteMany({});
      
      console.log(`Cleared ${result.deletedCount} sanctioned applications from database`);
      return { deletedCount: result.deletedCount };
    } catch (error) {
      console.error('Error clearing sanctioned applications:', error);
      throw error;
    }
  }

  static async bulkCreateSanctionedApplications(applications: CreateSanctionedApplicationData[]): Promise<{
    success: number;
    failed: number;
    errors: string[];
    duplicates: number;
  }> {
    try {
      const { db } = await connectToDatabase();
      const collection = db.collection<SanctionedApplication>(this.collectionName);
      
      let success = 0;
      let failed = 0;
      let duplicates = 0;
      const errors: string[] = [];

      // Process in batches to reduce memory usage
      const BATCH_SIZE = 100;
      
      for (let i = 0; i < applications.length; i += BATCH_SIZE) {
        const batch = applications.slice(i, i + BATCH_SIZE);
        
        try {
          // Get existing appIds in bulk for duplicate checking
          const appIds = batch.map(app => app.appId);
          const existingApps = await collection.find(
            { appId: { $in: appIds } },
            { projection: { appId: 1 } }
          ).toArray();
          
          const existingAppIds = new Set(existingApps.map(app => app.appId));
          
          // Filter out duplicates and prepare documents for insertion
          const documentsToInsert: SanctionedApplication[] = [];
          
          for (const appData of batch) {
            if (existingAppIds.has(appData.appId)) {
              duplicates++;
              errors.push(`${appData.appId}: Duplicate application`);
              continue;
            }

            const newSanctionedApplication: SanctionedApplication = {
              appId: appData.appId,
              customerName: appData.customerName,
              branch: appData.branch,
              sanctionedAmount: appData.sanctionedAmount,
              sanctionedDate: new Date(),
              validityPeriod: appData.validityPeriod || 6,
              loanType: appData.loanType,
              interestRate: appData.interestRate,
              processingFee: appData.processingFee,
              customerPhone: appData.customerPhone || '',
              customerEmail: appData.customerEmail || '',
              sanctionedBy: appData.sanctionedBy,
              approvedBy: appData.approvedBy,
              remarks: appData.remarks || '',
              conditions: appData.conditions || [],
              status: 'active',
              createdAt: new Date(),
              updatedAt: new Date(),
              originalAppId: appData.originalAppId,
              loanNo: appData.loanNo,
              salesExec: appData.salesExec
            };
            
            documentsToInsert.push(newSanctionedApplication);
          }

          // Bulk insert the batch
          if (documentsToInsert.length > 0) {
            const insertResult = await collection.insertMany(documentsToInsert, { ordered: false });
            success += insertResult.insertedCount;
            console.log(`Batch ${Math.floor(i / BATCH_SIZE) + 1}: Inserted ${insertResult.insertedCount} applications`);
          }
          
        } catch (error: any) {
          // Handle bulk insert errors
          if (error.code === 11000) {
            // Duplicate key errors
            const duplicateCount = error.writeErrors?.length || 0;
            duplicates += duplicateCount;
            success += batch.length - duplicateCount;
            error.writeErrors?.forEach((writeError: any) => {
              errors.push(`Batch error: ${writeError.errmsg}`);
            });
          } else {
            failed += batch.length;
            errors.push(`Batch error: ${error.message}`);
            console.error(`Failed to insert batch ${Math.floor(i / BATCH_SIZE) + 1}: ${error.message}`);
          }
        }
        
        // Add small delay between batches to prevent memory spikes
        if (i + BATCH_SIZE < applications.length) {
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      }

      return { success, failed, errors, duplicates };
    } catch (error) {
      console.error('Error bulk creating sanctioned applications:', error);
      throw error;
    }
  }

  static async getSanctionedApplicationByAppId(appId: string): Promise<SanctionedApplication | null> {
    try {
      const { db } = await connectToDatabase();
      const collection = db.collection<SanctionedApplication>(this.collectionName);
      return await collection.findOne({ appId });
    } catch (error) {
      console.error('Error getting sanctioned application by appId:', error);
      throw error;
    }
  }

  static async updateSanctionedApplicationStatus(appId: string, status: 'active' | 'expired' | 'utilized' | 'cancelled', actor?: string, remarks?: string): Promise<boolean> {
    try {
      const { db } = await connectToDatabase();
      const collection = db.collection<SanctionedApplication>(this.collectionName);
      
      const updateData: any = { status, updatedAt: new Date() };
      if (remarks) updateData.remarks = remarks;
      if (actor) updateData.updatedBy = actor;
      
      const result = await collection.updateOne(
        { appId },
        { $set: updateData }
      );
      return result.modifiedCount > 0;
    } catch (error) {
      console.error('Error updating sanctioned application status:', error);
      throw error;
    }
  }

  static async deleteSanctionedApplication(appId: string): Promise<boolean> {
    try {
      const { db } = await connectToDatabase();
      const collection = db.collection<SanctionedApplication>(this.collectionName);
      const result = await collection.deleteOne({ appId });
      return result.deletedCount > 0;
    } catch (error) {
      console.error('Error deleting sanctioned application:', error);
      throw error;
    }
  }

  static async getExpiringSanctionedApplications(daysThreshold: number = 30): Promise<SanctionedApplication[]> {
    try {
      const { db } = await connectToDatabase();
      const collection = db.collection<SanctionedApplication>(this.collectionName);
      
      const thresholdDate = new Date();
      thresholdDate.setDate(thresholdDate.getDate() + daysThreshold);
      
      return await collection.find({
        status: 'active',
        $expr: {
          $lte: [
            {
              $add: [
                "$sanctionedDate",
                { $multiply: [{ $ifNull: ["$validityPeriod", 6] }, 30, 24, 60, 60, 1000] }
              ]
            },
            thresholdDate
          ]
        }
      }).toArray();
    } catch (error) {
      console.error('Error getting expiring sanctioned applications:', error);
      throw error;
    }
  }

  static async getSanctionedApplicationStats(): Promise<{
    total: number;
    active: number;
    expired: number;
    utilized: number;
    cancelled: number;
    totalAmount: number;
  }> {
    try {
      const { db } = await connectToDatabase();
      const collection = db.collection<SanctionedApplication>(this.collectionName);
      
      const stats = await collection.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            active: { $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] } },
            expired: { $sum: { $cond: [{ $eq: ["$status", "expired"] }, 1, 0] } },
            utilized: { $sum: { $cond: [{ $eq: ["$status", "utilized"] }, 1, 0] } },
            cancelled: { $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] } },
            totalAmount: { $sum: "$sanctionedAmount" }
          }
        }
      ]).toArray();
      
      return (stats[0] as any) || {
        total: 0,
        active: 0,
        expired: 0,
        utilized: 0,
        cancelled: 0,
        totalAmount: 0
      };
    } catch (error) {
      console.error('Error getting sanctioned application stats:', error);
      throw error;
    }
  }

  static async addSampleData(): Promise<{ success: number; failed: number; errors: string[] }> {
    try {
      const sampleApplications: CreateSanctionedApplicationData[] = [
        {
          appId: 'SA001',
          customerName: 'Rajesh Kumar',
          branch: 'Mumbai Central',
          sanctionedAmount: 500000,
          loanType: 'Personal Loan',
          interestRate: 12.5,
          processingFee: 5000,
          customerPhone: '+91-9876543210',
          customerEmail: 'rajesh.kumar@email.com',
          sanctionedBy: 'Manager A',
          approvedBy: 'Senior Manager',
          remarks: 'Regular customer with good credit history',
          conditions: ['Salary slip required', 'Bank statements for 6 months'],
          validityPeriod: 6,
          loanNo: 'PL001'
        },
        {
          appId: 'SA002',
          customerName: 'Priya Sharma',
          branch: 'Delhi North',
          sanctionedAmount: 1000000,
          loanType: 'Home Loan',
          interestRate: 8.5,
          processingFee: 10000,
          customerPhone: '+91-9876543211',
          customerEmail: 'priya.sharma@email.com',
          sanctionedBy: 'Manager B',
          approvedBy: 'Regional Manager',
          remarks: 'First time home buyer',
          conditions: ['Property documents', 'Income proof', 'Guarantor required'],
          validityPeriod: 12,
          loanNo: 'HL001'
        },
        {
          appId: 'SA003',
          customerName: 'Amit Singh',
          branch: 'Bangalore Tech Park',
          sanctionedAmount: 2000000,
          loanType: 'Business Loan',
          interestRate: 10.0,
          processingFee: 20000,
          customerPhone: '+91-9876543212',
          customerEmail: 'amit.singh@email.com',
          sanctionedBy: 'Manager C',
          approvedBy: 'Branch Head',
          remarks: 'Expanding tech startup',
          conditions: ['Business plan', 'Financial statements', 'Collateral required'],
          validityPeriod: 9,
          loanNo: 'BL001'
        },
        {
          appId: 'SA004',
          customerName: 'Sunita Patel',
          branch: 'Ahmedabad Main',
          sanctionedAmount: 300000,
          loanType: 'Vehicle Loan',
          interestRate: 9.5,
          processingFee: 3000,
          customerPhone: '+91-9876543213',
          customerEmail: 'sunita.patel@email.com',
          sanctionedBy: 'Manager D',
          remarks: 'New car purchase',
          conditions: ['Vehicle insurance', 'RC book'],
          validityPeriod: 6,
          loanNo: 'VL001'
        },
        {
          appId: 'SA005',
          customerName: 'Vikram Reddy',
          branch: 'Hyderabad HITEC',
          sanctionedAmount: 750000,
          loanType: 'Education Loan',
          interestRate: 7.5,
          processingFee: 7500,
          customerPhone: '+91-9876543214',
          customerEmail: 'vikram.reddy@email.com',
          sanctionedBy: 'Manager E',
          approvedBy: 'Assistant Manager',
          remarks: 'Pursuing masters abroad',
          conditions: ['Admission letter', 'Fee structure', 'Guardian co-signer'],
          validityPeriod: 18,
          loanNo: 'EL001'
        }
      ];

      let success = 0;
      let failed = 0;
      const errors: string[] = [];

      for (const appData of sampleApplications) {
        try {
          await this.createSanctionedApplication(appData);
          success++;
          console.log(`Created sanctioned application: ${appData.appId}`);
        } catch (error: any) {
          failed++;
          errors.push(`${appData.appId}: ${error.message}`);
          console.log(`Failed to create sanctioned application ${appData.appId}: ${error.message}`);
        }
      }

      return { success, failed, errors };
    } catch (error) {
      console.error('Error adding sample data:', error);
      throw error;
    }
  }
}