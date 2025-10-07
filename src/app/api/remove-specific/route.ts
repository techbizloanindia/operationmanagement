import { NextRequest, NextResponse } from 'next/server';
import { ApplicationModel } from '@/lib/models/Application';

export async function POST(request: NextRequest) {
  try {
    console.log('🗑️ Remove specific applications request received');
    
    const body = await request.json();
    const { searchTerms } = body;

    if (!searchTerms || !Array.isArray(searchTerms)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Search terms array is required' 
        },
        { status: 400 }
      );
    }

    console.log('🔍 Searching for applications with terms:', searchTerms);

    // Get all applications first to find matches
    const allApplications = await ApplicationModel.getAllApplications();
    
    const applicationsToRemove = [];
    const searchResults = [];

    // Search for applications that match the criteria
    for (const app of allApplications) {
      let matchFound = false;
      const matchedTerms = [];

      for (const term of searchTerms) {
        const termLower = term.toLowerCase();
        
        // Check various fields for matches
        const fieldsToCheck = [
          app.customerName?.toLowerCase() || '',
          app.branch?.toLowerCase() || '',
          app.remarks?.toLowerCase() || '',
          app.appId?.toLowerCase() || '',
          app.loanType?.toLowerCase() || '',
          app.appStatus?.toLowerCase() || ''
        ];

        const fieldMatched = fieldsToCheck.some(field => 
          field.includes(termLower) || termLower.includes(field)
        );

        if (fieldMatched) {
          matchFound = true;
          matchedTerms.push(term);
        }
      }

      if (matchFound) {
        applicationsToRemove.push(app);
        searchResults.push({
          appId: app.appId,
          customerName: app.customerName,
          branch: app.branch,
          status: app.status,
          matchedTerms: matchedTerms,
          remarks: app.remarks?.substring(0, 100) + '...' || ''
        });
      }
    }

    console.log(`📊 Found ${applicationsToRemove.length} applications to remove`);

    if (applicationsToRemove.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No applications found matching the search criteria',
        searchResults: [],
        removedCount: 0
      });
    }

    // Remove the matched applications
    let removedCount = 0;
    const errors = [];

    for (const app of applicationsToRemove) {
      try {
        await ApplicationModel.deleteApplication(app.appId);
        removedCount++;
        console.log(`✅ Removed application: ${app.appId} - ${app.customerName}`);
      } catch (error: any) {
        console.error(`❌ Failed to remove application ${app.appId}:`, error.message);
        errors.push(`Failed to remove ${app.appId}: ${error.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully removed ${removedCount} applications from database`,
      searchResults: searchResults,
      removedCount: removedCount,
      totalFound: applicationsToRemove.length,
      errors: errors
    });

  } catch (error: unknown) {
    console.error('💥 Remove specific applications error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json(
      { 
        success: false, 
        error: `Failed to remove applications: ${errorMessage}` 
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // Get all applications for review
    const applications = await ApplicationModel.getAllApplications();
    
    const summary = applications.map(app => ({
      appId: app.appId,
      customerName: app.customerName,
      branch: app.branch,
      status: app.status,
      remarks: app.remarks?.substring(0, 150) + '...' || '',
      uploadedAt: app.uploadedAt
    }));

    return NextResponse.json({
      success: true,
      applications: summary,
      totalCount: applications.length
    });

  } catch (error: unknown) {
    console.error('💥 Get applications error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json(
      { 
        success: false, 
        error: `Failed to get applications: ${errorMessage}` 
      },
      { status: 500 }
    );
  }
}
