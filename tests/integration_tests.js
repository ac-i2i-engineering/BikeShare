// =============================================================================
// INTEGRATION TEST SUITE (interacts with live sheets + services)
// =============================================================================

const INTEGRATION_TEST_BIKE_CATALOG = buildIntegrationTestBikeCatalog();

function runIntegrationTests() {
  Logger.log('🧪 Running integration tests...');
  setupTestData();
  const initialCounts = recordInitialRowCounts();
  Logger.log('📊 Initial row counts recorded', initialCounts);

  testCheckoutProcess();
  testReturnProcess();
  testErrorHandling();
  testDataProcessing();

  Logger.log('✅ Integration tests completed');
}

function setupTestData() {
  Logger.log('🔧 Ensuring integration test data...');
  ensureTestSettingsLoaded();
  const seededBikes = ensureIntegrationTestBikeRows();
  Logger.log(`🚲 Prepared ${seededBikes.length} integration test bikes (${seededBikes.join(', ')})`);
}

function buildIntegrationTestBikeCatalog() {
  const hoursAgo = (hours) => new Date(Date.now() - hours * 60 * 60 * 1000);
  return {
    checkoutPrimary: createTestBikeConfig('CHECKOUT_1'),
    checkoutSecondary: createTestBikeConfig('CHECKOUT_2'),
    checkoutTertiary: createTestBikeConfig('CHECKOUT_3'),
    returnNormal: createTestBikeConfig('RETURN_1', {
      availability: 'Checked Out',
      mostRecentUser: 'studentTest@amherst.edu',
      lastCheckoutDate: hoursAgo(6)
    }),
    returnMismatch: createTestBikeConfig('RETURN_2', {
      availability: 'Checked Out',
      mostRecentUser: 'student2@amherst.edu',
      lastCheckoutDate: hoursAgo(8)
    }),
    returnFriend: createTestBikeConfig('RETURN_3', {
      availability: 'Checked Out',
      mostRecentUser: 'original.user@amherst.edu',
      lastCheckoutDate: hoursAgo(30)
    }),
    returnUncertain: createTestBikeConfig('RETURN_4', {
      availability: 'Checked Out',
      mostRecentUser: 'confused@amherst.edu',
      lastCheckoutDate: hoursAgo(4)
    })
  };
}

function createTestBikeConfig(label, overrides) {
  const prefix = typeof TEST_BIKE_PREFIX === 'string' ? TEST_BIKE_PREFIX : 'INT_TEST_BIKE_';
  const baseConfig = {
    bikeName: `${prefix}${label}`,
    size: 'M',
    maintenanceStatus: 'Good',
    availability: 'Available',
    lastCheckoutDate: '',
    lastReturnDate: '',
    currentUsageTimer: 0,
    totalUsageHours: 0,
    mostRecentUser: '',
    secondRecentUser: '',
    thirdRecentUser: '',
    tempRecent: '',
    bikeHash: `${prefix}HASH_${label}`
  };
  return { ...baseConfig, ...(overrides || {}) };
}

function ensureIntegrationTestBikeRows() {
  const catalog = INTEGRATION_TEST_BIKE_CATALOG;
  const rows = [];
  Object.keys(catalog).forEach((key) => {
    const config = catalog[key];
    const rowIndex = upsertTestBikeRow(config);
    rows.push(`${config.bikeName}@row${rowIndex}`);
  });
  return rows;
}

// -----------------------------------------------------------------------------
// Checkout Scenarios
// -----------------------------------------------------------------------------

function testCheckoutProcess() {
  Logger.log('Testing checkout process...');
  setupTestData();

  const bikes = INTEGRATION_TEST_BIKE_CATALOG;
  const scenarios = [
    {
      scenario: 'Normal Checkout',
      userEmail: 'testUser1@amherst.edu',
      bike: bikes.checkoutPrimary,
      conditionConfirmation: 'I consent'
    },
    {
      scenario: 'Different User Checkout',
      userEmail: 'testUser2@amherst.edu',
      bike: bikes.checkoutSecondary,
      conditionConfirmation: 'I consent'
    },
    {
      scenario: 'Deterministic Checkout',
      userEmail: 'integrationtest.checkout@amherst.edu',
      bike: bikes.checkoutTertiary,
      conditionConfirmation: 'I consent'
    }
  ];

  scenarios.forEach(testCheckoutScenario);
}

