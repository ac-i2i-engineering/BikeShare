/**
 * Test Runner for BikeShare System
 * Centralized test execution and reporting
 */

/**
 * Run all available test suites
 */
function runAllSystemTests() {
  const overallResults = {
    testRunner: 'BikeShare System Tests',
    startTime: new Date().toISOString(),
    suites: [],
    overallSummary: { passed: 0, failed: 0, total: 0 }
  };

  Logger.log('🚀 Starting BikeShare System Test Runner...');
  
  try {
    // Run Cache Tests
    Logger.log('📦 Running Cache Test Suite...');
    const cacheResults = runCacheTests();
    overallResults.suites.push(cacheResults);
    
    // You can add more test suites here as they are created
    // Example:
    // const pipelineResults = runPipelineTests();
    // overallResults.suites.push(pipelineResults);
    
  } catch (error) {
    Logger.log(`❌ Error running test suites: ${error.message}`);
    overallResults.error = error.message;
  }

  // Calculate overall summary
  overallResults.suites.forEach(suite => {
    if (suite.summary) {
      overallResults.overallSummary.passed += suite.summary.passed;
      overallResults.overallSummary.failed += suite.summary.failed;
      overallResults.overallSummary.total += suite.summary.total;
    }
  });

  overallResults.endTime = new Date().toISOString();
  
  // Log summary
  Logger.log('📊 =========================');
  Logger.log('📊 OVERALL TEST RESULTS');
  Logger.log('📊 =========================');
  overallResults.suites.forEach(suite => {
    const status = suite.summary.failed === 0 ? '✅' : '❌';
    Logger.log(`${status} ${suite.testSuite}: ${suite.summary.passed}/${suite.summary.total} passed`);
  });
  Logger.log(`📊 Total: ${overallResults.overallSummary.passed}/${overallResults.overallSummary.total} tests passed`);
  
  return overallResults;
}

/**
 * Quick cache test - for rapid debugging
 */
function quickCacheTest() {
  Logger.log('⚡ Quick Cache Test...');
  
  try {
    const result = CACHED_SETTINGS.refreshCache(false);
    const hasSheets = !!CACHED_SETTINGS.VALUES?.SHEETS?.BIKES_STATUS?.NAME;
    
    if (result && hasSheets) {
      Logger.log(`✅ Cache OK - BIKES: ${CACHED_SETTINGS.VALUES.SHEETS.BIKES_STATUS.NAME}`);
      return { success: true, message: 'Cache working correctly' };
    } else {
      Logger.log('❌ Cache FAIL - Missing configuration');
      return { success: false, message: 'Cache not working' };
    }
  } catch (error) {
    Logger.log(`❌ Cache ERROR: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Test individual components
 */
function testComponent(componentName) {
  Logger.log(`🧪 Testing component: ${componentName}`);
  
  switch (componentName.toLowerCase()) {
    case 'cache':
      return runCacheTests();
    
    case 'persistence':
      return testCachePersistenceStandalone();
    
    default:
      Logger.log(`❌ Unknown component: ${componentName}`);
      return { success: false, error: `Unknown component: ${componentName}` };
  }
}

/**
 * Diagnostic test for troubleshooting
 */
function runDiagnostics() {
  Logger.log('🔍 Running System Diagnostics...');
  
  const diagnostics = {
    timestamp: new Date().toISOString(),
    checks: []
  };
  
  // Check 1: Settings object exists
  diagnostics.checks.push({
    name: 'CACHED_SETTINGS Object',
    passed: !!CACHED_SETTINGS,
    details: CACHED_SETTINGS ? 'Found' : 'Missing'
  });
  
  // Check 2: Cache functionality
  try {
    const cacheTest = CacheService.getScriptCache().get('test');
    diagnostics.checks.push({
      name: 'ScriptCache Service',
      passed: true,
      details: 'Accessible'
    });
  } catch (error) {
    diagnostics.checks.push({
      name: 'ScriptCache Service',
      passed: false,
      details: error.message
    });
  }
  
  // Check 3: Spreadsheet access
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    diagnostics.checks.push({
      name: 'Spreadsheet Access',
      passed: !!ss,
      details: ss ? ss.getName() : 'No active spreadsheet'
    });
  } catch (error) {
    diagnostics.checks.push({
      name: 'Spreadsheet Access',
      passed: false,
      details: error.message
    });
  }
  
  // Log results
  diagnostics.checks.forEach(check => {
    const status = check.passed ? '✅' : '❌';
    Logger.log(`${status} ${check.name}: ${check.details}`);
  });
  
  return diagnostics;
}