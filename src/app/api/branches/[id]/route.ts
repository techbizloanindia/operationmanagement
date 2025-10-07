import { NextRequest, NextResponse } from 'next/server';
import { BranchModel } from '@/lib/models/Branch';

// GET - Get branch by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const branch = await BranchModel.getBranchById(id);
    
    if (!branch) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Branch not found' 
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: branch
    });
  } catch (error) {
    console.error('Error fetching branch:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch branch' 
      },
      { status: 500 }
    );
  }
}

// PUT - Update branch
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    const updatedBranch = await BranchModel.updateBranch(id, body);
    
    if (!updatedBranch) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Branch not found' 
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updatedBranch,
      message: 'Branch updated successfully'
    });
  } catch (error: any) {
    console.error('Error updating branch:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to update branch' 
      },
      { status: 400 }
    );
  }
}

// DELETE - Delete branch
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await BranchModel.deleteBranch(id);
    
    return NextResponse.json({
      success: true,
      message: 'Branch deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting branch:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to delete branch' 
      },
      { status: 500 }
    );
  }
} 