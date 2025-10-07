import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';

// COMPREHENSIVE BRANCH MAPPING - Updated from Admin Dashboard (32 branches)
const BRANCH_MAPPING = {
  // NORTH REGION (26 branches)
  'ALI': { name: 'North-Alipur', code: 'ALI', region: 'North', state: 'Delhi', city: 'Alipur' },
  'FR2': { name: 'North-Badarpur', code: 'FR2', region: 'North', state: 'Delhi', city: 'Badarpur' },
  'BHR': { name: 'North-Behror', code: 'BHR', region: 'North', state: 'Rajasthan', city: 'Behror' },
  'BHI': { name: 'North-Bhiwadi', code: 'BHI', region: 'North', state: 'Rajasthan', city: 'Bhiwadi' },
  'BSH': { name: 'North-Bulandshahr', code: 'BSH', region: 'North', state: 'Uttar Pradesh', city: 'Bulandshahr' },
  'EAD': { name: 'North-East Delhi', code: 'EAD', region: 'North', state: 'Delhi', city: 'East Delhi' },
  'FRI': { name: 'North-Faridabad', code: 'FRI', region: 'North', state: 'Haryana', city: 'Faridabad' },
  'GZB': { name: 'North-Ghaziabad', code: 'GZB', region: 'North', state: 'Uttar Pradesh', city: 'Ghaziabad' },
  'GOV': { name: 'North-Goverdhan', code: 'GOV', region: 'North', state: 'Uttar Pradesh', city: 'Goverdhan' },
  'GGN': { name: 'North-Gurugram', code: 'GGN', region: 'North', state: 'Haryana', city: 'Gurugram' },
  'HPR': { name: 'North-Hapur', code: 'HPR', region: 'North', state: 'Uttar Pradesh', city: 'Hapur' },
  'JEW': { name: 'North-Jewar', code: 'JEW', region: 'North', state: 'Uttar Pradesh', city: 'Jewar' },
  'KNL': { name: 'North-Karnal', code: 'KNL', region: 'North', state: 'Haryana', city: 'Karnal' },
  'KTL': { name: 'North-Khairthal', code: 'KTL', region: 'North', state: 'Rajasthan', city: 'Khairthal' },
  'LON': { name: 'North-Loni', code: 'LON', region: 'North', state: 'Uttar Pradesh', city: 'Loni' },
  'MAT': { name: 'North-Mathura', code: 'MAT', region: 'North', state: 'Uttar Pradesh', city: 'Mathura' },
  'NGL': { name: 'North-Nangloi', code: 'NGL', region: 'North', state: 'Delhi', city: 'Nangloi' },
  'NRN': { name: 'North-Narnaul', code: 'NRN', region: 'North', state: 'Haryana', city: 'Narnaul' },
  'HDL': { name: 'North-Palwal', code: 'HDL', region: 'North', state: 'Haryana', city: 'Palwal' },
  'PNI': { name: 'North-Panipat', code: 'PNI', region: 'North', state: 'Haryana', city: 'Panipat' },
  'PAT': { name: 'North-Pataudi', code: 'PAT', region: 'North', state: 'Haryana', city: 'Pataudi' },
  'NDL': { name: 'North-Pitampura', code: 'NDL', region: 'North', state: 'Delhi', city: 'Pitampura' },
  'REW': { name: 'North-Rewari', code: 'REW', region: 'North', state: 'Haryana', city: 'Rewari' },
  'SHN': { name: 'North-Sohna', code: 'SHN', region: 'North', state: 'Haryana', city: 'Sohna' },
  'SNP': { name: 'North-Sonipat', code: 'SNP', region: 'North', state: 'Haryana', city: 'Sonipat' },
  'SJP': { name: 'North-Surajpur', code: 'SJP', region: 'North', state: 'Uttar Pradesh', city: 'Surajpur' },
  
  // SOUTH REGION (6 branches)
  'DVG': { name: 'South-Davangere', code: 'DVG', region: 'South', state: 'Karnataka', city: 'Davangere' },
  'KAN': { name: 'South-Kanakpura', code: 'KAN', region: 'South', state: 'Karnataka', city: 'Kanakpura' },
  'BLR': { name: 'South-Kengeri', code: 'BLR', region: 'South', state: 'Karnataka', city: 'Kengeri' },
  'MDY': { name: 'South-Mandya', code: 'MDY', region: 'South', state: 'Karnataka', city: 'Mandya' },
  'RMN': { name: 'South-Ramnagar', code: 'RMN', region: 'South', state: 'Karnataka', city: 'Ramnagar' },
  'YEL': { name: 'South-Yelahanka', code: 'YEL', region: 'South', state: 'Karnataka', city: 'Yelahanka' }
};

