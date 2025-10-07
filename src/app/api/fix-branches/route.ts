import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';

// CORRECTED Branch mapping based on application number prefixes
const branchMapping: { [key: string]: { name: string; code: string } } = {
  'FRI': { name: 'North-Faridabad', code: 'FRI' },
  'FR2': { name: 'North-Badarpur', code: 'FR2' },
  'GGN': { name: 'North-Gurugram', code: 'GGN' },
  'DEL': { name: 'Delhi Main Branch', code: 'DEL' },
  'MUM': { name: 'Mumbai Central Branch', code: 'MUM' },
  'BLR': { name: 'Bangalore IT Branch', code: 'BLR' },
  'CHN': { name: 'Chennai Port Branch', code: 'CHN' },
  'KOL': { name: 'Kolkata Central Branch', code: 'KOL' },
  'PUN': { name: 'Pune West Branch', code: 'PUN' },
  // Additional mappings for common variations
  'BAD': { name: 'North-Badarpur', code: 'FR2' },
  'FAR': { name: 'North-Faridabad', code: 'FRI' },
  'GUR': { name: 'North-Gurugram', code: 'GGN' }
};

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Starting branch fix operation...');
    
    const { db } = await connectDB();
    const collection = db.collection('queries');
    
    // Find all queries with "Unknown Branch", empty branch, OR inconsistent branchCode
    const problematicQueries = await collection.find({
      $or: [
        { branch: 'Unknown Branch' },
        { branch: { $exists: false } },
        { branch: '' },
        { branch: null },
        // Also fix queries where branchCode doesn't match the expected pattern
        { branchCode: { $regex: /^North-/ } }, // branchCode should be short codes like FRI, FR2, not full names
        { branchCode: { $exists: false } },
        { branchCode: '' },
        { branchCode: null }
      ]
    }).toArray();
    
    console.log(`Found ${problematicQueries.length} queries with branch issues`);
    
    let updatedCount = 0;
    const updateResults = [];
    
    for (const query of problematicQueries) {
      let newBranch = 'North-Faridabad'; // Default
      let newBranchCode = 'FRI';
      
      // Extract prefix from application number
      if (query.appNo) {
        const prefix = query.appNo.match(/^([A-Z0-9]+)/)?.[1];
        if (prefix && branchMapping[prefix]) {
          newBranch = branchMapping[prefix].name;
          newBranchCode = branchMapping[prefix].code;
        }
      }
      
      // Update the query
      const result = await collection.updateOne(
        { _id: query._id },
        {
          $set: {
            branch: newBranch,
            branchCode: newBranchCode,
            applicationBranch: newBranch,
            applicationBranchCode: newBranchCode
          }
        }
      );
      
      if (result.modifiedCount > 0) {
        updatedCount++;
        updateResults.push({
          appNo: query.appNo,
          oldBranch: query.branch || 'Unknown Branch',
          newBranch: newBranch,
          newBranchCode: newBranchCode
        });
        console.log(`✅ Updated ${query.appNo}: ${newBranch} (${newBranchCode})`);
      }
    }
    
    console.log(`🎉 Successfully updated ${updatedCount} queries with proper branch names`);
    
    return NextResponse.json({
      success: true,
      message: `Successfully updated ${updatedCount} queries with proper branch names`,
      updatedQueries: updateResults,
      totalFound: problematicQueries.length,
      totalUpdated: updatedCount
    });
    
  } catch (error) {
    console.error('❌ Error fixing branches:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fix branches',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
