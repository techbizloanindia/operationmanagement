import { NextRequest, NextResponse } from 'next/server';
import { UserModel } from '@/lib/models/User';

// GET - Check user details by employee ID
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employeeId');
    
    if (!employeeId) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Employee ID is required' 
        },
        { status: 400 }
      );
    }

    // Find user by employee ID
    const user = await UserModel.getUserByEmployeeId(employeeId);
    
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Employee ID not found',
        code: 'USER_NOT_FOUND'
      }, { status: 404 });
    }

    // Check if user is active
    if (!user.isActive) {
      return NextResponse.json({
        success: false,
        error: 'Account is inactive',
        code: 'ACCOUNT_INACTIVE',
        data: {
          employeeId: user.employeeId,
          fullName: user.fullName,
          isActive: false
        }
      }, { status: 403 });
    }

    // Check if user has access rights (role assigned)
    if (!user.role) {
      return NextResponse.json({
        success: false,
        error: 'No access rights assigned',
        code: 'NO_ACCESS_RIGHTS',
        data: {
          employeeId: user.employeeId,
          fullName: user.fullName,
          department: user.department,
          branch: user.branch,
          isActive: user.isActive
        }
      }, { status: 403 });
    }

    // Return user details with access rights
    const accessRights = getUserAccessRights(user.role);
    
    return NextResponse.json({
      success: true,
      data: {
        employeeId: user.employeeId,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        department: user.department,
        branch: user.branch,
        isActive: user.isActive,
        permissions: user.permissions || [],
        accessRights
      }
    });

  } catch (error) {
    console.error('Error checking employee:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to check employee details' 
      },
      { status: 500 }
    );
  }
}

// Helper function to get access rights by role
function getUserAccessRights(role: string) {
  const accessRights: Record<string, any> = {
    operations: {
      role: 'operations',
      displayName: 'Operations Team',
      description: 'Manage queries and sanctioned cases',
      modules: [
        { name: 'Sanctioned Cases', permissions: ['View', 'Edit'], icon: '📋' },
        { name: 'Query Management', permissions: ['View', 'Edit', 'Approve', 'Defer'], icon: '❓' },
        { name: 'Add New Query', permissions: ['Create'], icon: '➕' },
        { name: 'Reports', permissions: ['View', 'Export'], icon: '📊' }
      ]
    },
    sales: {
      role: 'sales',
      displayName: 'Sales Team',
      description: 'Handle sales queries and customer applications',
      modules: [
        { name: 'Sales Queries', permissions: ['View', 'Respond'], icon: '💼' },
        { name: 'Applications', permissions: ['View'], icon: '📄' },
        { name: 'Customer Support', permissions: ['View', 'Edit'], icon: '👥' },
        { name: 'Reports', permissions: ['View'], icon: '📊' }
      ]
    },
    credit: {
      role: 'credit',
      displayName: 'Credit Team',
      description: 'Process credit assessments and applications',
      modules: [
        { name: 'Credit Queries', permissions: ['View', 'Respond'], icon: '💳' },
        { name: 'Applications', permissions: ['View', 'Assess'], icon: '📋' },
        { name: 'Credit Reports', permissions: ['View', 'Generate'], icon: '📈' },
        { name: 'Risk Assessment', permissions: ['View', 'Edit'], icon: '⚠️' }
      ]
    },

    admin: {
      role: 'admin',
      displayName: 'Administrator',
      description: 'Full system access and user management',
      modules: [
        { name: 'User Management', permissions: ['Full Access'], icon: '👤' },
        { name: 'System Settings', permissions: ['Full Access'], icon: '⚙️' },
        { name: 'All Modules', permissions: ['Full Access'], icon: '🔧' },
        { name: 'Analytics', permissions: ['Full Access'], icon: '📊' }
      ]
    }
  };

  return accessRights[role] || {
    role: 'unknown',
    displayName: 'Unknown Role',
    description: 'No access rights defined',
    modules: []
  };
}
