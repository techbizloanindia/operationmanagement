import { NextRequest, NextResponse } from 'next/server';
import { UserModel, CreateUserData } from '@/lib/models/User';

// GET - Get all users
export async function GET() {
  try {
    // Skip during build time
    if (process.env.BUILDING === 'true') {
      return NextResponse.json({
        success: true,
        data: []
      });
    }

    console.log('🔍 Fetching all users from database...');
    const users = await UserModel.getAllUsers();
    console.log(`✅ Found ${users.length} users in database`);
    
    return NextResponse.json({
      success: true,
      data: users,
      count: users.length
    });
  } catch (error) {
    console.error('💥 Error fetching users:', error);
    
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
        error: error instanceof Error ? error.message : 'Failed to fetch users',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    );
  }
}

// POST - Create a new user
export async function POST(request: NextRequest) {
  try {
    // Skip during build time
    if (process.env.BUILDING === 'true') {
      return NextResponse.json({
        success: true,
        data: { message: 'Build mode - user creation skipped' }
      });
    }

    const userData = await request.json() as CreateUserData;
    console.log('🔄 Creating new user:', { employeeId: userData.employeeId, email: userData.email, role: userData.role });

    // Validate required fields - removed username from requirements
    const requiredFields = ['email', 'password', 'role', 'fullName', 'employeeId'];
    const missingFields = requiredFields.filter(field => !userData[field as keyof CreateUserData]);
    
    if (missingFields.length > 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Missing required fields: ${missingFields.join(', ')}` 
        },
        { status: 400 }
      );
    }

    // Validate role
    const validRoles = ['admin', 'operations', 'sales', 'credit'];
    if (!validRoles.includes(userData.role)) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Invalid role. Must be one of: ${validRoles.join(', ')}` 
        },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(userData.email)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid email format' 
        },
        { status: 400 }
      );
    }

    // Create the user
    const newUser = await UserModel.createUser(userData);
    console.log('✅ User created successfully:', newUser.employeeId);

    return NextResponse.json({
      success: true,
      data: newUser,
      message: 'User created successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('💥 Error creating user:', error);
    
    // Return empty data during build time
    if (process.env.BUILDING === 'true') {
      return NextResponse.json({
        success: true,
        data: { message: 'Build mode - user creation skipped' }
      });
    }
    
    // Handle specific MongoDB errors
    if (error instanceof Error && error.message.includes('already exists')) {
      return NextResponse.json(
        { 
          success: false, 
          error: error.message 
        },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to create user',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    );
  }
} 