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
    const bikesData = DB.getAllData(CACHED_SETTINGS.VALUES.SHEETS.BIKES_STATUS.NAME);
    if (!bikesData) throw new Error('❌Failed to Load Bikes data');

    const usersData = DB.getAllData(CACHED_SETTINGS.VALUES.SHEETS.USER_STATUS.NAME);
    if (!usersData) throw new Error('❌Failed to Load Users data');

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
    const periodCol = CACHED_SETTINGS.VALUES.SHEETS.REPORTS.PERIOD_NUM_COLUMN - 1; // Convert to 0-based
    
    for (let i = 1; i < previousReports.length; i++) {
      if (previousReports[i][periodCol] == newReport.period) {
        existingRow = { rowIndex: i + 1, rowData: previousReports[i] };
        Logger.log(`🔍 Found existing report using batch data (row ${i + 1})`);
        break;
      }
    }
  }

  if (!existingRow){
    Logger.log(`➕ Creating new report entry for period ${newReport.period}`);
    DB.appendRow(CACHED_SETTINGS.VALUES.SHEETS.REPORTS.NAME, values);
    Logger.log(`Sorting the Reports sheet..`)
    DB.sortByColumn(CACHED_SETTINGS.VALUES.SHEETS.REPORTS.NAME)
  }else{
    Logger.log(`🔄 Updating existing report for period ${newReport.period}`);
    DB.updateRow(CACHED_SETTINGS.VALUES.SHEETS.REPORTS.NAME, existingRow.rowIndex, values);
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
  const diffInMs = timestamp - firstRunDate;
  return Math.round(diffInMs / checkSpan);
};

/**
 * Check if bike is overdue for return
 * @param {Object} bike - Bike object to check
 * @returns {boolean} True if bike is overdue
 */
const isBikeOverdue = (bike) => {
  if (bike.availability !== 'checked out') return false;
  const maxHours = CACHED_SETTINGS.VALUES.MAX_CHECKOUT_HOURS || 24;
  const hoursElapsed = (new Date() - bike.lastCheckoutDate) / (1000 * 60 * 60);
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
    const issue = convertSheetValue(log[8], 'string').toLowerCase();
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
  const overdueCol = CACHED_SETTINGS.VALUES.SHEETS.REPORTS.OVERDUE_RETURNS_COLUMN - 1; // Convert to 0-based
  const mismatchCol = CACHED_SETTINGS.VALUES.SHEETS.REPORTS.RETURN_MISMATCHES_COLUMN - 1;
  const usageCol = CACHED_SETTINGS.VALUES.SHEETS.REPORTS.TOTAL_USAGE_HOURS_COLUMN - 1;

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
  const period = getPeriodNumber(timestamp, checkSpan);
  
  Logger.log(`📅 Report period: ${period} (${frequencyInDays} day interval)`);
  
  const bikes = processBikesData(allSheetData.bikes);
  const users = processUsersData(allSheetData.users);

  Logger.log(`🚲 Found ${bikes.length} bikes, 👤 ${users.length} users`);

  // Calculate deltas using batch-loaded reports data
  const deltas = calculateAllDeltas(users, allSheetData.reports);
  
  // Count reported issues using batch-loaded return logs
  const reportedIssues = countReportedIssues(timestamp, checkSpan, allSheetData.returnLogs);

  return {
    timestamp: timestamp,
    recordedBy: "Automated",
    period: period,
    totalBikes: bikes.length,
    bikesInRepair: bikes.filter(bike => bike.maintenanceStatus === 'in repair').length,
    checkedOutBikes: bikes.filter(bike => bike.availability === 'checked out').length,
    overdueBikes: bikes.filter(bike => isBikeOverdue(bike)).length,
    readyForCheckout: bikes.filter(bike => bike.availability === 'available').length,
    newUsers: countNewUsersForPeriod(users, timestamp, checkSpan),
    lateReturnsCount: deltas.lateReturnsCount,
    returnMismatches: deltas.returnMismatches,
    reportedIssues: reportedIssues,
    totalUsageHours: deltas.totalUsageHours,
    adminNotes: ''
  };
};
// =============================================================================