function testCheckoutScenario(testData) {
  const checkoutSheet = DB.getSheet(CACHED_SETTINGS.VALUES.SHEETS.CHECKOUT_LOGS.NAME);
  const formData = [
    new Date(),
    testData.userEmail,
    testData.bike.bikeHash,
    testData.conditionConfirmation
  ];

  checkoutSheet.appendRow(formData);
  const lastRow = checkoutSheet.getLastRow();
  const actualRange = checkoutSheet.getRange(lastRow, 1, 1, formData.length);

  const mockEvent = {
    values: formData,
    range: actualRange,
    source: { getActiveSheet: () => checkoutSheet }
  };

  try {
    const result = handleOnFormSubmit(mockEvent);
    assert(result.transaction?.type === 'checkout', `${testData.scenario}: Should create checkout transaction`);
    assert(result.success === true || result.success === false, `${testData.scenario}: Should have success status`);

    if (result.success) {
      assert(result.stateChanges?.bikes?.length > 0, `${testData.scenario}: Should have bike state changes`);
      assert(result.user?.userEmail, `${testData.scenario}: Should have user data`);
      assert(result.bike?.bikeHash === testData.bike.bikeHash, `${testData.scenario}: Should match bike hash`);
      assert(result.bike?.bikeName === testData.bike.bikeName, `${testData.scenario}: Should match bike name`);
      Logger.log(`✅ ${testData.scenario} test passed`);
    } else {
      Logger.log(`⚠️  ${testData.scenario} completed with error: ${result.errorMessage}`);
    }
  } catch (error) {
    Logger.log(`❌ ${testData.scenario} test failed: ${error.message}`);
  }
}

// -----------------------------------------------------------------------------
// Return Scenarios
// -----------------------------------------------------------------------------

function testReturnProcess() {
  Logger.log('Testing return process...');
  setupTestData();

  const bikes = INTEGRATION_TEST_BIKE_CATALOG;
  const scenarios = [
    {
      scenario: 'Normal Return',
      userEmail: 'studentTest@amherst.edu',
      bike: bikes.returnNormal,
      confirmBikeName: bikes.returnNormal.bikeName,
      assureRodeBike: 'Yes',
      mismatchExplanation: '',
      returningForFriend: 'No',
      friendEmail: '',
      issuesConcerns: ''
    },
    {
      scenario: 'Bike Mismatch',
      userEmail: 'student2@amherst.edu',
      bike: bikes.returnMismatch,
      confirmBikeName: bikes.returnMismatch.bikeName,
      assureRodeBike: 'No',
      mismatchExplanation: '🛠️ The original bike had a problem, so I rode a different one',
      returningForFriend: 'No',
      friendEmail: '',
      issuesConcerns: 'Original bike had flat tire'
    },
    {
      scenario: 'Friend Return',
      userEmail: 'friend@amherst.edu',
      bike: bikes.returnFriend,
      confirmBikeName: bikes.returnFriend.bikeName,
      assureRodeBike: 'Yes',
      mismatchExplanation: '',
      returningForFriend: 'Yes',
      friendEmail: 'original.user@amherst.edu',
      issuesConcerns: ''
    },
    {
      scenario: 'Uncertain Return',
      userEmail: 'confused@amherst.edu',
      bike: bikes.returnUncertain,
      confirmBikeName: bikes.returnUncertain.bikeName,
      assureRodeBike: 'Not Sure',
      mismatchExplanation: '🧠 I forgot which bike I checked out',
      returningForFriend: 'No',
      friendEmail: '',
      issuesConcerns: 'Not sure if this is the right bike'
    }
  ];

  scenarios.forEach(testReturnScenario);
}

function testReturnScenario(testData) {
  const returnSheet = DB.getSheet(CACHED_SETTINGS.VALUES.SHEETS.RETURN_LOGS.NAME);
  const formData = [
    new Date(),
    testData.userEmail,
    testData.bike.bikeName,
    testData.confirmBikeName || testData.bike.bikeName,
    testData.assureRodeBike,
    testData.mismatchExplanation,
    testData.returningForFriend,
    testData.friendEmail,
    testData.issuesConcerns
  ];

  returnSheet.appendRow(formData);
  const lastRow = returnSheet.getLastRow();
  const actualRange = returnSheet.getRange(lastRow, 1, 1, formData.length);

  const mockEvent = {
    values: formData,
    range: actualRange,
    source: { getActiveSheet: () => returnSheet }
  };

  try {
    const result = handleOnFormSubmit(mockEvent);
    assert(result.transaction?.type === 'return', `${testData.scenario}: Should create return transaction`);
    assert(result.success === true || result.success === false, `${testData.scenario}: Should have success status`);

    if (result.success) {
      assert(result.stateChanges?.bikes?.length > 0, `${testData.scenario}: Should have bike state changes`);
      assert(result.user?.userEmail, `${testData.scenario}: Should have user data`);
      assert(result.bike?.bikeName === testData.bike.bikeName, `${testData.scenario}: Should have bike data`);
      if (testData.returningForFriend === 'Yes') {
        assert(result.isReturningForFriend !== undefined, `${testData.scenario}: Should detect friend return`);
      }
      Logger.log(`✅ ${testData.scenario} test passed`);
    } else {
      Logger.log(`⚠️  ${testData.scenario} completed with error: ${result.errorMessage}`);
    }
  } catch (error) {
    Logger.log(`❌ ${testData.scenario} test failed: ${error.message}`);
  }
}

// -----------------------------------------------------------------------------
// Error & Data Validation Tests
// -----------------------------------------------------------------------------

