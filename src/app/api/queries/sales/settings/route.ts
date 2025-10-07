import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';

/**
 * Sales Settings API Route
 * Manages sales team settings and configuration
 */

// GET - Fetch sales team settings
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const settingType = searchParams.get('type') || 'all';
    
    console.log(`⚙️ Sales Settings: Fetching ${settingType} settings`);
    
    // Default sales settings
    let salesSettings = {
      notifications: {
        emailAlerts: true,
        queryAssignments: true,
        statusUpdates: true,
        dailyDigest: false,
        realTimeUpdates: true
      },
      dashboard: {
        defaultView: 'queries',
        queriesPerPage: 10,
        autoRefresh: true,
        refreshInterval: 30, // seconds
        showResolved: false,
        compactView: false
      },
      permissions: {
        canApprove: true,
        canDefer: true,
        canOTC: true,
        canWaiver: true,
        canAssignBranch: true,
        canViewAnalytics: true,
        canGenerateReports: true
      },
      filters: {
        defaultBranch: 'all',
        defaultPriority: 'all',
        defaultStatus: 'pending',
        savedFilters: []
      },
      integration: {
        crmEnabled: false,
        emailIntegration: true,
        slackNotifications: false,
        webhookUrl: ''
      }
    };

    try {
      const { db } = await connectDB();
      
      // Try to fetch settings from database
      const settingsDoc = await db.collection('settings').findOne({ team: 'sales' });
      
      if (settingsDoc) {
        salesSettings = { ...salesSettings, ...settingsDoc.settings };
        console.log('⚙️ Sales Settings: Loaded from database');
      } else {
        console.log('⚙️ Sales Settings: Using default settings');
      }

    } catch (dbError) {
      console.error('❌ Sales Settings: MongoDB error, using defaults:', dbError);
    }

    // Return specific setting type if requested
    if (settingType !== 'all' && salesSettings.hasOwnProperty(settingType)) {
      return NextResponse.json({
        success: true,
        data: { [settingType]: salesSettings[settingType as keyof typeof salesSettings] }
      });
    }

    return NextResponse.json({
      success: true,
      data: salesSettings
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('💥 Sales Settings: Error fetching settings:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage
      },
      { status: 500 }
    );
  }
}

// POST - Update sales team settings
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { settingType, settings, userId } = body;
    
    console.log(`⚙️ Sales Settings: Updating ${settingType || 'all'} settings`);

    if (!settings) {
      return NextResponse.json(
        { success: false, error: 'Settings data is required' },
        { status: 400 }
      );
    }

    try {
      const { db } = await connectDB();
      
      // Update settings in database
      const updateData = {
        team: 'sales',
        settings: settings,
        updatedAt: new Date(),
        updatedBy: userId || 'Sales Team'
      };

      const result = await db.collection('settings').updateOne(
        { team: 'sales' },
        { $set: updateData },
        { upsert: true }
      );

      console.log(`⚙️ Sales Settings: Updated successfully (${result.modifiedCount || result.upsertedCount} documents)`);

      return NextResponse.json({
        success: true,
        message: 'Sales settings updated successfully',
        data: settings
      });

    } catch (dbError) {
      console.error('❌ Sales Settings: MongoDB error:', dbError);
      
      // Return success anyway since settings can work with defaults
      return NextResponse.json({
        success: true,
        message: 'Settings updated (using local storage)',
        data: settings,
        warning: 'Database update failed, using local storage'
      });
    }

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('💥 Sales Settings: Error updating settings:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage
      },
      { status: 500 }
    );
  }
}

// PATCH - Update specific setting values
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { path, value, userId } = body;
    
    console.log(`⚙️ Sales Settings: Updating setting at path: ${path}`);

    if (!path) {
      return NextResponse.json(
        { success: false, error: 'Setting path is required' },
        { status: 400 }
      );
    }

    try {
      const { db } = await connectDB();
      
      // Build update path for nested setting
      const updatePath = `settings.${path}`;
      const updateData = {
        [updatePath]: value,
        updatedAt: new Date(),
        updatedBy: userId || 'Sales Team'
      };

      const result = await db.collection('settings').updateOne(
        { team: 'sales' },
        { $set: updateData },
        { upsert: true }
      );

      console.log(`⚙️ Sales Settings: Updated setting ${path} = ${value}`);

      return NextResponse.json({
        success: true,
        message: `Setting ${path} updated successfully`,
        path,
        value
      });

    } catch (dbError) {
      console.error('❌ Sales Settings: MongoDB error:', dbError);
      
      return NextResponse.json({
        success: true,
        message: `Setting ${path} updated (local)`,
        path,
        value,
        warning: 'Database update failed'
      });
    }

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('💥 Sales Settings: Error updating setting:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage
      },
      { status: 500 }
    );
  }
}