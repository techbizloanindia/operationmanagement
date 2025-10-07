import { NextRequest, NextResponse } from 'next/server';
import { BranchModel, CreateBranchData } from '@/lib/models/Branch';

// GET - Get all branches
export async function GET(request: NextRequest) {
  try {
    // Skip during build time
    if (process.env.BUILDING === 'true') {
      return NextResponse.json({
        success: true,
        data: []
      });
    }

    console.log('🏢 Fetching branches from database...');
    const { searchParams } = new URL(request.url);
    const isActive = searchParams.get('isActive');
    const region = searchParams.get('region');
    const zone = searchParams.get('zone');
    const state = searchParams.get('state');
    const city = searchParams.get('city');

    const filters: any = {};
    if (isActive !== null) filters.isActive = isActive === 'true';
    if (region) filters.region = region;
    if (zone) filters.zone = zone;
    if (state) filters.state = state;
    if (city) filters.city = city;

    console.log('📋 Branch filters applied:', filters);
    const branches = await BranchModel.getAllBranches(filters);
    console.log(`✅ Found ${branches.length} branches in database`);
    
    return NextResponse.json({
      success: true,
      data: branches,
      count: branches.length,
      filters: filters
    });
  } catch (error) {
    console.error('💥 Error fetching branches:', error);
    
    // Return empty data during build time
    if (process.env.BUILDING === 'true') {
      return NextResponse.json({
        success: true,
        data: []
      });
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch branches',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    );
  }
}

// POST - Create new branch
export async function POST(request: NextRequest) {
  try {
    console.log('🏢 Creating new branch...');
    const body = await request.json();
    
    // Validate required fields
    const { name, code, city, state } = body;
    
    console.log('📋 Branch creation request:', { name, code, city, state });
    
    if (!name || !code || !city || !state) {
      const missingFields = [];
      if (!name) missingFields.push('name');
      if (!code) missingFields.push('code');
      if (!city) missingFields.push('city');
      if (!state) missingFields.push('state');
      
      console.error('❌ Missing required fields:', missingFields);
      return NextResponse.json(
        { 
          success: false, 
          error: `Missing required fields: ${missingFields.join(', ')}`,
          requiredFields: ['name', 'code', 'city', 'state']
        },
        { status: 400 }
      );
    }

    // Create simplified branch data structure
    const branchData: CreateBranchData = {
      branchCode: code.toUpperCase(),
      branchName: name,
      branchAddress: `${city}, ${state}`, // Simplified address
      city,
      state,
      pincode: '000000', // Default pincode
      phone: '+91-0000000000', // Default phone
      email: `${code.toLowerCase()}@company.com`, // Default email
      branchManager: 'TBD', // To be determined
      managerEmail: 'manager@company.com', // Default manager email
      managerPhone: '+91-0000000000', // Default manager phone
      region: state, // Use state as region for simplicity
      zone: state // Use state as zone for simplicity
    };

    console.log('🔄 Creating branch in database...');
    const newBranch = await BranchModel.createBranch(branchData);
    console.log('✅ Branch created successfully:', newBranch.branchCode);
    
    return NextResponse.json({
      success: true,
      data: newBranch,
      message: `Branch "${name}" created successfully with code ${code.toUpperCase()}`
    });
  } catch (error: any) {
    console.error('💥 Error creating branch:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to create branch',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 400 }
    );
  }
} 