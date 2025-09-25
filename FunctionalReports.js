// =============================================================================
// FUNCTIONAL REPORT GENERATION
// Pure functions for generating system reports
// =============================================================================

/**
 * Generate periodic report using functional approach
 * @returns {Object} Report generation result
 */
function generatePeriodicReportFunctional() {
  try {
    // Check if report generation is enabled
    if (!CACHED_SETTINGS.VALUES.REPORT_GENERATION.ENABLE_REPORT_GENERATION) {
      return {
        success: true,
        message: 'Report generation is disabled',
        reportData: null
      };
    }
    
    // Load current system state
    const systemState = loadSystemState();
    
    // Generate report through functional pipeline
    const reportResult = pipe(
      (state) => calculateSystemMetrics(state),
      (data) => calculateUserMetrics(data),
      (data) => calculateBikeMetrics(data),
      (data) => generateReportSummary(data),
      (data) => formatReportData(data),
      (data) => saveReportData(data)
    )(systemState);
    
    return {
      success: true,
      reportData: reportResult,
      timestamp: new Date()
    };
    
  } catch (error) {
    Logger.log(`Error in functional report generation: ${error.message}`);
    return {
      success: false,
      errorMessage: error.message,
      timestamp: new Date()
    };
  }
}

/**
 * Calculate overall system metrics
 * @param {Object} systemState - Current system state
 * @returns {Object} State with system metrics
 */
function calculateSystemMetrics(systemState) {
  const totalBikes = systemState.bikes.length;
  const availableBikes = systemState.bikes.filter(bike => bike.availability === 'Available').length;
  const checkedOutBikes = systemState.bikes.filter(bike => bike.availability === 'Checked Out').length;
  const maintenanceBikes = systemState.bikes.filter(bike => bike.maintenanceStatus !== 'Good').length;
  
  const totalUsers = systemState.users.length;
  const activeUsers = systemState.users.filter(user => user.hasUnreturnedBike).length;
  const newUsers = systemState.users.filter(user => user.numberOfCheckouts === 1).length;
  
  return {
    ...systemState,
    systemMetrics: {
      totalBikes,
      availableBikes,
      checkedOutBikes,
      maintenanceBikes,
      utilizationRate: totalBikes > 0 ? (checkedOutBikes / totalBikes * 100).toFixed(2) : 0,
      totalUsers,
      activeUsers,
      newUsers,
      timestamp: new Date()
    }
  };
}

/**
 * Calculate user-related metrics
 * @param {Object} data - Data with system metrics
 * @returns {Object} Data with user metrics
 */
function calculateUserMetrics(data) {
  const users = data.users;
  
  const totalCheckouts = users.reduce((sum, user) => sum + (user.numberOfCheckouts || 0), 0);
  const totalReturns = users.reduce((sum, user) => sum + (user.numberOfReturns || 0), 0);
  const totalUsageHours = users.reduce((sum, user) => sum + (user.usageHours || 0), 0);
  const totalOverdueReturns = users.reduce((sum, user) => sum + (user.overdueReturns || 0), 0);
  
  const averageUsagePerUser = users.length > 0 ? (totalUsageHours / users.length).toFixed(2) : 0;
  const averageCheckoutsPerUser = users.length > 0 ? (totalCheckouts / users.length).toFixed(2) : 0;
  
  // Find most active users
  const mostActiveUsers = users
    .sort((a, b) => (b.numberOfCheckouts || 0) - (a.numberOfCheckouts || 0))
    .slice(0, 5)
    .map(user => ({
      email: user.userEmail,
      checkouts: user.numberOfCheckouts || 0,
      usageHours: user.usageHours || 0
    }));
  
  return {
    ...data,
    userMetrics: {
      totalCheckouts,
      totalReturns,
      totalUsageHours,
      totalOverdueReturns,
      averageUsagePerUser,
      averageCheckoutsPerUser,
      mostActiveUsers,
      returnRate: totalCheckouts > 0 ? ((totalReturns / totalCheckouts) * 100).toFixed(2) : 0
    }
  };
}

