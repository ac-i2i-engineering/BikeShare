// =============================================================================
// BUSINESS LOGIC FUNCTIONS (Pure)
// =============================================================================

/**
 * Process checkout transaction
 * @param {Object} data - Current processing data
 * @param {Object} currentState - Current system state
 * @returns {Object} Data with transaction details
 */
function processCheckoutTransaction(data, currentState) {
  if (data.error) return data; // Skip if already has error
  
  const transaction = {
    type: 'checkout',
    timestamp: data.timestamp,
    userEmail: data.userEmail,
    bikeHash: data.bikeHash,
    bikeName: data.bike.bikeName,
    conditionConfirmation: data.conditionConfirmation
  };
  
  return {
    ...data,
    transaction: transaction,
    stateChanges: {
      bikes: [],
      users: [],
      logs: []
    }
  };
}

/**
 * Process return transaction
 * @param {Object} data - Current processing data
 * @param {Object} currentState - Current system state
 * @returns {Object} Data with transaction details
 */
function processReturnTransaction(data, currentState) {
  if (data.error) return data; // Skip if already has error
  
  const transaction = {
    type: 'return',
    timestamp: data.timestamp,
    userEmail: data.userEmail,
    bikeHash: data.bikeHash,
    bikeName: data.bike.bikeName,
    isReturningForFriend: data.isReturningForFriend
  };
  
  return {
    ...data,
    transaction: transaction,
    stateChanges: {
      bikes: [],
      users: [],
      logs: []
    }
  };
}

/**
 * Update bike status
 * @param {Object} data - Current processing data
 * @param {string} newStatus - New availability status
 * @returns {Object} Data with updated bike state
 */
function updateBikeStatus(data, newStatus) {
  if (data.error) return data; // Skip if already has error
  
  const updatedBike = {
    ...data.bike,
    availability: newStatus,
    lastCheckoutDate: newStatus === 'Checked Out' ? data.timestamp : data.bike.lastCheckoutDate,
    lastReturnDate: newStatus === 'Available' ? data.timestamp : data.bike.lastReturnDate,
    // Update recent users for checkout
    ...(newStatus === 'Checked Out' && {
      thirdRecentUser: data.bike.secondRecentUser,
      secondRecentUser: data.bike.mostRecentUser,
      mostRecentUser: data.userEmail,
      tempRecent: data.userEmail
    })
  };
  
  // Add to state changes
  const bikeChanges = [...(data.stateChanges?.bikes || []), {
    action: 'update',
    sheetName: CACHED_SETTINGS.VALUES.SHEETS.BIKES_STATUS.NAME,
    searchKey: 'bikeHash',
    searchValue: data.bikeHash,
    updatedData: updatedBike
  }];
  
  return {
    ...data,
    bike: updatedBike,
    stateChanges: {
      ...data.stateChanges,
      bikes: bikeChanges
    }
  };
}

/**
 * Update user status
 * @param {Object} data - Current processing data
 * @returns {Object} Data with updated user state
 */
function updateUserStatus(data) {
  if (data.error) return data; // Skip if already has error
  
  const isCheckout = data.transaction.type === 'checkout';
  const isReturn = data.transaction.type === 'return';
  
  const updatedUser = {
    ...data.user,
    hasUnreturnedBike: isCheckout ? true : false,
    lastCheckoutName: isCheckout ? data.bike.bikeName : data.user.lastCheckoutName,
    lastCheckoutDate: isCheckout ? data.timestamp : data.user.lastCheckoutDate,
    lastReturnName: isReturn ? data.bike.bikeName : data.user.lastReturnName,
    lastReturnDate: isReturn ? data.timestamp : data.user.lastReturnDate,
    numberOfCheckouts: isCheckout ? (data.user.numberOfCheckouts + 1) : data.user.numberOfCheckouts,
    numberOfReturns: isReturn ? (data.user.numberOfReturns + 1) : data.user.numberOfReturns,
    firstUsageDate: data.user.firstUsageDate || data.timestamp
  };
  
  // Add to state changes
  const userChanges = [...(data.stateChanges?.users || []), {
    action: data.user.isNewUser ? 'create' : 'update',
    sheetName: CACHED_SETTINGS.VALUES.SHEETS.USERS_STATUS.NAME,
    searchKey: 'userEmail',
    searchValue: data.userEmail,
    updatedData: updatedUser
  }];
  
  return {
    ...data,
    user: updatedUser,
    stateChanges: {
      ...data.stateChanges,
      users: userChanges
    }
  };
}

/**
 * Calculate usage hours for return
 * @param {Object} data - Current processing data
 * @returns {Object} Data with usage calculation
 */
