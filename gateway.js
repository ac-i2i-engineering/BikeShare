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
    lock.waitLock(timeout); // Attempt to acquire the lock. Wait up to 'timeout' ms.
    Logger.log(`🔒 Lock acquired for ${operationName}`);
    return fn(); // Execute the protected function
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
      // Log success with transaction type and user email
      Logger.log(`Successfully processed ${result.transaction?.type || 'unknown'} for ${result.user?.userEmail || 'unknown user'}`);
    } else {
      // Log failure with error details
      const txType = result.transaction?.type || result.eventContext?.operation || 'unknown';
      const userEmail = result.user?.userEmail || result.formData?.userEmail || 'unknown user';
      Logger.log(`Failed to process ${txType} for ${userEmail}: ${result.errorMessage || 'Unknown error'}`);
    }
    
    return result;
  }, 'form submission');
}


/**
 * Main trigger function for automatic management settings sync
 */
function handleSettingsUpdate(e){
  return withLock(() => {
    parseSettingsUpdate(e)
  }, 'settings update');
}

/**
 * Main trigger function for automatic reports generation
 */
function executeReportGeneration() {
  if(!CACHED_SETTINGS.VALUES.REPORT_GENERATION.ENABLE_REPORT_GENERATION){
    Logger.log("Report Generation currently disabled in management sheets")
    return
  }
  Logger.log('⏰ Triggered automatic report generation');
  return withLock(() => {
    return runReportPipeline();
  }, 'report generation');
}

/**
 * Main trigger function for automatic time usageTimer update
 */
function executeUsageTimerUpdate(){
  Logger.log('⏰ Triggered automatic usage timer update');
  return withLock(() => {
    return runTimerUpdate();
  }, 'usage timer update');
}

function handleScheduledSystemActivation() {
  return withLock(() => {
    Logger.log('🔓Attempting scheduled system activation');
    setSystemActivationState(true);
  }, 'system activation');
}

function handleScheduledSystemShutdown() {
  return withLock(() => {
    Logger.log('🔒Attempting scheduled system shutdown');
    setSystemActivationState(false);
  }, 'system shutdown');
}

/**
 * Handle manual edits to the dashboard (Bikes Status sheet)
 * Removes notes from maintenance status column when changed from "has issue"
 */
function handleManualDashboardChanges(e) {
  return withLock(() => {
    try {
     processManualDashboardActions(e)
    } catch (error) {
      Logger.log(`❌ Error handling manual dashboard change: ${error.message}`);
      Logger.log(error.stack);
    }
  }, 'manual dashboard change');
}