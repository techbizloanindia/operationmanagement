import { NextRequest, NextResponse } from 'next/server';
import { BranchModel, CreateBranchData } from '@/lib/models/Branch';

// Production branch data - cleaned and formatted
const PRODUCTION_BRANCHES = [
  { branchName: 'Badarpur', branchCode: 'FR2' },
  { branchName: 'Mathura', branchCode: 'MAT' },
  { branchName: 'Ghaziabad', branchCode: 'GZB' },
  { branchName: 'Mandya', branchCode: 'MDY' },
  { branchName: 'East Delhi', branchCode: 'EAD' },
  { branchName: 'Faridabad', branchCode: 'FRI' },
  { branchName: 'Narnaul', branchCode: 'NRN' },
  { branchName: 'Palwal', branchCode: 'HDL' },
  { branchName: 'Ramnagar', branchCode: 'RMN' },
  { branchName: 'Gurugram', branchCode: 'GGN' },
  { branchName: 'Bhiwadi', branchCode: 'BHI' },
  { branchName: 'Alipur', branchCode: 'ALI' },
  { branchName: 'Panipat', branchCode: 'PNI' },
  { branchName: 'Surajpur', branchCode: 'SJP' },
  { branchName: 'Goverdhan', branchCode: 'GOV' },
  { branchName: 'Palwal', branchCode: 'HDL' },
  { branchName: 'Loni', branchCode: 'LON' },
  { branchName: 'Pataudi', branchCode: 'PAT' },
  { branchName: 'Rewari', branchCode: 'REW' },
  { branchName: 'Jewar', branchCode: 'JEW' },
  { branchName: 'Hapur', branchCode: 'HPR' },
  { branchName: 'Sohna', branchCode: 'SHN' },
  { branchName: 'Kengeri', branchCode: 'BLR' },
  { branchName: 'Kengeri', branchCode: 'BLR' },
  { branchName: 'Behror', branchCode: 'BHR' },
  { branchName: 'Karnal', branchCode: 'KNL' },
  { branchName: 'Nangloi', branchCode: 'NGL' },
  { branchName: 'Davangere', branchCode: 'DVG' },
  { branchName: 'Yelahanka', branchCode: 'YEL' },
  { branchName: 'Kanakpura', branchCode: 'KAN' },
  { branchName: 'Pitampura', branchCode: 'NDL' },
  { branchName: 'Ghaziabad', branchCode: 'MDN' },
  { branchName: 'Khairthal', branchCode: 'KTL' },
  { branchName: 'Sonipat', branchCode: 'SNP' },
  { branchName: 'Bulandshahr', branchCode: 'BSH' },
  { branchName: 'Kalyan', branchCode: 'KLY' }
];

// Production state mapping for accurate data
const STATE_MAPPING: { [key: string]: string } = {
  'Badarpur': 'Delhi',
  'Mathura': 'Uttar Pradesh',
  'Ghaziabad': 'Uttar Pradesh',
  'Mandya': 'Karnataka',
  'East Delhi': 'Delhi',
  'Faridabad': 'Haryana',
  'Narnaul': 'Haryana',
  'Palwal': 'Haryana',
  'Ramnagar': 'Uttarakhand',
  'Gurugram': 'Haryana',
  'Bhiwadi': 'Rajasthan',
  'Alipur': 'Delhi',
  'Panipat': 'Haryana',
  'Surajpur': 'Uttar Pradesh',
  'Goverdhan': 'Uttar Pradesh',
  'Loni': 'Uttar Pradesh',
  'Pataudi': 'Haryana',
  'Rewari': 'Haryana',
  'Jewar': 'Uttar Pradesh',
  'Hapur': 'Uttar Pradesh',
  'Sohna': 'Haryana',
  'Kengeri': 'Karnataka',
  'Behror': 'Rajasthan',
  'Karnal': 'Haryana',
  'Nangloi': 'Delhi',
  'Davangere': 'Karnataka',
  'Yelahanka': 'Karnataka',
  'Kanakpura': 'Karnataka',
  'Pitampura': 'Delhi',
  'Khairthal': 'Rajasthan',
  'Sonipat': 'Haryana',
  'Bulandshahr': 'Uttar Pradesh',
  'Kalyan': 'Maharashtra'
};

interface SeedResults {
  success: number;
  failed: number;
  skipped: number;
  updated: number;
  errors: string[];
  branches: string[];
}

