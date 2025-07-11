/**
 * BikeShare System - Object-Oriented Design
 * Uses Google Sheets as database and Google Forms for user interaction
 */

// =============================================================================
// FORM TRIGGER FUNCTIONS
// =============================================================================
function handleOnFormSubmit(e) {
  const service = new BikeShareService();
  const sheetName = e.source.getActiveSheet().getName();
  const responses = e.values;
  const range = e.range;
  // Check if the edit is in the 'Checkout Logs' or 'Return Logs' sheet
  if (sheetName === CONFIG.SHEETS.CHECKOUT_LOGS.NAME) {
    const result = service.processCheckout(responses, range);
    Logger.log('Checkout processed:', result.message || result.error);
  } else if (sheetName === CONFIG.SHEETS.RETURN_LOGS.NAME) {
    const result = service.processReturn(responses, range);
    Logger.log('Return processed:', result.message || result.error);
  }
}

// =============================================================================
// SCHEDULED FUNCTIONS
// =============================================================================
function dailyOverdueCheck() {
  const service = new BikeShareService();
  service.sendOverdueNotifications();
}

function weeklyReportGeneration() {
  const service = new BikeShareService();
  const report = service.generateWeeklyReport();
  console.log('Weekly report generated:', report);
}

// =============================================================================
// ADMIN FUNCTIONS
// =============================================================================
function getSystemStatus() {
  const service = new BikeShareService();
  return {
    availableBikes: service.getAvailableBikes().length,
    overdueBikes: service.getOverdueBikes().length,
    lastReportGenerated: new Date()
  };
}

function manuallyProcessCheckout(email, bikeId) {
  const user = User.findByEmail(email);
  return user.checkoutBike(bikeId);
}

function manuallyProcessReturn(email, bikeId) {
  const user = User.findByEmail(email);
  const service = new BikeShareService();
  const usageHours = service.calculateUsageHours(bikeId);
  return user.returnBike(bikeId, usageHours);
}
