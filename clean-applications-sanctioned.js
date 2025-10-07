/**
 * Database Cleanup Script for Applications and Sanctioned Applications
 * Clears applications and sanctioned_applications collections from the database
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
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error calling ${endpoint}:`, error);
    return { success: false, error: error.message };
  }
}

// Function to get count of records before cleanup
async function getRecordCount(collection) {
  try {
    const result = await callApi(collection);
    if (result.success && result.data) {
      return Array.isArray(result.data) ? result.data.length : 0;
    }
    return 0;
  } catch (error) {
    console.error(`Error getting count for ${collection}:`, error);
    return 0;
  }
}

// Function to backup data before deletion (optional)
async function backupData(collection, data) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = `backup-${collection}-${timestamp}.json`;
  
  try {
    // In a real environment, you might want to save to file system
    console.log(`📋 Backup data for ${collection} would be saved to ${backupFile}`);
    console.log(`   Records to backup: ${data.length}`);
    return true;
  } catch (error) {
    console.error(`Error backing up ${collection}:`, error);
    return false;
  }
}

// Main cleanup function
async function cleanApplicationsAndSanctioned() {
  console.log('🧹 Starting applications and sanctioned applications cleanup...');
  console.log('================================================================');

  // 1. Get current record counts
  console.log('📊 Checking current record counts...');
  const applicationsCount = await getRecordCount('applications');
  const sanctionedCount = await getRecordCount('sanctioned-applications');
  
  console.log(`   Applications: ${applicationsCount} records`);
  console.log(`   Sanctioned Applications: ${sanctionedCount} records`);
  console.log('-----------------------------------');

  // 2. Optional: Backup applications data
  if (applicationsCount > 0) {
    console.log('💾 Backing up applications data...');
    const applicationsData = await callApi('applications');
    if (applicationsData.success && applicationsData.data) {
      await backupData('applications', applicationsData.data);
    }
  }

  // 3. Optional: Backup sanctioned applications data
  if (sanctionedCount > 0) {
    console.log('💾 Backing up sanctioned applications data...');
    const sanctionedData = await callApi('sanctioned-applications');
    if (sanctionedData.success && sanctionedData.data) {
      await backupData('sanctioned-applications', sanctionedData.data);
    }
  }
  console.log('-----------------------------------');

  // 4. Clear applications
  console.log('🗑️ Clearing applications...');
  try {
    const applicationsResult = await callApi('clear-applications?confirm=true', 'DELETE');
    if (applicationsResult.success) {
      console.log(`✅ Applications cleared successfully (${applicationsCount} records removed)`);
    } else {
      console.log('❌ Failed to clear applications:', applicationsResult.error);
    }
  } catch (error) {
    console.log('❌ Error clearing applications:', error.message);
  }
  console.log('-----------------------------------');

  // 5. Clear sanctioned applications
  console.log('🗑️ Clearing sanctioned applications...');
  try {
    const sanctionedResult = await callApi('clear-sanctioned', 'DELETE');
    if (sanctionedResult.success) {
      console.log(`✅ Sanctioned applications cleared successfully (${sanctionedCount} records removed)`);
    } else {
      console.log('❌ Failed to clear sanctioned applications:', sanctionedResult.error);
    }
  } catch (error) {
    console.log('❌ Error clearing sanctioned applications:', error.message);
  }
  console.log('-----------------------------------');

  // 6. Verify cleanup
  console.log('🔍 Verifying cleanup...');
  const newApplicationsCount = await getRecordCount('applications');
  const newSanctionedCount = await getRecordCount('sanctioned-applications');
  
  console.log(`   Applications after cleanup: ${newApplicationsCount} records`);
  console.log(`   Sanctioned Applications after cleanup: ${newSanctionedCount} records`);
  
  if (newApplicationsCount === 0 && newSanctionedCount === 0) {
    console.log('✅ Cleanup verification successful - All records removed');
  } else {
    console.log('⚠️ Cleanup verification - Some records may still exist');
  }
  console.log('-----------------------------------');

  // 7. Summary
  console.log('📋 CLEANUP SUMMARY:');
  console.log(`   Applications removed: ${applicationsCount - newApplicationsCount}`);
  console.log(`   Sanctioned Applications removed: ${sanctionedCount - newSanctionedCount}`);
  console.log(`   Total records removed: ${(applicationsCount - newApplicationsCount) + (sanctionedCount - newSanctionedCount)}`);
  console.log('================================================================');
  console.log('🎉 Applications and Sanctioned Applications cleanup complete!');
}

// Function to clean only applications
async function cleanApplicationsOnly() {
  console.log('🧹 Starting applications cleanup...');
  console.log('===================================');

  const count = await getRecordCount('applications');
  console.log(`📊 Applications to remove: ${count} records`);

  const result = await callApi('clear-applications?confirm=true', 'DELETE');
  if (result.success) {
    console.log(`✅ Applications cleared successfully (${count} records removed)`);
  } else {
    console.log('❌ Failed to clear applications:', result.error);
  }

  console.log('🎉 Applications cleanup complete!');
}

// Function to clean only sanctioned applications
async function cleanSanctionedOnly() {
  console.log('🧹 Starting sanctioned applications cleanup...');
  console.log('===============================================');

  const count = await getRecordCount('sanctioned-applications');
  console.log(`📊 Sanctioned Applications to remove: ${count} records`);

  const result = await callApi('clear-sanctioned', 'DELETE');
  if (result.success) {
    console.log(`✅ Sanctioned applications cleared successfully (${count} records removed)`);
  } else {
    console.log('❌ Failed to clear sanctioned applications:', result.error);
  }

  console.log('🎉 Sanctioned Applications cleanup complete!');
}

// Command line argument handling
const args = process.argv.slice(2);
const command = args[0]?.toLowerCase();

switch (command) {
  case 'applications':
  case 'apps':
    cleanApplicationsOnly().catch(error => {
      console.error('Fatal error during applications cleanup:', error);
    });
    break;
  
  case 'sanctioned':
  case 'sanc':
    cleanSanctionedOnly().catch(error => {
      console.error('Fatal error during sanctioned applications cleanup:', error);
    });
    break;
  case 'both':
  case undefined:
  default:
    cleanApplicationsAndSanctioned().catch(error => {
      console.error('Fatal error during cleanup:', error);
    });
    break;
}

// Export functions for use in other modules
export {
  cleanApplicationsAndSanctioned,
  cleanApplicationsOnly,
  cleanSanctionedOnly,
  callApi,
  getRecordCount
};