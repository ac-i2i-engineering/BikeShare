// =============================================================================
// BUSINESS LOGIC FUNCTIONS (Pure)
// =============================================================================

/**
 * Process checkout transaction
 * @param {Object} data - Current processing data
 * @returns {Object} Data with transaction details
 */
function processCheckoutTransaction(data) {
  if (data.error) return data; // Skip if already has error
  const transaction = {
    type: 'checkout',
    timestamp: data.currentState.timestamp,
    userEmail: data.user.userEmail,
    bikeHash: data.bike.bikeHash,
    bikeName: data.bike.bikeName,
    conditionConfirmation: data.formData.conditionConfirmation
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
 * @returns {Object} Data with transaction details
 */
function processReturnTransaction(data) {
  if (data.error) return data; // Skip if already has error
  
  const transaction = {
    type: 'return',
    timestamp: data.currentState.timestamp,
    userEmail: data.user.userEmail,
    bikeHash: data.bike.bikeHash,
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
 * @returns {Object} Data with updated bike state
 */
function updateBikeStatus(data) {
  if (data.error) return data; // Skip if already has error
  const newStatus = data.transaction.type === 'checkout' ? 'Checked Out' : "Available"
  const updatedBike = {
    ...data.bike,
    availability: newStatus,
    lastCheckoutDate: newStatus === 'Checked Out' ? data.currentState.timestamp : data.bike.lastCheckoutDate,
    lastReturnDate: newStatus === 'Available' ? data.currentState.timestamp : data.bike.lastReturnDate,
    // Update recent users for checkout - safely handle null/undefined values
    ...(newStatus === 'Checked Out' && {
      tempRecent: data.bike.thirdRecentUser || '',
      thirdRecentUser: data.bike.secondRecentUser || '',
      secondRecentUser: data.bike.mostRecentUser || '',
      mostRecentUser: data.formData.userEmail,
    })
  };
  
  // Add to state changes
  const bikeChanges = [...(data.stateChanges?.bikes || []), {
    action: 'update',
    sheetName: CACHED_SETTINGS.VALUES.SHEETS.BIKES_STATUS.NAME,
    searchKey: 'bikeHash',
    searchValue: data.bike.bikeHash,
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
    lastCheckoutDate: isCheckout ? data.currentState.timestamp : data.user.lastCheckoutDate,
    lastReturnName: isReturn ? data.bike.bikeName : data.user.lastReturnName,
    lastReturnDate: isReturn ? data.currentState.timestamp : data.user.lastReturnDate,
    numberOfCheckouts: isCheckout ? (data.user.numberOfCheckouts + 1) : data.user.numberOfCheckouts,
    numberOfReturns: isReturn ? (data.user.numberOfReturns + 1) : data.user.numberOfReturns,
    firstUsageDate: data.user.firstUsageDate || data.currentState.timestamp
  };
  
  // Add to state changes
  const userChanges = [...(data.stateChanges?.users || []), {
    action: data.user.isNewUser ? 'create' : 'update',
    sheetName: CACHED_SETTINGS.VALUES.SHEETS.USER_STATUS.NAME,
    searchKey: 'userEmail',
    searchValue: data.formData.userEmail,
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
  const usageHours = (data.currentState.timestamp - checkoutTime) / (1000 * 60 * 60); // Convert to hours
  
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
      change.searchValue === data.bike.bikeHash 
        ? { ...change, updatedData: updatedBike }
        : change
    ),
    users: data.stateChanges.users.map(change => 
      change.searchValue === data.formData.userEmail 
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
 * Generate notifications based on transaction type and result
 * @param {Object} data - Current processing data
 * @returns {Object} Data with notifications to send
 */
function generateNotifications(data) {
  const notifications = [];
  
  if (data.error) {
    // Error notifications
    notifications.push({
      type: 'error',
      commID: data.error,
      context: {
        userEmail: data.formData.userEmail,
        errorMessage: data.errorMessage,
        bikeHash: data.formData.bikeHash,
        timestamp: data.currentState.timestamp,
        range: data.context.range || null // Add range context for error marking
      }
    });
  } else if (data.transaction && data.user && data.bike) {
    // Success notifications - only if we have all required data
    let successCommID;
    if (data.transaction.type === 'checkout') {
      successCommID = 'CFM_USR_COT_001';
    } else {
      // Return success codes based on scenario
      if (data.isReturningForFriend) {
        successCommID = 'CFM_USR_RET_003'; // returning for friend
      } else if (data.isCollectedMismatch) {
        successCommID = 'CFM_USR_RET_004'; // mismatch return
      } else if (data.isDirectReturn === false) {
        successCommID = 'CFM_USR_RET_002'; // indirect return
      } else {
        successCommID = 'CFM_USR_RET_001'; // normal return
      }
    }
      
    notifications.push({
      type: 'success',
      commID: successCommID,
      context: {
        userEmail: data.user.userEmail,
        bikeName: data.bike.bikeName,
        bikeHash: data.bike.bikeHash,
        timestamp: data.currentState.timestamp,
        usageHours: data.usageHours || 0,
        range: data.context.range // Add range for success marking
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
 * @returns {Object} Data with entry marking info
 */
function markSheetEntry(data) {
  if (!data.context?.range) {
    // No range to mark, skip marking
    return data;
  }

  if (data.error) {
    // Mark error entries with red background and error message
    const entryMark = {
      range: data.context.range,
      bgColor: '#ffcccc', // Red for error
      note: `ERROR: ${data.errorMessage || 'Processing error'}`
    };
    
    return {
      ...data,
      entryMark: entryMark
    };
  } else if (data.transaction && data.user) {
    // Mark successful entries with green background - only if we have required data
    const entryMark = {
      range: data.context.range,
      bgColor: '#ccffcc', // Light green for success
      note: `SUCCESS: ${data.transaction.type} processed for ${data.user.userEmail}`
    };
    
    return {
      ...data,
      entryMark: entryMark
    };
  } else {
    // No marking if we don't have sufficient data
    return data;
  }
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
    // Defensive check - ensure we have a valid result object
    if (!result || typeof result !== 'object') {
      throw new Error('Invalid result object provided to commitStateChanges');
    }
    
    // Prepare all database operations for batch processing
    const allOperations = [];
    
    // Add bike changes to batch
    if (result.stateChanges?.bikes && Array.isArray(result.stateChanges.bikes)) {
      result.stateChanges.bikes.forEach(change => {
        if (change && change.updatedData) {
          allOperations.push(prepareBikeOperation(change));
        }
      });
    }
    
    // Add user changes to batch  
    if (result.stateChanges?.users && Array.isArray(result.stateChanges.users)) {
      result.stateChanges.users.forEach(change => {
        if (change && change.updatedData) {
          allOperations.push(prepareUserOperation(change));
        }
      });
    }
    
    // Note: No log operations needed - Google Forms handles log creation
    // We only mark entries for errors (handled separately)
    
    // Execute all operations in batch for better performance
    const batchResults = DB.batchUpdate(allOperations);
    
    // Send notifications
    if (result.notifications && result.notifications.length > 0) {
      Logger.log(`Attempting to send ${result.notifications.length} notifications`);
      result.notifications.forEach((notification, index) => {
        try {
          Logger.log(`Processing notification ${index + 1}: ${notification.commID}`);
          const notificationResults = COMM.handleCommunication(notification.commID, notification.context);
          Logger.log(`Notification ${index + 1} results:`, JSON.stringify(notificationResults));
        } catch (error) {
          Logger.log(`Error processing notification ${index + 1}: ${error.message}`);
        }
      });
    } else {
      Logger.log('No notifications to send');
    }
    
    // Mark sheet entry (both success and error cases)
    if (result.entryMark && result.entryMark.range) {
      try {
        Logger.log(`Marking entry with color: ${result.entryMark.bgColor}, note: ${result.entryMark.note}`);
        DB.markEntry(result.entryMark.range, result.entryMark.bgColor, result.entryMark.note);
        Logger.log(`Successfully marked entry`);
      } catch (markError) {
        Logger.log(`Warning: Could not mark entry - ${markError.message}`);
        // Don't fail the entire transaction for marking issues
      }
    } else {
      Logger.log(`No entry marking needed - entryMark: ${!!result.entryMark}, range: ${!!result.entryMark?.range}`);
    }
    
    // Sort sheets (only if we have operations and transaction exists)
    if (allOperations.length > 0 && result.transaction?.type) {
      try {
        const sheetToSort = result.transaction.type === 'checkout' 
          ? CACHED_SETTINGS.VALUES.SHEETS.CHECKOUT_LOGS.NAME
          : CACHED_SETTINGS.VALUES.SHEETS.RETURN_LOGS.NAME;
        DB.sortByColumn(sheetToSort);
      } catch (sortError) {
        Logger.log(`Warning: Could not sort sheet - ${sortError.message}`);
        // Don't fail the entire transaction for sorting issues
      }
    }
    
    return {
      ...result,
      success: true,
      persistenceStatus: 'committed',
      batchResults: batchResults
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
 * Prepare bike operation for batch processing
 * @param {Object} change - Change specification
 * @returns {Object} Batch operation object
 */
function prepareBikeOperation(change) {
  if (!change || !change.updatedData) {
    throw new Error('Invalid bike change object');
  }
  
  if (!change.updatedData._rowIndex) {
    throw new Error('Missing row index for bike update - cannot commit changes');
  }
  
  const bikeRowData = [
    change.updatedData.bikeName || '',
    change.updatedData.size || '',
    change.updatedData.maintenanceStatus || 'Good',
    change.updatedData.availability || 'Available',
    change.updatedData.lastCheckoutDate || '',
    change.updatedData.lastReturnDate || '',
    change.updatedData.currentUsageTimer || 0,
    change.updatedData.totalUsageHours || 0,
    change.updatedData.mostRecentUser || '',
    change.updatedData.secondRecentUser || '',
    change.updatedData.thirdRecentUser || '',
    change.updatedData.tempRecent || '',
    change.updatedData.bikeHash || ''
  ];
  
  return {
    type: 'updateByRowIndex',
    sheetName: change.sheetName || CACHED_SETTINGS.VALUES.SHEETS.BIKES_STATUS.NAME,
    rowIndex: change.updatedData._rowIndex, // Use the row index from loaded data!
    values: bikeRowData
  };
}

/**
 * Prepare user operation for batch processing
 * @param {Object} change - Change specification
 * @returns {Object} Batch operation object
 */
function prepareUserOperation(change) {
  if (!change || !change.updatedData) {
    throw new Error('Invalid user change object');
  }
  
  // Only validate row index for updates, not for new user creation
  if (change.action !== 'create' && !change.updatedData._rowIndex) {
    throw new Error('Missing row index for user update - cannot commit changes');
  }
  
  const userRowData = [
    change.updatedData.userEmail || '',
    change.updatedData.hasUnreturnedBike ? 'Yes' : 'No',
    change.updatedData.lastCheckoutName || '',
    change.updatedData.lastCheckoutDate || '',
    change.updatedData.lastReturnName || '',
    change.updatedData.lastReturnDate || '',
    change.updatedData.numberOfCheckouts || 0,
    change.updatedData.numberOfReturns || 0,
    change.updatedData.numberOfMismatches || 0,
    change.updatedData.usageHours || 0,
    change.updatedData.overdueReturns || 0,
    change.updatedData.firstUsageDate || ''
  ];
  
  return {
    type: change.action === 'create' ? 'append' : 'updateByRowIndex',
    sheetName: change.sheetName || CACHED_SETTINGS.VALUES.SHEETS.USER_STATUS.NAME,
    rowIndex: change.updatedData._rowIndex, // Use the row index from loaded data!
    values: userRowData
  };
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