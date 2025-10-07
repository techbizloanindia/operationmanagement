import { ApplicationModel } from '@/lib/models/Application';
import { BranchModel } from '@/lib/models/Branch';
import { SanctionedApplicationModel } from '@/lib/models/SanctionedApplication';
import { connectToDatabase } from '@/lib/mongodb';

export interface BranchInfo {
  branchName: string;
  branchCode: string;
  isValid: boolean;
  source: 'application' | 'sanctioned' | 'branch_lookup' | 'fallback';
}

export interface ApplicationBranchData {
  appNo: string;
  customerName: string;
  branch: BranchInfo;
  applicationBranch?: string;
  applicationBranchCode?: string;
}

/**
 * Service to handle branch-application relationships and resolve branch information
 * from application numbers for proper query filtering
 */
export class BranchApplicationService {
  
  /**
   * Resolve branch information from application number
   * Checks multiple sources: Applications, Sanctioned Applications, and Branch lookup
   */
  static async resolveBranchFromAppNo(appNo: string): Promise<BranchInfo> {
    try {
      console.log(`🔍 Resolving branch information for application: ${appNo}`);
      
      // 1. First try to get from Applications collection
      try {
        const application = await ApplicationModel.getApplicationByAppId(appNo);
        if (application && application.branch) {
          console.log(`✅ Found branch from Applications: ${application.branch}`);
          
          // Try to get branch code from branch name
          const branchCode = await this.getBranchCodeFromName(application.branch);
          
          return {
            branchName: application.branch,
            branchCode: branchCode || application.branch,
            isValid: true,
            source: 'application'
          };
        }
      } catch (error) {
        console.log(`⚠️ Could not fetch from Applications: ${error}`);
      }
      
      // 2. Try to get from Sanctioned Applications collection
      try {
        const sanctionedApp = await SanctionedApplicationModel.getSanctionedApplicationByAppId(appNo);
        if (sanctionedApp && sanctionedApp.branch) {
          console.log(`✅ Found branch from Sanctioned Applications: ${sanctionedApp.branch}`);
          
          // Try to get branch code from branch name
          const branchCode = await this.getBranchCodeFromName(sanctionedApp.branch);
          
          return {
            branchName: sanctionedApp.branch,
            branchCode: branchCode || sanctionedApp.branch,
            isValid: true,
            source: 'sanctioned'
          };
        }
      } catch (error) {
        console.log(`⚠️ Could not fetch from Sanctioned Applications: ${error}`);
      }
      
      // 3. Try to infer branch from application number pattern
      const inferredBranch = this.inferBranchFromAppNo(appNo);
      if (inferredBranch.isValid) {
        console.log(`✅ Inferred branch from app pattern: ${inferredBranch.branchName}`);
        return inferredBranch;
      }
      
      // 4. Fallback to default branch
      console.log(`⚠️ Could not resolve branch for ${appNo}, using fallback`);
      return {
        branchName: 'Unknown Branch',
        branchCode: 'UNKNOWN',
        isValid: false,
        source: 'fallback'
      };
      
    } catch (error) {
      console.error(`❌ Error resolving branch for ${appNo}:`, error);
      return {
        branchName: 'Unknown Branch',
        branchCode: 'UNKNOWN',
        isValid: false,
        source: 'fallback'
      };
    }
  }
  
  /**
   * Get branch code from branch name by looking up in branches collection
   */
  static async getBranchCodeFromName(branchName: string): Promise<string | null> {
    try {
      const { db } = await connectToDatabase();
      const branchesCollection = db.collection('branches');
      
      // Try exact match first
      let branch = await branchesCollection.findOne({ branchName: branchName });
      
      // Try case-insensitive match
      if (!branch) {
        branch = await branchesCollection.findOne({ 
          branchName: { $regex: new RegExp(`^${branchName}$`, 'i') } 
        });
      }
      
      // Try partial match
      if (!branch) {
        branch = await branchesCollection.findOne({ 
          branchName: { $regex: new RegExp(branchName, 'i') } 
        });
      }
      
      if (branch && branch.branchCode) {
        console.log(`✅ Found branch code: ${branch.branchCode} for branch: ${branchName}`);
        return branch.branchCode;
      }
      
      return null;
    } catch (error) {
      console.error(`❌ Error getting branch code for ${branchName}:`, error);
      return null;
    }
  }
  
  /**
   * Infer branch information from application number patterns
   * Common patterns: SNP -> Mumbai, BHR -> Delhi, BL -> Bangalore, etc.
   */
  static inferBranchFromAppNo(appNo: string): BranchInfo {
    const appPrefix = appNo.replace(/\s+/g, '').match(/^([A-Z]+)/)?.[1];
    
    // Common application number patterns and their associated branches
    const branchPatterns: { [key: string]: { name: string; code: string } } = {
      'SNP': { name: 'Mumbai Central Branch', code: 'MUM001' },
      'BHR': { name: 'Delhi Main Branch', code: 'DEL001' },
      'BL': { name: 'Bangalore IT Branch', code: 'BLR001' },
      'MUM': { name: 'Mumbai West Branch', code: 'MUM002' },
      'DEL': { name: 'Delhi South Branch', code: 'DEL002' },
      'CHN': { name: 'Chennai Port Branch', code: 'CHN001' },
      'KOL': { name: 'Kolkata Central Branch', code: 'KOL001' },
      'PUN': { name: 'Pune West Branch', code: 'PUN001' },
      'HYD': { name: 'Hyderabad Tech Branch', code: 'HYD001' },
      'AHM': { name: 'Ahmedabad Commercial Branch', code: 'AHM001' },
      'JPR': { name: 'Jaipur Main Branch', code: 'JPR001' },
      'LKO': { name: 'Lucknow Central Branch', code: 'LKO001' },
      'IND': { name: 'Indore Branch', code: 'IND001' },
      'BHP': { name: 'Bhopal Branch', code: 'BHP001' },
      'NAG': { name: 'Nagpur Branch', code: 'NAG001' }
    };
    
    if (appPrefix && branchPatterns[appPrefix]) {
      const pattern = branchPatterns[appPrefix];
      console.log(`✅ Inferred branch from pattern ${appPrefix}: ${pattern.name}`);
      return {
        branchName: pattern.name,
        branchCode: pattern.code,
        isValid: true,
        source: 'branch_lookup'
      };
    }
    
    return {
      branchName: 'Unknown Branch',
      branchCode: 'UNKNOWN',
      isValid: false,
      source: 'fallback'
    };
  }
  