// COMPREHENSIVE Branch Name Variations -> Standard Branch Code
const BRANCH_NAME_MAPPING = {
  // North Region Mappings
  'Alipur': 'ALI', 'North-Alipur': 'ALI',
  'Badarpur': 'FR2', 'North-Badarpur': 'FR2',
  'Behror': 'BHR', 'North-Behror': 'BHR',
  'Bhiwadi': 'BHI', 'North-Bhiwadi': 'BHI',
  'Bulandshahr': 'BSH', 'North-Bulandshahr': 'BSH',
  'East Delhi': 'EAD', 'North-East Delhi': 'EAD',
  'Faridabad': 'FRI', 'North-Faridabad': 'FRI',
  'Ghaziabad': 'GZB', 'North-Ghaziabad': 'GZB',
  'Goverdhan': 'GOV', 'North-Goverdhan': 'GOV',
  'Gurugram': 'GGN', 'North-Gurugram': 'GGN',
  'Hapur': 'HPR', 'North-Hapur': 'HPR',
  'Jewar': 'JEW', 'North-Jewar': 'JEW',
  'Karnal': 'KNL', 'North-Karnal': 'KNL',
  'Khairthal': 'KTL', 'North-Khairthal': 'KTL',
  'Loni': 'LON', 'North-Loni': 'LON',
  'Mathura': 'MAT', 'North-Mathura': 'MAT',
  'Nangloi': 'NGL', 'North-Nangloi': 'NGL',
  'Narnaul': 'NRN', 'North-Narnaul': 'NRN',
  'Palwal': 'HDL', 'North-Palwal': 'HDL',
  'Panipat': 'PNI', 'North-Panipat': 'PNI',
  'Pataudi': 'PAT', 'North-Pataudi': 'PAT',
  'Pitampura': 'NDL', 'North-Pitampura': 'NDL',
  'Rewari': 'REW', 'North-Rewari': 'REW',
  'Sohna': 'SHN', 'North-Sohna': 'SHN',
  'Sonipat': 'SNP', 'North-Sonipat': 'SNP',
  'Surajpur': 'SJP', 'North-Surajpur': 'SJP',
  
  // South Region Mappings
  'Davangere': 'DVG', 'South-Davangere': 'DVG',
  'Kanakpura': 'KAN', 'South-Kanakpura': 'KAN',
  'Kengeri': 'BLR', 'South-Kengeri': 'BLR', 'Bangalore': 'BLR',
  'Mandya': 'MDY', 'South-Mandya': 'MDY',
  'Ramnagar': 'RMN', 'South-Ramnagar': 'RMN',
  'Yelahanka': 'YEL', 'South-Yelahanka': 'YEL'
};

