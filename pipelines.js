/**
 * Main pipeline orchestrator - processes form submissions functionally
 * @param {Object} triggerEvent - Google Apps Script trigger event
 * @returns {Object} Result with success status and any notifications sent
 */
function processFormSubmissionEvent(triggerEvent) {
  try {
    // Extract input
    const context = extractEventContext(triggerEvent);
    const formData = parseFormResponse(context);
    
    // Load current state
    const currentState = loadSystemState();
    
    // Process through pipeline based on operation type
    const pipeline = context.operation === 'checkout' 
      ? checkoutPipeline 
      : returnPipeline;
    
    const result = pipeline(formData, currentState, context);
    
    // Persist state changes and send notifications
    const finalResult = commitStateChanges(result);
    
    return finalResult;
    
  } catch (error) {
    return handlePipelineError(error, triggerEvent);
  }
}

/**
 * Checkout processing pipeline
 * @param {Object} formData - Parsed form submission data
 * @param {Object} currentState - Current system state (bikes, users, settings)
 * @param {Object} context - Additional context (range, sheet name, etc.)
 * @returns {Object} Processing result with state changes and notifications
 */
function checkoutPipeline(formData, currentState, context) {
  // Add context to formData for error handling
  const rawData = { formData: formData, currentState:currentState, context:context};
  
  return pipe(
    // Validation steps
    validateEmailDomain,
    validateSystemActive,
    validateBikeExists,
    validateBikeAvailable,
    validateUserEligible,
    
    // Business logic steps
    processCheckoutTransaction,
    updateBikeStatus,
    updateUserStatus,
    createCheckoutRecord,
    
    // Communication steps
    generateNotifications,
    markSheetEntry
  )(rawData);
}

/**
 * Return processing pipeline
 * @param {Object} formData - Parsed form submission data
 * @param {Object} currentState - Current system state (bikes, users, settings)
 * @param {Object} context - Additional context (range, sheet name, etc.)
 * @returns {Object} Processing result with state changes and notifications
 */
function returnPipeline(formData, currentState, context) {
  // Add context to formData for error handling
  const rawData = { formData: formData, currentState:currentState, context:context};
  
  return pipe(
    // Validation steps
    validateEmailDomain,
    validateSystemActive,
    validateBikeExists,
    validateReturnEligible,
    
    // Business logic steps
    processReturnTransaction,
    updateBikeStatus,
    updateUserStatus,
    calculateUsageHours,
    createReturnRecord,
    
    // Communication steps
    generateNotifications,
    markSheetEntry
  )(rawData);
}


// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Functional composition helper - creates a pipeline of functions
 * @param {...Function} functions - Functions to compose
 * @returns {Function} Composed function
 */
const pipe = (...functions) => rawData => functions.reduce((accData, fn) => fn(accData), rawData);

/**
 * Extract context from Google Apps Script trigger event
 * @param {Object} triggerEvent - Apps Script event object
 * @returns {Object} Extracted context
 */
function extractEventContext(triggerEvent) {
  const sheetName = triggerEvent.source.getActiveSheet().getName();
  return {
    operation: sheetName === CACHED_SETTINGS.VALUES.SHEETS.CHECKOUT_LOGS.NAME ? 'checkout' : 'return',
    responses: triggerEvent.values,
    range: triggerEvent.range,
    sheetName: sheetName,
    timestamp: new Date()
  };
}

/**
 * Parse form response into structured data
 * @param {Array} responses - Raw form response array
 * @returns {Object} Structured form data
 */
function parseFormResponse(context) {
  const responses = context.responses

  //parse checkout entry
  if (context.operation === 'checkout'){
        return {
          timestamp: responses[0],
          userEmail: responses[1],
          bikeHash: responses[2],
          conditionConfirmation: responses[3],
        };
    }

    //parse return entry
    return {
        timestamp: responses[0],
        userEmail: responses[1],
        bikeName: responses[2],
        confirmBikeName: responses[3],
        assureRodeBike: responses[4],
        mismatchExplanation: responses[5],
        returningForFriend: responses[6],
        friendEmail: responses[7],
        issuesConcerns: responses[8],
    }
}

/**
 * Load current system state from sheets
 * @returns {Object} Current state object
 */
function loadSystemState() {
  return {
    bikes: loadBikesData(),
    users: loadUsersData(),
    settings: CACHED_SETTINGS.VALUES,
    timestamp: new Date()
  };
}

/**
 * Load bikes data and convert to functional format
 * @param {DatabaseManager} db - Database manager instance
 * @returns {Array} Array of bike objects
 */
function loadBikesData() {
  const bikesData = DB.getAllData(CACHED_SETTINGS.VALUES.SHEETS.BIKES_STATUS.NAME);
  return bikesData.map(row => ({
    bikeName: row[0],
    size: row[1],
    maintenanceStatus: row[2],
    availability: row[3],
    lastCheckoutDate: row[4],
    lastReturnDate: row[5],
    currentUsageTimer: row[6] || 0,
    totalUsageHours: row[7] || 0,
    mostRecentUser: row[8] || '',
    secondRecentUser: row[9] || '',
    thirdRecentUser: row[10] || '',
    tempRecent: row[11] || '',
    bikeHash: row[12]
  }));
}

/**
 * Load users data and convert to functional format
 * @param {DatabaseManager} db - Database manager instance
 * @returns {Array} Array of user objects
 */
