import { ObjectId } from 'mongodb';
import { connectToDatabase } from '../mongodb';
import { Application } from './Application';

const isBuildProcess = process.env.BUILDING === 'true';

export interface Branch {
  _id?: ObjectId;
  branchCode: string;
  branchName: string;
  branchAddress: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  email: string;
  branchManager: string;
  managerEmail: string;
  managerPhone: string;
  region: string;
  zone: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  departments: string[];
  employeeCount: number;
  operatingHours: {
    weekdays: string;
    saturday: string;
    sunday: string;
  };
  facilities: string[];
  metadata?: {
    [key: string]: any;
  };
}

export interface CreateBranchData {
  branchCode: string;
  branchName: string;
  branchAddress: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  email: string;
  branchManager: string;
  managerEmail: string;
  managerPhone: string;
  region: string;
  zone: string;
  departments?: string[];
  operatingHours?: {
    weekdays: string;
    saturday: string;
    sunday: string;
  };
  facilities?: string[];
}

export class BranchModel {
  private static collectionName = 'branches';

  // Create a new branch
  static async createBranch(branchData: CreateBranchData): Promise<Branch> {
    try {
      const { db } = await connectToDatabase();
      const collection = db.collection<Branch>(this.collectionName);

      // Check if branch already exists
      const existingBranch = await collection.findOne({
        $or: [
          { branchCode: branchData.branchCode },
          { branchName: branchData.branchName }
        ]
      });

      if (existingBranch) {
        throw new Error('Branch with this code or name already exists');
      }

      const newBranch: Branch = {
        branchCode: branchData.branchCode,
        branchName: branchData.branchName,
        branchAddress: branchData.branchAddress,
        city: branchData.city,
        state: branchData.state,
        pincode: branchData.pincode,
        phone: branchData.phone,
        email: branchData.email,
        branchManager: branchData.branchManager,
        managerEmail: branchData.managerEmail,
        managerPhone: branchData.managerPhone,
        region: branchData.region,
        zone: branchData.zone,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        departments: branchData.departments || ['Operations', 'Sales', 'Credit'],
        employeeCount: 0,
        operatingHours: branchData.operatingHours || {
          weekdays: '9:00 AM - 6:00 PM',
          saturday: '9:00 AM - 2:00 PM',
          sunday: 'Closed'
        },
        facilities: branchData.facilities || []
      };

      const result = await collection.insertOne(newBranch);
      return { ...newBranch, _id: result.insertedId };
    } catch (error) {
      console.error('Error creating branch:', error);
      throw error;
    }
  }

