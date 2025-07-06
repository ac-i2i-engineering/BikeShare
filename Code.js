/**
 * BikeShare System - Object-Oriented Design
 * Uses Google Sheets as database and Google Forms for user interaction
 */

// =============================================================================
// FORM TRIGGER FUNCTIONS
// =============================================================================
function onFormSubmit(e, debugging = false) {
  // During debugging: e = "sheetName"
  const service = new BikeShareService();

  const sheet = !debugging ? e.source.getActiveSheet() : service.db.getSheet(e);
  const lastRowId = sheet.getLastRow();
  const sheetName = sheet.getName();
  const responses = sheet.getRange(lastRowId, 1, 1, sheet.getLastColumn()).getValues()[0];
  // Check if the edit is in the 'Checkout Logs' or 'Return Logs' sheet
  if (sheetName === CONFIG.SHEETS.CHECKOUT_LOGS) {
    const result = service.processCheckout(responses);
    Logger.log('Checkout processed:', result.message);
  } else if (sheetName === CONFIG.SHEETS.RETURN_LOGS) {
    const result = service.processReturn(responses);
    Logger.log('Return processed:', result.message);
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