function calculateUsageHours(data) {
  if (data.error || data.transaction.type !== 'return') return data;
  
  const checkoutTime = new Date(data.bike.lastCheckoutDate);
  const returnTime = new Date(data.timestamp);
  const usageHours = (returnTime - checkoutTime) / (1000 * 60 * 60); // Convert to hours
  
  // Update bike with usage hours
  const updatedBike = {
    ...data.bike,
    currentUsageTimer: 0, // Reset current timer
    totalUsageHours: (data.bike.totalUsageHours || 0) + usageHours
  };
  
  // Update user with usage hours
  const updatedUser = {
    ...data.user,
    usageHours: (data.user.usageHours || 0) + usageHours
  };
  
  // Update state changes
  const updatedStateChanges = {
    ...data.stateChanges,
    bikes: data.stateChanges.bikes.map(change => 
      change.searchValue === data.bikeHash 
        ? { ...change, updatedData: updatedBike }
        : change
    ),
    users: data.stateChanges.users.map(change => 
      change.searchValue === data.userEmail 
        ? { ...change, updatedData: updatedUser }
        : change
    )
  };
  
  return {
    ...data,
    bike: updatedBike,
    user: updatedUser,
    usageHours: usageHours,
    stateChanges: updatedStateChanges
  };
}

/**
 * Create checkout record
 * @param {Object} data - Current processing data
 * @param {Object} context - Processing context
 * @returns {Object} Data with log record
 */
function createCheckoutRecord(data, context) {
  if (data.error) return data; // Skip if already has error
  
  const logRecord = {
    timestamp: data.timestamp,
    userEmail: data.userEmail,
    bikeHash: data.bikeHash,
    conditionConfirmation: data.conditionConfirmation,
    status: 'Processed'
  };
  
  const logChanges = [...(data.stateChanges?.logs || []), {
    action: 'create',
    sheetName: CACHED_SETTINGS.VALUES.SHEETS.CHECKOUT_LOGS.NAME,
    range: context.range,
    data: logRecord
  }];
  
  return {
    ...data,
    logRecord: logRecord,
    stateChanges: {
      ...data.stateChanges,
      logs: logChanges
    }
  };
}

/**
 * Create return record
 * @param {Object} data - Current processing data
 * @param {Object} context - Processing context
 * @returns {Object} Data with log record
 */
function createReturnRecord(data, context) {
  if (data.error) return data; // Skip if already has error
  
  const logRecord = {
    timestamp: data.timestamp,
    userEmail: data.userEmail,
    bikeHash: data.bikeHash,
    usageHours: data.usageHours || 0,
    isReturningForFriend: data.isReturningForFriend,
    status: 'Processed'
  };
  
  const logChanges = [...(data.stateChanges?.logs || []), {
    action: 'create',
    sheetName: CACHED_SETTINGS.VALUES.SHEETS.RETURN_LOGS.NAME,
    range: context.range,
    data: logRecord
  }];
  
  return {
    ...data,
    logRecord: logRecord,
    stateChanges: {
      ...data.stateChanges,
      logs: logChanges
    }
  };
}

/**
 * Generate notifications based on transaction type and result
 * @param {Object} data - Current processing data
 * @param {string} operationType - 'checkout' or 'return'
 * @returns {Object} Data with notifications to send
 */
function generateNotifications(data, operationType) {
  const notifications = [];
  
  if (data.error) {
    // Error notifications
    notifications.push({
      type: 'error',
      commID: data.error,
      context: {
        userEmail: data.userEmail,
        errorMessage: data.errorMessage,
        bikeHash: data.bikeHash,
        timestamp: data.timestamp,
        range: data.range || null // Add range context for error marking
      }
    });
  } else {
    // Success notifications
    const successCommID = operationType === 'checkout' 
      ? 'SUC_CHK_001' 
      : 'SUC_RET_001';
      
    notifications.push({
      type: 'success',
      commID: successCommID,
      context: {
        userEmail: data.userEmail,
        bikeName: data.bike.bikeName,
        bikeHash: data.bikeHash,
        timestamp: data.timestamp,
        usageHours: data.usageHours
      }
    });
  }
  
  return {
    ...data,
    notifications: notifications
  };
}

/**
 * Mark sheet entry with status/color
 * @param {Object} data - Current processing data
 * @param {Object} context - Processing context
 * @returns {Object} Data with entry marking info
 */
function markSheetEntry(data, context) {
  const entryMark = {
    range: context.range,
    bgColor: data.error ? '#ffcccc' : '#ccffcc', // Red for error, green for success
    note: data.error ? data.errorMessage : 'Processed successfully'
  };
  
  return {
    ...data,
    entryMark: entryMark
  };
}

