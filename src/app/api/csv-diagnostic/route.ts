import { NextRequest, NextResponse } from 'next/server';

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

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({
        success: false,
        error: 'No file provided'
      }, { status: 400 });
    }

    // Read file content
    const fileContent = await file.text();
    const lines = fileContent.split('\n').filter(line => line.trim());

    // Parse CSV header
    const header = parseCSVLine(lines[0]).map(col => col.toLowerCase().trim().replace(/\s+/g, '_'));
    
    // Check for required fields
    const requiredFields = ['app.no', 'app_no', 'name', 'branchname', 'branch_name', 'taskname', 'task_name'];
    const foundRequired = header.filter(col => 
      requiredFields.some(req => col.includes(req.toLowerCase()) || req.includes(col))
    );

    // Sample first few data rows
    const sampleRows = [];
    for (let i = 1; i < Math.min(6, lines.length); i++) {
      const row = parseCSVLine(lines[i]);
      sampleRows.push(row);
    }

    // Check TaskName values for sanction keywords
    const taskNameIndex = header.findIndex(col => 
      ['taskname', 'task_name', 'status', 'app_status'].includes(col)
    );
    
    const sanctionKeywords = [
      'sanction', 'sanctioned', 'sanctions', 'sanctioning',
      'loan sanctioned', 'sanctioned loan', 'sanction complete',
      'sanction approved', 'approved sanction', 'sanctioned amount',
      'final sanction', 'sanctioned case', 'sanctioned application'
    ];

    const taskNameAnalysis = [];
    if (taskNameIndex !== -1) {
      for (let i = 1; i < Math.min(11, lines.length); i++) {
        const row = parseCSVLine(lines[i]);
        const taskName = row[taskNameIndex]?.toLowerCase().trim() || '';
        const isSanctioned = sanctionKeywords.some(keyword => taskName.includes(keyword));
        taskNameAnalysis.push({
          row: i + 1,
          taskName: row[taskNameIndex] || '',
          isSanctioned,
          matchedKeywords: sanctionKeywords.filter(keyword => taskName.includes(keyword))
        });
      }
    }

    return NextResponse.json({
      success: true,
      diagnostic: {
        fileName: file.name,
        fileSize: file.size,
        totalLines: lines.length,
        header: {
          original: parseCSVLine(lines[0]),
          normalized: header,
          requiredFieldsFound: foundRequired
        },
        sampleData: sampleRows,
        taskNameAnalysis: {
          columnIndex: taskNameIndex,
          columnName: taskNameIndex !== -1 ? header[taskNameIndex] : 'NOT_FOUND',
          sampleValues: taskNameAnalysis
        },
        sanctionKeywords: sanctionKeywords,
        recommendations: [
          taskNameIndex === -1 ? '❌ TaskName column not found - check column names' : '✅ TaskName column found',
          foundRequired.length === 0 ? '❌ No required columns found' : `✅ Found ${foundRequired.length} required fields`,
          taskNameAnalysis.filter(t => t.isSanctioned).length === 0 ? '❌ No sanctioned applications detected' : `✅ Found ${taskNameAnalysis.filter(t => t.isSanctioned).length} sanctioned applications`
        ]
      }
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json({
      success: false,
      error: `Diagnostic failed: ${errorMessage}`,
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}
