// =============================================================================
// UNIT TEST SUITE (pure logic, no sheet side effects)
// =============================================================================

function runUnitTests() {
  Logger.log('🧪 Running unit tests (no sheet mutations)...');
  const unitTests = [
    { name: 'Checkout pipeline updates state correctly', fn: testCheckoutPipelineHappyPath },
    { name: 'Checkout pipeline blocks users with unreturned bikes', fn: testCheckoutPipelineRejectsUnreturnedBike },
    { name: 'Checkout pipeline rejects invalid email domains', fn: testCheckoutPipelineRejectsInvalidEmail },
    { name: 'Return pipeline calculates usage hours', fn: testReturnPipelineUsageHours },
    { name: 'Return pipeline flags friend returns and notifications', fn: testReturnPipelineFriendFlow },
    { name: 'Return pipeline flags mismatch notifications', fn: testReturnPipelineMismatchFlow }
  ];

  unitTests.forEach(testCase => {
    try {
      testCase.fn();
      Logger.log(`✅ ${testCase.name}`);
    } catch (error) {
      Logger.log(`❌ ${testCase.name}: ${error.message}`);
      throw error;
    }
  });

  Logger.log('✅ Unit tests completed successfully');
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function mergeDeep(target, source) {
  const output = Array.isArray(target) ? target.slice() : { ...target };
  if (!source) return output;
  Object.keys(source).forEach(key => {
    const sourceValue = source[key];
    if (sourceValue && typeof sourceValue === 'object' && !Array.isArray(sourceValue)) {
      output[key] = mergeDeep(target[key] || {}, sourceValue);
    } else if (Array.isArray(sourceValue)) {
      output[key] = sourceValue.slice();
    } else {
      output[key] = sourceValue;
    }
  });
  return output;
}

function createBaseUnitTestSettings() {
  return {
    SYSTEM_ACTIVE: true,
    REGULATIONS: {
      MAX_CHECKOUT_HOURS: 72,
      CAN_CHECKOUT_WITH_UNRETURNED_BIKE: false
    },
    NOTIFICATION_SETTINGS: {
      ENABLE_USER_NOTIFICATIONS: true,
      ENABLE_ADMIN_NOTIFICATIONS: false,
      ENABLE_DEV_NOTIFICATIONS: false
    },
    COMM_CODES: {
      CFM_USR_COT_001: { notifyUser: { subject: 'Checkout confirmed', body: 'Enjoy {{bikeName}}!' } },
      CFM_USR_RET_001: { notifyUser: { subject: 'Return confirmed', body: 'Thanks for returning {{bikeName}} after {{usageHours}} hours.' } },
      CFM_USR_RET_002: { notifyUser: { subject: 'Return recorded', body: 'We\'ve logged your indirect return for {{bikeName}}.' } },
      CFM_USR_RET_003: { notifyUser: { subject: 'Friend return', body: '{{friendEmail}} just returned {{bikeName}} for you.' } },
      CFM_USR_RET_004: { notifyUser: { subject: 'Return mismatch', body: 'We detected a mismatch for {{bikeName}}.' } }
    },
    SHEETS: {
      BIKES_STATUS: { NAME: 'Bikes Status' },
      USER_STATUS: { NAME: 'User Status' },
      CHECKOUT_LOGS: { NAME: 'Checkout Logs' },
      RETURN_LOGS: { NAME: 'Return Logs' }
    }
  };
}

function withMockedSettings(overrides, testFn) {
  const originalValues = CACHED_SETTINGS.VALUES;
  CACHED_SETTINGS.VALUES = mergeDeep(createBaseUnitTestSettings(), overrides || {});
  try {
    testFn();
  } finally {
    CACHED_SETTINGS.VALUES = originalValues;
  }
}

function createBike(overrides) {
  return {
    bikeName: 'Bike Alpha',
    size: 'M',
    maintenanceStatus: 'Good',
    availability: 'Available',
    lastCheckoutDate: null,
    lastReturnDate: null,
    currentUsageTimer: 0,
    totalUsageHours: 0,
    mostRecentUser: '',
    secondRecentUser: '',
    thirdRecentUser: '',
    tempRecent: '',
    bikeHash: 'HASH123',
    _rowIndex: 2,
    ...overrides
  };
}

function createUser(overrides) {
  return {
    userEmail: 'student@amherst.edu',
    hasUnreturnedBike: false,
    lastCheckoutName: '',
    lastCheckoutDate: null,
    lastReturnName: '',
    lastReturnDate: null,
    numberOfCheckouts: 0,
    numberOfReturns: 0,
    numberOfMismatches: 0,
    usageHours: 0,
    overdueReturns: 0,
    firstUsageDate: null,
    _rowIndex: 2,
    ...overrides
  };
}

function createContext(operation) {
  return {
    operation,
    responses: [],
    range: null,
    sheetName: operation === 'checkout'
      ? CACHED_SETTINGS.VALUES.SHEETS.CHECKOUT_LOGS.NAME
      : CACHED_SETTINGS.VALUES.SHEETS.RETURN_LOGS.NAME,
    timestamp: new Date()
  };
}

// -----------------------------------------------------------------------------
// Test Cases
// -----------------------------------------------------------------------------

function testCheckoutPipelineHappyPath() {
  withMockedSettings({}, () => {
    const timestamp = new Date('2025-01-01T10:00:00Z');
    const bike = createBike();

    const rawData = {
      formData: {
        timestamp,
        userEmail: 'student@amherst.edu',
        bikeHash: bike.bikeHash,
        conditionConfirmation: 'I consent'
      },
      currentState: {
        bikes: [bike],
        users: [],
        settings: CACHED_SETTINGS.VALUES,
        timestamp
      },
      context: createContext('checkout')
    };

    const result = checkoutPipeline(rawData);

    assert(!result.error, 'Checkout should succeed');
    assert(result.transaction?.type === 'checkout', 'Transaction type should be checkout');
    assert(result.bike.availability === 'Checked Out', 'Bike should be marked as checked out');
    assert(result.user.hasUnreturnedBike === true, 'User should now have an unreturned bike flag');
    assert(result.stateChanges?.bikes?.length === 1, 'Bike state change should be recorded');
    assert(result.stateChanges?.users?.length === 1, 'User state change should be recorded');
    assert(result.notifications?.[0]?.commID === 'CFM_USR_COT_001', 'Checkout success notification should be queued');
  });
}

function testCheckoutPipelineRejectsUnreturnedBike() {
  withMockedSettings({}, () => {
    const timestamp = new Date('2025-01-01T12:00:00Z');
    const bike = createBike({ availability: 'Available' });
    const user = createUser({
      userEmail: 'student@amherst.edu',
      hasUnreturnedBike: true,
      lastCheckoutName: bike.bikeName,
      lastCheckoutDate: new Date('2025-01-01T09:00:00Z')
    });

    const rawData = {
      formData: {
        timestamp,
        userEmail: user.userEmail,
        bikeHash: bike.bikeHash,
        conditionConfirmation: 'I consent'
      },
      currentState: {
        bikes: [bike],
        users: [user],
        settings: CACHED_SETTINGS.VALUES,
        timestamp
      },
      context: createContext('checkout')
    };

    const result = checkoutPipeline(rawData);

    assert(result.error === 'ERR_USR_COT_002', 'Checkout should be blocked for users with unreturned bikes');
    assert(result.notifications?.[0]?.type === 'error', 'Error notification should be prepared');
  });
}

function testCheckoutPipelineRejectsInvalidEmail() {
  withMockedSettings({}, () => {
    const timestamp = new Date('2025-01-02T08:00:00Z');
    const bike = createBike();

    const rawData = {
      formData: {
        timestamp,
        userEmail: 'student@invalid.edu',
        bikeHash: bike.bikeHash,
        conditionConfirmation: 'I consent'
      },
      currentState: {
        bikes: [bike],
        users: [],
        settings: CACHED_SETTINGS.VALUES,
        timestamp
      },
      context: createContext('checkout')
    };

    const result = checkoutPipeline(rawData);

    assert(result.error === 'ERR_USR_EMAIL_001', 'Invalid email domain should be rejected');
  });
}

function testReturnPipelineUsageHours() {
  withMockedSettings({}, () => {
    const checkoutTime = new Date('2025-01-03T08:00:00Z');
    const timestamp = new Date('2025-01-03T10:00:00Z');
    const bike = createBike({
      availability: 'Checked Out',
      lastCheckoutDate: checkoutTime,
      mostRecentUser: 'student@amherst.edu'
    });
    const user = createUser({
      userEmail: 'student@amherst.edu',
      hasUnreturnedBike: true,
      lastCheckoutName: bike.bikeName,
      lastCheckoutDate: checkoutTime
    });

    const rawData = {
      formData: {
        timestamp,
        userEmail: user.userEmail,
        bikeName: bike.bikeName,
        confirmBikeName: bike.bikeName,
        assureRodeBike: 'Yes',
        mismatchExplanation: '',
        returningForFriend: 'No',
        friendEmail: '',
        issuesConcerns: ''
      },
      currentState: {
        bikes: [bike],
        users: [user],
        settings: CACHED_SETTINGS.VALUES,
        timestamp
      },
      context: createContext('return')
    };

    const result = returnPipeline(rawData);

    assert(!result.error, 'Return should succeed');
    assert(result.transaction?.type === 'return', 'Transaction type should be return');
    assert(result.bike.availability === 'Available', 'Bike should be made available');
    assert(result.user.hasUnreturnedBike === false, 'User flag should be cleared');
    const expectedHours = (timestamp - checkoutTime) / (1000 * 60 * 60);
    assert(Math.abs(result.usageHours - expectedHours) < 0.01, 'Usage hours should be calculated accurately');
    assert(result.notifications?.[0]?.commID === 'CFM_USR_RET_001', 'Standard return notification should be queued');
  });
}

function testReturnPipelineFriendFlow() {
  withMockedSettings({}, () => {
    const checkoutTime = new Date('2025-01-04T08:00:00Z');
    const timestamp = new Date('2025-01-05T10:30:00Z');
    const bike = createBike({
      bikeName: 'Bike Beta',
      bikeHash: 'HASH789',
      availability: 'Checked Out',
      lastCheckoutDate: checkoutTime,
      mostRecentUser: 'owner@amherst.edu'
    });
    const returningUser = createUser({
      userEmail: 'friend@amherst.edu',
      hasUnreturnedBike: false
    });

    const rawData = {
      formData: {
        timestamp,
        userEmail: returningUser.userEmail,
        bikeName: bike.bikeName,
        confirmBikeName: bike.bikeName,
        assureRodeBike: 'Yes',
        mismatchExplanation: '',
        returningForFriend: 'Yes',
        friendEmail: 'owner@amherst.edu',
        issuesConcerns: ''
      },
      currentState: {
        bikes: [bike],
        users: [returningUser],
        settings: CACHED_SETTINGS.VALUES,
        timestamp
      },
      context: createContext('return')
    };

    const result = returnPipeline(rawData);

    assert(!result.error, 'Friend return should succeed');
    assert(result.isReturningForFriend === true, 'Friend return flag should be true');
    assert(result.notifications?.[0]?.commID === 'CFM_USR_RET_003', 'Friend return notification should be queued');
  });
}

function testReturnPipelineMismatchFlow() {
  withMockedSettings({}, () => {
    const checkoutTime = new Date('2025-01-06T09:00:00Z');
    const timestamp = new Date('2025-01-06T11:00:00Z');
    const bike = createBike({
      bikeName: 'Bike Gamma',
      availability: 'Checked Out',
      lastCheckoutDate: checkoutTime,
      mostRecentUser: 'student@amherst.edu'
    });
    const user = createUser({
      userEmail: 'student@amherst.edu',
      hasUnreturnedBike: true,
      lastCheckoutName: 'Completely Different Bike',
      lastCheckoutDate: checkoutTime
    });

    const rawData = {
      formData: {
        timestamp,
        userEmail: user.userEmail,
        bikeName: bike.bikeName,
        confirmBikeName: bike.bikeName,
        assureRodeBike: 'No',
        mismatchExplanation: 'Had to swap bikes due to issue',
        returningForFriend: 'No',
        friendEmail: '',
        issuesConcerns: ''
      },
      currentState: {
        bikes: [bike],
        users: [user],
        settings: CACHED_SETTINGS.VALUES,
        timestamp
      },
      context: createContext('return')
    };

    const result = returnPipeline(rawData);

    assert(!result.error, 'Mismatch return should still succeed');
    assert(result.isCollectedMismatch === true, 'Mismatch flag should be true');
    assert(result.notifications?.[0]?.commID === 'CFM_USR_RET_004', 'Mismatch notification should be queued');
  });
}
