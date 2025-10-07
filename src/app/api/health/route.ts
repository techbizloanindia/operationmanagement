import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';

export async function GET() {
  try {
    const startTime = Date.now();
    
    // Check database connection
    let dbStatus = 'disconnected';
    let dbResponseTime = 0;
    
    try {
      const dbStartTime = Date.now();
      const { db } = await connectToDatabase();
      
      // Simple ping to test connection
      await db.admin().ping();
      
      dbResponseTime = Date.now() - dbStartTime;
      dbStatus = 'connected';
    } catch (dbError) {
      console.error('Database health check failed:', dbError);
      dbStatus = 'error';
    }
    
    const totalResponseTime = Date.now() - startTime;
    
    const healthData = {
      status: dbStatus === 'connected' ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime(),
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        external: Math.round(process.memoryUsage().external / 1024 / 1024),
      },
      database: {
        status: dbStatus,
        responseTime: `${dbResponseTime}ms`,
      },
      responseTime: `${totalResponseTime}ms`,
    };
    
    const statusCode = dbStatus === 'connected' ? 200 : 503;
    
    return NextResponse.json(healthData, { status: statusCode });
    
  } catch (error) {
    console.error('Health check failed:', error);
    
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 503 });
  }
} 