// POST - Seed production branches
export async function POST(request: NextRequest) {
  try {
    const { action, confirmProduction } = await request.json();
    
    // Production safety check
    if (!confirmProduction) {
      return NextResponse.json({
        success: false,
        error: 'Production confirmation required',
        message: 'This endpoint requires confirmProduction: true for safety'
      }, { status: 400 });
    }

    console.log('🏭 PRODUCTION: Starting branch seeding...');
    console.log(`📊 Total branches to process: ${PRODUCTION_BRANCHES.length}`);

    const results: SeedResults = {
      success: 0,
      failed: 0,
      skipped: 0,
      updated: 0,
      errors: [],
      branches: []
    };

    // Validate all branch data before processing
    console.log('🔍 Validating branch data...');
    const validationErrors: string[] = [];
    
    PRODUCTION_BRANCHES.forEach((branch, index) => {
      if (!branch.branchName || !branch.branchCode) {
        validationErrors.push(`Branch ${index + 1}: Missing name or code`);
      }
      if (branch.branchCode.length < 2 || branch.branchCode.length > 5) {
        validationErrors.push(`${branch.branchName}: Invalid code length`);
      }
      if (!STATE_MAPPING[branch.branchName]) {
        validationErrors.push(`${branch.branchName}: No state mapping found`);
      }
    });

    if (validationErrors.length > 0) {
      return NextResponse.json({
        success: false,
        error: 'Validation failed',
        validationErrors,
        message: 'Please fix validation errors before proceeding'
      }, { status: 400 });
    }

    // Clear existing branches if action is 'replace'
    if (action === 'replace') {
      try {
        console.log('🗑️ PRODUCTION: Clearing existing branches...');
        await BranchModel.clearAllBranches();
        console.log('✅ Existing branches cleared successfully');
      } catch (error: any) {
        console.error('❌ Error clearing branches:', error);
        results.errors.push(`Failed to clear existing branches: ${error.message}`);
      }
    }

    // Process each branch with detailed logging
    for (let i = 0; i < PRODUCTION_BRANCHES.length; i++) {
      const branch = PRODUCTION_BRANCHES[i];
      
      try {
        const { branchName, branchCode } = branch;
        
        console.log(`🔄 [${i + 1}/${PRODUCTION_BRANCHES.length}] Processing: ${branchName} (${branchCode})`);
        
        // Check if branch already exists (unless replacing)
        const existingBranch = await BranchModel.getBranchByCode(branchCode);
        
        if (existingBranch && action !== 'replace') {
          console.log(`⚠️ Branch ${branchCode} already exists, skipping...`);
          results.skipped++;
          results.branches.push(`${branchName} (${branchCode}) - SKIPPED`);
          continue;
        }

        const state = STATE_MAPPING[branchName];
        const city = branchName;

        // Create comprehensive branch data
        const branchData: CreateBranchData = {
          branchCode: branchCode.toUpperCase().trim(),
          branchName: branchName.trim(),
          branchAddress: `${city}, ${state}, India`,
          city: city,
          state: state,
          pincode: '000000',
          phone: '+91-1800-XXX-XXXX',
          email: `${branchCode.toLowerCase().trim()}@bizloan.com`,
          branchManager: 'To Be Assigned',
          managerEmail: 'manager@bizloan.com',
          managerPhone: '+91-9999999999',
          region: state,
          zone: state,
          departments: ['Operations', 'Sales', 'Credit', 'Customer Service'],
          operatingHours: {
            weekdays: '9:00 AM - 6:00 PM',
            saturday: '9:00 AM - 2:00 PM',
            sunday: 'Closed'
          },
          facilities: ['ATM', 'Parking', 'Customer Service', 'Loan Processing']
        };

        if (existingBranch && action === 'replace') {
          // Update existing branch
          await BranchModel.updateBranch(existingBranch._id!.toString(), branchData);
          console.log(`✅ [${i + 1}/${PRODUCTION_BRANCHES.length}] Updated: ${branchName} (${branchCode})`);
          results.updated++;
          results.branches.push(`${branchName} (${branchCode}) - UPDATED`);
        } else {
          // Create new branch
          const newBranch = await BranchModel.createBranch(branchData);
          console.log(`✅ [${i + 1}/${PRODUCTION_BRANCHES.length}] Created: ${branchName} (${branchCode})`);
          results.success++;
          results.branches.push(`${branchName} (${branchCode}) - CREATED`);
        }
        
      } catch (error: any) {
        console.error(`❌ [${i + 1}/${PRODUCTION_BRANCHES.length}] Error processing ${branch.branchName}:`, error.message);
        results.failed++;
        results.errors.push(`${branch.branchName} (${branch.branchCode}): ${error.message}`);
        results.branches.push(`${branch.branchName} (${branch.branchCode}) - FAILED`);
      }
    }

    // Final verification
    console.log('🔍 PRODUCTION: Verifying final state...');
    const finalBranches = await BranchModel.getAllBranches();
    const totalProcessed = results.success + results.updated + results.failed + results.skipped;
    
    console.log('🎉 PRODUCTION: Branch seeding completed!');
    console.log(`📈 Final Results: ${results.success} created, ${results.updated} updated, ${results.skipped} skipped, ${results.failed} failed`);
    console.log(`📊 Total branches in database: ${finalBranches.length}`);

    return NextResponse.json({
      success: true,
      message: `✅ Production branch seeding completed successfully!`,
      summary: {
        totalRequested: PRODUCTION_BRANCHES.length,
        totalProcessed: totalProcessed,
        created: results.success,
        updated: results.updated,
        skipped: results.skipped,
        failed: results.failed,
        errors: results.errors.length,
        finalDatabaseCount: finalBranches.length
      },
      results: {
        created: results.success,
        updated: results.updated,
        skipped: results.skipped,
        failed: results.failed,
        errors: results.errors,
        processingLog: results.branches
      },
      verification: {
        expectedBranches: PRODUCTION_BRANCHES.length,
        actualBranches: finalBranches.length,
        isComplete: finalBranches.length >= PRODUCTION_BRANCHES.length
      },
      timestamp: new Date().toISOString(),
      environment: 'production'
    });

  } catch (error: any) {
    console.error('💥 PRODUCTION FATAL ERROR:', error);
    return NextResponse.json({
      success: false,
      error: `Production seeding failed: ${error.message}`,
      details: 'Critical error occurred during branch seeding',
      timestamp: new Date().toISOString(),
      environment: 'production'
    }, { status: 500 });
  }
}

