import { NextRequest, NextResponse } from 'next/server';
import { ApplicationModel } from '@/lib/models/Application';
import { SanctionedApplicationModel } from '@/lib/models/SanctionedApplication';

// GET - Get application details by App.No
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ appNo: string }> }
) {
  try {
    const { appNo: rawAppNo } = await params;
    
    if (!rawAppNo) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'App.No is required' 
        },
        { status: 400 }
      );
    }

    // Decode URL encoding and trim whitespace
    const appNo = decodeURIComponent(rawAppNo).trim();
    
    console.log(`🔍 API: Searching for application: "${appNo}" (original: "${rawAppNo}")`);

    // Search for application by App.No in both applications and sanctioned_applications collections
    let application = await ApplicationModel.getApplicationByAppId(appNo);
    let source = 'applications';
    
    // If not found in applications collection, search in sanctioned_applications collection
    if (!application) {
      console.log(`🔍 API: Not found in applications collection, searching in sanctioned_applications...`);
      const sanctionedApplication = await SanctionedApplicationModel.getSanctionedApplicationByAppId(appNo);
      
      if (sanctionedApplication) {
        // Convert sanctioned application to application format
        application = {
          _id: sanctionedApplication._id,
          appId: sanctionedApplication.appId,
          customerName: sanctionedApplication.customerName,
          branch: sanctionedApplication.branch,
          status: 'sanctioned' as const,
          amount: sanctionedApplication.sanctionedAmount,
          appliedDate: sanctionedApplication.createdAt,
          sanctionedDate: sanctionedApplication.sanctionedDate,
          uploadedAt: sanctionedApplication.createdAt,
          uploadedBy: sanctionedApplication.sanctionedBy,
          priority: 'medium' as const,
          loanType: sanctionedApplication.loanType,
          customerPhone: sanctionedApplication.customerPhone || '',
          customerEmail: sanctionedApplication.customerEmail || '',
          documentStatus: 'Approved',
          remarks: sanctionedApplication.remarks || '',
          assignedTo: sanctionedApplication.approvedBy || '',
          resolverName: sanctionedApplication.approvedBy || '',
          lastUpdated: sanctionedApplication.updatedAt,
          history: [],
          loanNo: sanctionedApplication.loanNo || '',
          appStatus: 'APPROVED',
          loginFee: sanctionedApplication.processingFee || 0,
          sanctionAmount: sanctionedApplication.sanctionedAmount,
          salesExec: sanctionedApplication.salesExec || ''
        };
        source = 'sanctioned_applications';
      }
    }
    
    if (!application) {
      console.log(`❌ API: Application not found for App.No: "${appNo}" in both collections`);
      
      // Get a few sample applications from both collections to help with debugging
      const sampleApplications = await ApplicationModel.getAllApplications({ limit: 3 });
      const sampleSanctionedApplications = await SanctionedApplicationModel.getAllSanctionedApplications({ limit: 5 });
      
      return NextResponse.json(
        { 
          success: false, 
          error: 'Application not found',
          details: `No application found with App.No: "${appNo}" in both applications and sanctioned_applications collections`,
          suggestion: 'Please check the App.No format and try again. App.No should match exactly as it appears in the database.',
          debug: {
            searchedFor: appNo,
            originalParam: rawAppNo,
            decodedParam: decodeURIComponent(rawAppNo),
            trimmedParam: appNo,
            sampleApplications: sampleApplications.map(app => ({
              appId: app.appId,
              customerName: app.customerName,
              status: app.status,
              source: 'applications'
            })),
            sampleSanctionedApplications: sampleSanctionedApplications.map(app => ({
              appId: app.appId,
              customerName: app.customerName,
              status: app.status,
              source: 'sanctioned_applications'
            }))
          }
        },
        { status: 404 }
      );
    }

    console.log(`✅ API: Found application: ${application.appId} - ${application.customerName} from ${source} collection`);

    // Format application data for the frontend with ALL available database details
    const applicationDetails = {
      // Core application details
      appNo: application.appId,
      customerName: application.customerName,
      loanAmount: application.amount ? application.amount.toLocaleString() : 'Not specified',
      status: application.status,
      customerPhone: application.customerPhone || 'Not provided',
      customerEmail: application.customerEmail || 'Not provided',
      branchName: application.branch,
      loanType: application.loanType || 'Personal Loan',
      appliedDate: application.appliedDate ? new Date(application.appliedDate).toLocaleDateString('en-IN') : 'Not specified',
      lastUpdated: new Date(application.lastUpdated).toLocaleDateString('en-IN'),
      
      // Financial details
      sanctionedAmount: application.sanctionAmount ? application.sanctionAmount.toLocaleString() : 
                       (application.amount ? application.amount.toLocaleString() : 'Same as loan amount'),
      sanctionedDate: application.sanctionedDate ? new Date(application.sanctionedDate).toLocaleDateString('en-IN') : 'Not specified',
      loginFee: application.loginFee ? `₹${application.loginFee.toLocaleString()}` : 'Not specified',
      
      // Employee and processing details
      salesExec: application.salesExec || 'Not specified',
      uploadedBy: application.uploadedBy || 'System Generated',
      employeeId: application.uploadedBy || 'System Generated',
      login: application.uploadedBy || 'Not specified',
      
      // Loan specific details
      loanNo: application.loanNo || 'Not specified',
      appStatus: application.appStatus || application.status,
      priority: application.priority || 'medium',
      documentStatus: application.documentStatus || 'Pending',
      remarks: application.remarks || 'No remarks available',
      
      // Address details (computed from branch or defaults)
      address: `${application.branch} Branch Area`,
      pincode: 'Available in documents',
      city: (application.branch?.includes('-') ? application.branch.split('-')[1] : application.branch) || 'Not specified',
      state: 'Available in documents',
      
      // Additional computed fields for display
      monthlyIncome: 'As per documents',
      companyName: 'As per application',
      designation: 'As per documents',
      workExperience: 'As per documents',
      cibilScore: 'Available in documents',
      
      // System fields
      uploadedAt: application.uploadedAt ? new Date(application.uploadedAt).toLocaleDateString('en-IN') : 'Not specified',
      assignedTo: application.assignedTo || 'Not assigned',
      resolverName: application.resolverName || 'Not assigned',
      
      // Additional fields for enhanced processing
      tenure: 'As per sanction letter',
      interestRate: 'As per sanction letter',
      processingFee: application.loginFee ? `₹${application.loginFee.toLocaleString()}` : 'As per policy',
      assetType: 'As per application type',
      taskName: `${application.loanType} Processing`,
      
      // History and tracking
      history: application.history || [],
      totalHistoryEntries: application.history ? application.history.length : 0
    };

    return NextResponse.json({
      success: true,
      data: applicationDetails
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('💥 API Error fetching application:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: `Failed to fetch application: ${errorMessage}`,
        details: 'There was an error searching for the application. Please try again.'
      },
      { status: 500 }
    );
  }
} 