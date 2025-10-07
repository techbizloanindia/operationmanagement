import { NextRequest, NextResponse } from 'next/server';
import { BranchModel, CreateBranchData } from '@/lib/models/Branch';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { branches } = body;
    
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
      errors: [] as string[]
    };

    for (const branchInfo of branches) {
      try {
        const { name, state, city } = branchInfo;
        
        if (!name || !state) {
          results.failed++;
          results.errors.push(`${name || 'Unknown'}: Missing required fields`);
          continue;
        }

        // Generate branch code from name (first 3 letters + number)
        const code = name.substring(0, 3).toUpperCase() + (Math.floor(Math.random() * 100) + 1).toString().padStart(2, '0');
        
        const branchData: CreateBranchData = {
          branchCode: code,
          branchName: name,
          branchAddress: `${city || name}, ${state}`,
          city: city || name,
          state,
          pincode: '000000',
          phone: '+91-0000000000',
          email: `${code.toLowerCase()}@company.com`,
          branchManager: 'TBD',
          managerEmail: 'manager@company.com',
          managerPhone: '+91-0000000000',
          region: state,
          zone: state
        };

        await BranchModel.createBranch(branchData);
        results.success++;
        
      } catch (error: any) {
        results.failed++;
        const errorMsg = error.message || 'Unknown error';
        if (errorMsg.includes('already exists')) {
          results.errors.push(`${branchInfo.name}: Branch already exists`);
        } else {
          results.errors.push(`${branchInfo.name}: ${errorMsg}`);
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: results,
      message: `Bulk creation completed: ${results.success} successful, ${results.failed} failed`
    });

  } catch (error: any) {
    console.error('Error in bulk branch creation:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to create branches' 
      },
      { status: 500 }
    );
  }
} 