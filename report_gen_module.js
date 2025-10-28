// =============================================================================
// FUNCTIONAL REPORT GENERATION
// =============================================================================

/**
 * Load all required data in single batch operation
 * @returns {Object} All sheet data needed for reports
 */
const loadAllReportData = () => {
  try {    
    // Get all required sheets in single context
    const bikesData = loadAllBikesData()

    const usersData = loadAllUsersData()

    const returnLogsData = DB.getAllData(CACHED_SETTINGS.VALUES.SHEETS.RETURN_LOGS.NAME);
    if (!returnLogsData) throw new Error('❌Failed to Load  Logs data');

    const reportsData = DB.getAllData(CACHED_SETTINGS.VALUES.SHEETS.REPORTS.NAME);
    if (!reportsData) throw new Error('❌Failed to Load ports data');
    
    Logger.log(`📦 Batch loaded data: Bikes (${bikesData.length} rows), Users (${usersData.length} rows), Return Logs (${returnLogsData.length} rows), Reports (${reportsData.length} rows)`);
    
    return {
      bikes: bikesData,
      users: usersData,
      returnLogs: returnLogsData,
      reports: reportsData
    };
  } catch (error) {
    throw new Error(`❌Batch loading failed: ${error.message}`);
  }
};

/**
 * Save report data to spreadsheet using batch-loaded data for checking
 * @param {Object} newReport - Report data to save
 * @param {Array} previousReports - Pre-loaded reports data (optional)
 */
const saveReport = (newReport, previousReports = null) => {
  if(!newReport){
    throw new Error("❌ Can't save null newReport")
  }

  Logger.log(`💾 Saving report for period ${newReport.period}...`);
  
  const values = [
    newReport.timestamp,
    newReport.recordedBy,
    newReport.period,
    newReport.totalBikes,
    newReport.bikesInRepair,
    newReport.checkedOutBikes,
    newReport.overdueBikes,
    newReport.readyForCheckout,
    newReport.newUsers,
    newReport.lateReturnsCount,
    newReport.returnMismatches,
    newReport.reportedIssues,
    newReport.totalUsageHours,
    newReport.adminNotes
  ];

  let existingRow = null;

  // Use pre-loaded data if available (no additional API call)
  if (previousReports && previousReports.length > 1) {
    const periodCol = CACHED_SETTINGS.VALUES.SHEETS.REPORTS.PERIOD_NUM_COLUMN;
    const newPeriodNum = Number(newReport.period);
    
    Logger.log(`🔍 Searching for existing report with period ${newReport.period} (type: ${typeof newReport.period}) in ${previousReports.length - 1} existing reports...`);
    Logger.log(`🔍 Using period column index: ${periodCol}`);
    
    // Skip header row and find matching period using functional approach
    const dataRows = previousReports.slice(1);
    const matchingReportIndex = dataRows.findIndex((row, index) => {
      const existingPeriod = row[periodCol];
      const existingPeriodNum = Number(existingPeriod);
      
      Logger.log(`   Row ${index + 2}: period = ${existingPeriod} (type: ${typeof existingPeriod}, as number: ${existingPeriodNum})`);
      Logger.log(`   Comparing: ${existingPeriodNum} === ${newPeriodNum} ? ${existingPeriodNum === newPeriodNum}`);
      
      // Use numeric comparison to avoid type mismatch issues
      return !isNaN(existingPeriodNum) && !isNaN(newPeriodNum) && existingPeriodNum === newPeriodNum;
    });
    
    if (matchingReportIndex !== -1) {
      const actualRowIndex = matchingReportIndex + 2; // +2 because we skipped header and arrays are 0-based but sheets are 1-based
      existingRow = { 
        rowIndex: actualRowIndex, 
        rowData: dataRows[matchingReportIndex] 
      };
      Logger.log(`🔍 Found existing report at row ${actualRowIndex} with matching period ${newReport.period}`);
    } else {
      Logger.log(`🔍 No existing report found for period ${newReport.period}`);
    }
  } else {
    Logger.log(`🔍 No previous reports data available (length: ${previousReports?.length || 0})`);
  }

  if (!existingRow) {
    Logger.log(`➕ Creating new report entry for period ${newReport.period}`);
    try {
      DB.appendRow(CACHED_SETTINGS.VALUES.SHEETS.REPORTS.NAME, values);
      Logger.log(`✅ Successfully appended new report`);
      Logger.log(`Sorting the Reports sheet..`);
      DB.sortByColumn(CACHED_SETTINGS.VALUES.SHEETS.REPORTS.NAME);
    } catch (error) {
      Logger.log(`❌ Error appending new report: ${error.message}`);
      throw error;
    }
  } else {
    Logger.log(`🔄 Updating existing report for period ${newReport.period} at row ${existingRow.rowIndex}`);
    try {
      DB.updateRow(CACHED_SETTINGS.VALUES.SHEETS.REPORTS.NAME, existingRow.rowIndex, values);
      Logger.log(`✅ Successfully updated existing report at row ${existingRow.rowIndex}`);
    } catch (error) {
      Logger.log(`❌ Error updating existing report: ${error.message}`);
      throw error;
    }
  }

  Logger.log(`✅ successfuly created new report`)
};

