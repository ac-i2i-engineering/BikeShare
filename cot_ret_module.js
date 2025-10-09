/**
 * Main pipeline orchestrator - processes form submissions functionally
 * @param {Object} triggerEvent - Google Apps Script trigger event
 * @returns {Object} Result with success status and any notifications sent
 */
function processFormSubmissionEvent(triggerEvent) {
  // Acquire lock to prevent race conditions
  const lock = LockService.getScriptLock();
  
  try {
    // Wait up to 30 seconds for the lock
    lock.waitLock(30000);
    
    // Extract input
    const eventContext = extractEventContext(triggerEvent);
    const formData = parseFormResponse(eventContext);
    
    // Load current state
    const currentState = loadSystemState();
    
    // Process through pipeline based on operation type
    const pipeline = eventContext.operation === 'checkout' 
      ? checkoutPipeline 
      : returnPipeline;
    
    const rawData = { formData: formData, currentState:currentState, eventContext:eventContext};
    const result = pipeline(rawData);
    
    // Persist state changes and send notifications
    const finalResult = commitStateChanges(result);
    
    return finalResult;
    
  } catch (error) {
    return handlePipelineError(error, triggerEvent);
  } finally {
    // Always release the lock
    lock.releaseLock();
  }
}

/**
 * Checkout processing pipeline
 * @param {Object} rawData - (Parsed form submission data, context, and currentState)
 * @returns {Object} Processing result with state changes and notifications
 */
function checkoutPipeline(rawData) {
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
    
    // Communication steps
    generateNotifications
  )(rawData);
}

/**
 * Return processing pipeline
 * @param {Object} rawData - (Parsed form submission data, context, and currentState)
 * @returns {Object} Processing result with state changes and notifications
 */
