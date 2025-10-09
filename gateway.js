//=====================================================
// CENTRALIZED LOCKING MECHANISM
//=====================================================
/**
 * Execute function with script lock to prevent race conditions
 * @param {Function} fn - Function to execute
 * @param {string} operationName - Name for logging
 * @param {number} timeout - Lock timeout in milliseconds (default: 30000)
 * @returns {*} Function result
 */
function withLock(fn, operationName = 'operation', timeout = 30000) {
  const lock = LockService.getScriptLock();
  
  try {
    lock.waitLock(timeout);
    Logger.log(`🔒 Lock acquired for ${operationName}`);
    return fn();
  } catch (error) {
    Logger.log(`❌ Lock error for ${operationName}: ${error.message}`);
    throw error;
  } finally {
    lock.releaseLock();
    Logger.log(`🔓 Lock released for ${operationName}`);
  }
}

//=====================================================
// FORM EVENT LISTENER
//=====================================================
function handleOnFormSubmit(e) {
  return withLock(() => {
    const result = processFormSubmissionEvent(e);
    
    if (result.success) {
      Logger.log(`Successfully processed ${result.transaction?.type || 'unknown'} for ${result.user?.userEmail || 'unknown user'}`);
    } else {
      const txType = result.transaction?.type || result.eventContext?.operation || 'unknown';
      const userEmail = result.user?.userEmail || result.formData?.userEmail || 'unknown user';
      Logger.log(`Failed to process ${txType} for ${userEmail}: ${result.errorMessage || 'Unknown error'}`);
    }
    
    return result;
  }, 'form submission');
}


function handleSettingsUpdate(e){
  return withLock(() => {
    runManagementSheetUpdate(e)
  }, 'settings update');
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
  return withLock(() => {
    return runReportPipeline();
  }, 'report generation');
}

function executeUsageTimerUpdate(){
  Logger.log('⏰ Triggered automatic usage timer update');
  return withLock(() => {
    return runTimerUpdate();
  }, 'usage timer update');
}