function loadUsersData() {
  const usersData = DB.getAllData(CACHED_SETTINGS.VALUES.SHEETS.USERS_STATUS.NAME);
  return usersData.map(row => ({
    userEmail: row[0],
    hasUnreturnedBike: row[1] === 'Yes',
    lastCheckoutName: row[2] || '',
    lastCheckoutDate: row[3],
    lastReturnName: row[4] || '',
    lastReturnDate: row[5],
    numberOfCheckouts: row[6] || 0,
    numberOfReturns: row[7] || 0,
    numberOfMismatches: row[8] || 0,
    usageHours: row[9] || 0,
    overdueReturns: row[10] || 0,
    firstUsageDate: row[11]
  }));
}

// =============================================================================
// VALIDATION FUNCTIONS (Pure)
// =============================================================================

/**
 * Validate email domain
 * @param {Object} data - Current processing data
 * @returns {Object} Data with validation result
 */
function validateEmailDomain(data) {
  
  const email = data.formData.userEmail
  if (!email || typeof email !== 'string') return false;
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return false;
  
  const domain = email.split('@')[1];
  const isValid = domain.toLowerCase() === allowedDomain.toLowerCase();
  if (!isValid) {
    return {
      ...data,
      error: 'ERR_USR_EMAIL_001',
      errorMessage: 'Only amherst.edu email addresses are allowed'
    };
  }
  return data;
}

/**
 * Validate system is active
 * @param {Object} data - Current processing data
 * @param {Object} settings - System settings
 * @returns {Object} Data with validation result
 */
function validateSystemActive(data) {
  if (!data.currentState.settings.SYSTEM_ACTIVE) {
    return {
      ...data,
      error: 'ERR_OPR_COR_001',
      errorMessage: 'System is currently out of service'
    };
  }
  return data;
}

/**
 * Validate bike exists
 * @param {Object} data - Current processing data
 * @returns {Object} Data with bike information
 */
function validateBikeExists(data) {
  const bike = findBikeByHash(data.currentState.bikes, data.formData.bikeHash);
  if (!bike) {
    return {
      ...data,
      error: 'ERR_BIK_NOT_001',
      errorMessage: 'Bike not found'
    };
  }
  return {
    ...data,
    bike: bike
  };
}

/**
 * Validate bike is available for checkout
 * @param {Object} data - Current processing data
 * @returns {Object} Data with validation result
 */
function validateBikeAvailable(data) {
  if (data.error) return data; // Skip if already has error
  
  if (data.bike.availability !== 'Available') {
    return {
      ...data,
      error: 'ERR_BIK_AVL_001',
      errorMessage: 'Bike is not available for checkout'
    };
  }
  return data;
}

/**
 * Validate user is eligible for checkout
 * @param {Object} data - Current processing data
 * @returns {Object} Data with user information
 */
function validateUserEligible(data) {
  if (data.error) return data; // Skip if already has error
  
  const user = findUserByEmail(data.currentState.users, data.formData.userEmail) || createNewUser(data.formData.userEmail);
  
  if (user.hasUnreturnedBike) {
    return {
      ...data,
      error: 'ERR_USR_UNR_001',
      errorMessage: 'User already has an unreturned bike'
    };
  }
  
  return {
    ...data,
    user: user
  };
}

/**
 * Validate user is eligible for return
 * @param {Object} data - Current processing data
 * @param {Array} users - Current users data
 * @returns {Object} Data with validation result
 */
function validateReturnEligible(data) {
  if (data.error) return data; // Skip if already has error
  
  // Validate bike is actually checked out
  if (data.bike.availability !== 'Checked Out') {
    return {
      ...data,
      error: 'ERR_BIK_NOT_CHK_001',
      errorMessage: 'Bike is not currently checked out'
    };
  }
  
  const user = findUserByEmail(data.currentState.users, data.formData.userEmail) || createNewUser(data.formData.userEmail);
  
  // Check if returning for friend (bike not checked out by this user)
  const isReturningForFriend = data.bike.mostRecentUser !== data.formData.userEmail && data.formData.friendEmail !== "";
  
  // If returning for friend, validate they have permission or bike is overdue
  if (isReturningForFriend) {
    const checkoutTime = new Date(data.bike.lastCheckoutDate);
    const hoursCheckedOut = (data.currentState.timestamp - checkoutTime) / (1000 * 60 * 60);
    
    // Allow friend returns if bike has been out for more than 24 hours (overdue)
    const isOverdue = hoursCheckedOut > 24;
    
    if (!isOverdue) {
      // Could implement additional checks here (e.g., friend permissions)
      Logger.log(`Friend return attempted: ${data.formData.userEmail} returning ${data.bike.bikeName} for ${data.bike.mostRecentUser}`);
    }
  }
  
  return {
    ...data,
    user: user,
    isReturningForFriend: isReturningForFriend
  };
}

// =============================================================================
// HELPER FUNCTIONS (Pure)
// =============================================================================

/**
 * Find bike by hash ID
 * @param {Array} bikes - Array of bike objects
 * @param {string} bikeHash - Bike hash to search for
 * @returns {Object|null} Bike object or null if not found
 */
function findBikeByHash(bikes, bikeHash) {
  return bikes.find(bike => bike.bikeHash === bikeHash) || null;
}

/**
 * Find user by email
 * @param {Array} users - Array of user objects
 * @param {string} email - Email to search for
 * @returns {Object|null} User object or null if not found
 */
function findUserByEmail(users, email) {
  return users.find(user => user.userEmail === email) || null;
}

/**
 * Create new user object
 * @param {string} email - User email
 * @returns {Object} New user object
 */
function createNewUser(email) {
  return {
    userEmail: email,
    hasUnreturnedBike: false,
    lastCheckoutName: '',
    lastCheckoutDate: null,
    lastReturnName: '',
    lastReturnDate: null,
    numberOfCheckouts: 0,
    numberOfReturns: 0,
    numberOfMismatches: 0,
    usageHours: 0,
    overdueReturns: 0,
    firstUsageDate: null,
    isNewUser: true
  };
}