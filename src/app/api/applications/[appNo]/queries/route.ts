import { NextRequest, NextResponse } from 'next/server';

// Query interface for proper typing
interface QueryMessage {
  sender: string;
  text: string;
  timestamp: string;
  isSent: boolean;
}

interface QueryData {
  id: string;
  appNo: string;
  title: string;
  tat: string;
  team: string;
  messages: QueryMessage[];
  markedForTeam: string;
  allowMessaging: boolean;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'resolved' | 'approved' | 'deferred' | 'otc';
  customerName: string;
  caseId: string;
  createdAt: string;
}

// In-memory database - should be replaced with database in production
let queriesDatabase: QueryData[] = [];

// Initialize sample data
const initializeData = () => {
  if (queriesDatabase.length === 0) {
    queriesDatabase = [
      // No sample applications - clean database for production use
    ];
  }
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ appNo: string }> }
) {
  try {
    initializeData();
    
    const { searchParams } = new URL(request.url);
    const { appNo: rawAppNo } = await params;
    const team = searchParams.get('team'); // Optional team filter
    
    // Decode URL encoding and trim whitespace
    const appNo = decodeURIComponent(rawAppNo).trim();
    
    console.log(`🔍 Queries API: Searching for queries of App.No: "${appNo}" (original: "${rawAppNo}") for team: ${team}`);
    
    // Filter queries for the specific application
    let applicationQueries = queriesDatabase.filter(q => q.appNo === appNo);
    
    // Apply team-specific access control
    if (team) {
      applicationQueries = applicationQueries.map(query => ({
        ...query,
        allowMessaging: query.markedForTeam === team.toLowerCase() || query.markedForTeam === 'both'
      }));
    }
    
    // Sort by creation date (newest first)
    applicationQueries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    console.log(`📊 Found ${applicationQueries.length} queries for App.No: "${appNo}"`);
    
    return NextResponse.json({
      success: true,
      data: applicationQueries,
      count: applicationQueries.length,
      appNo,
      teamFilter: team,
      debug: {
        originalParam: rawAppNo,
        decodedParam: decodeURIComponent(rawAppNo),
        trimmedParam: appNo
      }
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('💥 Error fetching application queries:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage || 'Failed to fetch application queries'
      },
      { status: 500 }
    );
  }
} 