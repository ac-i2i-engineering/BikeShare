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
          timestamp: convertSheetValue(responses[0], 'date'),
          userEmail: convertSheetValue(responses[1], 'string'),
          bikeHash: convertSheetValue(responses[2], 'string'),
          conditionConfirmation: convertSheetValue(responses[3], 'string'),
        };
    }

    //parse return entry
    return {
        timestamp: convertSheetValue(responses[0], 'date'),
        userEmail: convertSheetValue(responses[1], 'string'),
        bikeName: convertSheetValue(responses[2], 'string'),
        confirmBikeName: convertSheetValue(responses[3], 'string'),
        assureRodeBike: convertSheetValue(responses[4], 'boolean'),
        mismatchExplanation: convertSheetValue(responses[5], 'string'),
        returningForFriend: convertSheetValue(responses[6], 'boolean'),
        friendEmail: convertSheetValue(responses[7], 'string'),
        issuesConcerns: convertSheetValue(responses[8], 'string'),
    }
}

/**
 * Load all bikes data from sheet
 * @returns {Array} Raw 2D array from bikes sheet
 */
function loadAllBikesData() {
  try {
    const bikesData = DB.getAllData(CACHED_SETTINGS.VALUES.SHEETS.BIKES_STATUS.NAME);
    if (!bikesData) throw new Error('❌ Failed loading Bikes data');
    return bikesData;
  } catch (error) {
    throw new Error(`❌Loading bikes data failed: ${error.message}`);
  }
}

/**
 * Load all users data from sheet
 * @returns {Array} Raw 2D array from users sheet
 */
function loadAllUsersData() {
  try {
    const usersData = DB.getAllData(CACHED_SETTINGS.VALUES.SHEETS.USER_STATUS.NAME);
    if (!usersData) throw new Error('❌ Failed loading Users data');
    return usersData;
  } catch (error) {
    throw new Error(`❌Loading users data failed: ${error.message}`);
  }
}