  /**
   * Get complete application-branch data for query creation
   */
  static async getApplicationBranchData(appNo: string): Promise<ApplicationBranchData> {
    try {
      console.log(`🔍 Getting complete application-branch data for: ${appNo}`);
      
      let customerName = '';
      let branchInfo: BranchInfo;
      
      // Try to get customer name and branch from applications first
      try {
        const application = await ApplicationModel.getApplicationByAppId(appNo);
        if (application) {
          customerName = application.customerName;
          branchInfo = await this.resolveBranchFromAppNo(appNo);
        } else {
          // Try sanctioned applications
          const sanctionedApp = await SanctionedApplicationModel.getSanctionedApplicationByAppId(appNo);
          if (sanctionedApp) {
            customerName = sanctionedApp.customerName;
            branchInfo = await this.resolveBranchFromAppNo(appNo);
          } else {
            // Fallback with inferred data
            customerName = `Customer ${appNo}`;
            branchInfo = this.inferBranchFromAppNo(appNo);
          }
        }
      } catch (error) {
        console.log(`⚠️ Error fetching application data: ${error}`);
        customerName = `Customer ${appNo}`;
        branchInfo = this.inferBranchFromAppNo(appNo);
      }
      
      return {
        appNo,
        customerName,
        branch: branchInfo,
        applicationBranch: branchInfo.branchName,
        applicationBranchCode: branchInfo.branchCode
      };
      
    } catch (error) {
      console.error(`❌ Error getting application-branch data for ${appNo}:`, error);
      
      // Return fallback data
      const fallbackBranch = this.inferBranchFromAppNo(appNo);
      return {
        appNo,
        customerName: `Customer ${appNo}`,
        branch: fallbackBranch,
        applicationBranch: fallbackBranch.branchName,
        applicationBranchCode: fallbackBranch.branchCode
      };
    }
  }
  
  /**
   * Check if a user has access to queries from a specific branch
   */
  static checkUserBranchAccess(userBranches: string[], queryBranch: string, queryBranchCode?: string, applicationBranch?: string, applicationBranchCode?: string): boolean {
    // If no user branches specified, assume admin access
    if (!userBranches || userBranches.length === 0) {
      return true;
    }
    
    // Check all possible branch fields
    const branchesToCheck = [
      queryBranch,
      queryBranchCode,
      applicationBranch,
      applicationBranchCode
    ].filter(Boolean);
    
    // Check if any of the user's assigned branches match any of the query's branch fields
    return userBranches.some(userBranch => 
      branchesToCheck.some(queryBranchField => 
        userBranch === queryBranchField ||
        userBranch.toLowerCase() === queryBranchField?.toLowerCase()
      )
    );
  }
  
  /**
   * Create enhanced branch filter for MongoDB queries
   */
  static createEnhancedBranchFilter(userBranches: string[]) {
    if (!userBranches || userBranches.length === 0) {
      return {}; // No filter for admin users
    }
    
    return {
      $or: [
        // Direct branch matches
        { branch: { $in: userBranches } },
        { branchCode: { $in: userBranches } },
        { assignedToBranch: { $in: userBranches } },
        
        // Application branch matches
        { applicationBranch: { $in: userBranches } },
        { applicationBranchCode: { $in: userBranches } },
        
        // Case-insensitive matches
        { branch: { $regex: new RegExp(`^(${userBranches.map(b => b.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})$`, 'i') } },
        { branchCode: { $regex: new RegExp(`^(${userBranches.map(b => b.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})$`, 'i') } },
        { applicationBranch: { $regex: new RegExp(`^(${userBranches.map(b => b.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})$`, 'i') } },
        { applicationBranchCode: { $regex: new RegExp(`^(${userBranches.map(b => b.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})$`, 'i') } }
      ]
    };
  }
  
  /**
   * Get all active branches for branch selection
   */
  static async getAllActiveBranches(): Promise<Array<{ branchName: string; branchCode: string }>> {
    try {
      const { db } = await connectToDatabase();
      const branchesCollection = db.collection('branches');
      
      const branches = await branchesCollection.find({ isActive: true })
        .sort({ state: 1, city: 1, branchName: 1 })
        .toArray();
      
      return branches.map(branch => ({
        branchName: branch.branchName,
        branchCode: branch.branchCode
      }));
    } catch (error) {
      console.error('❌ Error fetching active branches:', error);
      return [];
    }
  }
}