/**
 * Calculate period number based on first run date
 * @param {Date} timestamp - Current timestamp
 * @param {number} checkSpan - Period interval in milliseconds
 * @returns {number} Period number
 */
const getPeriodNumber = (timestamp, checkSpan) => {
  const firstRunDate = new Date(CACHED_SETTINGS.VALUES.REPORT_GENERATION.FIRST_GENERATION_DATE);
  
  // Validate inputs to prevent NaN
  if (isNaN(firstRunDate.getTime())) {
    throw new Error(`❌ Invalid FIRST_GENERATION_DATE: ${CACHED_SETTINGS.VALUES.REPORT_GENERATION.FIRST_GENERATION_DATE}`);
  }
  
  if (!checkSpan || checkSpan <= 0) {
    throw new Error(`❌ Invalid checkSpan: ${checkSpan}`);
  }
  
  const diffInMs = timestamp - firstRunDate;
  const period = Math.round(diffInMs / checkSpan);
  
  Logger.log(`📊 Period calculation: timestamp=${timestamp}, firstRunDate=${firstRunDate}, diffInMs=${diffInMs}, checkSpan=${checkSpan}, period=${period}`);
  
  if (isNaN(period)) {
    throw new Error(`❌ Period calculation resulted in NaN. timestamp=${timestamp}, firstRunDate=${firstRunDate}, checkSpan=${checkSpan}`);
  }
  
  return period;
};

/**
 * Check if bike is overdue for return
 * @param {Object} bike - Bike object to check
 * @returns {boolean} True if bike is overdue
 */
const isBikeOverdue = (bike) => {
  if (bike.availability !== 'checked out') return false;
  
  // Validate lastCheckoutDate before calculating
  if (!bike.lastCheckoutDate || !(bike.lastCheckoutDate instanceof Date) || isNaN(bike.lastCheckoutDate.getTime())) {
    Logger.log(`⚠️ Bike ${bike.bikeName} is marked as 'checked out' but has invalid lastCheckoutDate: ${bike.lastCheckoutDate}`);
    return false; // Can't determine if overdue without valid checkout date
  }
  
  const maxHours = CACHED_SETTINGS.VALUES.MAX_CHECKOUT_HOURS || 24;
  const hoursElapsed = (new Date() - bike.lastCheckoutDate) / (1000 * 60 * 60);
  
  // Additional validation to ensure calculation is valid
  if (isNaN(hoursElapsed) || hoursElapsed < 0) {
    Logger.log(`⚠️ Bike ${bike.bikeName} calculated invalid hours elapsed: ${hoursElapsed}`);
    return false;
  }
  
  return hoursElapsed > maxHours;
};

/**
 * Count new users for current period
 * @param {Array} users - Array of user objects
 * @param {Date} timestamp - Current timestamp
 * @param {number} checkSpan - Period interval in milliseconds
 * @returns {number} Number of new users
 */
const countNewUsersForPeriod = (users, timestamp, checkSpan) => {
  const count = users.filter(user => {
    return (timestamp - user.firstUsageDate) <= checkSpan;
  }).length;
  Logger.log(`👥 New users in period: ${count}`);
  return count;
};

/**
 * Count reported issues from batch-loaded return logs data
 * @param {Date} timestamp - Current timestamp
 * @param {number} checkSpan - Period interval in milliseconds
 * @param {Array} returnLogsData - Pre-loaded return logs data
 * @returns {number} Number of reported issues
 */
