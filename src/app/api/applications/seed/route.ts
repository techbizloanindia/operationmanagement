import { NextResponse } from 'next/server';
import { ApplicationModel } from '@/lib/models/Application';

export async function POST() {
  try {
    return NextResponse.json({
      success: true,
      message: 'Sample application seeding is disabled. Use bulk upload for production data.',
      data: null
    });

  } catch (error) {
    console.error('Error in seed endpoint:', error);
    return NextResponse.json({
      success: false,
      error: 'Seed endpoint error'
    }, { status: 500 });
  }
} 