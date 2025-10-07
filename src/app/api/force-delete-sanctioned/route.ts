import { NextRequest, NextResponse } from 'next/server';
import { SanctionedApplicationModel } from '@/lib/models/SanctionedApplication';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { appNo } = body;
    
    if (!appNo) {
      return NextResponse.json({
        success: false,
        error: 'Application number is required'
      }, { status: 400 });
    }
    
    console.log(`🗑️ FORCE DELETE: Removing application ${appNo} from sanctioned cases (triggered externally)...`);
    
    // Delete from sanctioned_applications collection
    const deleted = await SanctionedApplicationModel.deleteSanctionedApplication(appNo);
    
    if (deleted) {
      console.log(`✅ Successfully force deleted application ${appNo} from sanctioned cases`);
      
      return NextResponse.json({
        success: true,
        message: `Application ${appNo} force removed from sanctioned cases`,
        data: {
          appNo,
          deleted: true,
          timestamp: new Date().toISOString()
        }
      });
    } else {
      console.log(`ℹ️ Application ${appNo} was not found in sanctioned cases`);
      
      return NextResponse.json({
        success: false,
        message: `Application ${appNo} was not found in sanctioned cases`,
        data: {
          appNo,
          deleted: false,
          timestamp: new Date().toISOString()
        }
      });
    }
    
  } catch (error) {
    console.error('❌ Error in force delete:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}