const countReportedIssues = (timestamp, checkSpan, returnLogsData) => {
  const filtered = returnLogsData.slice(1).filter(log => {
    const returnDate = convertSheetValue(log[0], 'date');
    if (!returnDate) return false;
    return (timestamp - returnDate) <= checkSpan;
  });

  const count = filtered.filter(log => {
    const issue = convertSheetValue(log[8], 'string')
    return issue !== "" && !CACHED_SETTINGS.VALUES.IGNORED_REPORT_STMTS_ON_RFORM?.includes(issue);
  }).length;
  
  Logger.log(`⚠️ Issues reported in period: ${count} (from ${filtered.length} logs in range)`);
  return count;
};

/**
 * Calculate all period deltas using batch-loaded reports data
 * @param {Array} users - Array of user objects
 * @param {Array} previousReports - Existing reports data (required)
 * @returns {Object} Object with all delta calculations
 */
const calculateAllDeltas = (users, previousReports) => {
  if (!previousReports || previousReports.length === 0) {
    throw new Error('Reports data is required for delta calculations');
  }

  // Get current totals from users 
  const totalOverdueReturns = users.reduce((count, user) => count + (user.overdueReturns || 0), 0);
  const currentPeriodMismatches = users.reduce((count, user) => count + (user.numberOfMismatches || 0), 0);
  const totalUsageHours = users.reduce((sum, user) => sum + (user.usageHours || 0), 0);

  // Calculate previous recorded values from batch-loaded reports data
  const overdueCol = CACHED_SETTINGS.VALUES.SHEETS.REPORTS.OVERDUE_RETURNS_COLUMN;
  const mismatchCol = CACHED_SETTINGS.VALUES.SHEETS.REPORTS.RETURN_MISMATCHES_COLUMN;
  const usageCol = CACHED_SETTINGS.VALUES.SHEETS.REPORTS.TOTAL_USAGE_HOURS_COLUMN;

  const prevRecordedOverdueReturns = previousReports.slice(1).reduce((sum, row) => 
    sum + convertSheetValue(row[overdueCol], 'number'), 0);
  const prevRecordedMismatches = previousReports.slice(1).reduce((sum, row) => 
    sum + convertSheetValue(row[mismatchCol], 'number'), 0);
  const prevRecordedUsageHours = previousReports.slice(1).reduce((sum, row) => 
    sum + convertSheetValue(row[usageCol], 'number'), 0);
  
  Logger.log('📊 Calculated previous values from batch data');

  const lateReturnsCount = Math.max(0, totalOverdueReturns - prevRecordedOverdueReturns);
  const returnMismatches = Math.max(0, currentPeriodMismatches - prevRecordedMismatches);
  const totalUsageHoursDeltas = Math.max(0, totalUsageHours - prevRecordedUsageHours);

  Logger.log(`🚨 Overdue returns delta: ${lateReturnsCount} (total: ${totalOverdueReturns}, prev: ${prevRecordedOverdueReturns})`);
  Logger.log(`🔄 Return mismatches delta: ${returnMismatches} (total: ${currentPeriodMismatches}, prev: ${prevRecordedMismatches})`);
  Logger.log(`⏱️ Usage hours delta: ${totalUsageHoursDeltas} (total: ${totalUsageHours}, prev: ${prevRecordedUsageHours})`);

  return {
    lateReturnsCount,
    returnMismatches,
    totalUsageHours: totalUsageHoursDeltas
  };
};

/**
 * Get return logs within time coverage
 * @param {Date} timestamp - Current timestamp
 * @param {number} checkSpan - Period interval in milliseconds
 * @returns {Array} Filtered return logs within time period
 */
const getReturnLogsInCoverage = (timestamp, checkSpan) => {
  const returnLogs = DB.getAllData(CACHED_SETTINGS.VALUES.SHEETS.RETURN_LOGS.NAME);
  const filtered = returnLogs.slice(1).filter(log => {
    if (!log[0]) return false;
    const returnDate = new Date(log[0]);
    return (timestamp - returnDate) <= checkSpan;
  });
  Logger.log(`📋 Found ${filtered.length} return logs in coverage period`);
  return filtered;
};

/**
 * Main pipeline function to generate and save reports
 * @returns {Object} Result object with success status and data
 */
