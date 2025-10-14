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

function handleScheduledSystemActivation(e) {
  return withLock(() => {
    try{
      Logger.log('🔓Attempting scheduled system activation');
      toogleFormAcceptResponses(true)
      Logger.log('✅System activated successfully');
    }catch(error){
      Logger.log(`❌Failed to activate system:${error.errorMessage}`)
    }
  }, 'system activation');
}

function handleScheduledSystemShutdown(e) {
  return withLock(() => {
    try{
      Logger.log('🔒Attempting scheduled system shutdown');
      toogleFormAcceptResponses(false)
      Logger.log('✅System shutdown successfully');
    }catch(error){
      Logger.log(`❌Failed to activate system:${error.errorMessage}`)
    }
  }, 'system shutdown');
}