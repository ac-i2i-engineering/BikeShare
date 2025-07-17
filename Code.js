/**
 * BikeShare System - Object-Oriented Design
 * Uses Google Sheets as database and Google Forms for user interaction
 */
// =============================================================================
// FORM TRIGGER & SCHEDULED FUNCTIONS
// =============================================================================
function handleOnFormSubmit(e) {
  const service = new BikeShareService();
  const sheetName = e.source.getActiveSheet().getName();
  const responses = e.values;
  const range = e.range;
  // Check if the edit is in the 'Checkout Logs' or 'Return Logs' sheet
  if (sheetName === CONFIG.SHEETS.CHECKOUT_LOGS.NAME) {
    service.processCheckout(responses, range);
    service.db.sortByColumn(null, CONFIG.SHEETS.CHECKOUT_LOGS.NAME);
  } else if (sheetName === CONFIG.SHEETS.RETURN_LOGS.NAME) {
    service.processReturn(responses, range);
    service.db.sortByColumn(null, CONFIG.SHEETS.RETURN_LOGS.NAME);
  }
}

function executeReportGeneration() {
  const service = new BikeShareService();
  Logger.log(service.generatePeriodicReport());
  service.db.sortByColumn(null, CONFIG.SHEETS.REPORTS.NAME);
}

// =============================================================================
// TEST FUNCTIONS
// =============================================================================

function simulateHandleOnFormSubmit(sheetName, responses) {
  const service = new BikeShareService();
  const sheet = service.db.getSheet(sheetName);
  service.db.sortByColumn(sheet, null);
  const range = sheet.getRange(2, 1, 1, responses.length);
  // Check if the edit is in the 'Checkout Logs' or 'Return Logs' sheet
  if (sheetName === CONFIG.SHEETS.CHECKOUT_LOGS.NAME) {
    service.processCheckout(responses, range);
  } else if (sheetName === CONFIG.SHEETS.RETURN_LOGS.NAME) {
    service.processReturn(responses, range);
  }
}