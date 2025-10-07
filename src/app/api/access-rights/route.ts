import { NextRequest, NextResponse } from 'next/server';
import { UserModel } from '@/lib/models/User';

// POST - Assign access rights to a user
export async function POST(request: NextRequest) {
  try {
    // Skip during build time
    if (process.env.BUILDING === 'true') {
      return NextResponse.json({
        success: true,
        data: { message: 'Build mode - access rights assignment skipped' }
      });
    }

    const { userId, role, branches, permissions = [] } = await request.json();
    console.log('🔐 Assigning access rights:', { userId, role, branches: branches?.length });

    // Validate required fields
    if (!userId || !role || !branches || !Array.isArray(branches)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required fields: userId, role, or branches' 
        },
        { status: 400 }
      );
    }

    // Validate role
    const validRoles = ['admin', 'operations', 'sales', 'credit'];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Invalid role. Must be one of: ${validRoles.join(', ')}` 
        },
        { status: 400 }
      );
    }

    // Create branch permissions array
    const branchPermissions = branches.map((branch: string) => `branch:${branch}`);
    
    // Combine with any additional permissions
    const allPermissions = [...branchPermissions, ...permissions];

    // Update user with permissions and assigned branches
    const updateData: any = {
      permissions: allPermissions,
      assignedBranches: branches,
      updatedAt: new Date()
    };

    // For operations users, also update the branch field if single branch
    if (role === 'operations' && branches.length === 1) {
      updateData.branch = branches[0];
    } else if (branches.length > 1) {
      updateData.branch = 'Multiple';
    }

    const updatedUser = await UserModel.updateUser(userId, updateData);
    
    if (!updatedUser) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'User not found or failed to update' 
        },
        { status: 404 }
      );
    }

    console.log('✅ Access rights assigned successfully:', {
      userId,
      role,
      branchCount: branches.length,
      permissionCount: allPermissions.length
    });

    return NextResponse.json({
      success: true,
      data: {
        userId: updatedUser._id,
        role: updatedUser.role,
        assignedBranches: updatedUser.assignedBranches,
        permissions: updatedUser.permissions,
        message: `Access rights assigned successfully for ${branches.length} branch(es)`
      }
    }, { status: 200 });

  } catch (error) {
    console.error('💥 Error assigning access rights:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to assign access rights' 
      },
      { status: 500 }
    );
  }
}

// GET - Get user access rights
export async function GET(request: NextRequest) {
  try {
    // Skip during build time
    if (process.env.BUILDING === 'true') {
      return NextResponse.json({
        success: true,
        data: { permissions: [], assignedBranches: [] }
      });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'User ID is required' 
        },
        { status: 400 }
      );
    }

    const user = await UserModel.getUserById(userId);
    
    if (!user) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'User not found' 
        },
        { status: 404 }
      );
    }

    // Extract branch permissions
    const branchPermissions = (user.permissions || [])
      .filter((perm: string) => perm.startsWith('branch:'))
      .map((perm: string) => perm.replace('branch:', ''));

    return NextResponse.json({
      success: true,
      data: {
        userId: user._id,
        role: user.role,
        assignedBranches: user.assignedBranches || branchPermissions,
        permissions: user.permissions || [],
        branch: user.branch
      }
    });

  } catch (error) {
    console.error('💥 Error getting access rights:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get access rights' 
      },
      { status: 500 }
    );
  }
}