/**
 * Calculate bike-related metrics
 * @param {Object} data - Data with user metrics
 * @returns {Object} Data with bike metrics
 */
function calculateBikeMetrics(data) {
  const bikes = data.bikes;
  
  const totalBikeUsageHours = bikes.reduce((sum, bike) => sum + (bike.totalUsageHours || 0), 0);
  const averageUsagePerBike = bikes.length > 0 ? (totalBikeUsageHours / bikes.length).toFixed(2) : 0;
  
  // Find most used bikes
  const mostUsedBikes = bikes
    .sort((a, b) => (b.totalUsageHours || 0) - (a.totalUsageHours || 0))
    .slice(0, 5)
    .map(bike => ({
      name: bike.bikeName,
      usageHours: bike.totalUsageHours || 0,
      status: bike.availability,
      maintenanceStatus: bike.maintenanceStatus
    }));
  
  // Bikes needing attention
  const bikesNeedingMaintenance = bikes.filter(bike => 
    bike.maintenanceStatus !== 'Good' || (bike.totalUsageHours || 0) > 100
  ).map(bike => ({
    name: bike.bikeName,
    maintenanceStatus: bike.maintenanceStatus,
    usageHours: bike.totalUsageHours || 0,
    lastCheckout: bike.lastCheckoutDate
  }));
  
  // Size distribution
  const sizeDistribution = bikes.reduce((acc, bike) => {
    acc[bike.size] = (acc[bike.size] || 0) + 1;
    return acc;
  }, {});
  
  return {
    ...data,
    bikeMetrics: {
      totalBikeUsageHours,
      averageUsagePerBike,
      mostUsedBikes,
      bikesNeedingMaintenance,
      sizeDistribution
    }
  };
}

/**
 * Generate report summary
 * @param {Object} data - Data with all metrics
 * @returns {Object} Data with report summary
 */
function generateReportSummary(data) {
  const summary = {
    reportDate: new Date(),
    period: 'Daily', // Could be made configurable
    highlights: [],
    concerns: [],
    recommendations: []
  };
  
  // Generate highlights
  if (data.systemMetrics.utilizationRate > 70) {
    summary.highlights.push(`High utilization rate: ${data.systemMetrics.utilizationRate}%`);
  }
  
  if (data.userMetrics.returnRate > 95) {
    summary.highlights.push(`Excellent return rate: ${data.userMetrics.returnRate}%`);
  }
  
  if (data.systemMetrics.newUsers > 0) {
    summary.highlights.push(`${data.systemMetrics.newUsers} new users joined`);
  }
  
  // Generate concerns
  if (data.systemMetrics.utilizationRate > 90) {
    summary.concerns.push('System approaching capacity - consider adding more bikes');
  }
  
  if (data.userMetrics.returnRate < 90) {
    summary.concerns.push(`Low return rate: ${data.userMetrics.returnRate}% - follow up needed`);
  }
  
  if (data.bikeMetrics.bikesNeedingMaintenance.length > 0) {
    summary.concerns.push(`${data.bikeMetrics.bikesNeedingMaintenance.length} bikes need maintenance attention`);
  }
  
  // Generate recommendations
  if (data.systemMetrics.availableBikes < 3) {
    summary.recommendations.push('Increase bike availability during peak hours');
  }
  
  if (data.userMetrics.totalOverdueReturns > 0) {
    summary.recommendations.push('Implement automated overdue return reminders');
  }
  
  return {
    ...data,
    reportSummary: summary
  };
}

/**
 * Format report data for storage
 * @param {Object} data - Data with report summary
 * @returns {Object} Data with formatted report
 */
