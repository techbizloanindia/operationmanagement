import { NextRequest, NextResponse } from 'next/server';

// Server-Sent Events endpoint for real-time chat updates
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ queryId: string }> }
) {
  try {
    const { queryId } = await params;
    
    // Set up Server-Sent Events headers
    const headers = new Headers({
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
    });

    let isConnected = true;
    const encoder = new TextEncoder();

    // Create a readable stream for SSE
    const stream = new ReadableStream({
      start(controller) {
        // Send initial connection message
        const initialData = `data: ${JSON.stringify({
          type: 'connected',
          queryId,
          timestamp: new Date().toISOString()
        })}\n\n`;
        controller.enqueue(encoder.encode(initialData));

        // Set up periodic heartbeat
        const heartbeatInterval = setInterval(() => {
          if (!isConnected) {
            clearInterval(heartbeatInterval);
            return;
          }

          const heartbeatData = `data: ${JSON.stringify({
            type: 'heartbeat',
            timestamp: new Date().toISOString()
          })}\n\n`;
          
          try {
            controller.enqueue(encoder.encode(heartbeatData));
          } catch (error) {
            console.error('Error sending heartbeat:', error);
            isConnected = false;
            clearInterval(heartbeatInterval);
          }
        }, 30000); // Every 30 seconds

        // Clean up on close
        request.signal.addEventListener('abort', () => {
          isConnected = false;
          clearInterval(heartbeatInterval);
          controller.close();
        });
      },
    });

    return new Response(stream, { headers });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('💥 Error setting up SSE:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: `Failed to set up real-time connection: ${errorMessage}`
      },
      { status: 500 }
    );
  }
}