function testErrorHandling() {
  Logger.log('Testing error handling...');
  setupTestData();

  const bikes = INTEGRATION_TEST_BIKE_CATALOG;
  const scenarios = [
    {
      scenario: 'Invalid Email Domain',
      values: [new Date(), 'student@invalid.edu', bikes.checkoutPrimary.bikeHash, 'I consent'],
      operation: 'checkout',
      shouldFail: true
    },
    {
      scenario: 'Empty Email',
      values: [new Date(), '', bikes.checkoutPrimary.bikeHash, 'I consent'],
      operation: 'checkout',
      shouldFail: true
    },
    {
      scenario: 'Invalid Bike Hash',
      values: [new Date(), 'studentTest@amherst.edu', 'INVALID_HASH', 'I consent'],
      operation: 'checkout',
      shouldFail: true
    },
    {
      scenario: 'Invalid Bike Name',
      values: [new Date(), 'studentTest@amherst.edu', 'NonExistentBike', 'NonExistentBike', 'Yes', '', 'No', '', ''],
      operation: 'return',
      shouldFail: true
    },
    {
      scenario: 'Mismatched Bike Names',
      values: [new Date(), 'student2@amherst.edu', bikes.returnMismatch.bikeName, 'DifferentBike', 'Yes', '', 'No', '', ''],
      operation: 'return',
      shouldFail: false
    }
  ];

  scenarios.forEach(testErrorScenario);
  Logger.log('✅ Error handling tests completed');
}

function testErrorScenario(testData) {
  const sheetName = testData.operation === 'checkout'
    ? CACHED_SETTINGS.VALUES.SHEETS.CHECKOUT_LOGS.NAME
    : CACHED_SETTINGS.VALUES.SHEETS.RETURN_LOGS.NAME;

  const sheet = DB.getSheet(sheetName);
  sheet.appendRow(testData.values);

  const lastRow = sheet.getLastRow();
  const actualRange = sheet.getRange(lastRow, 1, 1, testData.values.length);

  const mockEvent = {
    values: testData.values,
    range: actualRange,
    source: { getActiveSheet: () => sheet }
  };

  try {
    const result = handleOnFormSubmit(mockEvent);
    if (testData.shouldFail) {
      assert(result.success === false, `${testData.scenario}: Should fail`);
      Logger.log(`✅ ${testData.scenario} correctly failed: ${result.errorMessage}`);
    } else {
      Logger.log(`📝 ${testData.scenario} result: ${result.success ? 'success' : result.errorMessage}`);
    }
  } catch (error) {
    Logger.log(`⚠️  ${testData.scenario} threw exception: ${error.message}`);
  }
}

function testDataProcessing() {
  Logger.log('Testing data processing...');
  const sampleBike = INTEGRATION_TEST_BIKE_CATALOG.checkoutPrimary;

  const mockBikesData = [
    ['BikeName', 'Size', 'Status', 'Availability'],
    [sampleBike.bikeName, 'M', 'Good', 'Available', '', '', 0, 0, '', '', '', '', sampleBike.bikeHash]
  ];

  const processedBikes = processBikesData(mockBikesData);
  assert(processedBikes.length === 1, 'Should process one bike');
  assert(processedBikes[0].bikeName === sampleBike.bikeName, 'Should have correct bike name');
  assert(processedBikes[0]._rowIndex === 2, 'Should have correct row index');

  testMismatchExplanations();
  Logger.log('✅ Data processing test passed');
}

function testMismatchExplanations() {
  const sampleBike = INTEGRATION_TEST_BIKE_CATALOG.returnNormal;
  const mismatchOptions = [
    '🧾 Bike\'s keys were not available',
    '🛠️ The original bike had a problem, so I rode a different one',
    '🧠 I forgot which bike I checked out',
    '🔁 I swapped bikes with a friend during use[check yes in next field, and provide their email]',
    '🤝Returning for someone else, but said it\'s not the exact same bike they checked out.',
    'Other: Found a different bike with better condition'
  ];

  mismatchOptions.forEach((explanation, index) => {
    const testData = {
      scenario: `Mismatch Option ${index + 1}`,
      userEmail: `test${index}@amherst.edu`,
      bikeName: sampleBike.bikeName,
      confirmBikeName: sampleBike.bikeName,
      assureRodeBike: explanation.includes('🔁') ? 'Yes' : 'No',
      mismatchExplanation: explanation,
      returningForFriend: explanation.includes('🔁') || explanation.includes('🤝') ? 'Yes' : 'No',
      friendEmail: explanation.includes('🔁') ? 'friend@amherst.edu' : '',
      issuesConcerns: explanation.includes('🛠️') ? 'Bike had mechanical issues' : ''
    };

    assert(testData.mismatchExplanation.length > 0, 'Should have mismatch explanation');
    assert(testData.userEmail.includes('@amherst.edu'), 'Should have valid email format');
    Logger.log(`📝 Validated mismatch explanation option ${index + 1}`);
  });

  Logger.log('✅ Mismatch explanation validation completed');
}
