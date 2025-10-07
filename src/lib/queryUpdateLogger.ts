// Query Update Logger Utility
// Provides logging functionality for query updates across the application

declare global {
  var queryUpdatesLog: Array<{
    queryId: string;
    appNo: string;
    customerName: string;
    branch: string;
    status: string;
    priority: string;
    team: string;
    markedForTeam: string;
    createdAt: string;
    submittedBy: string;
    action: 'created' | 'updated' | 'resolved';
    timestamp: string;
  }> | undefined;
}

// Initialize global updates log
if (!global.queryUpdatesLog) {
  global.queryUpdatesLog = [];
}

// Helper function to log query updates
export function logQueryUpdate(update: {
  queryId: string;
  appNo: string;
  customerName: string;
  branch: string;
  status: string;
  priority: string;
  team: string;
  markedForTeam: string;
  createdAt: string;
  submittedBy: string;
  action: 'created' | 'updated' | 'resolved';
}) {
  if (!global.queryUpdatesLog) {
    global.queryUpdatesLog = [];
  }

  const logEntry = {
    ...update,
    timestamp: new Date().toISOString()
  };

  global.queryUpdatesLog.unshift(logEntry);
  
  // Keep only last 1000 entries
  if (global.queryUpdatesLog.length > 1000) {
    global.queryUpdatesLog = global.queryUpdatesLog.slice(0, 1000);
  }

  console.log('📝 Logged query update:', logEntry);
}

// Helper function to get query updates since a specific time
export function getQueryUpdatesSince(since: string) {
  if (!global.queryUpdatesLog) {
    return [];
  }

  const sinceDate = new Date(since);
  return global.queryUpdatesLog.filter(update => 
    new Date(update.timestamp) > sinceDate
  ).slice(0, 50); // Limit to 50 most recent
}

// Helper function to clear old updates (optional cleanup)
export function cleanupOldUpdates(maxAgeHours: number = 24) {
  if (!global.queryUpdatesLog) {
    return;
  }

  const cutoffTime = new Date(Date.now() - (maxAgeHours * 60 * 60 * 1000));
  const initialCount = global.queryUpdatesLog.length;
  
  global.queryUpdatesLog = global.queryUpdatesLog.filter(update => 
    new Date(update.timestamp) > cutoffTime
  );

  const removedCount = initialCount - global.queryUpdatesLog.length;
  if (removedCount > 0) {
    console.log(`🧹 Cleaned up ${removedCount} old query updates (older than ${maxAgeHours}h)`);
  }
}
