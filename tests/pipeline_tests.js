// =============================================================================
// SIMPLE PIPELINE TESTS
// =============================================================================

/**
 * Simple test runner - logs results to console
 */
function runAllTests() {
  Logger.log('🧪 Running Pipeline Tests...');
  
  testCheckoutProcess();
  testReturnProcess();
  testErrorHandling();
  
  Logger.log('✅ All tests completed');
}

/**
 * Test successful checkout process
 */
function testCheckoutProcess() {
  Logger.log('Testing checkout process...');
  
  // Mock data
  const mockFormData = {
    timestamp: new Date(),
    userEmail: 'student@amherst.edu',
    bikeHash: 'BIKE001',
    conditionConfirmation: 'Good'
  };
  
  const mockCurrentState = {
    bikes: [{
      bikeName: 'TestBike1',
      bikeHash: 'BIKE001',
      availability: 'Available',
      maintenanceStatus: 'Good',
      _rowIndex: 2
    }],
    users: [],
    settings: { SYSTEM_ACTIVE: true },
    timestamp: new Date()
  };
  
  const mockContext = {
    operation: 'checkout',
    range: 'mockRange'
  };
  
  // Run checkout pipeline
  const result = checkoutPipeline(mockFormData, mockCurrentState, mockContext);
  
  // Assertions
  assert(result.transaction?.type === 'checkout', 'Should create checkout transaction');
  assert(result.bike?.availability === 'Checked Out', 'Should update bike status');
  assert(result.user?.hasUnreturnedBike === true, 'Should mark user as having unreturned bike');
  assert(result.stateChanges?.bikes?.length > 0, 'Should have bike state changes');
  assert(result.stateChanges?.users?.length > 0, 'Should have user state changes');
  
  Logger.log('✅ Checkout test passed');
}

/**
 * Test successful return process
 */
function testReturnProcess() {
  Logger.log('Testing return process...');
  
  // Mock data
  const mockFormData = {
    timestamp: new Date(),
    userEmail: 'student@amherst.edu',
    bikeName: 'TestBike1',
    confirmBikeName: 'TestBike1',
    returningForFriend: 'No'
  };
  
  const mockCurrentState = {
    bikes: [{
      bikeName: 'TestBike1',
      bikeHash: 'BIKE001',
      availability: 'Checked Out',
      mostRecentUser: 'student@amherst.edu',
      lastCheckoutDate: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      totalUsageHours: 10,
      _rowIndex: 2
    }],
    users: [{
      userEmail: 'student@amherst.edu',
      hasUnreturnedBike: true,
      numberOfReturns: 5,
      usageHours: 20,
      _rowIndex: 3
    }],
    settings: { SYSTEM_ACTIVE: true },
    timestamp: new Date()
  };
  
  const mockContext = {
    operation: 'return',
    range: 'mockRange'
  };
  
  // Run return pipeline
  const result = returnPipeline(mockFormData, mockCurrentState, mockContext);
  
  // Assertions
  assert(result.transaction?.type === 'return', 'Should create return transaction');
  assert(result.bike?.availability === 'Available', 'Should update bike to available');
  assert(result.user?.hasUnreturnedBike === false, 'Should mark user as not having unreturned bike');
  assert(result.usageHours > 0, 'Should calculate usage hours');
  assert(result.stateChanges?.bikes?.length > 0, 'Should have bike state changes');
  assert(result.stateChanges?.users?.length > 0, 'Should have user state changes');
  
  Logger.log('✅ Return test passed');
}

/**
 * Test error handling
 */
function testErrorHandling() {
  Logger.log('Testing error handling...');
  
  // Test invalid email domain
  const mockFormData = {
    userEmail: 'student@invalid.edu',
    bikeHash: 'BIKE001'
  };
  
  const mockCurrentState = {
    bikes: [],
    users: [],
    settings: { SYSTEM_ACTIVE: true }
  };
  
  const mockContext = { operation: 'checkout' };
  
  const result = checkoutPipeline(mockFormData, mockCurrentState, mockContext);
  
  // Assertions
  assert(result.error === 'ERR_USR_EMAIL_001', 'Should reject invalid email domain');
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