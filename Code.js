/**
 * BikeShare System - Object-Oriented Design
 * Uses Google Sheets as database and Google Forms for user interaction
 */
// =============================================================================
// FORM TRIGGER & SCHEDULED & EVENTHANDLER FUNCTIONS
// =============================================================================
function handleOnFormSubmit(e) {
  const service = new BikeShareService();
  const sheetName = e.source.getActiveSheet().getName();
  const responses = e.values;
  const range = e.range;
  // Check if the edit is in the 'Checkout Logs' or 'Return Logs' sheet
  if (sheetName === CACHED_SETTINGS.VALUES.SHEETS.CHECKOUT_LOGS.NAME) {
    service.processCheckout(responses, range);
    service.db.sortByColumn(null, CACHED_SETTINGS.VALUES.SHEETS.CHECKOUT_LOGS.NAME);
  } else if (sheetName === CACHED_SETTINGS.VALUES.SHEETS.RETURN_LOGS.NAME) {
    service.processReturn(responses, range);
    service.db.sortByColumn(null, CACHED_SETTINGS.VALUES.SHEETS.RETURN_LOGS.NAME);
  }
}

function executeReportGeneration() {
  const service = new BikeShareService();
  Logger.log(service.generatePeriodicReport());
  service.db.sortByColumn(null, CACHED_SETTINGS.VALUES.SHEETS.REPORTS.NAME);
}

function handleSettingsUpdate(e){
  if(!CACHED_SETTINGS.refreshCache(true)){
    throw new Error("Failed to refresh settings cache");
  }
  const editedSheet = e.source.getActiveSheet()
  const curSheetName = editedSheet.getName()
  const curCell = e.source.getActiveCell()
  const editedRange = editedSheet.getActiveRange()
  const editedCol = editedRange.getLastColumn()
  const editedRow = editedRange.getLastRow()
  const newValue = editedRange.getValue()
  const services = new BikeShareService(CACHED_SETTINGS.VALUES.MAIN_DASHBOARD_SS_ID)
  const curDate =  new Date()
  const commContext = {}

  //Process systemButtons
  if(editedCol == 3 && curSheetName == "mainConfig"){
    const editedParam = editedSheet.getRange(editedRow,1).getValue()
    //process the database reset
    if(editedParam === "FORCE_SYSTEM_RESET" && newValue === "ON"){
      services.db.resetDatabase()
      //send success confirmation to the administrator
      commContext['resetDate'] = curDate
      services.comm.handleCommunication('CFM_ADMIN_RESET_001',commContext)
      curCell.setValue("OFF")
      curCell.setNote(`Last reset on ${curDate}`)
    }

    //process system operations pause or resume by disabling/enabling all forms
    if(editedParam === "SYSTEM_ACTIVE"){
      const action = newValue === "ON" ? "resume" : "pause";
      services.manageFormsAccessibility(action);
      curCell.setNote(`System ${action}d on ${curDate}`);
    }
  }
}

//next: report generation... && automated on and off scheduling


// =============================================================================
// TEST FUNCTIONS
// =============================================================================

function simulateHandleOnFormSubmit(sheetName, responses) {
  const service = new BikeShareService();
  const sheet = service.db.getSheet(sheetName);
  service.db.sortByColumn(sheet, null);
  const range = sheet.getRange(2, 1, 1, responses.length);
  // Check if the edit is in the 'Checkout Logs' or 'Return Logs' sheet
  if (sheetName === CACHED_SETTINGS.VALUES.SHEETS.CHECKOUT_LOGS.NAME) {
    service.processCheckout(responses, range);
  } else if (sheetName === CACHED_SETTINGS.VALUES.SHEETS.RETURN_LOGS.NAME) {
    service.processReturn(responses, range);
  }
}