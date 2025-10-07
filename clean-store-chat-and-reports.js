/**
 * Database Cleanup Script
 * Clears queries and messages while preserving chat archives and reports
 */

const BASE_URL = 'http://localhost:3000/api';

// Function to make API calls
async function callApi(endpoint, method = 'GET', body = null) {
  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(`${BASE_URL}/${endpoint}`, options);
    return await response.json();
  } catch (error) {
    console.error(`Error calling ${endpoint}:`, error);
    return { success: false, error: error.message };
  }
}

// Main cleanup function
async function cleanDatabase() {
  console.log('🧹 Starting database cleanup...');
  console.log('-----------------------------------');

  // 1. Archive any active chats before deletion
  console.log('📦 Archiving active chats...');
  const activeQueries = await callApi('queries');
  
  if (activeQueries.success && activeQueries.data) {
    for (const query of activeQueries.data) {
      console.log(`  - Archiving chat for query ${query.id} (${query.appNo || 'Unknown App'})`);
      
      await callApi('chat-archives', 'POST', {
        queryId: query.id,
        queryData: {
          appNo: query.appNo || `APP-${query.id}`,
          customerName: query.customerName || 'Unknown Customer',
          queryTitle: query.title || query.queries?.[0]?.text || 'Query',
          queryStatus: 'archived-before-cleanup',
          markedForTeam: query.markedForTeam || query.team || 'unknown'
        },
        archiveReason: 'system-cleanup'
      });
    }
  }
  
  console.log('✅ Chat archiving complete');
  console.log('-----------------------------------');

  // 2. Clear queries
  console.log('🗑️ Clearing queries...');
  const queriesResult = await callApi('clear-queries', 'DELETE');
  console.log(queriesResult.success ? '✅ Queries cleared successfully' : '❌ Failed to clear queries');
  console.log('-----------------------------------');

  // 3. Clear messages
  console.log('🗑️ Clearing messages...');
  const messagesResult = await callApi('clear-messages', 'DELETE');
  console.log(messagesResult.success ? '✅ Messages cleared successfully' : '❌ Failed to clear messages');
  console.log('-----------------------------------');

  // 4. Verify chat archives are preserved
  console.log('🔍 Verifying chat archives...');
  const chatArchives = await callApi('chat-archives');
  
  if (chatArchives.success) {
    console.log(`✅ ${chatArchives.data.length} chat archives preserved`);
  } else {
    console.log('❌ Failed to verify chat archives');
  }
  console.log('-----------------------------------');

  // 5. Verify reports are preserved
  console.log('🔍 Verifying reports...');
  const reports = await callApi('reports');
  
  if (reports.success) {
    console.log(`✅ Reports data preserved`);
  } else {
    console.log('❌ Failed to verify reports');
  }
  console.log('-----------------------------------');

  console.log('🎉 Cleanup complete! Chat archives and reports have been preserved.');
}

// Execute the cleanup
cleanDatabase().catch(error => {
  console.error('Fatal error during cleanup:', error);
});
