import { NextRequest, NextResponse } from 'next/server';
import { SanctionedApplicationModel, CreateSanctionedApplicationData } from '@/lib/models/SanctionedApplicationClean';

// Helper function to parse CSV properly handling quoted fields
function parseCSVLine(line: string): string[] {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote
        current += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // End of field
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  // Add the last field
  result.push(current.trim());
  return result;
}

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
    console.log('📁 Bulk upload request received');
    
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      console.log('❌ No file provided');
      return NextResponse.json(
        { 
          success: false, 
          error: 'No file provided',
          help: 'Please select a CSV file to upload'
        },
        { status: 400 }
      );
    }

    console.log(`📋 Processing file: ${file.name}, Size: ${file.size} bytes, Type: ${file.type}`);

    // Validate file type
    if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
      console.log('❌ Invalid file type:', file.type);
      return NextResponse.json(
        { 
          success: false, 
          error: `Invalid file type: ${file.type}. Only CSV files are allowed`,
          help: 'Please upload a file with .csv extension'
        },
        { status: 400 }
      );
    }

    // Validate file size (5MB limit for better memory management)
    const maxSize = 5 * 1024 * 1024; // 5MB (reduced from 10MB)
    if (file.size > maxSize) {
      console.log('❌ File too large:', file.size);
      const sizeMB = (file.size / 1024 / 1024).toFixed(2);
      return NextResponse.json(
        { 
          success: false, 
          error: `File size too large: ${sizeMB}MB. Maximum allowed size is 5MB`,
          help: 'Please reduce the file size or split it into smaller files. For larger files, use the streaming upload endpoint.'
        },
        { status: 400 }
      );
    }

    // Read file content
    const fileContent = await file.text();
    const lines = fileContent.split('\n').filter(line => line.trim());

    console.log(`📊 File contains ${lines.length} lines`);
    
    // Process in smaller chunks to prevent memory issues
    const CHUNK_SIZE = 50; // Process 50 records at a time
    const totalLines = lines.length;
    
    if (totalLines > 5000) {
      return NextResponse.json(
        { 
          success: false, 
          error: `File contains too many records: ${totalLines}. Maximum allowed is 5000 records.`,
          help: 'Please split your file into smaller batches for better performance and memory management.'
        },
        { status: 400 }
      );
    }

    if (lines.length < 2) {
      console.log('❌ Insufficient data in file');
      return NextResponse.json(
        { 
          success: false, 
          error: 'CSV file must contain header and at least one data row' 
        },
        { status: 400 }
      );
    }

    // Parse CSV header using improved parser
    const header = parseCSVLine(lines[0]).map(col => col.toLowerCase().trim().replace(/\s+/g, '_'));
    
    console.log('📋 CSV Headers found:', header);
    
    // Updated required fields mapping for user's specific requirements
    const requiredFields = [
      { 
        field: 'app_no', 
        alternatives: ['app.no', 'app_no', 'appno', 'application_no', 'application_number', 'app_id', 'id'] 
      },
      { 
        field: 'customer_name', 
        alternatives: ['name', 'customer_name', 'customer', 'client_name', 'applicant_name'] 
      },
      { 
        field: 'branch_name', 
        alternatives: ['branchname', 'branch_name', 'branch', 'location'] 
      },
      { 
        field: 'sanction_amount', 
        alternatives: ['sanction_amount', 'sanctioned_amount', 'approved_amount', 'final_amount', 'amount'] 
      }
    ];

    const columnMapping: { [key: string]: number } = {};
    const missingFields = [];

    for (const required of requiredFields) {
      let found = false;
      for (const alt of required.alternatives) {
        const index = header.indexOf(alt);
        if (index !== -1) {
          columnMapping[required.field] = index;
          found = true;
          break;
        }
      }
      if (!found) {
        missingFields.push(required.field);
      }
    }
    
    if (missingFields.length > 0) {
      console.log('❌ Missing required columns:', missingFields);
      console.log('💡 Available columns:', header);
      return NextResponse.json(
        { 
          success: false, 
          error: `Missing required columns: ${missingFields.join(', ')}. Found columns: ${header.join(', ')}`,
          suggestion: 'Please ensure your CSV has columns: App.No, Name, BranchName, and Sanction Amount. Column names are case-insensitive.',
          availableColumns: header,
          requiredColumns: ['App.No', 'Name', 'BranchName', 'Sanction Amount'],
          optionalColumns: ['AppDate', 'LoanNo', 'Email', 'Product', 'TaskName', 'Login', 'SalesExec', 'ReceivedOn', 'Location', 'Asset Type', 'App Status', 'Sanction Date']
        },
        { status: 400 }
      );
    }

    console.log('✅ Column mapping:', columnMapping);

    // Updated optional column mapping for user's specific requirements (exactly as specified)
    const optionalMapping: { [key: string]: number } = {};
    const optionalFields = [
      { field: 'app_date', alternatives: ['appdate', 'app_date', 'application_date', 'date', 'applied_date'] },
      { field: 'loan_no', alternatives: ['loanno', 'loan_no', 'loan_number', 'loan_id'] },
      { field: 'email', alternatives: ['email', 'email_id', 'customer_email'] },
      { field: 'product', alternatives: ['product', 'loan_type', 'loan_product', 'service'] },
      { field: 'task_name', alternatives: ['taskname', 'task_name', 'status', 'app_status', 'application_status'] },
      { field: 'login', alternatives: ['login', 'login_id', 'user_login', 'username'] },
      { field: 'salesexec', alternatives: ['salesexec', 'sales_exec', 'sales_executive', 'sale_exec', 'login', 'login_id', 'user_login', 'username'] },
      { field: 'received_on', alternatives: ['received_on', 'receivedon', 'received_date', 'received'] },
      { field: 'location', alternatives: ['location', 'place', 'city', 'area'] },
      { field: 'asset_type', alternatives: ['asset_type', 'asset', 'property_type', 'collateral_type'] },
      { field: 'app_status', alternatives: ['app_status', 'application_status', 'current_status'] },
      { field: 'sanction_date', alternatives: ['sanction_date', 'sanctioned_date', 'approval_date', 'approved_date'] }
    ];
    
    for (const fieldObj of optionalFields) {
      for (const alt of fieldObj.alternatives) {
        const index = header.indexOf(alt);
        if (index !== -1) {
          optionalMapping[fieldObj.field] = index;
          break;
        }
      }
    }

    console.log('📋 Optional column mapping:', optionalMapping);

    // Parse data rows and create sanctioned applications
    const sanctionedApplications: CreateSanctionedApplicationData[] = [];
    const errors: string[] = [];
    const skippedRows: string[] = [];
    let processedRows = 0;

    for (let i = 1; i < lines.length; i++) {
      try {
        const row = parseCSVLine(lines[i]);
        
        if (row.length < Math.max(...Object.values(columnMapping)) + 1) {
          errors.push(`Row ${i + 1}: Insufficient columns (expected at least ${Math.max(...Object.values(columnMapping)) + 1}, got ${row.length})`);
          continue;
        }

        // Extract required fields with enhanced cleaning
        const appNo = row[columnMapping.app_no]?.trim().replace(/\s+/g, ' ') || '';
        const customerName = row[columnMapping.customer_name]?.trim().replace(/\s+/g, ' ') || '';
        const branchName = row[columnMapping.branch_name]?.trim().replace(/\s+/g, ' ') || '';
        const sanctionAmountRaw = row[columnMapping.sanction_amount]?.trim() || '';
        
        // Parse sanction amount
        const sanctionAmount = parseFloat(sanctionAmountRaw.replace(/[^\d.-]/g, '') || '0');

        // Validate required fields
        if (!appNo || !customerName || !branchName || sanctionAmount <= 0) {
          errors.push(`Row ${i + 1}: Missing required data - App.No: "${appNo}", Name: "${customerName}", Branch: "${branchName}", Sanction Amount: "${sanctionAmountRaw}"`);
          continue;
        }

        // Since we have sanction amount as required field, we assume all records are sanctioned applications

        // Extract optional fields (only the specified columns exactly as user requested)
        const appDate = optionalMapping.app_date !== undefined ? 
          row[optionalMapping.app_date]?.trim() : '';
        const loanNo = optionalMapping.loan_no !== undefined ? 
          row[optionalMapping.loan_no]?.trim() || '' : '';
        const email = optionalMapping.email !== undefined ? 
          row[optionalMapping.email]?.trim() || '' : '';
        const product = optionalMapping.product !== undefined ? 
          row[optionalMapping.product]?.trim() || '' : '';
        const taskName = optionalMapping.task_name !== undefined ? 
          row[optionalMapping.task_name]?.trim() || '' : '';
        const login = optionalMapping.login !== undefined ? 
          row[optionalMapping.login]?.trim() || '' : '';
        const salesExec = optionalMapping.salesexec !== undefined ? 
          row[optionalMapping.salesexec]?.trim() || '' : '';
        const receivedOn = optionalMapping.received_on !== undefined ? 
          row[optionalMapping.received_on]?.trim() : '';
        const location = optionalMapping.location !== undefined ? 
          row[optionalMapping.location]?.trim() || '' : '';
        const assetType = optionalMapping.asset_type !== undefined ? 
          row[optionalMapping.asset_type]?.trim() || '' : '';
        const appStatus = optionalMapping.app_status !== undefined ? 
          row[optionalMapping.app_status]?.trim() || '' : '';
        const sanctionDateStr = optionalMapping.sanction_date !== undefined ? 
          row[optionalMapping.sanction_date]?.trim() : '';

        // Parse application date and other dates
        const appliedDate = appDate ? parseDate(appDate) : new Date();
        const sanctionDate = sanctionDateStr ? parseDate(sanctionDateStr) : new Date();
        const receivedDate = receivedOn ? parseDate(receivedOn) : undefined;

        // Create sanctioned application data with all the specified columns
        const sanctionedApplicationData: CreateSanctionedApplicationData = {
          appId: appNo,
          customerName,
          branch: branchName,
          sanctionedAmount: sanctionAmount,
          loanType: product || assetType || taskName || 'Personal Loan',
          interestRate: undefined,
          processingFee: undefined,
          customerPhone: '', // Not available in CSV
          customerEmail: email,
          sanctionedBy: 'Bulk Upload System',
          approvedBy: salesExec || login || undefined, // Use salesExec primarily, fallback to login
          remarks: `Imported from CSV${appDate ? ` - App Date: ${appDate}` : ''}${loanNo ? `, Loan No: ${loanNo}` : ''}${product ? `, Product: ${product}` : ''}${taskName ? `, Task: ${taskName}` : ''}${salesExec ? `, Sales Exec: ${salesExec}` : ''}${receivedOn ? `, Received: ${receivedOn}` : ''}${location ? `, Location: ${location}` : ''}${assetType ? `, Asset Type: ${assetType}` : ''}${appStatus ? `, Status: ${appStatus}` : ''}`,
          conditions: [],
          validityPeriod: 6, // Default 6 months
          originalAppId: appNo,
          loanNo: loanNo || undefined,
          salesExec: salesExec || undefined
        };

        sanctionedApplications.push(sanctionedApplicationData);
        processedRows++;
        
        console.log(`✅ Row ${i + 1}: Processed application ${appNo} for ${customerName} with sanction amount ₹${sanctionAmount}`);
        
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        errors.push(`Row ${i + 1}: ${errorMessage}`);
      }
    }

    console.log(`📊 Processing Summary:`);
    console.log(`- Total rows processed: ${processedRows}`);
    console.log(`- Applications with valid data: ${sanctionedApplications.length}`);
    console.log(`- Rows skipped: ${skippedRows.length}`);
    console.log(`- Errors encountered: ${errors.length}`);

    if (sanctionedApplications.length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'No valid applications found in CSV file',
          details: [
            '📋 **What was found in your CSV:**',
            `- Total rows processed: ${processedRows}`,
            `- Rows with errors: ${errors.length}`,
            `- Rows skipped (non-sanctioned): ${skippedRows.length}`,
            '',
            '🔍 **Sanction Detection Keywords (what we\'re looking for):**',
            'sanction, sanctioned, loan sanctioned, sanction approved, approved, completed, disbursed, successful, active, etc.',
            '',
            '📝 **Sample TaskName values from your CSV:**',
            ...skippedRows.slice(0, 5).map(skip => `  - ${skip}`),
            '',
            '💡 **Solutions:**',
            '1. Check if your TaskName column contains sanction/approval keywords',
            '2. Use /api/bulk-upload-all endpoint to upload ALL data (no filtering)',
            '3. Use /csv-diagnostic page to analyze your CSV file',
            '4. Update TaskName values to include "sanctioned" or "approved" keywords'
          ],
          summary: {
            totalRows: lines.length - 1,
            processedRows,
            sanctionedFound: 0,
            skippedNonSanctioned: skippedRows.length,
            errors: errors.length
          },
          alternativeEndpoint: '/api/bulk-upload-all',
          diagnosticTool: '/csv-diagnostic'
        },
        { status: 400 }
      );
    }

    // Clear all existing applications before uploading new ones
    console.log('🗑️ Clearing all existing applications from database...');
    let clearResult;
    try {
      // Clear all sanctioned applications to replace with new CSV data
      clearResult = await SanctionedApplicationModel.clearAllSanctionedApplications();
      console.log(`✅ Cleared ${clearResult.deletedCount} existing sanctioned applications`);
    } catch (error) {
      console.error('❌ Error clearing sanctioned applications:', error);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to clear existing sanctioned applications from database',
          details: error instanceof Error ? error.message : 'Unknown database error',
          help: 'Please check MongoDB connection and try again'
        },
        { status: 500 }
      );
    }

    // Bulk create sanctioned applications in database
    console.log('💾 Creating sanctioned applications in database...');
    let result;
    try {
      result = await SanctionedApplicationModel.bulkCreateSanctionedApplications(sanctionedApplications);
      console.log(`✅ Database operation complete: ${result.success} created, ${result.failed} failed, ${result.duplicates} duplicates ignored`);
    } catch (error) {
      console.error('❌ Error creating sanctioned applications:', error);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to save sanctioned applications to database',
          details: error instanceof Error ? error.message : 'Unknown database error',
          data: {
            processed: sanctionedApplications.length,
            cleared: clearResult?.deletedCount || 0,
            errors: errors.length,
            skipped: skippedRows.length
          },
          help: 'Sanctioned applications were processed but failed to save. Please check MongoDB connection.'
        },
        { status: 500 }
      );
    }

    // Combine all feedback
    const allFeedback = [...errors, ...skippedRows];

    return NextResponse.json({
      success: true,
      data: {
        fileName: file.name,
        fileSize: file.size,
        totalRows: lines.length - 1,
        processedRows: processedRows,
        sanctionedRows: sanctionedApplications.length,
        skippedRows: skippedRows.length,
        createdApplications: result.success,
        failedApplications: result.failed,
        duplicateApplications: result.duplicates,
        clearedApplications: clearResult.deletedCount,
        errors: errors.length,
        errorDetails: allFeedback.slice(0, 15), // Return first 15 items
        summary: {
          uploaded: result.success,
          failed: result.failed + errors.length,
          skipped: skippedRows.length,
          duplicates: result.duplicates,
          cleared: clearResult.deletedCount,
          total: lines.length - 1,
          validRows: processedRows,
          sanctionedOnly: sanctionedApplications.length
        },
        applicationStats: {
          created: result.success,
          failed: result.failed,
          duplicates: result.duplicates,
          cleared: clearResult.deletedCount,
          validationErrors: errors.length,
          nonSanctioned: skippedRows.length
        },
        columnMapping: {
          required: columnMapping,
          optional: optionalMapping,
          detected: header
        }
      },
      message: result.success > 0 
        ? `Successfully uploaded ${result.success} sanctioned applications from CSV! ${clearResult.deletedCount} existing sanctioned applications were cleared first. ${result.duplicates > 0 ? `${result.duplicates} duplicates were ignored. ` : ''}${skippedRows.length > 0 ? `${skippedRows.length} non-sanctioned applications were automatically skipped. ` : ''}${errors.length > 0 ? `${errors.length} rows had errors. ` : ''}Data stored in sanctioned_applications collection.`
        : `Upload processed but no sanctioned applications were created. ${clearResult.deletedCount} existing sanctioned applications were cleared. ${result.duplicates > 0 ? `${result.duplicates} duplicates were ignored. ` : ''}${skippedRows.length > 0 ? `${skippedRows.length} non-sanctioned applications were skipped. ` : ''}${errors.length > 0 ? `${errors.length} errors occurred. ` : ''}Only "Sanctioned" applications are imported.`
    });

  } catch (error: unknown) {
    console.error('💥 Bulk upload error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json(
      { 
        success: false, 
        error: `Failed to process file: ${errorMessage}`,
        details: 'Please check the file format and ensure it contains the required columns: App.No, Name, BranchName, TaskName.'
      },
      { status: 500 }
    );
  }
} 