// GET - Branch Management Dashboard
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'dashboard';
    
    const { db } = await connectDB();
    
    if (action === 'dashboard') {
      // Get comprehensive branch management data
      const queries = await db.collection('queries').find({}).toArray();
      const users = await db.collection('users').find({}).toArray();
      const applications = await db.collection('applications').find({}).toArray();
      const sanctionedApps = await db.collection('sanctioned_applications').find({}).toArray();
      
      // Analyze branch distribution in queries
      const branchStats: { [key: string]: { count: number; codes: Set<string> | string[]; queries: string[] } } = {};
      const branchIssues: Array<{ appNo: string; issue: string; branch?: string; branchCode?: string }> = [];
      
      queries.forEach(query => {
        const branch = query.branch || 'Unknown';
        const branchCode = query.branchCode || 'Unknown';
        
        if (!branchStats[branch]) {
          branchStats[branch] = { count: 0, codes: new Set(), queries: [] };
        }
        
        branchStats[branch].count++;
        (branchStats[branch].codes as Set<string>).add(branchCode);
        branchStats[branch].queries.push(query.appNo);
        
        // Check for inconsistencies
        if (query.branch === 'Unknown Branch' || !query.branchCode || query.branchCode.startsWith('North-')) {
          branchIssues.push({
            appNo: query.appNo,
            issue: 'Inconsistent branch data',
            branch: query.branch,
            branchCode: query.branchCode
          });
        }
      });
      
      // Convert Sets to Arrays for JSON serialization
      Object.keys(branchStats).forEach(branch => {
        branchStats[branch].codes = Array.from(branchStats[branch].codes as Set<string>);
      });
      
      // Analyze sanctioned cases branch distribution
      const sanctionedBranchStats: { [key: string]: { count: number; totalAmount: number; apps: string[] } } = {};
      sanctionedApps.forEach(app => {
        const branch = app.branch || 'Unknown';
        if (!sanctionedBranchStats[branch]) {
          sanctionedBranchStats[branch] = { count: 0, totalAmount: 0, apps: [] };
        }
        sanctionedBranchStats[branch].count++;
        sanctionedBranchStats[branch].totalAmount += app.sanctionedAmount || 0;
        sanctionedBranchStats[branch].apps.push(app.appId);
      });
      
      // Analyze applications branch distribution
      const applicationBranchStats: { [key: string]: { count: number; totalAmount: number; apps: string[] } } = {};
      applications.forEach(app => {
        const branch = app.branch || 'Unknown';
        if (!applicationBranchStats[branch]) {
          applicationBranchStats[branch] = { count: 0, totalAmount: 0, apps: [] };
        }
        applicationBranchStats[branch].count++;
        applicationBranchStats[branch].totalAmount += app.amount || 0;
        applicationBranchStats[branch].apps.push(app.appId);
      });
      
      // User branch assignments
      const userBranchStats: { [key: string]: { count: number; roles: { [key: string]: number } } } = {};
      users.forEach(user => {
        const branch = user.branch || 'Unassigned';
        if (!userBranchStats[branch]) {
          userBranchStats[branch] = { count: 0, roles: {} };
        }
        userBranchStats[branch].count++;
        
        const role = user.role || 'unknown';
        userBranchStats[branch].roles[role] = (userBranchStats[branch].roles[role] || 0) + 1;
      });
      
      return NextResponse.json({
        success: true,
        data: {
          branchMapping: BRANCH_MAPPING,
          branchNameMapping: BRANCH_NAME_MAPPING,
          branchStats,
          sanctionedBranchStats,
          applicationBranchStats,
          userBranchStats,
          branchIssues,
          totalQueries: queries.length,
          totalUsers: users.length,
          totalApplications: applications.length,
          totalSanctionedApps: sanctionedApps.length,
          issuesCount: branchIssues.length
        }
      });
    }
    
    if (action === 'sanctioned-analysis') {
      // Detailed analysis of sanctioned cases and their branch mapping
      const sanctionedApps = await db.collection('sanctioned_applications').find({}).toArray();
      const applications = await db.collection('applications').find({}).toArray();
      
      const analysis: {
        sanctionedAppsWithBranchIssues: Array<{ appId: string; issue: string; currentBranch?: string }>;
        applicationsWithBranchIssues: Array<{ appId: string; issue: string; currentBranch?: string }>;
        branchCodeMismatches: Array<{ appId: string; currentBranch: string; expectedBranch: string; expectedCode: string; source: string }>;
        recommendedFixes: Array<any>;
      } = {
        sanctionedAppsWithBranchIssues: [],
        applicationsWithBranchIssues: [],
        branchCodeMismatches: [],
        recommendedFixes: []
      };
      
      // Analyze sanctioned applications
      sanctionedApps.forEach(app => {
        const appPrefix = app.appId?.match(/^([A-Z0-9]+)/)?.[1];
        const expectedBranch = appPrefix && BRANCH_MAPPING[appPrefix as keyof typeof BRANCH_MAPPING] ? BRANCH_MAPPING[appPrefix as keyof typeof BRANCH_MAPPING] : null;
        
        if (expectedBranch && app.branch !== expectedBranch.name) {
          analysis.branchCodeMismatches.push({
            appId: app.appId,
            currentBranch: app.branch,
            expectedBranch: expectedBranch.name,
            expectedCode: expectedBranch.code,
            source: 'sanctioned_applications'
          });
        }
        
        if (!app.branch || app.branch === 'Unknown Branch') {
          analysis.sanctionedAppsWithBranchIssues.push({
            appId: app.appId,
            issue: 'Missing or unknown branch',
            currentBranch: app.branch
          });
        }
      });
      
      // Analyze regular applications
      applications.forEach(app => {
        const appPrefix = app.appId?.match(/^([A-Z0-9]+)/)?.[1];
        const expectedBranch = appPrefix && BRANCH_MAPPING[appPrefix as keyof typeof BRANCH_MAPPING] ? BRANCH_MAPPING[appPrefix as keyof typeof BRANCH_MAPPING] : null;
        
        if (expectedBranch && app.branch !== expectedBranch.name) {
          analysis.branchCodeMismatches.push({
            appId: app.appId,
            currentBranch: app.branch,
            expectedBranch: expectedBranch.name,
            expectedCode: expectedBranch.code,
            source: 'applications'
          });
        }
        
        if (!app.branch || app.branch === 'Unknown Branch') {
          analysis.applicationsWithBranchIssues.push({
            appId: app.appId,
            issue: 'Missing or unknown branch',
            currentBranch: app.branch
          });
        }
      });
      
      return NextResponse.json({
        success: true,
        data: analysis
      });
    }
    
    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
    
  } catch (error) {
    console.error('❌ Branch Management Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Branch management operation failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// POST - Fix Branch Issues
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;
    
    const { db } = await connectDB();
    
    if (action === 'fix-all-branches') {
      console.log('🔧 Starting comprehensive branch fix...');
      
      const collection = db.collection('queries');
      
      // Find all problematic queries
      const problematicQueries = await collection.find({
        $or: [
          { branch: 'Unknown Branch' },
          { branch: { $exists: false } },
          { branch: '' },
          { branch: null },
          { branchCode: { $regex: /^North-/ } },
          { branchCode: { $exists: false } },
          { branchCode: '' },
          { branchCode: null }
        ]
      }).toArray();
      
      console.log(`Found ${problematicQueries.length} queries with branch issues`);
      
      let updatedCount = 0;
      const updateResults = [];
      
      for (const query of problematicQueries) {
        let newBranch = 'North-Faridabad'; // Default
        let newBranchCode = 'FRI';
        
        // Extract prefix from application number
        if (query.appNo) {
          const prefix = query.appNo.match(/^([A-Z0-9]+)/)?.[1];
          if (prefix && BRANCH_MAPPING[prefix as keyof typeof BRANCH_MAPPING]) {
            newBranch = BRANCH_MAPPING[prefix as keyof typeof BRANCH_MAPPING].name;
            newBranchCode = BRANCH_MAPPING[prefix as keyof typeof BRANCH_MAPPING].code;
          }
        }
        
        // Update the query
        const result = await collection.updateOne(
          { _id: query._id },
          {
            $set: {
              branch: newBranch,
              branchCode: newBranchCode,
              applicationBranch: newBranch,
              applicationBranchCode: newBranchCode
            }
          }
        );
        
        if (result.modifiedCount > 0) {
          updatedCount++;
          updateResults.push({
            appNo: query.appNo,
            oldBranch: query.branch || 'Unknown Branch',
            oldBranchCode: query.branchCode || 'Unknown',
            newBranch: newBranch,
            newBranchCode: newBranchCode
          });
          console.log(`✅ Updated ${query.appNo}: ${newBranch} (${newBranchCode})`);
        }
      }
      
      return NextResponse.json({
        success: true,
        message: `Successfully updated ${updatedCount} queries with proper branch names`,
        updatedQueries: updateResults,
        totalFound: problematicQueries.length,
        totalUpdated: updatedCount
      });
    }
    
    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
    
  } catch (error) {
    console.error('❌ Branch Management Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Branch management operation failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
