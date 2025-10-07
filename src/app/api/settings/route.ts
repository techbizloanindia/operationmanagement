import { NextRequest, NextResponse } from 'next/server';

// Settings API Route
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

    // Mock settings data - in real app, this would come from database
    const defaultSettings = {
      notifications: {
        emailAlerts: true,
        smsAlerts: false,
        dashboardNotifications: true,
        highRiskAlerts: true,
        approvalNotifications: true
      },
      riskParameters: {
        lowRiskThreshold: 80,
        mediumRiskThreshold: 60,
        highRiskThreshold: 40,
        autoApprovalLimit: 500000,
        manualReviewRequired: true
      },
      workflowSettings: {
        autoAssignQueries: true,
        escalationTimeout: 24,
        requireDualApproval: false,
        allowBulkActions: true
      },
      displaySettings: {
        itemsPerPage: 20,
        defaultSortOrder: 'newest',
        showAdvancedFilters: true,
        compactView: false
      },
      integrationSettings: {
        cibilIntegration: true,
        equifaxIntegration: false,
        experianIntegration: false,
        realTimeScoring: true
      }
    };

    return NextResponse.json({
      success: true,
      data: defaultSettings
    });

  } catch (error) {
    console.error('Settings GET error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch settings'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { team, settings } = body;

    if (team !== 'credit') {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized access'
      }, { status: 403 });
    }

    // In a real application, this would:
    // 1. Validate the settings
    // 2. Save to database
    // 3. Update user preferences
    // 4. Send notifications if needed

    console.log('Saving credit settings:', settings);

    return NextResponse.json({
      success: true,
      message: 'Settings saved successfully'
    });

  } catch (error) {
    console.error('Settings POST error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to save settings'
    }, { status: 500 });
  }
}