const runReportPipeline = () => {
  try {
    Logger.log('📊 Starting report generation...');
    
    const allSheetData = loadAllReportData();
    const reportData = generateReport(allSheetData);
    saveReport(reportData, allSheetData.reports);
    
    // Send notification if communication system is available
    try {
      COMM.handleCommunication('CFM_RPT_001', reportData);
    } catch (commError) {
      Logger.log(`❌ Failed to send confirmation notification: ${JSON.stringify(commError)}`);
    }
    
    Logger.log(`✅ Report generated for period ${reportData.period}`);
    return { success: true, period: reportData.period, data: reportData };

  } catch (error) {
    Logger.log(`❌ Report generation failed: ${error.message}`);
    // Send error notification if communication system is available
    COMM.handleCommunication('ERR_RPT_001', {
      timestamp: new Date(),
      errorMessage: error.message
    });
    
    return { success: false, error: error.message };
  }
};

/**
 * Generate report using pre-loaded batch data
 * @param {Object} allSheetData - All pre-loaded sheet data
 * @returns {Object} Report data with all metrics
 */
const generateReport = (allSheetData) => {
  Logger.log('🔍 Processing batch-loaded data...');
  const timestamp = new Date();
  const frequencyInDays = CACHED_SETTINGS.VALUES.REPORT_GENERATION.DAYS_INTERVAL;
  const checkSpan = frequencyInDays * 24 * 60 * 60 * 1000;
  
  Logger.log(`📊 Report generation settings: frequencyInDays=${frequencyInDays}, checkSpan=${checkSpan}`);
  Logger.log(`📊 FIRST_GENERATION_DATE=${CACHED_SETTINGS.VALUES.REPORT_GENERATION.FIRST_GENERATION_DATE}`);
  
  const period = getPeriodNumber(timestamp, checkSpan);
  
  Logger.log(`📅 Report period: ${period} (type: ${typeof period}) for ${frequencyInDays} day interval`);
  
  const bikes = processBikesData(allSheetData.bikes);
  const users = processUsersData(allSheetData.users);

  Logger.log(`🚲 Found ${bikes.length} bikes, 👤 ${users.length} users`);

  // Validate bike data consistency before generating report
  const checkedOutBikes = bikes.filter(bike => bike.availability === 'checked out');
  const checkedOutWithInvalidDates = checkedOutBikes.filter(bike => 
    !bike.lastCheckoutDate || !(bike.lastCheckoutDate instanceof Date) || isNaN(bike.lastCheckoutDate.getTime())
  );
  
  if (checkedOutWithInvalidDates.length > 0) {
    Logger.log(`⚠️ Data inconsistency detected: ${checkedOutWithInvalidDates.length} bikes marked as 'checked out' but have invalid checkout dates:`);
    checkedOutWithInvalidDates.forEach(bike => {
      Logger.log(`   - ${bike.bikeName}: lastCheckoutDate = ${bike.lastCheckoutDate}`);
    });
  }

  // Calculate deltas using batch-loaded reports data
  const deltas = calculateAllDeltas(users, allSheetData.reports);
  
  // Count reported issues using batch-loaded return logs
  const reportedIssues = countReportedIssues(timestamp, checkSpan, allSheetData.returnLogs);

  // Calculate counts with logging
  const bikesInRepairCount = bikes.filter(bike => bike.maintenanceStatus === 'in repair').length;
  const checkedOutBikesCount = checkedOutBikes.length;
  const overdueBikesCount = bikes.filter(bike => isBikeOverdue(bike)).length;
  const readyForCheckoutCount = bikes.filter(bike => bike.availability === 'available').length;

  Logger.log(`📊 Bike status counts: Total=${bikes.length}, InRepair=${bikesInRepairCount}, CheckedOut=${checkedOutBikesCount}, Overdue=${overdueBikesCount}, available=${readyForCheckoutCount}`);
  if (checkedOutWithInvalidDates.length > 0) {
    Logger.log(`⚠️ Note: ${checkedOutWithInvalidDates.length} checked-out bikes excluded from overdue calculation due to invalid dates`);
  }

  return {
    timestamp: timestamp,
    recordedBy: "Automated",
    period: period,
    totalBikes: bikes.length,
    bikesInRepair: bikesInRepairCount,
    checkedOutBikes: checkedOutBikesCount,
    overdueBikes: overdueBikesCount,
    readyForCheckout: readyForCheckoutCount,
    newUsers: countNewUsersForPeriod(users, timestamp, checkSpan),
    lateReturnsCount: deltas.lateReturnsCount,
    returnMismatches: deltas.returnMismatches,
    reportedIssues: reportedIssues,
    totalUsageHours: deltas.totalUsageHours,
    adminNotes: ''
  };
};
// =============================================================================