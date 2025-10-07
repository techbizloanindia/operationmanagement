import { ObjectId } from 'mongodb';
import { connectToDatabase } from '../mongodb';
import bcrypt from 'bcryptjs';

const isBuildProcess = process.env.BUILDING === 'true';

export interface User {
  _id?: ObjectId;
  username?: string; // Made optional - will be generated from employeeId if not provided
  email: string;
  password: string;
  role: 'admin' | 'operations' | 'sales' | 'credit';
  fullName: string;
  employeeId: string;
  branch: string;
  department: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLogin?: Date;
  permissions: string[];
  assignedBranches?: string[]; // For multi-branch assignment
  branchCode?: string;
}

export interface CreateUserData {
  username?: string; // Made optional
  email: string;
  password: string;
  role: 'admin' | 'operations' | 'sales' | 'credit';
  fullName: string;
  employeeId: string;
  branch: string;
  department: string;
  permissions?: string[];
  assignedBranches?: string[];
  branchCode?: string;
}

export class UserModel {
  private static collectionName = process.env.MONGODB_USERS_COLLECTION || 'users';

  // Create a new user
  static async createUser(userData: CreateUserData): Promise<User> {
    if (isBuildProcess) {
      console.log('Build process: Mocking createUser');
      return { ...userData, _id: new ObjectId(), isActive: true, createdAt: new Date(), updatedAt: new Date() } as User;
    }
    try {
      const { db } = await connectToDatabase();
      const collection = db.collection<User>(this.collectionName);

      // Check if user already exists - only check email and employeeId since username is optional
      const existingUser = await collection.findOne({
        $or: [
          { email: userData.email },
          { employeeId: userData.employeeId }
        ]
      });

      if (existingUser) {
        throw new Error('User with this email or employee ID already exists');
      }

      // Generate username from employeeId if not provided
      const username = userData.username || userData.employeeId;

      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 12);

      // Create user object
      const newUser: User = {
        username: username,
        email: userData.email,
        password: hashedPassword,
        role: userData.role,
        fullName: userData.fullName,
        employeeId: userData.employeeId,
        branch: userData.branch || 'General',
        department: userData.department || 'General',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        permissions: userData.permissions || []
      };

      // Insert user
      const result = await collection.insertOne(newUser);
      
      // Return user without password
      const { password, ...userWithoutPassword } = newUser;
      return { ...userWithoutPassword, _id: result.insertedId } as User;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  // Get user by ID
  static async getUserById(userId: string): Promise<User | null> {
    if (isBuildProcess) {
      console.log('Build process: Mocking getUserById');
      return null;
    }
    try {
      const { db } = await connectToDatabase();
      const collection = db.collection<User>(this.collectionName);
      
      const user = await collection.findOne({ _id: new ObjectId(userId) });
      if (user) {
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword as User;
      }
      return null;
    } catch (error) {
      console.error('Error getting user by ID:', error);
      throw error;
    }
  }

  // Get user by email
  static async getUserByEmail(email: string): Promise<User | null> {
    if (isBuildProcess) {
      console.log('Build process: Mocking getUserByEmail');
      return null;
    }
    try {
      const { db } = await connectToDatabase();
      const collection = db.collection<User>(this.collectionName);
      
      const user = await collection.findOne({ email });
      return user;
    } catch (error) {
      console.error('Error getting user by email:', error);
      throw error;
    }
  }

  // Get all users
  static async getAllUsers(): Promise<User[]> {
    if (isBuildProcess) {
      console.log('Build process: Mocking getAllUsers');
      return [];
    }
    try {
      const { db } = await connectToDatabase();
      const collection = db.collection<User>(this.collectionName);
      
      const users = await collection.find({}).toArray();
      return users.map(user => {
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword as User;
      });
    } catch (error) {
      console.error('Error getting all users:', error);
      throw error;
    }
  }

  // Update user
  static async updateUser(userId: string, updateData: Partial<User>): Promise<User | null> {
    if (isBuildProcess) {
      console.log('Build process: Mocking updateUser');
      return null;
    }
    try {
      const { db } = await connectToDatabase();
      const collection = db.collection<User>(this.collectionName);
      
      // If password is being updated, hash it
      if (updateData.password) {
        updateData.password = await bcrypt.hash(updateData.password, 12);
      }
      
      updateData.updatedAt = new Date();
      
      const result = await collection.findOneAndUpdate(
        { _id: new ObjectId(userId) },
        { $set: updateData },
        { returnDocument: 'after' }
      );
      
      if (result) {
        const { password, ...userWithoutPassword } = result;
        return userWithoutPassword as User;
      }
      return null;
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  // Delete user
  static async deleteUser(userId: string): Promise<boolean> {
    if (isBuildProcess) {
      console.log('Build process: Mocking deleteUser');
      return true;
    }
    try {
      const { db } = await connectToDatabase();
      const collection = db.collection<User>(this.collectionName);
      
      const result = await collection.deleteOne({ _id: new ObjectId(userId) });
      return result.deletedCount === 1;
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }

  // Verify user credentials
  static async verifyCredentials(email: string, password: string): Promise<User | null> {
    if (isBuildProcess) {
      console.log('Build process: Mocking verifyCredentials');
      return null;
    }
    try {
      const user = await this.getUserByEmail(email);
      if (!user || !user.isActive) {
        return null;
      }

      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return null;
      }

      // Update last login
      await this.updateUser(user._id!.toString(), { lastLogin: new Date() });

      const { password: _, ...userWithoutPassword } = user;
      return userWithoutPassword as User;
    } catch (error) {
      console.error('Error verifying credentials:', error);
      throw error;
    }
  }

  // Get users by role
  static async getUsersByRole(role: string): Promise<User[]> {
    if (isBuildProcess) {
      console.log('Build process: Mocking getUsersByRole');
      return [];
    }
    try {
      const { db } = await connectToDatabase();
      const collection = db.collection<User>(this.collectionName);
      
      const users = await collection.find({ role: role as any }).toArray();
      return users.map(user => {
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword as User;
      });
    } catch (error) {
      console.error('Error getting users by role:', error);
      throw error;
    }
  }

  // Get users by branch
  static async getUsersByBranch(branch: string): Promise<User[]> {
    if (isBuildProcess) {
      console.log('Build process: Mocking getUsersByBranch');
      return [];
    }
    try {
      const { db } = await connectToDatabase();
      const collection = db.collection<User>(this.collectionName);
      
      const users = await collection.find({ branch }).toArray();
      return users.map(user => {
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword as User;
      });
    } catch (error) {
      console.error('Error getting users by branch:', error);
      throw error;
    }
  }

  // Get user by employee ID
  static async getUserByEmployeeId(employeeId: string): Promise<User | null> {
    if (isBuildProcess) {
      console.log('Build process: Mocking getUserByEmployeeId');
      return null;
    }
    try {
      const { db } = await connectToDatabase();
      const collection = db.collection<User>(this.collectionName);
      
      const user = await collection.findOne({ employeeId });
      if (user) {
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword as User;
      }
      return null;
    } catch (error) {
      console.error('Error getting user by employee ID:', error);
      throw error;
    }
  }
}
