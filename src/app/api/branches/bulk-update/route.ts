import { NextRequest, NextResponse } from 'next/server';
import { BranchModel, CreateBranchData } from '@/lib/models/Branch';

interface BranchUpdateData {
  branchName: string;
  branchCode: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { branches, action } = body;
    
    if (!branches || !Array.isArray(branches)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing branches array' 
        },
        { status: 400 }
      );
    }

    const results = {
      success: 0,
      failed: 0,
      updated: 0,
      errors: [] as string[]
    };

    // Clear existing branches if action is replace
    if (action === 'replace') {
      try {
        console.log('🗑️ Clearing existing branches...');
        await BranchModel.clearAllBranches();
        console.log('✅ Existing branches cleared');
      } catch (error: any) {
        console.error('Error clearing branches:', error);
        results.errors.push('Failed to clear existing branches: ' + error.message);
      }
    }

    // Process each branch
    for (const branchInfo of branches) {
      try {
        const { branchName, branchCode } = branchInfo as BranchUpdateData;
        
        if (!branchName || !branchCode) {
          results.failed++;
          results.errors.push(`${branchName || branchCode || 'Unknown'}: Missing branch name or code`);
          continue;
        }

        // Map state based on branch location
        const stateMapping: { [key: string]: string } = {
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

        const state = stateMapping[branchName] || 'Delhi';
        const city = branchName;

        const branchData: CreateBranchData = {
          branchCode: branchCode.toUpperCase(),
          branchName: branchName,
          branchAddress: `${city}, ${state}`,
          city: city,
          state: state,
          pincode: '000000',
          phone: '+91-0000000000',
          email: `${branchCode.toLowerCase()}@bizloan.com`,
          branchManager: 'TBD',
          managerEmail: 'manager@bizloan.com',
          managerPhone: '+91-0000000000',
          region: state,
          zone: state,
          departments: ['Operations', 'Sales', 'Credit'],
          operatingHours: {
            weekdays: '9:00 AM - 6:00 PM',
            saturday: '9:00 AM - 2:00 PM',
            sunday: 'Closed'
          },
          facilities: ['ATM', 'Parking', 'Customer Service']
        };

        // Check if branch exists and update or create
        const existingBranch = await BranchModel.getBranchByCode(branchCode);
        
        if (existingBranch && action !== 'replace') {
          // Update existing branch
          await BranchModel.updateBranch(existingBranch._id!.toString(), branchData);
          results.updated++;
        } else {
          // Create new branch
          await BranchModel.createBranch(branchData);
          results.success++;
        }
        
      } catch (error: any) {
        results.failed++;
        const errorMsg = error.message || 'Unknown error';
        if (errorMsg.includes('already exists')) {
          results.errors.push(`${branchInfo.branchName}: Branch already exists`);
        } else {
          results.errors.push(`${branchInfo.branchName}: ${errorMsg}`);
        }
      }
    }

    const totalProcessed = results.success + results.updated + results.failed;
    
    return NextResponse.json({
      success: true,
      data: results,
      message: `Bulk branch update completed. ${results.success} created, ${results.updated} updated, ${results.failed} failed out of ${totalProcessed} branches.`,
      summary: {
        total: branches.length,
        processed: totalProcessed,
        created: results.success,
        updated: results.updated,
        failed: results.failed,
        errors: results.errors.length
      }
    });

  } catch (error: any) {
    console.error('Error in bulk branch update:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: `Failed to update branches: ${error.message}`,
        details: 'Please check the branch data format and try again.'
      },
      { status: 500 }
    );
  }
} 