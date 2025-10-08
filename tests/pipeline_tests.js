// =============================================================================
// GOOGLE APPS SCRIPT PIPELINE TEST HARNESS (orchestrator only)
// =============================================================================
// Delegates to dedicated suites:
//   - tests/unit_tests.js          → runUnitTests()
//   - tests/integration_tests.js   → runIntegrationTests() + scenario helpers
//   - tests/test_helpers.js        → shared utilities (cleanup, assertions, etc.)
// =============================================================================

function runAllTests() {
  Logger.log('🧪 Running Pipeline Test Harness...');
  Logger.log('⚠️  WARNING: Integration tests will append data to live sheets');

  ensureTestSettingsLoaded();

  try {
    Logger.log('🧬 Executing unit tests (pure logic)...');
    runUnitTests();

    Logger.log('🧹 Cleaning database before integration tests...');
    cleanDatabaseForTests();

    Logger.log('🔄 Running integration scenarios...');
    runIntegrationTests();

    Logger.log('🧹 Cleaning database after integration tests...');
    cleanDatabaseForTests();

    Logger.log('✅ Pipeline test harness completed successfully');
  } catch (error) {
    Logger.log(`❌ Pipeline test harness failed: ${error.message}`);
    try {
      Logger.log('🧹 Performing emergency cleanup...');
      cleanDatabaseForTests();
    } catch (cleanupError) {
      Logger.log(`❌ Emergency cleanup failed: ${cleanupError.message}`);
    }
    throw error;
  }
}

// -----------------------------------------------------------------------------
// Targeted entry points for quick validation / diagnostics
// -----------------------------------------------------------------------------

function quickCheckoutTest() {
  Logger.log('🚀 Quick Checkout Test');
  ensureTestSettingsLoaded();
  runUnitTests();
  testCheckoutProcess();
}

function quickReturnTest() {
  Logger.log('🚀 Quick Return Test');
  ensureTestSettingsLoaded();
  runUnitTests();
  testReturnProcess();
}

function quickErrorTests() {
  Logger.log('🚀 Quick Error Handling Test');
  ensureTestSettingsLoaded();
  testErrorHandling();
}

// Convenience exports left in place for GAS toolbar execution
const TESTS = {
  runAllTests,
  quickCheckoutTest,
  quickReturnTest,
  quickErrorTests,
  cleanupTestData,
  quickDatabaseCleanup,
  resetBikesOnly
};