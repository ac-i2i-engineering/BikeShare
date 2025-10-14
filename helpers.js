// =============================================================================
// UTILITY FUNCTIONS - Pure helper functions for the functional system
// =============================================================================

function quickTest(){
  CACHED_SETTINGS.refreshCache()
  console.log(CACHED_SETTINGS.VALUES)
}

// Simple test runner
function runTests() {
  try {
    runAllTests(); // Calls the test function from pipeline_tests.js
  } catch (error) {
    Logger.log(`❌ Test failed: ${error.message}`);
  }
}

function printFormFieldInfo(formId){
  const form = FormApp.openById(formId);
  form.getItems().forEach(item=>{
    console.log(`ID: ${item.getId()}, Title: ${item.getTitle()}, Type: ${item.getType()}`);
  });
}

function cleanDatabase() {
  try {
    Logger.log('🧹 Starting database reset...');
    DB.resetDatabase(CACHED_SETTINGS.VALUES.MAIN_DASHBOARD_SS_ID);
    Logger.log('✅ Database resetDatabase() completed.');
    DB.hardResetDatabase(CACHED_SETTINGS.VALUES.MAIN_DASHBOARD_SS_ID);
    Logger.log('✅ Database hardResetDatabase() completed.');
    Logger.log('🎉 Database cleaned successfully.');
  } catch (error) {
    Logger.log(`❌ Error during database cleaning: ${error.message}`);
    throw error;
  }
}

function clearCache(){
  let cache = PropertiesService.getScriptProperties();
  cache.deleteAllProperties(); // Clears the cached data associated with the key "data"
}

function installOnSubmitTrigger(){
  const sheet = SpreadsheetApp.getActive()
  ScriptApp.newTrigger('handleOnFormSubmit')
    .forSpreadsheet(sheet)
    .onFormSubmit()
    .create();
}

// creates a trigger that runs every n days at a specific hour
function installExecuteReportGenerationTrigger(){
  const dayInterval = CACHED_SETTINGS.VALUES.REPORT_GENERATION.DAYS_INTERVAL;
  const hour = CACHED_SETTINGS.VALUES.REPORT_GENERATION.GENERATION_HOUR;
  ScriptApp.newTrigger('executeReportGeneration')
    .timeBased()
    .everyDays(dayInterval)
    .atHour(hour)
    .create();
}

function installScheduleSystemShutdownAndActivationTrigger(){
  const activationDate = new Date(CACHED_SETTINGS.VALUES.NEXT_SYSTEM_ACTIVATION_DATE)
  const shutdownDate = new Date(CACHED_SETTINGS.VALUES.NEXT_SYSTEM_SHUTDOWN_DATE)
  const curDate = new Date()
  const dashboardSpreadsheet = SpreadsheetApp.openById(CACHED_SETTINGS.VALUES.MAIN_DASHBOARD_SS_ID)
  if(activationDate > curDate){
    ScriptApp.newTrigger('handleScheduledSystemActivation').forSpreadsheet(dashboardSpreadsheet).timeBased().at(activationDate).create()
  }
  if(shutdownDate > curDate){
    ScriptApp.newTrigger('handleScheduledSystemShutdown').forSpreadsheet(dashboardSpreadsheet).timeBased().at(shutdownDate).create()
  }
}

function installHandleSettingsUpdateTrigger(){
  ScriptApp.newTrigger('handleSettingsUpdate').forSpreadsheet(CACHED_SETTINGS.management_ss).onChange().create();
}

