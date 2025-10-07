import { NextRequest, NextResponse } from 'next/server';
import { UserModel, CreateUserData } from '@/lib/models/User';

interface BulkCreateRequest {
  users: CreateUserData[];
}

interface BulkCreateResult {
  success: boolean;
  results: {
    total: number;
    successful: number;
    failed: number;
    successfulUsers: Array<{
      employeeId: string;
      fullName: string;
      email: string;
      _id?: string;
    }>;
    failedUsers: Array<{
      employeeId: string;
      fullName: string;
      email: string;
      error: string;
    }>;
  };
}

// POST - Bulk create users
export async function POST(request: NextRequest): Promise<NextResponse<BulkCreateResult>> {
  try {
    // Skip during build time
    if (process.env.BUILDING === 'true') {
      return NextResponse.json({
        success: true,
        results: {
          total: 0,
          successful: 0,
          failed: 0,
          successfulUsers: [],
          failedUsers: []
        }
      });
    }

    const { users }: BulkCreateRequest = await request.json();
    
    if (!users || !Array.isArray(users) || users.length === 0) {
      return NextResponse.json(
        {
          success: false,
          results: {
            total: 0,
            successful: 0,
            failed: 0,
            successfulUsers: [],
            failedUsers: []
          }
        },
        { status: 400 }
      );
    }

    console.log(`🔄 Starting bulk creation of ${users.length} users...`);

    const results = {
      total: users.length,
      successful: 0,
      failed: 0,
      successfulUsers: [] as Array<{
        employeeId: string;
        fullName: string;
        email: string;
        _id?: string;
      }>,
      failedUsers: [] as Array<{
        employeeId: string;
        fullName: string;
        email: string;
        error: string;
      }>
    };

    // Process users in batches to avoid overwhelming the database
    const batchSize = 10;
    for (let i = 0; i < users.length; i += batchSize) {
      const batch = users.slice(i, i + batchSize);
      
      // Process batch concurrently
      const batchPromises = batch.map(async (userData) => {
        try {
          // Validate required fields
          const requiredFields = ['email', 'password', 'role', 'fullName', 'employeeId'];
          const missingFields = requiredFields.filter(field => !userData[field as keyof CreateUserData]);
          
          if (missingFields.length > 0) {
            throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
          }

          // Validate role
          const validRoles = ['admin', 'operations', 'sales', 'credit'];
          if (!validRoles.includes(userData.role)) {
            throw new Error(`Invalid role. Must be one of: ${validRoles.join(', ')}`);
          }

          // Validate email format
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(userData.email)) {
            throw new Error('Invalid email format');
          }

          // Create the user
          const newUser = await UserModel.createUser(userData);
          
          return {
            success: true,
            user: {
              employeeId: userData.employeeId,
              fullName: userData.fullName,
              email: userData.email,
              _id: newUser._id?.toString()
            }
          };
        } catch (error) {
          return {
            success: false,
            user: {
              employeeId: userData.employeeId,
              fullName: userData.fullName,
              email: userData.email,
              error: error instanceof Error ? error.message : 'Unknown error'
            }
          };
        }
      });

      // Wait for batch to complete
      const batchResults = await Promise.all(batchPromises);
      
      // Process results
      batchResults.forEach(result => {
        if (result.success) {
          results.successful++;
          results.successfulUsers.push(result.user);
          console.log(`✅ Created: ${result.user.fullName} (${result.user.employeeId})`);
        } else {
          results.failed++;
          results.failedUsers.push(result.user as any);
          console.log(`❌ Failed: ${result.user.fullName} (${result.user.employeeId}) - ${(result.user as any).error}`);
        }
      });

      console.log(`📊 Processed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(users.length / batchSize)}`);
    }

    console.log(`✅ Bulk creation completed: ${results.successful} successful, ${results.failed} failed`);

    return NextResponse.json({
      success: true,
      results
    }, { status: 201 });

  } catch (error) {
    console.error('💥 Error in bulk user creation:', error);
    
    // Return empty data during build time
    if (process.env.BUILDING === 'true') {
      return NextResponse.json({
        success: true,
        results: {
          total: 0,
          successful: 0,
          failed: 0,
          successfulUsers: [],
          failedUsers: []
        }
      });
    }
    
    return NextResponse.json(
      {
        success: false,
        results: {
          total: 0,
          successful: 0,
          failed: 0,
          successfulUsers: [],
          failedUsers: []
        }
      },
      { status: 500 }
    );
  }
}
