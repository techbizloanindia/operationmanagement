import { NextRequest, NextResponse } from 'next/server';
import { ApplicationModel, CreateApplicationData } from '@/lib/models/Application';

// Helper function to parse dates in various formats
function parseDate(dateStr: string): Date {
  if (!dateStr) return new Date();
  
  // Try different date formats
  const formats = [
    /(\d{4})-(\d{2})-(\d{2})/, // YYYY-MM-DD
    /(\d{2})\/(\d{2})\/(\d{4})/, // MM/DD/YYYY
    /(\d{2})-(\d{2})-(\d{4})/, // MM-DD-YYYY
    /(\d{2})\.(\d{2})\.(\d{4})/, // MM.DD.YYYY
  ];
  
  for (const format of formats) {
    const match = dateStr.match(format);
    if (match) {
      if (format === formats[0]) { // YYYY-MM-DD
        return new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
      } else { // MM/DD/YYYY, MM-DD-YYYY, MM.DD.YYYY
        return new Date(parseInt(match[3]), parseInt(match[1]) - 1, parseInt(match[2]));
      }
    }
  }
  
  // Fallback to Date constructor
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? new Date() : date;
}

export async function POST(request: NextRequest) {
  try {
    console.log('📁 JSON Bulk upload request received');
    
    const body = await request.json();
    const { applications } = body;

    if (!applications || !Array.isArray(applications) || applications.length === 0) {
      console.log('❌ No applications provided');
      return NextResponse.json(
        { 
          success: false, 
          error: 'No applications provided',
          help: 'Please provide an array of applications in the request body'
        },
        { status: 400 }
      );
    }

    console.log(`📋 Processing ${applications.length} applications`);

    // Validate and process applications
    const validApplications: CreateApplicationData[] = [];
    const errors: string[] = [];
    const skippedRows: string[] = [];
    let processedRows = 0;

    for (let i = 0; i < applications.length; i++) {
      try {
        const app = applications[i];
        
        // Validate required fields
        const appNo = app.appNo?.trim() || '';
        const customerName = app.customerName?.trim() || '';
        const branchName = app.branchName?.trim() || '';
        const taskName = app.taskName?.trim() || '';

        if (!appNo || !customerName || !branchName || !taskName) {
          errors.push(`Row ${i + 1}: Missing required data - App.No: "${appNo}", Name: "${customerName}", Branch: "${branchName}", TaskName: "${taskName}"`);
          continue;
        }

        // FILTER FOR SANCTION DATA ONLY - Enhanced sanction detection
        const taskNameLower = taskName.toLowerCase();
        const sanctionKeywords = [
          'sanction', 'sanctioned', 'approved', 'disbursed', 'disbursement',
          'documentation', 'final approval', 'completed', 'ready for disbursement',
          'loan sanctioned', 'sanctioned loan', 'documentation complete',
          'approval', 'approved loan', 'loan approved'
        ];

        const isSanctioned = sanctionKeywords.some(keyword => taskNameLower.includes(keyword));
        
        if (!isSanctioned) {
          skippedRows.push(`Row ${i + 1}: Non-sanctioned application skipped (TaskName: ${taskName})`);
          continue;
        }

        processedRows++;

        // Create application data object
        const applicationData: CreateApplicationData = {
          appId: appNo.toUpperCase(),
          customerName,
          branch: branchName,
          status: 'sanctioned' as any, // Force sanctioned status
          amount: parseFloat(app.loanAmount?.replace(/[^\d.-]/g, '') || '0'),
          appliedDate: app.appliedDate ? parseDate(app.appliedDate) : new Date(),
          priority: (app.priority?.toLowerCase() === 'high' || app.priority?.toLowerCase() === 'low') 
            ? app.priority.toLowerCase() as 'high' | 'low' 
            : 'medium',
          loanType: app.loanType?.trim() || 'Personal Loan',
          customerPhone: app.customerPhone?.trim() || '',
          customerEmail: app.customerEmail?.trim() || '',
          documentStatus: app.documentStatus?.trim() || 'Complete',
          remarks: app.remarks?.trim() || `Uploaded via CSV - Product: ${app.product || 'N/A'}, Sales Exec: ${app.salesExec || 'N/A'}, ASM: ${app.asm || 'N/A'}`,
          uploadedBy: 'CSV Import'
        };

        validApplications.push(applicationData);

      } catch (error) {
        console.error(`Error processing application ${i + 1}:`, error);
        errors.push(`Row ${i + 1}: Processing error - ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    console.log(`📊 Processed: ${processedRows}, Valid: ${validApplications.length}, Errors: ${errors.length}, Skipped: ${skippedRows.length}`);

    if (validApplications.length === 0) {
      console.log('❌ No valid applications to create');
      return NextResponse.json({
        success: false,
        error: 'No valid sanctioned applications found',
        data: {
          totalRows: applications.length,
          processedRows,
          validRows: validApplications.length,
          errors: errors.length,
          skippedRows: skippedRows.length,
          errorDetails: errors.slice(0, 10),
          skippedDetails: skippedRows.slice(0, 10)
        },
        message: 'No sanctioned applications were found to upload. Only applications with sanctioned status are accepted.'
      });
    }

    // Bulk create applications using ApplicationModel
    console.log(`💾 Creating ${validApplications.length} applications in database`);
    const result = await ApplicationModel.bulkCreateApplications(validApplications);
    
    console.log(`✅ Bulk creation result:`, result);

    // Compile feedback
    const allFeedback = [
      ...errors.map(e => ({ type: 'error' as const, message: e })),
      ...result.errors.map((e: string) => ({ type: 'warning' as const, message: e })),
      ...skippedRows.map(s => ({ type: 'info' as const, message: s }))
    ];

    return NextResponse.json({
      success: true,
      data: {
        totalRows: applications.length,
        processedRows: processedRows,
        sanctionedRows: validApplications.length,
        skippedRows: skippedRows.length,
        createdApplications: result.success,
        failedApplications: result.failed,
        errors: errors.length,
        errorDetails: allFeedback.slice(0, 15),
        summary: {
          uploaded: result.success,
          failed: result.failed + errors.length,
          skipped: skippedRows.length,
          total: applications.length,
          validRows: processedRows,
          sanctionedOnly: validApplications.length
        },
        applicationStats: {
          created: result.success,
          failed: result.failed,
          duplicates: result.errors.filter(e => e.includes('already exists')).length,
          validationErrors: errors.length,
          nonSanctioned: skippedRows.length
        }
      },
      message: result.success > 0 
        ? `Successfully uploaded ${result.success} sanctioned applications to Operations Dashboard! ${skippedRows.length > 0 ? `${skippedRows.length} non-sanctioned applications were automatically skipped. ` : ''}${errors.length > 0 ? `${errors.length} rows had errors. ` : ''}Only sanctioned applications from TaskName are imported for operations processing.`
        : `Upload processed but no sanctioned applications were created. ${skippedRows.length > 0 ? `${skippedRows.length} non-sanctioned applications were skipped. ` : ''}${errors.length > 0 ? `${errors.length} errors occurred. ` : ''}Only sanctioned applications are imported.`
    });

  } catch (error: unknown) {
    console.error('💥 JSON Bulk upload error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json(
      { 
        success: false, 
        error: `Failed to process applications: ${errorMessage}`,
        details: 'Please check the data format and ensure all required fields are provided.'
      },
      { status: 500 }
    );
  }
}
