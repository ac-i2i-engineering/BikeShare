// =============================================================================
// TEST SUPPORT UTILITIES (shared across unit + integration tests)
// =============================================================================

const TEST_BIKE_PREFIX = 'INT_TEST_BIKE_';

function ensureTestSettingsLoaded() {
  if (!CACHED_SETTINGS.VALUES || !CACHED_SETTINGS.VALUES.SHEETS) {
    Logger.log('📋 Loading settings for tests...');
    CACHED_SETTINGS.refreshCache();
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(`❌ Test failed: ${message}`);
  }
}

function cleanDatabaseForTests() {
  try {
    Logger.log('🧹 Starting database cleanup for tests...');
    resetBikeAvailability();
    cleanUserStatusData();
    cleanTransactionLogs();
    removeIntegrationTestBikes();
    Logger.log('✅ Database cleanup completed successfully');
  } catch (error) {
    Logger.log(`❌ Database cleanup failed: ${error.message}`);
    throw error;
  }
}

function resetBikeAvailability() {
  try {
    const bikesSheet = DB.getSheet(CACHED_SETTINGS.VALUES.SHEETS.BIKES_STATUS.NAME);
    const lastRow = bikesSheet.getLastRow();
    const totalCols = bikesSheet.getLastColumn();
    if (lastRow <= 1) {
      Logger.log('🚲 No bike rows to reset');
      return;
    }

    let updatedCount = 0;
    for (let row = 2; row <= lastRow; row++) {
      const availabilityCell = bikesSheet.getRange(row, 4); // Column D
      const availability = availabilityCell.getValue();
      if (availability !== 'available') {
        availabilityCell.setValue('available');
        if (totalCols >= 5) bikesSheet.getRange(row, 5).setValue('');
        if (totalCols >= 6) bikesSheet.getRange(row, 6).setValue('');
        if (totalCols >= 7) bikesSheet.getRange(row, 7).setValue(0);
        if (totalCols >= 9) bikesSheet.getRange(row, 9).setValue('');
        if (totalCols >= 10) bikesSheet.getRange(row, 10).setValue('');
        if (totalCols >= 11) bikesSheet.getRange(row, 11).setValue('');
        if (totalCols >= 12) bikesSheet.getRange(row, 12).setValue('');
        updatedCount++;
        Logger.log(`✅ Reset bike row ${row}: availability updated to available`);
      }
    }

    Logger.log(`🚲 Reset ${updatedCount} bikes to available status`);
  } catch (error) {
    Logger.log(`❌ Failed to reset bike availability: ${error.message}`);
    throw error;
  }
}

function cleanUserStatusData() {
  try {
    const userSheet = DB.getSheet(CACHED_SETTINGS.VALUES.SHEETS.USER_STATUS.NAME);
    const userData = userSheet.getDataRange().getValues();
    const rowsToDelete = [];

    for (let i = 1; i < userData.length; i++) {
      const email = userData[i][0];
      if (email && isTestEmail(email)) {
        rowsToDelete.push(i + 1);
      }
    }

    rowsToDelete.reverse().forEach(rowIndex => userSheet.deleteRow(rowIndex));
    Logger.log(`👤 Removed ${rowsToDelete.length} test users`);
  } catch (error) {
    Logger.log(`❌ Failed to clean user status data: ${error.message}`);
    throw error;
  }
}

function cleanTransactionLogs() {
  try {
    cleanLogSheet(CACHED_SETTINGS.VALUES.SHEETS.CHECKOUT_LOGS.NAME, 'Checkout');
    cleanLogSheet(CACHED_SETTINGS.VALUES.SHEETS.RETURN_LOGS.NAME, 'Return');
  } catch (error) {
    Logger.log(`❌ Failed to clean transaction logs: ${error.message}`);
    throw error;
  }
}

function cleanLogSheet(sheetName, logType) {
  const sheet = DB.getSheet(sheetName);
  const data = sheet.getDataRange().getValues();
  const rowsToDelete = [];

  for (let i = 1; i < data.length; i++) {
    const email = data[i][1];
    if (email && isTestEmail(email)) {
      rowsToDelete.push(i + 1);
    }
  }

  rowsToDelete.reverse().forEach(rowIndex => sheet.deleteRow(rowIndex));
  Logger.log(`📋 Removed ${rowsToDelete.length} test entries from ${logType} logs`);
}

function isTestEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const testPatterns = [
    'test',
    'testuser',
    'someone@amherst.edu',
    'student2@amherst.edu',
    'friend@amherst.edu',
    'confused@amherst.edu',
    '@invalid.edu'
  ];
  const emailLower = email.toLowerCase();
  return testPatterns.some(pattern => emailLower.includes(pattern));
}

function recordInitialRowCounts() {
  const counts = {};
  try {
    const checkoutSheet = DB.getSheet(CACHED_SETTINGS.VALUES.SHEETS.CHECKOUT_LOGS.NAME);
    const returnSheet = DB.getSheet(CACHED_SETTINGS.VALUES.SHEETS.RETURN_LOGS.NAME);

    counts.checkoutRows = checkoutSheet.getLastRow();
    counts.returnRows = returnSheet.getLastRow();

    Logger.log(`Initial counts - Checkout: ${counts.checkoutRows}, Return: ${counts.returnRows}`);
  } catch (error) {
    Logger.log(`Could not record initial counts: ${error.message}`);
  }
  return counts;
}

function cleanupTestData() {
  Logger.log('🧹 Manual test data cleanup...');
  try {
    cleanDatabaseForTests();
    Logger.log('✅ Manual cleanup completed');
  } catch (error) {
    Logger.log(`❌ Manual cleanup failed: ${error.message}`);
  }
}

function quickDatabaseCleanup() {
  Logger.log('🚀 Quick Database Cleanup...');
  try {
    cleanDatabaseForTests();
    Logger.log('✅ Quick cleanup completed successfully');
  } catch (error) {
    Logger.log(`❌ Quick cleanup failed: ${error.message}`);
  }
}

function resetBikesOnly() {
  Logger.log('🚲 Resetting bike availability only...');
  try {
    resetBikeAvailability();
    Logger.log('✅ Bike reset completed');
  } catch (error) {
    Logger.log(`❌ Bike reset failed: ${error.message}`);
  }
}

function upsertTestBikeRow(config) {
  if (!config || !config.bikeName) {
    throw new Error('upsertTestBikeRow requires a bikeName');
  }

  const sheet = DB.getSheet(CACHED_SETTINGS.VALUES.SHEETS.BIKES_STATUS.NAME);
  const totalCols = sheet.getLastColumn();
  const bikeName = config.bikeName;

  const baseRow = [
    bikeName,
    config.size || 'M',
    config.maintenanceStatus || 'Good',
    config.availability || 'available',
    config.lastCheckoutDate || '',
    config.lastReturnDate || '',
    config.currentUsageTimer !== undefined ? config.currentUsageTimer : 0,
    config.totalUsageHours !== undefined ? config.totalUsageHours : 0,
    config.mostRecentUser || '',
    config.secondRecentUser || '',
    config.thirdRecentUser || '',
    config.tempRecent || '',
    config.bikeHash || `${TEST_BIKE_PREFIX}${Math.floor(Math.random() * 1e6)}`
  ];

  while (baseRow.length < totalCols) {
    baseRow.push('');
  }
  const rowValues = baseRow.slice(0, totalCols);

  const data = sheet.getDataRange().getValues();
  let targetRow = null;
  for (let i = 1; i < data.length; i++) {
    const existingName = (data[i][0] || '').toString().trim().toLowerCase();
    if (existingName === bikeName.toLowerCase()) {
      targetRow = i + 1; // account for header row
      break;
    }
  }

  if (targetRow) {
    sheet.getRange(targetRow, 1, 1, totalCols).setValues([rowValues]);
  } else {
    sheet.appendRow(rowValues);
    targetRow = sheet.getLastRow();
  }

  return targetRow;
}

function removeIntegrationTestBikes() {
  try {
    const sheet = DB.getSheet(CACHED_SETTINGS.VALUES.SHEETS.BIKES_STATUS.NAME);
    const data = sheet.getDataRange().getValues();
    const rowsToDelete = [];

    for (let i = 1; i < data.length; i++) {
      const bikeName = data[i][0];
      if (typeof bikeName === 'string' && bikeName.startsWith(TEST_BIKE_PREFIX)) {
        rowsToDelete.push(i + 1);
      }
    }

    rowsToDelete.reverse().forEach(rowIndex => sheet.deleteRow(rowIndex));
    if (rowsToDelete.length > 0) {
      Logger.log(`🧽 Removed ${rowsToDelete.length} integration test bikes`);
    }
  } catch (error) {
    Logger.log(`⚠️ removeIntegrationTestBikes failed: ${error.message}`);
  }
}
