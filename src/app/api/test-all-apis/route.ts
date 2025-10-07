import { NextRequest, NextResponse } from 'next/server';

interface ApiTestResult {
  endpoint: string;
  method: string;
  status: number;
  success: boolean;
  responseTime: number;
  error?: string;
  data?: any;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category') || 'all';
  
  console.log(`🧪 Starting API testing for category: ${category}`);
  
  const results: ApiTestResult[] = [];
  const baseUrl = 'http://localhost:3000';
  
  // Helper function to test an API endpoint
  const testEndpoint = async (
    endpoint: string, 
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE' = 'GET', 
    body?: any,
    headers?: Record<string, string>
  ): Promise<ApiTestResult> => {
    const startTime = Date.now();
    
    try {
      const config: RequestInit = {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        }
      };
      
      if (body && method !== 'GET') {
        config.body = JSON.stringify(body);
      }
      
      const response = await fetch(`${baseUrl}${endpoint}`, config);
      const responseTime = Date.now() - startTime;
      
      let data;
      try {
        data = await response.json();
      } catch {
        data = await response.text();
      }
      
      return {
        endpoint,
        method,
        status: response.status,
        success: response.ok,
        responseTime,
        data: typeof data === 'string' ? data.substring(0, 200) + '...' : data
      };
    } catch (error) {
      return {
        endpoint,
        method,
        status: 0,
        success: false,
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  };
  
  // Core API Tests
  if (category === 'all' || category === 'core') {
    console.log('🔧 Testing Core APIs...');
    
    // Health check
    results.push(await testEndpoint('/api/health'));
    
    // Database info
    results.push(await testEndpoint('/api/database-info'));
    
    // Test database connection
    results.push(await testEndpoint('/api/test-db'));
  }
  
  // Authentication & Users
  if (category === 'all' || category === 'auth') {
    console.log('👤 Testing Authentication APIs...');
    
    results.push(await testEndpoint('/api/users'));
    results.push(await testEndpoint('/api/users/check-role', 'POST', { employeeId: 'TEST001' }));
    results.push(await testEndpoint('/api/users/check-employee', 'POST', { employeeId: 'TEST001' }));
    results.push(await testEndpoint('/api/auth/login', 'POST', { 
      employeeId: 'TEST001', 
      password: 'test123' 
    }));
  }
  
  // Queries Management
  if (category === 'all' || category === 'queries') {
    console.log('📋 Testing Queries APIs...');
    
    results.push(await testEndpoint('/api/queries'));
    results.push(await testEndpoint('/api/queries?stats=true'));
    results.push(await testEndpoint('/api/queries/operations'));
    results.push(await testEndpoint('/api/queries/credit'));
    results.push(await testEndpoint('/api/queries/sales'));
    
    // Test chat functionality (assuming query ID 603 exists)
    results.push(await testEndpoint('/api/queries/603/chat'));
    
    // Test query actions
    results.push(await testEndpoint('/api/query-actions'));
  }
  
  // Applications Management
  if (category === 'all' || category === 'applications') {
    console.log('📄 Testing Applications APIs...');
    
    results.push(await testEndpoint('/api/applications'));
    results.push(await testEndpoint('/api/applications?stats=true'));
  }
  
  // Chat & Messages
  if (category === 'all' || category === 'chat') {
    console.log('💬 Testing Chat APIs...');
    
    results.push(await testEndpoint('/api/messages'));
    results.push(await testEndpoint('/api/chat'));
    results.push(await testEndpoint('/api/debug-chat-connection'));
    results.push(await testEndpoint('/api/debug-chat-isolation?queryId=603'));
  }
  
  // Sanctioned Applications
  if (category === 'all' || category === 'sanctioned') {
    console.log('🚫 Testing Sanctioned Applications APIs...');
    
    results.push(await testEndpoint('/api/sanctioned-applications'));
    results.push(await testEndpoint('/api/sanctioned-applications/stats'));
    results.push(await testEndpoint('/api/sanctioned-applications/expiring'));
    results.push(await testEndpoint('/api/get-sanctioned'));
  }
  
  // Reports
  if (category === 'all' || category === 'reports') {
    console.log('📊 Testing Reports APIs...');
    
    results.push(await testEndpoint('/api/reports'));
    results.push(await testEndpoint('/api/reports/resolved'));
  }
  
  // Branches & Settings
  if (category === 'all' || category === 'settings') {
    console.log('⚙️ Testing Settings APIs...');
    
    results.push(await testEndpoint('/api/branches'));
    results.push(await testEndpoint('/api/settings'));
    results.push(await testEndpoint('/api/salesexec'));
  }
  
  // CSV & Bulk Operations
  if (category === 'all' || category === 'bulk') {
    console.log('📦 Testing Bulk Operations APIs...');
    
    results.push(await testEndpoint('/api/csv-upload'));
    results.push(await testEndpoint('/api/csv-diagnostic'));
    results.push(await testEndpoint('/api/bulk-upload'));
    results.push(await testEndpoint('/api/bulk-upload-all'));
  }
  
  // Debug & Maintenance
  if (category === 'all' || category === 'debug') {
    console.log('🔍 Testing Debug APIs...');
    
    results.push(await testEndpoint('/api/debug'));
    results.push(await testEndpoint('/api/debug-comprehensive'));
    results.push(await testEndpoint('/api/debug-queries'));
    results.push(await testEndpoint('/api/debug-sanctioned'));
    results.push(await testEndpoint('/api/test-realtime'));
  }
  
  // Calculate summary statistics
  const summary = {
    total: results.length,
    successful: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length,
    averageResponseTime: results.reduce((sum, r) => sum + r.responseTime, 0) / results.length,
    categories: {
      '2xx': results.filter(r => r.status >= 200 && r.status < 300).length,
      '4xx': results.filter(r => r.status >= 400 && r.status < 500).length,
      '5xx': results.filter(r => r.status >= 500).length,
      'errors': results.filter(r => r.status === 0).length
    }
  };
  
  return NextResponse.json({
    success: true,
    category,
    timestamp: new Date().toISOString(),
    summary,
    results: results.map(r => ({
      ...r,
      status_category: r.status >= 200 && r.status < 300 ? 'success' : 
                      r.status >= 400 && r.status < 500 ? 'client_error' :
                      r.status >= 500 ? 'server_error' : 'network_error'
    }))
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, endpoints } = body;
    
    if (action === 'test-custom-endpoints') {
      const results: ApiTestResult[] = [];
      
      for (const endpoint of endpoints) {
        const result = await fetch(`http://localhost:3000${endpoint.path}`, {
          method: endpoint.method || 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...endpoint.headers
          },
          body: endpoint.body ? JSON.stringify(endpoint.body) : undefined
        });
        
        results.push({
          endpoint: endpoint.path,
          method: endpoint.method || 'GET',
          status: result.status,
          success: result.ok,
          responseTime: 0, // Would need to measure this properly
          data: await result.json().catch(() => result.text())
        });
      }
      
      return NextResponse.json({
        success: true,
        results
      });
    }
    
    return NextResponse.json({
      error: 'Invalid action'
    }, { status: 400 });
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}