/**
 * Cache System Tests
 * Tests for CACHED_SETTINGS cache persistence and error handling
 */

/**
 * Test Suite: Cache Diagnostics
 * Tests cache functionality, persistence, and error recovery
 */
function runCacheTests() {
  const results = {
    testSuite: 'Cache System Tests',
    startTime: new Date().toISOString(),
    tests: [],
    summary: { passed: 0, failed: 0, total: 0 }
  };

  Logger.log('🧪 Running Cache System Test Suite...');
  
  // Test 1: Cache Status Diagnostics
  results.tests.push(testCacheStatusDiagnostics());
  
  // Test 2: Cache Persistence
  results.tests.push(testCachePersistence());
  
  // Test 3: Force Refresh Functionality
  results.tests.push(testForceRefresh());
  
  // Test 4: Cache Clear and Rebuild
  results.tests.push(testCacheClearAndRebuild());
  
  // Test 5: Cache Validation
  results.tests.push(testCacheValidation());
  
  // Test 6: ScriptCache vs DocumentCache
  results.tests.push(testCacheTypeVerification());

  // Calculate summary
  results.tests.forEach(test => {
    results.summary.total++;
    if (test.passed) {
      results.summary.passed++;
    } else {
      results.summary.failed++;
    }
  });

  results.endTime = new Date().toISOString();
  
  Logger.log(`📊 Cache Tests Complete: ${results.summary.passed}/${results.summary.total} passed`);
  
  return results;
}

/**
 * Test 1: Cache Status Diagnostics
 */
function testCacheStatusDiagnostics() {
  const test = {
    name: 'Cache Status Diagnostics',
    description: 'Tests cache status reporting and validation',
    passed: false,
    errors: [],
    details: {}
  };

  try {
    Logger.log('📋 Test 1: Cache Status Diagnostics');
    
    const cacheStatus = CACHED_SETTINGS.debugCacheStatus();
    test.details.cacheStatus = cacheStatus;
    
    // Validate cache status response
    const hasRequiredFields = cacheStatus.rawCacheExists !== undefined && 
                             cacheStatus.processedCacheExists !== undefined &&
                             cacheStatus.finalValuesExists !== undefined;
    
    if (!hasRequiredFields) {
      test.errors.push('Cache status missing required fields');
      return test;
    }
    
    // Check if cache system is functional
    if (!cacheStatus.finalValuesExists) {
      test.errors.push('Final VALUES not populated');
      return test;
    }
    
    test.passed = true;
    Logger.log('✅ Cache status diagnostics passed');
    
  } catch (error) {
    test.errors.push(`Cache diagnostics failed: ${error.message}`);
    Logger.log(`❌ Cache diagnostics failed: ${error.message}`);
  }
  
  return test;
}

/**
 * Test 2: Cache Persistence Verification
 */
function testCachePersistence() {
  const test = {
    name: 'Cache Persistence',
    description: 'Tests ScriptCache persistence across refreshCache calls',
    passed: false,
    errors: [],
    details: {}
  };

  try {
    Logger.log('📋 Test 2: Cache Persistence');
    
    // First refresh (should load from spreadsheet or use existing cache)
    const firstRefresh = CACHED_SETTINGS.refreshCache(false);
    test.details.firstRefreshResult = firstRefresh;
    
    if (!firstRefresh) {
      test.errors.push('First cache refresh failed');
      return test;
    }
    
    // Verify cache content exists
    const hasValidContent = CACHED_SETTINGS.VALUES?.SHEETS?.BIKES_STATUS?.NAME;
    test.details.hasValidContent = !!hasValidContent;
    
    if (!hasValidContent) {
      test.errors.push('Cache content invalid after refresh');
      return test;
    }
    
    // Second refresh (should use cache if available)
    const secondRefresh = CACHED_SETTINGS.refreshCache(false);
    test.details.secondRefreshResult = secondRefresh;
    
    if (!secondRefresh) {
      test.errors.push('Second cache refresh failed');
      return test;
    }
    
    // Verify content still valid
    const stillHasValidContent = CACHED_SETTINGS.VALUES?.SHEETS?.BIKES_STATUS?.NAME;
    test.details.stillHasValidContent = !!stillHasValidContent;
    
    if (!stillHasValidContent) {
      test.errors.push('Cache content lost between refreshes');
      return test;
    }
    
    test.passed = true;
    test.details.bikesSheetName = CACHED_SETTINGS.VALUES.SHEETS.BIKES_STATUS.NAME;
    Logger.log(`✅ Cache persistence test passed - BIKES sheet: ${test.details.bikesSheetName}`);
    
  } catch (error) {
    test.errors.push(`Cache persistence test failed: ${error.message}`);
    Logger.log(`❌ Cache persistence test failed: ${error.message}`);
  }
  
  return test;
}