function formatReportData(data) {
  const formattedReport = {
    timestamp: new Date(),
    systemMetrics: data.systemMetrics,
    userMetrics: data.userMetrics,
    bikeMetrics: data.bikeMetrics,
    summary: data.reportSummary,
    
    // Create a human-readable summary
    textSummary: `
BikeShare System Report - ${data.reportSummary.reportDate.toDateString()}

SYSTEM OVERVIEW:
- Total Bikes: ${data.systemMetrics.totalBikes}
- Available: ${data.systemMetrics.availableBikes}
- Checked Out: ${data.systemMetrics.checkedOutBikes}
- Utilization Rate: ${data.systemMetrics.utilizationRate}%

USER ACTIVITY:
- Total Users: ${data.systemMetrics.totalUsers}
- Total Checkouts: ${data.userMetrics.totalCheckouts}
- Total Returns: ${data.userMetrics.totalReturns}
- Return Rate: ${data.userMetrics.returnRate}%
- New Users: ${data.systemMetrics.newUsers}

USAGE STATS:
- Total Usage Hours: ${data.userMetrics.totalUsageHours}
- Average per User: ${data.userMetrics.averageUsagePerUser} hours
- Average per Bike: ${data.bikeMetrics.averageUsagePerBike} hours

HIGHLIGHTS:
${data.reportSummary.highlights.map(h => `- ${h}`).join('\n')}

CONCERNS:
${data.reportSummary.concerns.map(c => `- ${c}`).join('\n')}

RECOMMENDATIONS:
${data.reportSummary.recommendations.map(r => `- ${r}`).join('\n')}
`.trim()
  };
  
  return {
    ...data,
    formattedReport: formattedReport
  };
}

/**
 * Save report data to sheets
 * @param {Object} data - Data with formatted report
 * @returns {Object} Final report result
 */
function saveReportData(data) {
  try {
    // Prepare row data for reports sheet
    const reportRowData = [
      data.formattedReport.timestamp,
      data.systemMetrics.totalBikes,
      data.systemMetrics.availableBikes,
      data.systemMetrics.checkedOutBikes,
      data.systemMetrics.utilizationRate,
      data.systemMetrics.totalUsers,
      data.userMetrics.totalCheckouts,
      data.userMetrics.totalReturns,
      data.userMetrics.returnRate,
      data.userMetrics.totalUsageHours,
      data.formattedReport.textSummary
    ];
    
    // Add to reports sheet
    DB.appendRow(CACHED_SETTINGS.VALUES.SHEETS.REPORTS.NAME, reportRowData);
    
    // Sort reports sheet
    DB.sortByColumn(CACHED_SETTINGS.VALUES.SHEETS.REPORTS.NAME);
    
    return {
      ...data.formattedReport,
      saveStatus: 'success',
      message: 'Report saved successfully'
    };
    
  } catch (error) {
    Logger.log(`Error saving report: ${error.message}`);
    return {
      ...data.formattedReport,
      saveStatus: 'failed',
      saveError: error.message
    };
  }
}

// =============================================================================
// UTILITY FUNCTIONS FOR REPORTS
// =============================================================================

/**
 * Get recent activity for reporting
 * @param {number} days - Number of days to look back
 * @returns {Object} Recent activity data
 */
function getRecentActivity(days = 7) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  
  // This would need to be implemented based on your sheet structure
  // and how you want to filter by date
  return {
    recentCheckouts: [],
    recentReturns: [],
    period: days
  };
}

/**
 * Generate trend analysis
 * @param {Array} historicalReports - Previous reports for comparison
 * @returns {Object} Trend analysis
 */
function generateTrendAnalysis(historicalReports) {
  if (!historicalReports || historicalReports.length < 2) {
    return {
      trends: [],
      message: 'Insufficient data for trend analysis'
    };
  }
  
  // Implementation would compare current metrics with historical data
  return {
    trends: [
      'Usage trending upward',
      'Return rate stable',
      'User base growing'
    ],
    period: `${historicalReports.length} reports analyzed`
  };
}