// =============================================================================
// STATE PERSISTENCE FUNCTIONS (Side Effects)
// =============================================================================

/**
 * Commit all state changes to sheets and send notifications
 * @param {Object} result - Processing result with state changes
 * @returns {Object} Final result with persistence status
 */
function commitStateChanges(result) {
  try {
    // Apply bike changes
    if (result.stateChanges?.bikes) {
      result.stateChanges.bikes.forEach(change => {
        applyBikeStateChange(change);
      });
    }
    
    // Apply user changes
    if (result.stateChanges?.users) {
      result.stateChanges.users.forEach(change => {
        applyUserStateChange(db, change);
      });
    }
    
    // Send notifications
    if (result.notifications) {
      result.notifications.forEach(notification => {
        COMM.handleCommunication(notification.commID, notification.context);
      });
    }
    
    // Mark sheet entry
    if (result.entryMark) {
      COMM.markEntry(result.entryMark.range, result.entryMark.bgColor, result.entryMark.note);
    }
    
    // Sort sheets
    const sheetToSort = result.transaction?.type === 'checkout' 
      ? CACHED_SETTINGS.VALUES.SHEETS.CHECKOUT_LOGS.NAME
      : CACHED_SETTINGS.VALUES.SHEETS.RETURN_LOGS.NAME;
    DB.sortByColumn(sheetToSort);
    
    return {
      ...result,
      success: true,
      persistenceStatus: 'committed'
    };
    
  } catch (error) {
    Logger.log(`Error committing state changes: ${error.message}`);
    return {
      ...result,
      success: false,
      persistenceStatus: 'failed',
      persistenceError: error.message
    };
  }
}

/**
 * Apply bike state change to database
 * @param {Object} change - Change specification
 */
function applyBikeStateChange(change) {
  if (change.action === 'update') {
    const bikeRowData = [
      change.updatedData.bikeName,
      change.updatedData.size,
      change.updatedData.maintenanceStatus,
      change.updatedData.availability,
      change.updatedData.lastCheckoutDate,
      change.updatedData.lastReturnDate,
      change.updatedData.currentUsageTimer,
      change.updatedData.totalUsageHours,
      change.updatedData.mostRecentUser,
      change.updatedData.secondRecentUser,
      change.updatedData.thirdRecentUser,
      change.updatedData.tempRecent,
      change.updatedData.bikeHash
    ];
    
    // Map search key to column index (bikeHash is in column 12, index 12)
    const searchColumnIndex = change.searchKey === 'bikeHash' ? 12 : 0;
    DB.updateRowByUniqueValue(
      change.sheetName,
      searchColumnIndex,
      change.searchValue,
      bikeRowData
    );
  }
}

/**
 * Apply user state change to database
 * @param {DatabaseManager} db - Database manager
 * @param {Object} change - Change specification
 */
function applyUserStateChange(db, change) {
  const userRowData = [
    change.updatedData.userEmail,
    change.updatedData.hasUnreturnedBike ? 'Yes' : 'No',
    change.updatedData.lastCheckoutName,
    change.updatedData.lastCheckoutDate,
    change.updatedData.lastReturnName,
    change.updatedData.lastReturnDate,
    change.updatedData.numberOfCheckouts,
    change.updatedData.numberOfReturns,
    change.updatedData.numberOfMismatches,
    change.updatedData.usageHours,
    change.updatedData.overdueReturns,
    change.updatedData.firstUsageDate
  ];
  
  if (change.action === 'create') {
    DB.appendRow(change.sheetName, userRowData);
  } else if (change.action === 'update') {
    // Map search key to column index (userEmail is in column 0, index 0)
    const searchColumnIndex = change.searchKey === 'userEmail' ? 0 : 0;
    DB.updateRowByUniqueValue(
      change.sheetName,
      searchColumnIndex,
      change.searchValue,
      userRowData
    );
  }
}

/**
 * Handle pipeline errors
 * @param {Error} error - The error that occurred
 * @param {Object} triggerEvent - Original trigger event
 * @returns {Object} Error result
 */
function handlePipelineError(error, triggerEvent) {
  Logger.log(`Pipeline error: ${error.message}`);
  
  // Try to send error notification if possible
  try {
    COMM.handleCommunication('ERR_SYS_001', {
      errorMessage: error.message,
      timestamp: new Date(),
      triggerData: triggerEvent
    });
  } catch (notificationError) {
    Logger.log(`Failed to send error notification: ${notificationError.message}`);
  }
  
  return {
    success: false,
    error: 'ERR_SYS_001',
    errorMessage: error.message,
    timestamp: new Date()
  };
}