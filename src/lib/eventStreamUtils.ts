// Store active connections
const connections = new Set<{
  id: string;
  controller: ReadableStreamDefaultController;
  lastPing: number;
}>();

// Cleanup inactive connections
setInterval(() => {
  const now = Date.now();
  connections.forEach(conn => {
    if (now - conn.lastPing > 65000) { // 65 seconds timeout
      try {
        conn.controller.close();
      } catch (e) {
        // Connection already closed
      }
      connections.delete(conn);
    }
  });
}, 30000); // Cleanup every 30 seconds

// Function to broadcast query updates to all connected clients
// Enhanced to prevent message reflection and cross-query contamination
export function broadcastQueryUpdate(update: any, excludeConnectionId?: string) {
  const encoder = new TextEncoder();
  
  // Add isolation metadata to prevent cross-query contamination
  const isolatedUpdate = {
    type: 'query_update',
    ...update,
    timestamp: new Date().toISOString(),
    isolationKey: `query_${update.id || update.appNo}`,
    broadcastId: `broadcast_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
  };
  
  const data = `data: ${JSON.stringify(isolatedUpdate)}\n\n`;

  console.log(`📡 Broadcasting to ${connections.size} connections (excluding: ${excludeConnectionId || 'none'}):`, {
    appNo: update.appNo,
    action: update.action,
    team: update.team,
    markedForTeam: update.markedForTeam,
    isolationKey: isolatedUpdate.isolationKey
  });

  const deadConnections = new Set<{
    id: string;
    controller: ReadableStreamDefaultController;
    lastPing: number;
  }>();
  
  connections.forEach(conn => {
    // Skip if this is the excluded connection (prevents reflection)
    if (excludeConnectionId && conn.id === excludeConnectionId) {
      console.log(`⏭️ Skipping broadcast to connection ${conn.id} (sender exclusion)`);
      return;
    }
    
    try {
      conn.controller.enqueue(encoder.encode(data));
      conn.lastPing = Date.now(); // Update last activity
    } catch (error) {
      console.warn('Dead connection detected, marking for removal:', conn.id);
      deadConnections.add(conn);
    }
  });

  // Remove dead connections
  deadConnections.forEach(conn => {
    connections.delete(conn);
  });

  console.log(`📤 Broadcast completed. Active connections: ${connections.size}`);
}

// Function to add a connection (to be called from the route handler)
export function addConnection(connection: {
  id: string;
  controller: ReadableStreamDefaultController;
  lastPing: number;
}) {
  connections.add(connection);
  console.log(`🔗 New SSE connection added: ${connection.id}. Total connections: ${connections.size}`);
}

// Function to remove a connection
export function removeConnection(connection: {
  id: string;
  controller: ReadableStreamDefaultController;
  lastPing: number;
}) {
  connections.delete(connection);
  console.log(`🔌 SSE connection removed: ${connection.id}. Total connections: ${connections.size}`);
}

// Function to get all connections (for debugging)
export function getConnections() {
  return Array.from(connections);
}
