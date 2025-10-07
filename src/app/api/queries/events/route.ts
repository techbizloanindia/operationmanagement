import { NextRequest } from 'next/server';
import { addConnection, removeConnection } from '@/lib/eventStreamUtils';

export async function GET(request: NextRequest) {
  const responseStream = new ReadableStream({
    start(controller) {
      const connectionId = Math.random().toString(36).substring(7);
      const connection = {
        id: connectionId,
        controller,
        lastPing: Date.now()
      };
      
      addConnection(connection);
      
      // Send initial connection message
      const encoder = new TextEncoder();
      try {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'connected',
          connectionId,
          timestamp: new Date().toISOString()
        })}\n\n`));
      } catch (error) {
        console.error('Error sending initial message:', error);
      }

      // Send periodic heartbeat
      const heartbeat = setInterval(() => {
        try {
          connection.lastPing = Date.now();
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'heartbeat',
            timestamp: new Date().toISOString()
          })}\n\n`));
        } catch (error) {
          clearInterval(heartbeat);
          removeConnection(connection);
        }
      }, 30000); // Heartbeat every 30 seconds

      // Cleanup on close
      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeat);
        removeConnection(connection);
        try {
          controller.close();
        } catch (e) {
          // Already closed
        }
      });
    },
  });

  return new Response(responseStream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
    },
  });
}