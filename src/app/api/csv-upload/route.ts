import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { CsvApplication, CsvUploadResult } from '@/lib/models/CsvApplication';
import csv from 'csv-parser';
import { Readable } from 'stream';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const applicationName = formData.get('applicationName') as string;

    if (!file) {
      return NextResponse.json(
        { success: false, message: 'No file uploaded' },
        { status: 400 }
      );
    }

    if (!applicationName) {
      return NextResponse.json(
        { success: false, message: 'Application name is required' },
        { status: 400 }
      );
    }

    if (!file.name.toLowerCase().endsWith('.csv')) {
      return NextResponse.json(
        { success: false, message: 'Only CSV files are allowed' },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();
    const collection = db.collection<CsvApplication>('csv_applications');

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    const results: Array<Record<string, any>> = [];
    const errors: Array<{ row: number; error: string; data?: Record<string, any> }> = [];
    let rowCount = 0;

    const stream = Readable.from(buffer.toString());

    const parsePromise = new Promise<void>((resolve, reject) => {
      stream
        .pipe(csv({
          headers: true
        }))
        .on('data', (data: Record<string, any>) => {
          rowCount++;
          try {
            if (Object.keys(data).length === 0) {
              errors.push({
                row: rowCount,
                error: 'Empty row',
                data
              });
              return;
            }

            const cleanedData: Record<string, any> = {};
            for (const [key, value] of Object.entries(data)) {
              const cleanKey = key.trim();
              const cleanValue = typeof value === 'string' ? value.trim() : value;
              
              if (cleanKey && cleanValue !== '') {
                cleanedData[cleanKey] = cleanValue;
              }
            }

            if (Object.keys(cleanedData).length > 0) {
              results.push({
                ...cleanedData,
                _csvRowNumber: rowCount,
                _processedAt: new Date()
              });
            } else {
              errors.push({
                row: rowCount,
                error: 'No valid data in row',
                data
              });
            }
          } catch (error) {
            errors.push({
              row: rowCount,
              error: `Row parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`,
              data
            });
          }
        })
        .on('end', resolve)
        .on('error', reject);
    });

    await parsePromise;

    const csvApplication: CsvApplication = {
      applicationName,
      uploadedAt: new Date(),
      fileName: file.name,
      fileSize: file.size,
      totalRecords: rowCount,
      processedRecords: results.length,
      failedRecords: errors.length,
      status: errors.length > 0 ? 'completed' : 'completed',
      data: results,
      errors: errors.length > 0 ? errors : undefined,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const insertResult = await collection.insertOne(csvApplication);

    const response: CsvUploadResult = {
      success: true,
      applicationId: insertResult.insertedId.toString(),
      message: `CSV file processed successfully. ${results.length} records processed, ${errors.length} errors.`,
      totalRecords: rowCount,
      processedRecords: results.length,
      failedRecords: errors.length,
      errors: errors.length > 0 ? errors.slice(0, 10) : undefined
    };

    return NextResponse.json(response, { status: 201 });

  } catch (error) {
    console.error('CSV upload error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: `Failed to process CSV file: ${error instanceof Error ? error.message : 'Unknown error'}` 
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const { db } = await connectToDatabase();
    const collection = db.collection<CsvApplication>('csv_applications');

    const applications = await collection
      .find({}, {
        projection: {
          data: 0
        }
      })
      .sort({ uploadedAt: -1 })
      .limit(50)
      .toArray();

    return NextResponse.json({
      success: true,
      applications
    });

  } catch (error) {
    console.error('Failed to fetch CSV applications:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to fetch applications' 
      },
      { status: 500 }
    );
  }
}