function deleteAllTriggers(){
  const triggers = ScriptApp.getProjectTriggers(); 
  Logger.log(`🗑️ Found ${triggers.length} triggers to delete`);
  
  let deletedCount = 0;
  let errorCount = 0;
  
  for (let i = 0; i < triggers.length; i++) { 
    try {
      const trigger = triggers[i];
      const handlerName = trigger.getHandlerFunction();
      Logger.log(`Deleting trigger ${i + 1}: ${handlerName}`);
      
      ScriptApp.deleteTrigger(trigger);
      deletedCount++;
      
      // Small delay to prevent potential race conditions
      Utilities.sleep(100);
      
    } catch (error) {
      Logger.log(`❌ Failed to delete trigger ${i + 1}: ${error.message}`);
      errorCount++;
    }
  }
  
  Logger.log(`✅ Deletion complete: ${deletedCount} deleted, ${errorCount} errors`);
  
  // Verify deletion
  const remainingTriggers = ScriptApp.getProjectTriggers();
  if (remainingTriggers.length > 0) {
    Logger.log(`⚠️ WARNING: ${remainingTriggers.length} triggers still remain after deletion`);
    remainingTriggers.forEach((trigger, index) => {
      Logger.log(`Remaining trigger ${index + 1}: ${trigger.getHandlerFunction()}`);
    });
  }
}

function reInstallAllTriggers(){
  Logger.log('🔄 Starting trigger reinstallation process...');
  
  try {
    // Clear cache first
    Logger.log('🧹 Clearing cache...');
    clearCache();
    
    // Delete all existing triggers
    Logger.log('🗑️ Deleting all existing triggers...');
    deleteAllTriggers();
    
    // Wait a moment to ensure deletion is complete
    Utilities.sleep(1000);
    
    // Install new triggers one by one with error handling
    const triggerInstallations = [
      { name: 'Form Submit Trigger', fn: installOnSubmitTrigger },
      { name: 'Report Generation Trigger', fn: installExecuteReportGenerationTrigger },
      { name: 'Settings Update Trigger', fn: installHandleSettingsUpdateTrigger },
      { name: 'System Activation/Shutdown Triggers', fn: installScheduleSystemShutdownAndActivationTrigger },
      { name: 'Usage Timer Update Trigger', fn: installUpdateUsageTimersTrigger }
    ];
    
    let successCount = 0;
    let errorCount = 0;
    
    triggerInstallations.forEach(installation => {
      try {
        Logger.log(`📝 Installing ${installation.name}...`);
        installation.fn();
        successCount++;
        Logger.log(`✅ ${installation.name} installed successfully`);
      } catch (error) {
        errorCount++;
        Logger.log(`❌ Failed to install ${installation.name}: ${error.message}`);
      }
    });
    
    Logger.log(`🎉 Trigger reinstallation complete: ${successCount} installed, ${errorCount} errors`);
    
    // Final verification
    const finalTriggers = ScriptApp.getProjectTriggers();
    Logger.log(`📊 Final trigger count: ${finalTriggers.length}`);
    
  } catch (error) {
    Logger.log(`❌ Critical error during trigger reinstallation: ${error.message}`);
    throw error;
  }
}

function installUpdateUsageTimersTrigger() {
  const intervalMinutes = 5;
  ScriptApp.newTrigger('executeUsageTimerUpdate')
    .timeBased()
    .everyMinutes(intervalMinutes)
    .create();
}

function levenshteinDistance(str1, str2) {
  const matrix = Array(str2.length + 1).fill().map(() => Array(str1.length + 1).fill(0));
  for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + cost
      );
    }
  }
  return matrix[str2.length][str1.length];
}

function fuzzyMatch(target, comp, isNotFuzzy=false){
  if (target == null || comp == null) return false;
  // Numbers: direct match
  if (typeof target === 'number' && typeof comp === 'number') {
    return target === comp;
  }
  // Strings: normalize and compare
  if (typeof target === 'string') target = target.trim().toLowerCase();
  if (typeof comp === 'string') comp = comp.trim().toLowerCase();
  if (isNotFuzzy) {
    return target === comp;
  }
  if (target === comp) return true;
  if (typeof target === 'string' && typeof comp === 'string') {
    if (target.length < 3 || comp.length < 3) return false;
    const distance = levenshteinDistance(target, comp);
    const maxLen = Math.max(target.length, comp.length);
    return distance / maxLen < CACHED_SETTINGS.VALUES.FUZZY_MATCHING_THRESHOLD;
  }
  return false;
}

function isValidEmailDomain(email, allowedDomain = 'amherst.edu') {
  if (!email || typeof email !== 'string') return false;
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return false;
  
  const domain = email.split('@')[1];
  return domain.toLowerCase() === allowedDomain.toLowerCase();
}