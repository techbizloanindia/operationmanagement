import { NextRequest, NextResponse } from 'next/server';

// Credit Analytics API Route
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const team = searchParams.get('team');
    const period = searchParams.get('period') || '30d';
    
    if (team !== 'credit') {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized access'
      }, { status: 403 });
    }

    // In a real application, this would fetch from your database
    // For now, returning mock data
    const analyticsData = {
      approvalRate: 76.5,
      rejectionRate: 23.5,
      monthlyTrends: [
        { month: 'Jan', applications: 45, approved: 34, rejected: 11 },
        { month: 'Feb', applications: 52, approved: 40, rejected: 12 },
        { month: 'Mar', applications: 48, approved: 37, rejected: 11 },
        { month: 'Apr', applications: 61, approved: 47, rejected: 14 },
        { month: 'May', applications: 58, approved: 44, rejected: 14 },
        { month: 'Jun', applications: 55, approved: 42, rejected: 13 }
      ],
      riskDistribution: [
        { risk: 'Low Risk', count: 89, percentage: 57.1 },
        { risk: 'Medium Risk', count: 45, percentage: 28.8 },
        { risk: 'High Risk', count: 22, percentage: 14.1 }
      ],
      branchPerformance: [
        { branch: 'Mumbai Central', applications: 34, approvalRate: 82.4 },
        { branch: 'Delhi NCR', applications: 28, approvalRate: 75.0 },
        { branch: 'Bangalore Tech', applications: 31, approvalRate: 77.4 },
        { branch: 'Chennai South', applications: 25, approvalRate: 72.0 },
        { branch: 'Pune West', applications: 22, approvalRate: 68.2 }
      ]
    };

    return NextResponse.json({
      success: true,
      data: analyticsData
    });

  } catch (error) {
    console.error('Credit analytics API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, period, filters } = body;

    // Handle analytics actions like generating reports, filtering data etc.
    
    return NextResponse.json({
      success: true,
      message: 'Analytics action completed'
    });

  } catch (error) {
    console.error('Credit analytics POST error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}
