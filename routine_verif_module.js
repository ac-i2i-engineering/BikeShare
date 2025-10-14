// =============================================================================
// ROUTINE VERIFICATION MODULE - Periodic bike status updates
// =============================================================================

/**
 * Main routine verification function - updates usage timers and checks for overdue bikes
 * @returns {Object} Verification result with counts and any issues found
 */
const runTimerUpdate = () => {
  try {
    Logger.log('🔄 Starting routine bike verification...');
    
    const bikesData = DB.getAllData(CACHED_SETTINGS.VALUES.SHEETS.BIKES_STATUS.NAME);
    if (!bikesData || bikesData.length <= 1) {
      Logger.log('⚠️ No bikes found for verification');
      return { success: true, checkedOutBikes: 0, overdueCount: 0 };
    }

    const bikes = processBikesData(bikesData);
    const checkedOutBikes = bikes.filter(bike => bike.availability === 'checked out');
    
    if (checkedOutBikes.length === 0) {
      Logger.log('✅ No checked out bikes to verify');
      return { success: true, checkedOutBikes: 0, overdueCount: 0 };
    }

    const timestamp = new Date();
    const { updates, overdueCount } = processCheckedOutBikes(checkedOutBikes, timestamp);
    
    if (updates.length > 0) {
      // Add sheetName to each update operation for batchUpdate
      const operationsWithSheetName = updates.map(update => ({
        ...update,
        sheetName: CACHED_SETTINGS.VALUES.SHEETS.BIKES_STATUS.NAME
      }));
      
      const results = DB.batchUpdate(operationsWithSheetName);
      const successCount = results.filter(r => r.success).length;
      Logger.log(`✅ Updated ${successCount}/${updates.length} bike timers`);
    }

    if (overdueCount > 0) {
      Logger.log(`⚠️ Found ${overdueCount} overdue bikes`);
    }

    Logger.log(`🔄 Verification complete: ${checkedOutBikes.length} checked out, ${overdueCount} overdue`);
    
    return { 
      success: true, 
      checkedOutBikes: checkedOutBikes.length, 
      overdueCount,
      updatesApplied: updates.length 
    };

  } catch (error) {
    Logger.log(`❌ Routine verification failed: ${error.message}`);
    return { success: false, error: error.message };
  }
};

/**
 * Process checked out bikes to update timers and identify overdue bikes
 * @param {Array} checkedOutBikes - Array of checked out bike objects
 * @param {Date} timestamp - Current timestamp
 * @returns {Object} Object with updates array and overdue count
 */
const processCheckedOutBikes = (checkedOutBikes, timestamp) => {
  const maxHours = CACHED_SETTINGS.VALUES.REGULATIONS?.MAX_CHECKOUT_HOURS || 72;
  const updates = [];
  let overdueCount = 0;
  let skippedCount = 0;

  Logger.log(`📊 Processing ${checkedOutBikes.length} checked out bikes...`);

  for (const bike of checkedOutBikes) {
    // Validate lastCheckoutDate before calculating usage
    if (!bike.lastCheckoutDate || !(bike.lastCheckoutDate instanceof Date) || isNaN(bike.lastCheckoutDate.getTime())) {
      Logger.log(`⚠️ ${bike.bikeName} has invalid checkout date (${bike.lastCheckoutDate}), skipping timer update`);
      skippedCount++;
      continue;
    }
    
    const currentUsageMs = timestamp - bike.lastCheckoutDate;
    const currentUsageHours = Math.round((currentUsageMs / (1000 * 60 * 60)) * 100) / 100;
    
    // Additional validation to ensure we have a reasonable usage time
    if (isNaN(currentUsageHours) || currentUsageHours < 0) {
      Logger.log(`⚠️ ${bike.bikeName} calculated invalid usage hours: ${currentUsageHours}, skipping`);
      skippedCount++;
      continue;
    }
    
    const isOverdue = currentUsageHours > maxHours;
    if (isOverdue) {
      overdueCount++;
      Logger.log(`⚠️ ${bike.bikeName} overdue: ${currentUsageHours}h (max: ${maxHours}h)`);
    }

    updates.push({
      type: 'updateByRowIndex',
      rowIndex: bike._rowIndex,
      values: [
        bike.bikeName,
        bike.size,
        bike.maintenanceStatus,
        bike.availability,
        bike.lastCheckoutDate,
        bike.lastReturnDate,
        currentUsageHours,
        bike.totalUsageHours,
        bike.mostRecentUser,
        bike.secondRecentUser,
        bike.thirdRecentUser,
        bike.tempRecent,
        bike.bikeHash
      ]
    });
  }

  Logger.log(`📊 Processing complete: ${updates.length} valid bikes processed, ${skippedCount} bikes skipped due to invalid dates, ${overdueCount} overdue`);
  
  return { updates, overdueCount };
};
