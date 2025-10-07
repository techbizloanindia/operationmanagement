import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';

// COMPREHENSIVE BRANCH MAPPING - All 32 branches (CORRECTED CODES)
const ALL_BRANCHES = [
  // NORTH REGION (26 branches)
  { name: 'North-Alipur', code: 'ALI', region: 'North', state: 'Delhi', city: 'Alipur' },
  { name: 'North-Badarpur', code: 'FR2', region: 'North', state: 'Delhi', city: 'Badarpur' },
  { name: 'North-Behror', code: 'BHR', region: 'North', state: 'Rajasthan', city: 'Behror' },
  { name: 'North-Bhiwadi', code: 'BHI', region: 'North', state: 'Rajasthan', city: 'Bhiwadi' },
  { name: 'North-Bulandshahr', code: 'BSH', region: 'North', state: 'Uttar Pradesh', city: 'Bulandshahr' },
  { name: 'North-East Delhi', code: 'EAD', region: 'North', state: 'Delhi', city: 'East Delhi' },
  { name: 'North-Faridabad', code: 'FRI', region: 'North', state: 'Haryana', city: 'Faridabad' },
  { name: 'North-Ghaziabad', code: 'GZB', region: 'North', state: 'Uttar Pradesh', city: 'Ghaziabad' },
  { name: 'North-Goverdhan', code: 'GOV', region: 'North', state: 'Uttar Pradesh', city: 'Goverdhan' },
  { name: 'North-Gurugram', code: 'GGN', region: 'North', state: 'Haryana', city: 'Gurugram' },
  { name: 'North-Hapur', code: 'HPR', region: 'North', state: 'Uttar Pradesh', city: 'Hapur' },
  { name: 'North-Jewar', code: 'JEW', region: 'North', state: 'Uttar Pradesh', city: 'Jewar' },
  { name: 'North-Karnal', code: 'KNL', region: 'North', state: 'Haryana', city: 'Karnal' },
  { name: 'North-Khairthal', code: 'KTL', region: 'North', state: 'Rajasthan', city: 'Khairthal' },
  { name: 'North-Loni', code: 'LON', region: 'North', state: 'Uttar Pradesh', city: 'Loni' },
  { name: 'North-Mathura', code: 'MAT', region: 'North', state: 'Uttar Pradesh', city: 'Mathura' },
  { name: 'North-Nangloi', code: 'NGL', region: 'North', state: 'Delhi', city: 'Nangloi' },
  { name: 'North-Narnaul', code: 'NRN', region: 'North', state: 'Haryana', city: 'Narnaul' },
  { name: 'North-Palwal', code: 'HDL', region: 'North', state: 'Haryana', city: 'Palwal' },
  { name: 'North-Panipat', code: 'PNI', region: 'North', state: 'Haryana', city: 'Panipat' },
  { name: 'North-Pataudi', code: 'PAT', region: 'North', state: 'Haryana', city: 'Pataudi' },
  { name: 'North-Pitampura', code: 'NDL', region: 'North', state: 'Delhi', city: 'Pitampura' },
  { name: 'North-Rewari', code: 'REW', region: 'North', state: 'Haryana', city: 'Rewari' },
  { name: 'North-Sohna', code: 'SHN', region: 'North', state: 'Haryana', city: 'Sohna' },
  { name: 'North-Sonipat', code: 'SNP', region: 'North', state: 'Haryana', city: 'Sonipat' },
  { name: 'North-Surajpur', code: 'SJP', region: 'North', state: 'Uttar Pradesh', city: 'Surajpur' },
  
  // SOUTH REGION (6 branches)
  { name: 'South-Davangere', code: 'DVG', region: 'South', state: 'Karnataka', city: 'Davangere' },
  { name: 'South-Kanakpura', code: 'KAN', region: 'South', state: 'Karnataka', city: 'Kanakpura' },
  { name: 'South-Kengeri', code: 'BLR', region: 'South', state: 'Karnataka', city: 'Kengeri' },
  { name: 'South-Mandya', code: 'MDY', region: 'South', state: 'Karnataka', city: 'Mandya' },
  { name: 'South-Ramnagar', code: 'RMN', region: 'South', state: 'Karnataka', city: 'Ramnagar' },
  { name: 'South-Yelahanka', code: 'YEL', region: 'South', state: 'Karnataka', city: 'Yelahanka' }
];

export async function GET(request: NextRequest) {
  try {
    console.log('🏢 Fetching all branches...');
    
    const { searchParams } = new URL(request.url);
    const region = searchParams.get('region');
    const includeStats = searchParams.get('includeStats') === 'true';
    
    let branches = ALL_BRANCHES;
    
    // Filter by region if specified
    if (region) {
      branches = branches.filter(branch => 
        branch.region.toLowerCase() === region.toLowerCase()
      );
      console.log(`🔍 Filtered to ${region} region: ${branches.length} branches`);
    }
    
    // Add statistics if requested
    if (includeStats) {
      try {
        const { db } = await connectDB();
        
        // Get query counts per branch
        const queryCounts = await db.collection('queries').aggregate([
          {
            $group: {
              _id: '$branchCode',
              totalQueries: { $sum: 1 },
              pendingQueries: {
                $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
              },
              resolvedQueries: {
                $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] }
              }
            }
          }
        ]).toArray();
        
        // Get sanctioned application counts per branch
        const sanctionedCounts = await db.collection('sanctioned_applications').aggregate([
          {
            $group: {
              _id: '$branch',
              totalSanctioned: { $sum: 1 }
            }
          }
        ]).toArray();
        
        // Merge statistics with branch data
        branches = branches.map(branch => {
          const queryStats = queryCounts.find(q => q._id === branch.code) || {
            totalQueries: 0,
            pendingQueries: 0,
            resolvedQueries: 0
          };
          
          const sanctionedStats = sanctionedCounts.find(s => 
            s._id === branch.name || s._id === branch.code
          ) || { totalSanctioned: 0 };
          
          return {
            ...branch,
            stats: {
              totalQueries: queryStats.totalQueries,
              pendingQueries: queryStats.pendingQueries,
              resolvedQueries: queryStats.resolvedQueries,
              totalSanctioned: sanctionedStats.totalSanctioned
            }
          };
        });
        
        console.log('📊 Added statistics to branch data');
      } catch (error) {
        console.warn('⚠️ Could not fetch branch statistics:', error);
      }
    }
    
    // Sort branches by region and then by name
    branches.sort((a, b) => {
      if (a.region !== b.region) {
        return a.region.localeCompare(b.region);
      }
      return a.name.localeCompare(b.name);
    });
    
    console.log(`✅ Returning ${branches.length} branches`);
    
    return NextResponse.json({
      success: true,
      data: branches,
      count: branches.length,
      regions: {
        north: branches.filter(b => b.region === 'North').length,
        south: branches.filter(b => b.region === 'South').length
      }
    });
    
  } catch (error) {
    console.error('❌ Error fetching branches:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch branches',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
