import { NextRequest, NextResponse } from 'next/server';
import { UserModel } from '@/lib/models/User';

// GET - Check user role by employee ID
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
        success: true,
        data: {
          hasRole: false,
          role: null,
          message: 'User not found'
        }
      });
    }

    // Check if user has been assigned access rights (not default values)
    // Operations users with 'Unassigned' branch and no permissions means access rights not set
    const hasAccessRights = (user.role && user.role !== 'operations') || 
                           (user.role === 'operations' && user.branch !== 'Unassigned') || 
                           (user.permissions && user.permissions.length > 0);

    return NextResponse.json({
      success: true,
      data: {
        hasRole: hasAccessRights,
        role: hasAccessRights ? user.role : null,
        fullName: user.fullName,
        branch: user.branch,
        employeeId: user.employeeId
      }
    });
  } catch (error) {
    console.error('Error checking user role:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to check user role' 
      },
      { status: 500 }
    );
  }
} 