/**
 * Test 3: Force Refresh Functionality
 */
function testForceRefresh() {
  const test = {
    name: 'Force Refresh',
    description: 'Tests force refresh bypasses cache and reloads from spreadsheet',
    passed: false,
    errors: [],
    details: {}
  };

  try {
    Logger.log('📋 Test 3: Force Refresh');
    
    // Store original timestamp if available
    const originalTimestamp = test.details.originalTimestamp = new Date().toISOString();
    
    // Force refresh (should bypass cache)
    const forceRefreshResult = CACHED_SETTINGS.refreshCache(true);
    test.details.forceRefreshResult = forceRefreshResult;
    
    if (!forceRefreshResult) {
      test.errors.push('Force refresh failed');
      return test;
    }
    
    // Verify content is still valid after force refresh
    const hasValidContent = CACHED_SETTINGS.VALUES?.SHEETS?.BIKES_STATUS?.NAME;
    test.details.hasValidContentAfterForce = !!hasValidContent;
    
    if (!hasValidContent) {
      test.errors.push('Invalid content after force refresh');
      return test;
    }
    
    test.passed = true;
    Logger.log('✅ Force refresh test passed');
    
  } catch (error) {
    test.errors.push(`Force refresh test failed: ${error.message}`);
    Logger.log(`❌ Force refresh test failed: ${error.message}`);
  }
  
  return test;
}

/**
 * Test 4: Cache Clear and Rebuild
 */
function testCacheClearAndRebuild() {
  const test = {
    name: 'Cache Clear and Rebuild',
    description: 'Tests emergency cache clearing and rebuilding functionality',
    passed: false,
    errors: [],
    details: {}
  };

  try {
    Logger.log('📋 Test 4: Cache Clear and Rebuild');
    
    // Clear cache and rebuild
    const clearResult = CACHED_SETTINGS.forceClearCache();
    test.details.clearResult = clearResult;
    
    if (!clearResult) {
      test.errors.push('Cache clear and rebuild failed');
      return test;
    }
    
    // Verify content is valid after rebuild
    const hasValidContent = CACHED_SETTINGS.VALUES?.SHEETS?.BIKES_STATUS?.NAME;
    test.details.hasValidContentAfterRebuild = !!hasValidContent;
    
    if (!hasValidContent) {
      test.errors.push('Invalid content after cache rebuild');
      return test;
    }
    
    test.passed = true;
    Logger.log('✅ Cache clear and rebuild test passed');
    
  } catch (error) {
    test.errors.push(`Cache clear and rebuild test failed: ${error.message}`);
    Logger.log(`❌ Cache clear and rebuild test failed: ${error.message}`);
  }
  
  return test;
}

/**
 * Test 5: Cache Content Validation
 */
function testCacheValidation() {
  const test = {
    name: 'Cache Content Validation',
    description: 'Tests cache content validation and required sections',
    passed: false,
    errors: [],
    details: {}
  };

  try {
    Logger.log('📋 Test 5: Cache Content Validation');
    
    // Check for required sections
    const requiredSections = ['bikesStatus', 'userStatus', 'checkoutLogs', 'returnLogs'];
    const missingSections = [];
    
    requiredSections.forEach(section => {
      if (!CACHED_SETTINGS.cacheValues?.[section]) {
        missingSections.push(section);
      }
    });
    
    test.details.requiredSections = requiredSections;
    test.details.missingSections = missingSections;
    
    if (missingSections.length > 0) {
      test.errors.push(`Missing required cache sections: ${missingSections.join(', ')}`);
    }
    
    // Check SHEETS configuration
    const sheetsConfig = CACHED_SETTINGS.VALUES?.SHEETS;
    test.details.hasSheetsConfig = !!sheetsConfig;
    
    if (!sheetsConfig) {
      test.errors.push('Missing SHEETS configuration');
      return test;
    }
    
    // Check critical sheet names
    const criticalSheets = ['BIKES_STATUS', 'USER_STATUS', 'CHECKOUT_LOGS', 'RETURN_LOGS'];
    const missingSheets = [];
    
    criticalSheets.forEach(sheetKey => {
      if (!sheetsConfig[sheetKey]?.NAME) {
        missingSheets.push(sheetKey);
      }
    });
    
    test.details.criticalSheets = criticalSheets;
    test.details.missingSheets = missingSheets;
    
    if (missingSheets.length > 0) {
      test.errors.push(`Missing critical sheet configurations: ${missingSheets.join(', ')}`);
    }
    
    // If we got here without errors, test passed
    test.passed = test.errors.length === 0;
    
    if (test.passed) {
      Logger.log('✅ Cache content validation passed');
    } else {
      Logger.log(`❌ Cache content validation failed: ${test.errors.join(', ')}`);
    }
    
  } catch (error) {
    test.errors.push(`Cache validation test failed: ${error.message}`);
    Logger.log(`❌ Cache validation test failed: ${error.message}`);
  }
  
  return test;
}

