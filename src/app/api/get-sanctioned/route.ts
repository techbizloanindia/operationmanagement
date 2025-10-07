import { NextRequest, NextResponse } from 'next/server';
import { ApplicationModel } from '@/lib/models/Application';
import { SanctionedApplicationModel } from '@/lib/models/SanctionedApplication';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const branch = searchParams.get('branch');
    const loanType = searchParams.get('loanType');
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 10000; // Show all by default

    console.log('🔍 Fetching sanctioned applications from BOTH applications and sanctioned_applications collections with filters:', { status, branch, loanType, limit });

    // Fetch from BOTH collections
    // 1. Get from applications collection (existing logic)
    const allApplications = await ApplicationModel.getAllApplications({
      branch: branch || undefined,
      limit: 5000 // Get all applications to filter properly
    });

    // 2. Get from dedicated sanctioned_applications collection (uploaded data)
    const dedicatedSanctionedApps = await SanctionedApplicationModel.getAllSanctionedApplications({
      status: status || undefined,
      branch: branch || undefined,
      loanType: loanType || undefined,
      limit: 5000
    });

    console.log(`📊 Found ${allApplications.length} applications and ${dedicatedSanctionedApps.length} dedicated sanctioned applications`);

    // Filter applications that are actually sanctioned (have sanctionAmount > 0 or approved status)
    const sanctionedApps = allApplications.filter(app => {
      // Exclude applications where all queries have been resolved
      if (app.appStatus === 'QUERY_RESOLVED') {
        console.log(`📋 Excluding ${app.appId} - queries already resolved`);
        return false;
      }
      
      // Consider an application sanctioned if:
      // 1. Has sanctionAmount > 0, OR
      // 2. appStatus is APPROVED, OR 
      // 3. remarks contain "sanction" keyword
      const hasSanctionAmount = app.sanctionAmount && app.sanctionAmount > 0;
      const isApproved = app.appStatus === 'APPROVED';
      const hasSanctionKeyword = app.remarks && app.remarks.toLowerCase().includes('sanction');
      
      return hasSanctionAmount || isApproved || hasSanctionKeyword;
    });

    console.log(`📊 Found ${allApplications.length} total applications, ${sanctionedApps.length} are sanctioned from applications collection`);

    // Transform applications from applications collection
    const transformedApplications = sanctionedApps.map(app => ({
      _id: app._id,
      appId: app.appId,
      customerName: app.customerName,
      branch: app.branch,
      sanctionedAmount: app.sanctionAmount || app.amount || 0,
      sanctionedDate: app.sanctionedDate || app.appliedDate,
      loanType: app.loanType || 'Personal Loan',
      status: 'active' as const, // Map sanctioned status to active
      customerEmail: app.customerEmail || '',
      sanctionedBy: app.uploadedBy || 'System',
      approvedBy: app.salesExec || app.uploadedBy || '', // Use salesExec primarily, fallback to uploadedBy
      salesExec: app.salesExec || app.uploadedBy || '', // Include salesExec field
      createdAt: app.uploadedAt || app.appliedDate,
      updatedAt: app.lastUpdated,
      remarks: app.remarks || '',
      source: 'applications' // Track source
    }));

    // Transform applications from dedicated sanctioned_applications collection
    const transformedDedicatedApps = dedicatedSanctionedApps.map(app => ({
      _id: app._id,
      appId: app.appId,
      customerName: app.customerName,
      branch: app.branch,
      sanctionedAmount: app.sanctionedAmount || 0,
      sanctionedDate: app.sanctionedDate,
      loanType: app.loanType || 'Personal Loan',
      status: app.status || 'active',
      customerEmail: app.customerEmail || '',
      sanctionedBy: app.sanctionedBy || 'System',
      approvedBy: app.approvedBy || app.sanctionedBy || '',
      salesExec: app.salesExec || '',
      createdAt: app.createdAt,
      updatedAt: app.updatedAt,
      remarks: app.remarks || '',
      source: 'sanctioned_applications' // Track source
    }));

    // Combine both sources and remove duplicates (prefer dedicated over applications)
    const allSanctionedApps = [...transformedDedicatedApps];
    
    // Add applications that don't exist in dedicated collection
    for (const app of transformedApplications) {
      const exists = transformedDedicatedApps.some(dedicatedApp => 
        dedicatedApp.appId === app.appId || 
        (dedicatedApp.customerName === app.customerName && dedicatedApp.branch === app.branch)
      );
      if (!exists) {
        allSanctionedApps.push(app);
      }
    }

    // Apply additional filtering based on query parameters
    const filteredApps = allSanctionedApps.filter(app => {
      if (loanType && app.loanType !== loanType) return false;
      if (status && status !== 'active' && app.status !== status) return false;
      if (branch && app.branch !== branch) return false;
      return true;
    });

    console.log(`✅ Returning ${filteredApps.length} sanctioned applications from both sources:`);
    console.log(`   - ${transformedDedicatedApps.length} from sanctioned_applications collection (uploaded data)`);
    console.log(`   - ${transformedApplications.length} from applications collection (existing logic)`);
    console.log(`   - ${filteredApps.length} total after deduplication and filtering`);

    return NextResponse.json({
      success: true,
      applications: filteredApps,
      count: filteredApps.length,
      sources: {
        dedicated: transformedDedicatedApps.length,
        applications: transformedApplications.length,
        total: filteredApps.length
      }
    });

  } catch (error) {
    console.error('❌ Error fetching sanctioned applications:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}