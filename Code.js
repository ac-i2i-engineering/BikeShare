/**
 * BikeShare System - Object-Oriented Design
 * Uses Google Sheets as database and Google Forms for user interaction
 */
// ============================================================================
// GLOBAL CONSTANTS & IMPORTS
// ============================================================================
const CUR_DATE = new Date();
// =============================================================================
// FORM TRIGGER & SCHEDULED & EVENTHANDLER FUNCTIONS
// =============================================================================
function handleOnFormSubmit(e) {
  // NEW FUNCTIONAL APPROACH
  const result = processBikeShareEvent(e);
  
  if (result.success) {
    Logger.log(`Successfully processed ${result.transaction?.type} for ${result.user?.userEmail}`);
  } else {
    Logger.log(`Failed to process event: ${result.errorMessage || 'Unknown error'}`);
  }
  
  return result;
}

// LEGACY OOP APPROACH (kept for reference/fallback)
function handleOnFormSubmitLegacy(e) {
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
  // NEW FUNCTIONAL APPROACH
  const result = generatePeriodicReportFunctional();
  
  if (result.success) {
    Logger.log(`Report generated successfully: ${result.reportData?.summary || 'No summary available'}`);
  } else {
    Logger.log(`Report generation failed: ${result.errorMessage || 'Unknown error'}`);
  }
  
  return result;
}

// LEGACY OOP APPROACH (kept for reference/fallback)
function executeReportGenerationLegacy() {
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
  const settingsUpdateDateCol = CACHED_SETTINGS.getValueCellByKeyName('LAST_SETTINGS_UPDATED_DATE','systemTime')
  const curDate =  new Date()
  const commContext = {}

  //Process systemButtons
  if(curSheetName == "mainConfig"){
    if(editedCol == 3){
      const editedParam = editedSheet.getRange(editedRow,1).getValue()
      //process the database reset
      if(editedParam === "FORCE_SYSTEM_RESET" && newValue === "ON"){
        resetSystemDatabase()
        //send success confirmation to the administrator
        commContext['resetDate'] = curDate
        COMM.handleCommunication('CFM_ADMIN_RESET_001',commContext)
        curCell.setValue("OFF")
        curCell.setNote(`Last reset on ${curDate}`)
        CACHED_SETTINGS.getValueCellByKeyName('FIRST_GENERATION_DATE','reportGenerationSettings').setValue(curDate)
      }

      //process system operations pause or resume by disabling/enabling all forms
      if(editedParam === "SYSTEM_ACTIVE"){
        const action = newValue === "ON" ? "resume" : "pause";
        manageFormsAccessibility(action);
        curCell.setNote(`System ${action}d on ${curDate}`);
        CACHED_SETTINGS.getValueCellByKeyName('ENABLE_REPORT_GENERATION','systemButtons').setValue(newValue)
      }
      CACHED_SETTINGS.getValueCellByKeyName('FIRST_GENERATION_DATE','reportGenerationSettings').setValue(curDate)
    }

    //Process SystemTime, CoreConfig & reportGenerationSettings
    if(editedCol == 8){
      const editedParam = editedSheet.getRange(editedRow,6).getValue()
      //NEXT_SYSTEM_SHUTDOWN_DATE
      if(editedParam === "NEXT_SYSTEM_SHUTDOWN_DATE" || editedParam == "NEXT_SYSTEM_SHUTDOWN_DATE"){
        reInstallAllTriggers()
      }
    }
  }


  //update settings last update tracker
  const delay = 1000*6
  if((curDate - settingsUpdateDateCol.getValue()) > delay){
    settingsUpdateDateCol.setValue(curDate)
    settingsUpdateDateCol.setNote(`Affected Range ${editedRange.getA1Notation()}`)
  }
}

function executeUsageTimerUpdate(){
  updateUsageTimersForAllCheckedoutBikes();
}
//next: report generation... && automated on and off scheduling
//auto update time colums after certain acttions.


// =============================================================================
// FUNCTIONAL UTILITY FUNCTIONS
// =============================================================================

/**
 * Reset system database (functional version)
 */
function resetSystemDatabase() {
  try {
    // Clear all data sheets while preserving headers
    const sheets = [
      CACHED_SETTINGS.VALUES.SHEETS.BIKES_STATUS.NAME,
      CACHED_SETTINGS.VALUES.SHEETS.USERS_STATUS.NAME,
      CACHED_SETTINGS.VALUES.SHEETS.CHECKOUT_LOGS.NAME,
      CACHED_SETTINGS.VALUES.SHEETS.RETURN_LOGS.NAME,
      CACHED_SETTINGS.VALUES.SHEETS.REPORTS.NAME
    ];
    
    sheets.forEach(sheetName => {
      const sheet = DB.getSheet(sheetName);
      const range = sheet.getDataRange();
      if (range.getNumRows() > 1) {
        sheet.deleteRows(2, range.getNumRows() - 1);
      }
    });
    
    Logger.log('System database reset completed');
    return { success: true };
  } catch (error) {
    Logger.log(`Database reset failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Manage forms accessibility (functional version)
 */
function manageFormsAccessibility(action) {
  try {
    const accepting = action === "resume";
    FormApp.openById(CACHED_SETTINGS.VALUES.FORMS.CHECKOUT_FORM_ID).setAcceptingResponses(accepting);
    FormApp.openById(CACHED_SETTINGS.VALUES.FORMS.RETURN_FORM_ID).setAcceptingResponses(accepting);
    
    Logger.log(`Forms ${action}d successfully`);
    return { success: true, action: action };
  } catch (error) {
    Logger.log(`Failed to ${action} forms: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Update usage timers for all checked out bikes (functional version)
 */
function updateUsageTimersForAllCheckedoutBikes() {
  try {
    const bikesData = DB.getAllData(CACHED_SETTINGS.VALUES.SHEETS.BIKES_STATUS.NAME);
    const checkedOutBikes = bikesData.filter(row => row[3] === 'Checked Out');
    
    const updates = checkedOutBikes.map(bikeRow => {
      const lastCheckoutDate = new Date(bikeRow[4]);
      const currentTime = new Date();
      const usageHours = (currentTime - lastCheckoutDate) / (1000 * 60 * 60);
      const usageDays = usageHours / 24; // Convert to days for spreadsheet formatting
      
      // Update the current usage timer (column index 6)
      bikeRow[6] = usageDays;
      
      return {
        type: 'update',
        sheetName: CACHED_SETTINGS.VALUES.SHEETS.BIKES_STATUS.NAME,
        rowIndex: bikesData.indexOf(bikeRow) + 1,
        values: bikeRow
      };
    });
    
    if (updates.length > 0) {
      DB.batchUpdate(updates);
      Logger.log(`Updated usage timers for ${updates.length} bikes`);
    }
    
    return { success: true, updatedCount: updates.length };
  } catch (error) {
    Logger.log(`Usage timer update failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// =============================================================================
// TEST FUNCTIONS
// =============================================================================

function simulateHandleOnFormSubmit(sheetName, responses) {
  const sheet = DB.getSheet(sheetName);
  DB.sortByColumn(sheetName);
  const range = sheet.getRange(2, 1, 1, responses.length);
  
  // Create mock trigger event
  const mockEvent = {
    source: { getActiveSheet: () => ({ getName: () => sheetName }) },
    values: responses,
    range: range
  };
  
  // Use functional pipeline
  return processBikeShareEvent(mockEvent);
}