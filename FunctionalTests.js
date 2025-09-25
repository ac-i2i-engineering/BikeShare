// =============================================================================
// FUNCTIONAL PIPELINE TESTING & DEMONSTRATION
// =============================================================================

/**
 * Test the functional checkout pipeline with sample data
 * This function demonstrates how the new functional approach works
 */
function testFunctionalCheckoutPipeline() {
  Logger.log('=== Testing Functional Checkout Pipeline ===');
  
  // Create mock trigger event
  const mockTriggerEvent = {
    source: {
      getActiveSheet: () => ({
        getName: () => CACHED_SETTINGS.VALUES.SHEETS.CHECKOUT_LOGS.NAME
      })
    },
    values: [
      new Date(), // timestamp
      'testuser@amherst.edu', // email
      'TEST123', // bike hash
      'I consent' // condition confirmation
    ],
    range: {
      getRow: () => 2,
      getColumn: () => 1,
      getSheet: () => ({ getName: () => 'Checkout Logs' })
    }
  };
  
  try {
    const result = processBikeShareEvent(mockTriggerEvent);
    
    Logger.log('Pipeline Result:');
    Logger.log(`Success: ${result.success}`);
    Logger.log(`Transaction Type: ${result.transaction?.type}`);
    Logger.log(`User Email: ${result.user?.userEmail}`);
    Logger.log(`Bike Name: ${result.bike?.bikeName}`);
    Logger.log(`Notifications: ${result.notifications?.length || 0}`);
    
    if (result.error) {
      Logger.log(`Error: ${result.error} - ${result.errorMessage}`);
    }
    
    if (result.stateChanges) {
      Logger.log(`State Changes - Bikes: ${result.stateChanges.bikes?.length || 0}`);
      Logger.log(`State Changes - Users: ${result.stateChanges.users?.length || 0}`);
    }
    
    return result;
    
  } catch (error) {
    Logger.log(`Test failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Test the functional return pipeline with sample data
 */
function testFunctionalReturnPipeline() {
  Logger.log('=== Testing Functional Return Pipeline ===');
  
  // Create mock trigger event for return
  const mockTriggerEvent = {
    source: {
      getActiveSheet: () => ({
        getName: () => CACHED_SETTINGS.VALUES.SHEETS.RETURN_LOGS.NAME
      })
    },
    values: [
      new Date(), // timestamp
      'testuser@amherst.edu', // email
      'TEST123', // bike hash
      'Good condition' // return notes
    ],
    range: {
      getRow: () => 3,
      getColumn: () => 1,
      getSheet: () => ({ getName: () => 'Return Logs' })
    }
  };
  
  try {
    const result = processBikeShareEvent(mockTriggerEvent);
    
    Logger.log('Return Pipeline Result:');
    Logger.log(`Success: ${result.success}`);
    Logger.log(`Transaction Type: ${result.transaction?.type}`);
    Logger.log(`Usage Hours: ${result.usageHours || 'N/A'}`);
    Logger.log(`Returning for Friend: ${result.isReturningForFriend}`);
    
    return result;
    
  } catch (error) {
    Logger.log(`Return test failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Test the functional report generation
 */
function testFunctionalReportGeneration() {
  Logger.log('=== Testing Functional Report Generation ===');
  
  try {
    const result = generatePeriodicReportFunctional();
    
    Logger.log('Report Generation Result:');
    Logger.log(`Success: ${result.success}`);
    
    if (result.reportData) {
      Logger.log(`System Metrics - Total Bikes: ${result.reportData.systemMetrics?.totalBikes}`);
      Logger.log(`System Metrics - Utilization: ${result.reportData.systemMetrics?.utilizationRate}%`);
      Logger.log(`User Metrics - Total Users: ${result.reportData.systemMetrics?.totalUsers}`);
      Logger.log(`Summary Highlights: ${result.reportData.summary?.highlights?.length || 0}`);
      Logger.log(`Summary Concerns: ${result.reportData.summary?.concerns?.length || 0}`);
    }
    
    return result;
    
  } catch (error) {
    Logger.log(`Report test failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Compare functional vs OOP approach performance
 */
function compareFunctionalVsOOPPerformance() {
  Logger.log('=== Performance Comparison: Functional vs OOP ===');
  
  const iterations = 10;
  let functionalTime = 0;
  let oopTime = 0;
  
  // Create consistent test data
  const mockEvent = {
    source: {
      getActiveSheet: () => ({
        getName: () => CACHED_SETTINGS.VALUES.SHEETS.CHECKOUT_LOGS.NAME
      })
    },
    values: [new Date(), 'perf@amherst.edu', 'PERF123', 'I consent'],
    range: { getRow: () => 2, getColumn: () => 1 }
  };
  
  // Test functional approach
  Logger.log('Testing Functional Approach...');
  const functionalStart = new Date().getTime();
  
  for (let i = 0; i < iterations; i++) {
    try {
      processBikeShareEvent(mockEvent);
    } catch (e) {
      // Continue testing even if individual calls fail
    }
  }
  
  functionalTime = new Date().getTime() - functionalStart;
  
  // Test OOP approach
  Logger.log('Testing OOP Approach...');
  const oopStart = new Date().getTime();
  
  for (let i = 0; i < iterations; i++) {
    try {
      handleOnFormSubmitLegacy(mockEvent);
    } catch (e) {
      // Continue testing even if individual calls fail
    }
  }
  
  oopTime = new Date().getTime() - oopStart;
  
  // Results
  Logger.log(`Results (${iterations} iterations each):`);
  Logger.log(`Functional Approach: ${functionalTime}ms (avg: ${(functionalTime/iterations).toFixed(2)}ms)`);
  Logger.log(`OOP Approach: ${oopTime}ms (avg: ${(oopTime/iterations).toFixed(2)}ms)`);
  Logger.log(`Performance Ratio: ${(oopTime/functionalTime).toFixed(2)}x`);
  
  return {
    functionalTime,
    oopTime,
    iterations,
    performanceRatio: oopTime / functionalTime
  };
}

/**
 * Test pipeline error handling
 */
function testPipelineErrorHandling() {
  Logger.log('=== Testing Pipeline Error Handling ===');
  
  const errorTests = [
    {
      name: 'Invalid Email Domain',
      event: {
        source: { getActiveSheet: () => ({ getName: () => CACHED_SETTINGS.VALUES.SHEETS.CHECKOUT_LOGS.NAME }) },
        values: [new Date(), 'invalid@gmail.com', 'TEST123', 'I consent'],
        range: { getRow: () => 2 }
      }
    },
    {
      name: 'Nonexistent Bike',
      event: {
        source: { getActiveSheet: () => ({ getName: () => CACHED_SETTINGS.VALUES.SHEETS.CHECKOUT_LOGS.NAME }) },
        values: [new Date(), 'test@amherst.edu', 'NONEXISTENT', 'I consent'],
        range: { getRow: () => 2 }
      }
    }
  ];
  
  errorTests.forEach(test => {
    Logger.log(`Testing: ${test.name}`);
    try {
      const result = processBikeShareEvent(test.event);
      Logger.log(`  Result: ${result.success ? 'Success' : 'Failed as expected'}`);
      Logger.log(`  Error: ${result.error || 'None'}`);
      Logger.log(`  Message: ${result.errorMessage || 'None'}`);
    } catch (error) {
      Logger.log(`  Exception: ${error.message}`);
    }
  });
}

/**
 * Demonstrate the benefits of the functional approach
 */
function demonstrateFunctionalBenefits() {
  Logger.log('=== Functional Programming Benefits Demonstration ===');
  
  Logger.log('1. PURE FUNCTIONS - Easy to test and reason about');
  Logger.log('   Example: validateEmailDomain() always returns same result for same input');
  
  Logger.log('2. COMPOSABILITY - Functions can be easily combined');
  Logger.log('   Example: pipe() allows building complex workflows from simple functions');
  
  Logger.log('3. IMMUTABILITY - Data is not modified in place');
  Logger.log('   Example: updateBikeStatus() returns new state without mutating original');
  
  Logger.log('4. ERROR HANDLING - Errors propagate naturally through pipeline');
  Logger.log('   Example: If validation fails, subsequent steps are skipped gracefully');
  
  Logger.log('5. SEPARATION OF CONCERNS - Pure logic separated from side effects');
  Logger.log('   Example: Business logic in pipeline, I/O in commitStateChanges()');
  
  Logger.log('6. TESTABILITY - Each function can be tested in isolation');
  Logger.log('   Example: validateBikeExists() can be tested with mock data');
  
  // Demonstrate composition
  const simpleValidation = pipe(
    (data) => validateEmailDomain(data, CACHED_SETTINGS.VALUES),
    (data) => validateSystemActive(data, CACHED_SETTINGS.VALUES)
  );
  
  const testData = { userEmail: 'test@amherst.edu' };
  const validationResult = simpleValidation(testData);
  
  Logger.log(`7. COMPOSITION EXAMPLE:`);
  Logger.log(`   Input: ${JSON.stringify(testData)}`);
  Logger.log(`   Output: ${JSON.stringify(validationResult)}`);
}

/**
 * Comprehensive pipeline validation for key operations
 */
function validateKeyOperations() {
  Logger.log('=== COMPREHENSIVE PIPELINE VALIDATION ===');
  
  const results = {
    checkout: { passed: 0, failed: 0, issues: [] },
    return: { passed: 0, failed: 0, issues: [] },
    notifications: { passed: 0, failed: 0, issues: [] },
    errorMarking: { passed: 0, failed: 0, issues: [] }
  };
  
  // Test 1: Checkout Operation Validation
  Logger.log('1. CHECKOUT OPERATION VALIDATION');
  try {
    const checkoutTests = [
      {
        name: 'Valid checkout',
        data: { userEmail: 'test@amherst.edu', bikeHash: 'TEST123', conditionConfirmation: 'I consent' },
        shouldSucceed: true
      },
      {
        name: 'Invalid email domain',
        data: { userEmail: 'test@gmail.com', bikeHash: 'TEST123', conditionConfirmation: 'I consent' },
        shouldSucceed: false
      },
      {
        name: 'Nonexistent bike',
        data: { userEmail: 'test@amherst.edu', bikeHash: 'FAKE999', conditionConfirmation: 'I consent' },
        shouldSucceed: false
      }
    ];
    
    checkoutTests.forEach(test => {
      const mockEvent = createMockCheckoutEvent(test.data);
      const result = processBikeShareEvent(mockEvent);
      
      if ((result.success && test.shouldSucceed) || (!result.success && !test.shouldSucceed)) {
        results.checkout.passed++;
        Logger.log(`  ✅ ${test.name}: PASSED`);
      } else {
        results.checkout.failed++;
        results.checkout.issues.push(`${test.name}: Expected ${test.shouldSucceed ? 'success' : 'failure'}, got ${result.success ? 'success' : 'failure'}`);
        Logger.log(`  ❌ ${test.name}: FAILED`);
      }
    });
  } catch (error) {
    results.checkout.issues.push(`Checkout validation error: ${error.message}`);
  }
  
  // Test 2: Return Operation Validation  
  Logger.log('2. RETURN OPERATION VALIDATION');
  try {
    const returnTests = [
      {
        name: 'Valid return',
        data: { userEmail: 'test@amherst.edu', bikeHash: 'TEST123' },
        shouldSucceed: true
      },
      {
        name: 'Return non-checked-out bike',
        data: { userEmail: 'test@amherst.edu', bikeHash: 'AVAILABLE123' },
        shouldSucceed: false
      }
    ];
    
    returnTests.forEach(test => {
      const mockEvent = createMockReturnEvent(test.data);
      const result = processBikeShareEvent(mockEvent);
      
      if ((result.success && test.shouldSucceed) || (!result.success && !test.shouldSucceed)) {
        results.return.passed++;
        Logger.log(`  ✅ ${test.name}: PASSED`);
      } else {
        results.return.failed++;
        results.return.issues.push(`${test.name}: Expected ${test.shouldSucceed ? 'success' : 'failure'}, got ${result.success ? 'success' : 'failure'}`);
        Logger.log(`  ❌ ${test.name}: FAILED`);
      }
    });
  } catch (error) {
    results.return.issues.push(`Return validation error: ${error.message}`);
  }
  
  // Test 3: Notifications Validation
  Logger.log('3. NOTIFICATIONS VALIDATION');
  try {
    const testData = { userEmail: 'test@amherst.edu', bikeHash: 'TEST123', conditionConfirmation: 'I consent' };
    const mockEvent = createMockCheckoutEvent(testData);
    const result = processBikeShareEvent(mockEvent);
    
    if (result.notifications && result.notifications.length > 0) {
      results.notifications.passed++;
      Logger.log(`  ✅ Notifications generated: ${result.notifications.length}`);
      
      // Validate notification structure
      result.notifications.forEach(notification => {
        if (notification.commID && notification.context) {
          results.notifications.passed++;
          Logger.log(`  ✅ Notification structure valid: ${notification.commID}`);
        } else {
          results.notifications.failed++;
          results.notifications.issues.push('Invalid notification structure');
        }
      });
    } else {
      results.notifications.failed++;
      results.notifications.issues.push('No notifications generated');
    }
  } catch (error) {
    results.notifications.issues.push(`Notification validation error: ${error.message}`);
  }
  
  // Test 4: Error Entry Marking Validation
  Logger.log('4. ERROR ENTRY MARKING VALIDATION');
  try {
    const errorData = { userEmail: 'invalid@gmail.com', bikeHash: 'TEST123', conditionConfirmation: 'I consent' };
    const mockEvent = createMockCheckoutEvent(errorData);
    const result = processBikeShareEvent(mockEvent);
    
    if (result.entryMark) {
      if (result.entryMark.bgColor && result.entryMark.note) {
        results.errorMarking.passed++;
        Logger.log(`  ✅ Error marking generated: ${result.entryMark.bgColor}`);
      } else {
        results.errorMarking.failed++;
        results.errorMarking.issues.push('Incomplete error marking');
      }
    } else {
      results.errorMarking.failed++;
      results.errorMarking.issues.push('No error marking generated for failed operation');
    }
  } catch (error) {
    results.errorMarking.issues.push(`Error marking validation error: ${error.message}`);
  }
  
  // Summary
  Logger.log('=== VALIDATION SUMMARY ===');
  Object.entries(results).forEach(([operation, result]) => {
    const total = result.passed + result.failed;
    Logger.log(`${operation.toUpperCase()}: ${result.passed}/${total} passed`);
    if (result.issues.length > 0) {
      Logger.log(`  Issues: ${result.issues.join(', ')}`);
    }
  });
  
  return results;
}

/**
 * Create mock checkout event
 */
function createMockCheckoutEvent(data) {
  return {
    source: {
      getActiveSheet: () => ({
        getName: () => CACHED_SETTINGS.VALUES.SHEETS.CHECKOUT_LOGS.NAME
      })
    },
    values: [
      new Date(),
      data.userEmail,
      data.bikeHash,
      data.conditionConfirmation || 'I consent'
    ],
    range: {
      getRow: () => 2,
      getColumn: () => 1,
      setBackground: () => {},
      setNote: () => {}
    }
  };
}

/**
 * Create mock return event
 */
function createMockReturnEvent(data) {
  return {
    source: {
      getActiveSheet: () => ({
        getName: () => CACHED_SETTINGS.VALUES.SHEETS.RETURN_LOGS.NAME
      })
    },
    values: [
      new Date(),
      data.userEmail,
      data.bikeHash,
      data.returnNotes || 'Good condition'
    ],
    range: {
      getRow: () => 3,
      getColumn: () => 1,
      setBackground: () => {},
      setNote: () => {}
    }
  };
}

/**
 * Run all functional tests
 */
function runAllFunctionalTests() {
  Logger.log('=== Running All Functional Pipeline Tests ===');
  
  try {
    validateKeyOperations();
    demonstrateFunctionalBenefits();
    testFunctionalCheckoutPipeline();
    testFunctionalReturnPipeline();
    testFunctionalReportGeneration();
    testPipelineErrorHandling();
    compareFunctionalVsOOPPerformance();
    
    Logger.log('=== All Tests Completed ===');
    
  } catch (error) {
    Logger.log(`Test suite failed: ${error.message}`);
  }
}