function returnPipeline(rawData) {
  return pipe(
    // Validation steps
    validateEmailDomain,
    validateSystemActive,
    validateBikeExists,
    validateBikeCheckedOut,
    validateReturnEligible,
    
    // Business logic steps
    processReturnTransaction,
    updateBikeStatus,
    updateUserStatus,
    calculateUsageHours,
    
    // Communication steps
    generateNotifications
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
 * Load current system state from sheets using batch operations
 * @returns {Object} Current state object
 */
function loadSystemState() {
  // Batch load all required sheet data in minimal API calls
  const sheetData = loadAllUsersAndBikesData();
  
  return {
    bikes: processBikesData(sheetData.bikes),
    users: processUsersData(sheetData.users),
    settings: CACHED_SETTINGS.VALUES,
    timestamp: new Date()
  };
}

/**
 * Load all required sheet data efficiently using minimal API calls
 * @returns {Object} Raw 2D arrays from sheet data (not processed objects yet)
 */
function loadAllUsersAndBikesData() {
  try {    
    // Get both sheets in single context 
    const bikesSheet = DB.getSheetByName(CACHED_SETTINGS.VALUES.SHEETS.BIKES_STATUS.NAME);
    if (!bikesSheet) throw new Error('❌ Bikes sheet is missing in the spreadsheet');

    const usersSheet = DB.getSheetByName(CACHED_SETTINGS.VALUES.SHEETS.USER_STATUS.NAME);
    if (!usersSheet) throw new Error('❌ Users sheet is missing in the spreadsheet');

    // Get raw sheet data as 2D arrays
    const bikesData = bikesSheet.getDataRange().getValues();
    const usersData = usersSheet.getDataRange().getValues();
    
    return {
      bikes: bikesData,    
      users: usersData   
    };
  } catch (error) {
    throw new Error(`❌Batch loading failed: ${error.message}`);
  }
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
        assureRodeBike: responses[4] === 'Yes',
        mismatchExplanation: responses[5],
        returningForFriend: responses[6] === 'Yes',
        friendEmail: responses[7],
        issuesConcerns: responses[8],
    }
}

/**
 * Convert sheet value to proper type
 * @param {*} value - Raw value from sheet
 * @param {string} type - Target type ('string', 'number', 'date', 'boolean')
 * @returns {*} Converted value
 */
function convertSheetValue(value, type) {
  if (value === null || value === undefined || value === '') {
    switch (type) {
      case 'number': return 0;
      case 'string': return '';
      case 'date': return null;
      case 'boolean': return false;
      default: return value;
    }
  }

  switch (type) {
    case 'number':
      const num = parseFloat(value);
      return isNaN(num) ? 0 : num;
    case 'string':
      return value.toString().toLowerCase().trim();
    case 'date':
      if (value instanceof Date) return value;
      if (typeof value === 'string' && value.trim() === '') return null;
      const date = new Date(value)
      if (isNaN(date.getTime())) {
        Logger.log(`⚠️ Invalid date value: ${value}`);
        return null;
      }
      return date
    case 'boolean':
      if (typeof value === 'boolean') return value;
      const str = value.toString().toLowerCase().trim();
      return str === 'yes' || str === 'true' || str === '1';
    default:
      return value;
  }
}

/**
 * Process bikes data from pre-loaded sheet data
 * @param {Array} bikesData - Raw sheet data
 * @returns {Array} Array of bike objects
 */
function processBikesData(bikesData) {
  // Skip header row (index 0) and filter out empty rows (only check bike name)
  return bikesData.slice(1).filter(row => row[0] && row[0].toString().trim() !== '').map((row, index) => ({
    bikeName: convertSheetValue(row[0], 'string'),
    size: convertSheetValue(row[1], 'string'),
    maintenanceStatus: convertSheetValue(row[2], 'string'),
    availability: convertSheetValue(row[3], 'string'),
    lastCheckoutDate: convertSheetValue(row[4], 'date'),
    lastReturnDate: convertSheetValue(row[5], 'date'),
    currentUsageTimer: convertSheetValue(row[6], 'number'),
    totalUsageHours: convertSheetValue(row[7], 'number'),
    mostRecentUser: convertSheetValue(row[8], 'string'),
    secondRecentUser: convertSheetValue(row[9], 'string'),
    thirdRecentUser: convertSheetValue(row[10], 'string'),
    tempRecent: convertSheetValue(row[11], 'string'),
    bikeHash: convertSheetValue(row[12], 'string'),
    _rowIndex: index + 2 // +2 because we skip header (index 0) and arrays are 0-based but sheets are 1-based
  }));
}

/**
 * Process users data from pre-loaded sheet data
 * @param {Array} usersData - Raw sheet data
 * @returns {Array} Array of user objects
 */
function processUsersData(usersData) {
  // Skip header row (index 0) and filter out empty rows
  return usersData.slice(1).filter(row => row[0]).map((row, index) => ({
    userEmail: convertSheetValue(row[0], 'string'),
    hasUnreturnedBike: convertSheetValue(row[1], 'boolean'),
    lastCheckoutName: convertSheetValue(row[2], 'string'),
    lastCheckoutDate: convertSheetValue(row[3], 'date'),
    lastReturnName: convertSheetValue(row[4], 'string'),
    lastReturnDate: convertSheetValue(row[5], 'date'),
    numberOfCheckouts: convertSheetValue(row[6], 'number'),
    numberOfReturns: convertSheetValue(row[7], 'number'),
    numberOfMismatches: convertSheetValue(row[8], 'number'),
    usageHours: convertSheetValue(row[9], 'number'),
    overdueReturns: convertSheetValue(row[10], 'number'),
    firstUsageDate: convertSheetValue(row[11], 'date'),
    _rowIndex: index + 2 // +2 because we skip header (index 0) and arrays are 0-based but sheets are 1-based
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
  if (data.error) return data; // Skip if already has error
  
  const email = data.formData.userEmail
  if (!email || typeof email !== 'string') {
    return {
      ...data,
      error: 'ERR_USR_EMAIL_001',
      errorMessage: 'Invalid email format'
    };
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return {
      ...data,
      error: 'ERR_USR_EMAIL_001',
      errorMessage: 'Invalid email format'
    };
  }
  
  const domain = email.split('@')[1];
  const allowedDomain = CACHED_SETTINGS.VALUES.ALLOWED_EMAIL_DOMAIN || 'amherst.edu'; // Define the allowed domain
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
  let bike;
  
  // For checkout operations, find by hash
  if (data.formData.bikeHash) {
    bike = findBikeByHash(data.currentState.bikes, data.formData.bikeHash);
  } 
  // For return operations, find by name (with fuzzy matching)
  else if (data.formData.bikeName) {
    bike = findBikeByName(data.currentState.bikes, data.formData.bikeName);
  }
  
  if (!bike) {
    const errorCode = data.formData.bikeHash ? 'ERR_USR_COT_003' : 'ERR_USR_RET_002';
    return {
      ...data,
      error: errorCode,
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
      error: 'ERR_USR_COT_001',
      errorMessage: 'Bike is not ready for checkout'
    };
  }
  return data;
}

/**
 * Validate bike is awaiting for return
 * @param {Object} data - Current processing data
 * @returns {Object} Data with validation result
 */
function validateBikeCheckedOut(data) {
  if (data.error) return data; // Skip if already has error
  
  if (data.bike.availability !== 'Checked Out') {
    return {
      ...data,
      error: 'ERR_USR_RET_006',
      errorMessage: `❌Can't return ${data.bike.bikeName}: status is ${data.bike.availability} not "Checked Out"`
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
  
  let modData = {
    ...data,
    user: user
  }
  
  if (user.hasUnreturnedBike) {
    modData = {
      ...modData,
      error: 'ERR_USR_COT_002',
      errorMessage: 'User already has an unreturned bike'
    };
  }
  
  return modData
}

/**
 * Validate user is eligible for return
 * @param {Object} data - Current processing data
 * @returns {Object} Data with validation result
 */
function validateReturnEligible(data) {
  if (data.error) return data; // Skip if already has error
  
  //get user data
  const user = findUserByEmail(data.currentState.users, data.formData.userEmail) || createNewUser(data.formData.userEmail);
  
  const normalizedBikeMostRecentUser = (data.bike.mostRecentUser || '').toLowerCase().trim();
  const normalizedUserEmail = (data.formData.userEmail || '').toLowerCase().trim();
  const normalizedFriendEMail = (data.formData.friendEmail || '').toLowerCase().trim();
  const isLastBikeUser = normalizedBikeMostRecentUser === normalizedUserEmail
  const isReturningForFriend = !isLastBikeUser && (normalizedFriendEMail !== "" || data.formData.assureRodeBike);
  const isDirectReturn = !isReturningForFriend

  Logger.log(`🔍 Friend return check: mostRecentUser='${normalizedBikeMostRecentUser}', currentUser='${normalizedUserEmail}', friendEmail='${data.formData.friendEmail}', isReturningForFriend=${isReturningForFriend}`);

  // friend processing
  if(isReturningForFriend){
   if(!normalizedFriendEMail){
    const msg = `❌${user.userEmail} failed failed to return ${data.bike.bikeName} b/c no friend email provided`
    Logger.log(msg)
    return{
      ...data,
      user:user,
      error: 'ERR_USR_RET_004',
      errorMessage: msg
    }
   }

   const friend = findUserByEmail(data.currentState.users, data.formData.friendEmail)
   //if friend has no records for checkout or returns
   if(!friend){
    const msg = `❌${user.userEmail} failed failed to return ${data.bike.bikeName} for ${data.formData.friendEmail} records could not be found in User Status`
    Logger.log(msg)
    return{
      ...data,
      user:user,
      error: 'ERR_USR_RET_010',
      errorMessage: msg
    }
   }

   //if friend has no unreturned bike 
   if(normalizedBikeMostRecentUser != friend.userEmail || !friend.hasUnreturnedBike){
     const msg = `❌${user.userEmail} failed failed to return ${data.bike.bikeName} for ${data.formData.friendEmail} b/c they have no unreturned bike. they last checked out ${friend.lastCheckoutName} returned on ${friend.lastReturnDate}, Else bikeName is diff from lastCheckoutName`
     Logger.log(msg)
     return{
       ...data,
       user:user,
       friend: friend,
       error: 'ERR_USR_RET_003',
       errorMessage: msg
      }
    }

    //if no error found in friend return verifications
    //switch user to make sure User status is updated well
    return {
      ...data,
      user: friend,
      friend:user,
      isReturningForFriend: isReturningForFriend,
      isDirectReturn: isDirectReturn
      // isCollectedMismatch: isCollectedMismatch,
    };
  }
  
  // validate user has unreturned bike
  if(!user.hasUnreturnedBike){
    const msg =`❌ return failed b/c ${user.userEmail} last checked out ${user.lastCheckoutName} they returned on ${user.lastReturnDate}`
    Logger.log(msg)
    return {
      ...data,
      user: user,
      error:'ERR_USR_RET_006',
      errorMessage:msg,
    };
  }

  
  // validate user return mismatch
  if(!fuzzyMatch(data.bike.bikeName, user.lastCheckoutName)){
   //switch the bikes to update the status of the right one
    const msg =`❌ return failed b/c ${user.userEmail} last checked out ${user.lastCheckoutName} on ${user.lastReturnDate}, but the're returning ${data.bike.bikeName}`
    Logger.log(msg)
    return {
      ...data,
      user: user,
      error:'ERR_USR_RET_007',
      errorMessage:msg,
    };
  }
  
  // Detect if this is a direct return (user returning their own bike directly)
  return {
    ...data,
    user: user,
    isReturningForFriend: isReturningForFriend,
    isCollectedMismatch: false,
    isDirectReturn: isDirectReturn
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
 * Find bike by name (with fuzzy matching)
 * @param {Array} bikes - Array of bike objects
 * @param {string} bikeName - Bike name to search for
 * @returns {Object|null} Bike object or null if not found
 */
function findBikeByName(bikes, bikeName) {
  // First try exact match
  let bike = bikes.find(bike => 
    bike.bikeName.toLowerCase().trim() === bikeName.toLowerCase().trim()
  );
  
  // If no exact match, try fuzzy matching
  if (!bike) {
    bike = bikes.find(bike => fuzzyMatch(bike.bikeName, bikeName));
  }
  
  return bike || null;
}

/**
 * Find user by email (case-insensitive)
 * @param {Array} users - Array of user objects
 * @param {string} email - Email to search for
 * @returns {Object|null} User object or null if not found
 */
function findUserByEmail(users, email) {
  if (!email || typeof email !== 'string') {
    Logger.log(`⚠️ findUserByEmail: Invalid email provided: ${email}`);
    return null;
  }
  
  const normalizedEmail = email.toLowerCase().trim();
  const foundUser = users.find(user => {
    if (!user.userEmail || typeof user.userEmail !== 'string') {
      Logger.log(`⚠️ findUserByEmail: Invalid user email in database: ${user.userEmail}`);
      return false;
    }
    return user.userEmail.toLowerCase().trim() === normalizedEmail;
  }) || null;
  
  if (foundUser) {
    Logger.log(`✅ User found: ${normalizedEmail} (original: ${foundUser.userEmail})`);
  } else {
    Logger.log(`❌ User not found: ${normalizedEmail}`);
  }
  
  return foundUser;
}

/**
 * Create new user object with normalized email
 * @param {string} email - User email
 * @returns {Object} New user object
 */
function createNewUser(email) {
  const normalizedEmail = (email || '').toLowerCase().trim();
  Logger.log(`🆕 Creating new user with normalized email: ${normalizedEmail} (original: ${email})`);
  
  return {
    userEmail: normalizedEmail,
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