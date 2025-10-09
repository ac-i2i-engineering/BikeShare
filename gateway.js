//=====================================================
// FORM EVENT LISTENER
//=====================================================
function handleOnFormSubmit(e) {
  const result = processFormSubmissionEvent(e);
  
  if (result.success) {
    Logger.log(`Successfully processed ${result.transaction?.type || 'unknown'} for ${result.user?.userEmail || 'unknown user'}`);
  } else {
    const txType = result.transaction?.type || result.eventContext?.operation || 'unknown';
    const userEmail = result.user?.userEmail || result.formData?.userEmail || 'unknown user';
    Logger.log(`Failed to process ${txType} for ${userEmail}: ${result.errorMessage || 'Unknown error'}`);
  }
  
  return result;
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
        DB.resetDatabase()
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

function manageFormsAccessibility(action){
  // stop accepting responses for return and checkout form
  const state = action === "resume" ? activateSystem() : shutdownSystem();
}

/**
 * Main trigger function for automatic reports
 * @returns {Object} Result object from runReportPipeline
 */
function executeReportGeneration() {
  Logger.log('⏰ Triggered automatic report generation');
  return runReportPipeline();
}