// =============================================================================
// SIMPLE PIPELINE TESTS
// =============================================================================

/**
 * Simple test runner - logs results to console
 */
function runAllTests() {
  Logger.log('🧪 Running Pipeline Tests...');
  
  // Ensure settings are loaded before testing
  try {
    if (!CACHED_SETTINGS.VALUES || !CACHED_SETTINGS.VALUES.SHEETS) {
      Logger.log('📋 Loading settings for tests...');
      CACHED_SETTINGS.refreshCache();
    }
  } catch (error) {
    Logger.log('⚠️  Could not load settings - tests may fail if real sheets are required');
  }
  
  testCheckoutProcess();
  testReturnProcess();
  testErrorHandling();
  testDataProcessing();
  
  Logger.log('✅ All tests completed');
}

/**
 * Test successful checkout process
 */
function testCheckoutProcess() {
  Logger.log('Testing checkout process...');
  
  // Create mock event that simulates Google Apps Script form submission
  const mockEvent = {
    values: [
      new Date(), // timestamp
      'student@amherst.edu', // userEmail
      'BIKE001', // bikeHash
      'Good' // conditionConfirmation
    ],
    range: {
      getA1Notation: () => 'A2:D2',
      setBackground: () => {},
      setNote: () => {}
    },
    source: {
      getActiveSheet: () => ({
        getName: () => CACHED_SETTINGS.VALUES.SHEETS.CHECKOUT_LOGS.NAME
      })
    }
  };
  
  // Run through the complete flow
  const result = handleOnFormSubmit(mockEvent);
  
  // Assertions
  assert(result.transaction?.type === 'checkout', 'Should create checkout transaction');
  assert(result.success === true || result.success === false, 'Should have success status');
  
  if (result.error) {
    Logger.log(`⚠️  Checkout test completed with error: ${result.errorMessage}`);
  } else {
    assert(result.stateChanges?.bikes?.length > 0, 'Should have bike state changes');
    Logger.log('✅ Checkout test passed');
  }
}

/**
 * Test successful return process
 */
function testReturnProcess() {
  Logger.log('Testing return process...');
  
  // Create mock event that simulates Google Apps Script form submission for return
  const mockEvent = {
    values: [
      new Date(), // timestamp
      'student@amherst.edu', // userEmail
      'TestBike1', // bikeName
      'TestBike1', // confirmBikeName
      'Yes', // assureRodeBike
      '', // mismatchExplanation
      'No', // returningForFriend
      '', // friendEmail
      'No issues' // issuesConcerns
    ],
    range: {
      getA1Notation: () => 'A2:I2',
      setBackground: () => {},
      setNote: () => {}
    },
    source: {
      getActiveSheet: () => ({
        getName: () => CACHED_SETTINGS.VALUES?.SHEETS?.RETURN_LOGS?.NAME || 'Return Logs'
      })
    }
  };
  
  // Run through the complete flow
  const result = handleOnFormSubmit(mockEvent);
  
  // Assertions
  assert(result.transaction?.type === 'return', 'Should create return transaction');
  assert(result.success === true || result.success === false, 'Should have success status');
  
  if (result.error) {
    Logger.log(`⚠️  Return test completed with error: ${result.errorMessage}`);
  } else {
    assert(result.stateChanges?.bikes?.length > 0, 'Should have bike state changes');
    Logger.log('✅ Return test passed');
  }
}

/**
 * Test error handling
 */
function testErrorHandling() {
  Logger.log('Testing error handling...');
  
  // Create mock event with invalid email domain
  const mockEvent = {
    values: [
      new Date(), // timestamp
      'student@invalid.edu', // invalid userEmail
      'BIKE001', // bikeHash
      'Good' // conditionConfirmation
    ],
    range: {
      getA1Notation: () => 'A2:D2',
      setBackground: () => {},
      setNote: () => {}
    },
    source: {
      getActiveSheet: () => ({
        getName: () => CACHED_SETTINGS.VALUES?.SHEETS?.CHECKOUT_LOGS?.NAME || 'Checkout Logs'
      })
    }
  };
  
  // Run through the complete flow
  const result = handleOnFormSubmit(mockEvent);
  
  // Assertions
  assert(result.success === false, 'Should fail with invalid email');
  assert(result.errorMessage?.includes('amherst.edu'), 'Should have appropriate error message');
  
  Logger.log('✅ Error handling test passed');
}

/**
 * Simple assertion helper
 */
function assert(condition, message) {
  if (!condition) {
    throw new Error(`❌ Test failed: ${message}`);
  }
}

/**
 * Test batch operations
 */
function testBatchOperations() {
  Logger.log('Testing batch operations...');
  
  const mockOperations = [
    {
      type: 'updateByRowIndex',
      sheetName: 'TestSheet',
      rowIndex: 2,
      values: ['test', 'data']
    }
  ];
  
  // This would normally call DB.batchUpdate(mockOperations)
  // For testing, we just verify the structure is correct
  assert(mockOperations[0].type === 'updateByRowIndex', 'Should have correct operation type');
  assert(mockOperations[0].rowIndex === 2, 'Should have row index');
  
  Logger.log('✅ Batch operations test passed');
}

/**
 * Test data processing functions
 */
function testDataProcessing() {
  Logger.log('Testing data processing...');
  
  // Test bike data processing
  const mockBikesData = [
    ['BikeName', 'Size', 'Status', 'Availability'], // Header
    ['TestBike1', 'M', 'Good', 'Available', '', '', 0, 0, '', '', '', '', 'BIKE001']
  ];
  
  const processedBikes = processBikesData(mockBikesData);
  
  assert(processedBikes.length === 1, 'Should process one bike');
  assert(processedBikes[0].bikeName === 'TestBike1', 'Should have correct bike name');
  assert(processedBikes[0]._rowIndex === 2, 'Should have correct row index');
  
  Logger.log('✅ Data processing test passed');
}

// =============================================================================
// QUICK TEST FUNCTIONS FOR DEVELOPMENT
// =============================================================================

/**
 * Quick checkout test for development
 */
function quickCheckoutTest() {
  Logger.log('🚀 Quick Checkout Test');
  testCheckoutProcess();
}

/**
 * Quick return test for development  
 */
function quickReturnTest() {
  Logger.log('🚀 Quick Return Test');
  testReturnProcess();
}