  // Get branch by ID
  static async getBranchById(branchId: string): Promise<Branch | null> {
    try {
      const { db } = await connectToDatabase();
      const collection = db.collection<Branch>(this.collectionName);
      
      const branch = await collection.findOne({ _id: new ObjectId(branchId) });
      return branch;
    } catch (error) {
      console.error('Error getting branch by ID:', error);
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

  // Clear all branches (for bulk operations)
  static async clearAllBranches(): Promise<void> {
    try {
      const { db } = await connectToDatabase();
      const collection = db.collection<Branch>(this.collectionName);
      
      await collection.deleteMany({});
      console.log('✅ All branches cleared successfully');
    } catch (error) {
      console.error('Error clearing all branches:', error);
      throw error;
    }
  }

  // Get branch by code
  static async getBranchByCode(branchCode: string): Promise<Branch | null> {
    try {
      const { db } = await connectToDatabase();
      const collection = db.collection<Branch>(this.collectionName);
      
      const branch = await collection.findOne({ branchCode: branchCode.toUpperCase() });
      return branch;
    } catch (error) {
      console.error('Error getting branch by code:', error);
      throw error;
    }
  }

  // Get all branches
  static async getAllBranches(filters?: {
    isActive?: boolean;
    region?: string;
    zone?: string;
    state?: string;
    city?: string;
  }): Promise<Branch[]> {
    try {
      const { db } = await connectToDatabase();
      const collection = db.collection<Branch>(this.collectionName);
      
      const query: any = {};
      
      if (filters) {
        if (filters.isActive !== undefined) query.isActive = filters.isActive;
        if (filters.region) query.region = filters.region;
        if (filters.zone) query.zone = filters.zone;
        if (filters.state) query.state = filters.state;
        if (filters.city) query.city = filters.city;
      }

      const branches = await collection.find(query).sort({ branchName: 1 }).toArray();
      return branches;
    } catch (error) {
      console.error('Error getting all branches:', error);
      throw error;
    }
  }

  // Update branch
  static async updateBranch(branchId: string, updateData: Partial<Branch>): Promise<Branch | null> {
    try {
      const { db } = await connectToDatabase();
      const collection = db.collection<Branch>(this.collectionName);
      
      updateData.updatedAt = new Date();
      
      const result = await collection.findOneAndUpdate(
        { _id: new ObjectId(branchId) },
        { $set: updateData },
        { returnDocument: 'after' }
      );
      
      return result;
    } catch (error) {
      console.error('Error updating branch:', error);
      throw error;
    }
  }

  // Delete branch
  static async deleteBranch(branchId: string): Promise<boolean> {
    try {
      const { db } = await connectToDatabase();
      const collection = db.collection<Branch>(this.collectionName);
      
      const result = await collection.deleteOne({ _id: new ObjectId(branchId) });
      return result.deletedCount === 1;
    } catch (error) {
      console.error('Error deleting branch:', error);
      throw error;
    }
  }

  // Activate/Deactivate branch
  static async toggleBranchStatus(branchId: string, isActive: boolean): Promise<Branch | null> {
    try {
      const { db } = await connectToDatabase();
      const collection = db.collection<Branch>(this.collectionName);
      
      const result = await collection.findOneAndUpdate(
        { _id: new ObjectId(branchId) },
        { 
          $set: { 
            isActive, 
            updatedAt: new Date() 
          } 
        },
        { returnDocument: 'after' }
      );
      
      return result;
    } catch (error) {
      console.error('Error toggling branch status:', error);
      throw error;
    }
  }

  // Get branches by region
  static async getBranchesByRegion(region: string): Promise<Branch[]> {
    try {
      const { db } = await connectToDatabase();
      const collection = db.collection<Branch>(this.collectionName);
      
      const branches = await collection.find({ region }).sort({ branchName: 1 }).toArray();
      return branches;
    } catch (error) {
      console.error('Error getting branches by region:', error);
      throw error;
    }
  }

  // Get branches by zone
  static async getBranchesByZone(zone: string): Promise<Branch[]> {
    try {
      const { db } = await connectToDatabase();
      const collection = db.collection<Branch>(this.collectionName);
      
      const branches = await collection.find({ zone }).sort({ branchName: 1 }).toArray();
      return branches;
    } catch (error) {
      console.error('Error getting branches by zone:', error);
      throw error;
    }
  }

  // Search branches
  static async searchBranches(searchTerm: string): Promise<Branch[]> {
    try {
      const { db } = await connectToDatabase();
      const collection = db.collection<Branch>(this.collectionName);
      
      const branches = await collection.find({
        $or: [
          { branchName: { $regex: searchTerm, $options: 'i' } },
          { branchCode: { $regex: searchTerm, $options: 'i' } },
          { city: { $regex: searchTerm, $options: 'i' } },
          { state: { $regex: searchTerm, $options: 'i' } },
          { region: { $regex: searchTerm, $options: 'i' } },
          { zone: { $regex: searchTerm, $options: 'i' } }
        ]
      }).sort({ branchName: 1 }).toArray();
      
      return branches;
    } catch (error) {
      console.error('Error searching branches:', error);
      throw error;
    }
  }

  // Update employee count
  static async updateEmployeeCount(branchId: string, count: number): Promise<Branch | null> {
    try {
      const { db } = await connectToDatabase();
      const collection = db.collection<Branch>(this.collectionName);
      
      const result = await collection.findOneAndUpdate(
        { _id: new ObjectId(branchId) },
        { 
          $set: { 
            employeeCount: count, 
            updatedAt: new Date() 
          } 
        },
        { returnDocument: 'after' }
      );
      
      return result;
    } catch (error) {
      console.error('Error updating employee count:', error);
      throw error;
    }
  }

  // Get branch statistics
  static async getBranchStatistics(): Promise<{
    total: number;
    active: number;
    inactive: number;
    byRegion: { [key: string]: number };
    byZone: { [key: string]: number };
    byState: { [key: string]: number };
    totalEmployees: number;
  }> {
    try {
      const { db } = await connectToDatabase();
      const collection = db.collection<Branch>(this.collectionName);
      
      const stats = await collection.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            active: { $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] } },
            inactive: { $sum: { $cond: [{ $eq: ['$isActive', false] }, 1, 0] } },
            regions: { $push: '$region' },
            zones: { $push: '$zone' },
            states: { $push: '$state' },
            totalEmployees: { $sum: '$employeeCount' }
          }
        }
      ]).toArray();

      const result = stats[0] || {
        total: 0,
        active: 0,
        inactive: 0,
        regions: [],
        zones: [],
        states: [],
        totalEmployees: 0
      };

      // Count by region
      const byRegion: { [key: string]: number } = {};
      result.regions.forEach((region: string) => {
        byRegion[region] = (byRegion[region] || 0) + 1;
      });

      // Count by zone
      const byZone: { [key: string]: number } = {};
      result.zones.forEach((zone: string) => {
        byZone[zone] = (byZone[zone] || 0) + 1;
      });

      // Count by state
      const byState: { [key: string]: number } = {};
      result.states.forEach((state: string) => {
        byState[state] = (byState[state] || 0) + 1;
      });

      return {
        total: result.total,
        active: result.active,
        inactive: result.inactive,
        byRegion,
        byZone,
        byState,
        totalEmployees: result.totalEmployees
      };
    } catch (error) {
      console.error('Error getting branch statistics:', error);
      throw error;
    }
  }

  // Get unique regions
  static async getUniqueRegions(): Promise<string[]> {
    try {
      const { db } = await connectToDatabase();
      const collection = db.collection<Branch>(this.collectionName);
      
      const result = await collection.aggregate([
        { $group: { _id: '$region' } },
        { $sort: { _id: 1 } }
      ]).toArray();
      
      return result.map(item => item._id).filter(Boolean);
    } catch (error) {
      console.error('Error getting unique regions:', error);
      throw error;
    }
  }

  // Get unique zones
  static async getUniqueZones(): Promise<string[]> {
    try {
      const { db } = await connectToDatabase();
      const collection = db.collection<Branch>(this.collectionName);
      
      const result = await collection.aggregate([
        { $group: { _id: '$zone' } },
        { $sort: { _id: 1 } }
      ]).toArray();
      
      return result.map(item => item._id).filter(Boolean);
    } catch (error) {
      console.error('Error getting unique zones:', error);
      throw error;
    }
  }
}