/**
 * Test 6: Cache Type Verification
 */
function testCacheTypeVerification() {
  const test = {
    name: 'Cache Type Verification',
    description: 'Verifies ScriptCache is being used (not DocumentCache)',
    passed: false,
    errors: [],
    details: {}
  };

  try {
    Logger.log('📋 Test 6: Cache Type Verification');
    
    // Test that we're using ScriptCache by checking cache name and functionality
    test.details.cacheName = CACHED_SETTINGS.cacheName;
    test.details.cacheExpirationSeconds = CACHED_SETTINGS.cacheExpirationSeconds;
    
    // Verify cache expiration is set (indicates ScriptCache)
    if (!CACHED_SETTINGS.cacheExpirationSeconds) {
      test.errors.push('Cache expiration not configured (may not be using ScriptCache)');
    }
    
    // Test ScriptCache directly
    try {
      const testKey = 'cacheTypeTest';
      const testValue = 'scriptCacheTest';
      
      // Store in ScriptCache
      CacheService.getScriptCache().put(testKey, testValue, 60); // 1 minute
      
      // Retrieve from ScriptCache
      const retrieved = CacheService.getScriptCache().get(testKey);
      test.details.scriptCacheTest = { stored: testValue, retrieved: retrieved };
      
      if (retrieved !== testValue) {
        test.errors.push('ScriptCache test failed - value mismatch');
      }
      
      // Clean up
      CacheService.getScriptCache().remove(testKey);
      
    } catch (cacheError) {
      test.errors.push(`ScriptCache functionality test failed: ${cacheError.message}`);
    }
    
    test.passed = test.errors.length === 0;
    
    if (test.passed) {
      Logger.log('✅ Cache type verification passed - using ScriptCache');
    } else {
      Logger.log(`❌ Cache type verification failed: ${test.errors.join(', ')}`);
    }
    
  } catch (error) {
    test.errors.push(`Cache type verification failed: ${error.message}`);
    Logger.log(`❌ Cache type verification failed: ${error.message}`);
  }
  
  return test;
}

/**
 * Standalone Cache Persistence Test
 * Run this multiple times in separate executions to test cross-execution persistence
 */
function testCachePersistenceStandalone() {
  try {
    const timestamp = new Date().toISOString();
    Logger.log(`🧪 Testing ScriptCache persistence at ${timestamp}...`);
    
    // Check if cache exists
    const result = CACHED_SETTINGS.refreshCache(false);
    Logger.log(`Cache refresh result: ${result}`);
    
    if (CACHED_SETTINGS.VALUES?.SHEETS?.BIKES_STATUS?.NAME) {
      Logger.log(`✅ Cache working - BIKES sheet name: ${CACHED_SETTINGS.VALUES.SHEETS.BIKES_STATUS.NAME}`);
    } else {
      Logger.log(`❌ Cache not working - no BIKES sheet config found`);
    }
    
    return {
      success: result,
      cacheWorking: !!CACHED_SETTINGS.VALUES?.SHEETS?.BIKES_STATUS?.NAME,
      timestamp: timestamp
    };
    
  } catch (error) {
    Logger.log(`❌ Error in testCachePersistenceStandalone: ${error.message}`);
    return { success: false, error: error.message, timestamp: new Date().toISOString() };
  }
}