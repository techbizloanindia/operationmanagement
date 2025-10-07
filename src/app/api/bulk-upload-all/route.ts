import { NextRequest, NextResponse } from 'next/server';
import { ApplicationModel, CreateApplicationData } from '@/lib/models/Application';

// Helper function to parse CSV properly handling quoted fields
function parseCSVLine(line: string): string[] {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
}

// Helper function to parse dates
function parseDate(dateStr: string): Date {
  if (!dateStr) return new Date();
  
  const formats = [
    /(\d{4})-(\d{2})-(\d{2})/,
    /(\d{2})\/(\d{2})\/(\d{4})/,
    /(\d{2})-(\d{2})-(\d{4})/,
    /(\d{2})\.(\d{2})\.(\d{4})/,
  ];
  
  for (const format of formats) {
    const match = dateStr.match(format);
    if (match) {
      if (format === formats[0]) {
        return new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
      } else {
        return new Date(parseInt(match[3]), parseInt(match[1]) - 1, parseInt(match[2]));
      }
    }
  }
  
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? new Date() : date;
}

export async function POST(request: NextRequest) {
  try {
    console.log('📁 Bulk upload ALL data request received');
    
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({
        success: false,
        error: 'No file provided'
      }, { status: 400 });
    }

    // Validate file
    if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
      return NextResponse.json({
        success: false,
        error: `Invalid file type: ${file.type}. Only CSV files are allowed`
      }, { status: 400 });
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json({
        success: false,
        error: `File too large: ${(file.size / 1024 / 1024).toFixed(2)}MB. Max 10MB allowed`
      }, { status: 400 });
    }

    // Read and parse CSV
    const fileContent = await file.text();
    const lines = fileContent.split('\n').filter(line => line.trim());

    if (lines.length < 2) {
      return NextResponse.json({
        success: false,
        error: 'CSV must contain header and at least one data row'
      }, { status: 400 });
    }

    const header = parseCSVLine(lines[0]).map(col => col.toLowerCase().trim().replace(/\s+/g, '_'));
    
    // Required field mapping
    const requiredFields = [
      { field: 'app_no', alternatives: ['app.no', 'app_no', 'appno', 'application_no', 'app_id', 'id'] },
      { field: 'customer_name', alternatives: ['name', 'customer_name', 'customer', 'client_name', 'applicant_name'] },
      { field: 'branch_name', alternatives: ['branchname', 'branch_name', 'branch', 'location'] },
      { field: 'task_name', alternatives: ['taskname', 'task_name', 'status', 'app_status', 'application_status'] }
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
      return NextResponse.json({
        success: false,
        error: `Missing required columns: ${missingFields.join(', ')}`,
        availableColumns: header,
        requiredColumns: ['App.No', 'Name', 'BranchName', 'TaskName']
      }, { status: 400 });
    }

    // Optional field mapping
    const optionalMapping: { [key: string]: number } = {};
    const optionalFields = [
      { field: 'app_date', alternatives: ['appdate', 'app_date', 'application_date', 'date'] },
      { field: 'loan_no', alternatives: ['loanno', 'loan_no', 'loan_number', 'loan_id'] },
      { field: 'amount', alternatives: ['amount', 'loan_amount', 'requested_amount'] },
      { field: 'email', alternatives: ['email', 'email_id', 'customer_email'] },
      { field: 'app_status', alternatives: ['app_status', 'application_status', 'current_status'] },
      { field: 'login_fee', alternatives: ['login_fee', 'processing_fee', 'fee'] },
      { field: 'sanction_amount', alternatives: ['sanction_amount', 'sanctioned_amount', 'approved_amount'] },
      { field: 'sanction_date', alternatives: ['sanction_date', 'sanctioned_date', 'approval_date'] },
      { field: 'login', alternatives: ['login', 'login_id', 'user_login'] },
      { field: 'salesexec', alternatives: ['salesexec', 'sales_exec', 'sales_executive', 'sale_exec', 'login', 'login_id', 'user_login'] },
      { field: 'asset_type', alternatives: ['asset_type', 'asset', 'property_type'] }
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

    // Process ALL rows (no filtering)
    const applications: CreateApplicationData[] = [];
    const errors: string[] = [];
    let processedRows = 0;

    for (let i = 1; i < lines.length; i++) {
      try {
        const row = parseCSVLine(lines[i]);
        
        // Extract required fields
        const appNo = row[columnMapping.app_no]?.trim() || '';
        const customerName = row[columnMapping.customer_name]?.trim() || '';
        const branchName = row[columnMapping.branch_name]?.trim() || '';
        const taskNameRaw = row[columnMapping.task_name]?.trim() || '';

        if (!appNo || !customerName || !branchName) {
          errors.push(`Row ${i + 1}: Missing required data`);
          continue;
        }

        // Extract optional fields
        const appDate = optionalMapping.app_date !== undefined ? row[optionalMapping.app_date]?.trim() : '';
        const loanNo = optionalMapping.loan_no !== undefined ? row[optionalMapping.loan_no]?.trim() || '' : '';
        const amount = optionalMapping.amount !== undefined ? parseFloat(row[optionalMapping.amount]?.replace(/[^\d.-]/g, '') || '0') : 0;
        const email = optionalMapping.email !== undefined ? row[optionalMapping.email]?.trim() || '' : '';
        const appStatus = optionalMapping.app_status !== undefined ? row[optionalMapping.app_status]?.trim() || '' : '';
        const loginFee = optionalMapping.login_fee !== undefined ? parseFloat(row[optionalMapping.login_fee]?.replace(/[^\d.-]/g, '') || '0') : 0;
        const sanctionAmount = optionalMapping.sanction_amount !== undefined ? parseFloat(row[optionalMapping.sanction_amount]?.replace(/[^\d.-]/g, '') || '0') : 0;
        const sanctionDateStr = optionalMapping.sanction_date !== undefined ? row[optionalMapping.sanction_date]?.trim() : '';
        const login = optionalMapping.login !== undefined ? row[optionalMapping.login]?.trim() || '' : '';
        const salesExec = optionalMapping.salesexec !== undefined ? row[optionalMapping.salesexec]?.trim() || '' : '';
        const assetType = optionalMapping.asset_type !== undefined ? row[optionalMapping.asset_type]?.trim() || '' : '';

        const appliedDate = appDate ? parseDate(appDate) : new Date();
        const sanctionDate = sanctionDateStr ? parseDate(sanctionDateStr) : undefined;
        const finalAmount = sanctionAmount > 0 ? sanctionAmount : (amount > 0 ? amount : undefined);

        // Create application data for ALL rows
        const applicationData: CreateApplicationData = {
          appId: appNo,
          customerName,
          branch: branchName,
          status: 'pending', // Default status since we're not filtering
          amount: finalAmount,
          appliedDate,
          priority: 'medium',
          loanType: 'Personal Loan',
          customerPhone: '',
          customerEmail: email,
          documentStatus: 'Pending',
          remarks: `Imported from CSV - Status: ${taskNameRaw}${salesExec ? `, Sales Exec: ${salesExec}` : ''}`,
          uploadedBy: 'Bulk Upload System (All Data)',
          loanNo,
          appStatus: appStatus || taskNameRaw,
          loginFee: loginFee > 0 ? loginFee : undefined,
          sanctionAmount: sanctionAmount > 0 ? sanctionAmount : undefined,
          login: salesExec || login || undefined, // Use salesExec primarily, fallback to login
          salesExec: salesExec || undefined,
          assetType: assetType || undefined
        };

        applications.push(applicationData);
        processedRows++;
        
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`Row ${i + 1}: ${errorMessage}`);
      }
    }

    if (applications.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No valid applications found in CSV file',
        details: errors
      }, { status: 400 });
    }

    // Clear existing applications
    console.log('🗑️ Clearing existing applications...');
    let clearResult;
    try {
      clearResult = await ApplicationModel.clearAllApplications();
    } catch (error) {
      return NextResponse.json({
        success: false,
        error: 'Failed to clear existing applications',
        details: error instanceof Error ? error.message : 'Database error'
      }, { status: 500 });
    }

    // Save all applications
    console.log('💾 Saving ALL applications to database...');
    let result;
    try {
      result = await ApplicationModel.bulkCreateApplications(applications);
    } catch (error) {
      return NextResponse.json({
        success: false,
        error: 'Failed to save applications',
        details: error instanceof Error ? error.message : 'Database error'
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: {
        fileName: file.name,
        fileSize: file.size,
        totalRows: lines.length - 1,
        processedRows: processedRows,
        createdApplications: result.success,
        failedApplications: result.failed,
        duplicateApplications: result.duplicates,
        clearedApplications: clearResult.deletedCount,
        errors: errors.length
      },
      message: `Successfully uploaded ${result.success} applications from CSV! Cleared ${clearResult.deletedCount} existing applications first.`
    });

  } catch (error: unknown) {
    console.error('💥 Upload error:', error);
    return NextResponse.json({
      success: false,
      error: `Failed to process file: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, { status: 500 });
  }
}
