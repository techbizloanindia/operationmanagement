import { NextRequest, NextResponse } from 'next/server';

// Risk Assessments API Route
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const team = searchParams.get('team');
    
    if (team !== 'credit') {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized access'
      }, { status: 403 });
    }

    // Mock risk assessment data
    const assessments = [
      {
        id: '1',
        appNo: 'APP001',
        customerName: 'Rajesh Kumar',
        creditAmount: '₹5,00,000',
        riskScore: 72,
        riskLevel: 'medium',
        assessmentDate: '2024-08-14T10:30:00Z',
        assessedBy: 'Credit Analyst 1',
        factors: {
          creditHistory: 80,
          income: 75,
          collateral: 65,
          employment: 85,
          debt: 60
        },
        recommendation: 'review',
        comments: 'Stable employment but high debt ratio requires review',
        branch: 'Mumbai Central',
        status: 'pending'
      },
      {
        id: '2',
        appNo: 'APP002',
        customerName: 'Priya Sharma',
        creditAmount: '₹3,00,000',
        riskScore: 85,
        riskLevel: 'low',
        assessmentDate: '2024-08-14T09:15:00Z',
        assessedBy: 'Credit Analyst 2',
        factors: {
          creditHistory: 90,
          income: 85,
          collateral: 80,
          employment: 90,
          debt: 85
        },
        recommendation: 'approve',
        comments: 'Excellent credit profile with low risk indicators',
        branch: 'Delhi NCR',
        status: 'completed'
      },
      {
        id: '3',
        appNo: 'APP003',
        customerName: 'Amit Patel',
        creditAmount: '₹15,00,000',
        riskScore: 45,
        riskLevel: 'high',
        assessmentDate: '2024-08-13T16:45:00Z',
        assessedBy: 'Credit Analyst 1',
        factors: {
          creditHistory: 40,
          income: 50,
          collateral: 45,
          employment: 60,
          debt: 30
        },
        recommendation: 'reject',
        comments: 'Poor credit history and insufficient collateral coverage',
        branch: 'Bangalore Tech',
        status: 'reviewed'
      }
    ];

    return NextResponse.json({
      success: true,
      data: {
        assessments
      }
    });

  } catch (error) {
    console.error('Risk assessments API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, assessmentId, data } = body;

    // Handle risk assessment actions like creating, updating, completing assessments
    
    return NextResponse.json({
      success: true,
      message: 'Risk assessment action completed'
    });

  } catch (error) {
    console.error('Risk assessments POST error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}