// GET - Check production branch status
export async function GET() {
  try {
    // Skip during build time
    if (process.env.BUILDING === 'true') {
      return NextResponse.json({
        success: true,
        status: 'build-time-skip',
        summary: {
          totalBranches: 0,
          activeBranches: 0,
          expectedBranches: PRODUCTION_BRANCHES.length,
          missingBranches: PRODUCTION_BRANCHES.length,
          isComplete: false
        },
        branches: [],
        missingBranches: PRODUCTION_BRANCHES.map(b => `${b.branchName} (${b.branchCode})`),
        productionBranches: PRODUCTION_BRANCHES.map(b => `${b.branchName} (${b.branchCode})`),
        timestamp: new Date().toISOString(),
        environment: 'build-time'
      });
    }

    console.log('📋 PRODUCTION: Checking branch status...');
    
    const allBranches = await BranchModel.getAllBranches();
    const activeBranches = allBranches.filter(b => b.isActive);
    
    // Check which production branches exist
    const existingCodes = allBranches.map(b => b.branchCode);
    const productionCodes = PRODUCTION_BRANCHES.map(b => b.branchCode);
    const missingBranches = PRODUCTION_BRANCHES.filter(b => !existingCodes.includes(b.branchCode));
    
    return NextResponse.json({
      success: true,
      status: 'production-ready',
      summary: {
        totalBranches: allBranches.length,
        activeBranches: activeBranches.length,
        expectedBranches: PRODUCTION_BRANCHES.length,
        missingBranches: missingBranches.length,
        isComplete: missingBranches.length === 0
      },
      branches: allBranches.map(b => ({
        name: b.branchName,
        code: b.branchCode,
        city: b.city,
        state: b.state,
        isActive: b.isActive,
        createdAt: b.createdAt
      })),
      missingBranches: missingBranches.map(b => `${b.branchName} (${b.branchCode})`),
      productionBranches: PRODUCTION_BRANCHES.map(b => `${b.branchName} (${b.branchCode})`),
      timestamp: new Date().toISOString(),
      environment: 'production'
    });
    
  } catch (error: any) {
    console.error('❌ PRODUCTION: Error checking branch status:', error);
    
    // Return build-time response during build
    if (process.env.BUILDING === 'true') {
      return NextResponse.json({
        success: true,
        status: 'build-time-skip',
        summary: {
          totalBranches: 0,
          activeBranches: 0,
          expectedBranches: PRODUCTION_BRANCHES.length,
          missingBranches: PRODUCTION_BRANCHES.length,
          isComplete: false
        },
        branches: [],
        timestamp: new Date().toISOString(),
        environment: 'build-time'
      });
    }
    
    return NextResponse.json({
      success: false,
      error: `Failed to check branch status: ${error.message}`,
      timestamp: new Date().toISOString(),
      environment: 'production'
    }, { status: 500 });
  }
} 