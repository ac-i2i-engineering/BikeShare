# BikeShare System Tests

This folder contains test files for the BikeShare system components.

## Test Files

### `cache_tests.js`
Tests for the CACHED_SETTINGS cache system including:
- Cache persistence across script executions
- Cache validation and error handling
- ScriptCache vs DocumentCache verification
- Force refresh and cache clearing functionality

### `pipeline_tests.js`
Tests for the form processing pipelines including:
- Checkout process validation
- Return process validation
- Error handling scenarios
- Data processing functions

### `test_runner.js`
Centralized test runner and diagnostic utilities

## How to Run Tests

### Run All System Tests
```javascript
runAllSystemTests()
```
Runs all available test suites and provides comprehensive results.

### Run Specific Test Suites

**Cache Tests:**
```javascript
runCacheTests()
```

**Pipeline Tests:**
```javascript
runAllTests() // from pipeline_tests.js
```

### Quick Tests

**Quick Cache Check:**
```javascript
quickCacheTest()
```

**Test Cache Persistence (standalone):**
```javascript
testCachePersistenceStandalone()
```
*Run this multiple times in separate script executions to test persistence*

**Test Specific Component:**
```javascript
testComponent('cache')
testComponent('persistence')
```

### Diagnostics

**System Diagnostics:**
```javascript
runDiagnostics()
```
Runs basic system health checks.

## Test Results Format

Tests return structured results with:
- `testSuite`: Name of the test suite
- `tests[]`: Array of individual test results
- `summary`: Pass/fail counts
- `startTime`/`endTime`: Execution timestamps

Example test result:
```javascript
{
  testSuite: 'Cache System Tests',
  tests: [
    {
      name: 'Cache Persistence',
      description: 'Tests ScriptCache persistence',
      passed: true,
      errors: [],
      details: { ... }
    }
  ],
  summary: { passed: 1, failed: 0, total: 1 }
}
```

## Cache Testing Notes

### ScriptCache Persistence
- **ScriptCache** persists across script executions for up to 6 hours
- **DocumentCache** only persists within the same execution
- The system now uses ScriptCache for better persistence

### Testing Cache Persistence
1. Run `testCachePersistenceStandalone()` once
2. Wait a moment or run other code
3. Run `testCachePersistenceStandalone()` again
4. Second run should show "ScriptCache retrieval result: found"

## Common Issues

### Cache Always Shows "not found"
- Check if using DocumentCache instead of ScriptCache
- Verify cache expiration settings
- Run `runDiagnostics()` to check system health

### Tests Failing
- Ensure CACHED_SETTINGS is properly initialized
- Check spreadsheet access permissions
- Verify management spreadsheet ID is correct

## Adding New Tests

1. Create test functions that return structured results
2. Add them to appropriate test suite in `cache_tests.js` or `pipeline_tests.js`
3. Update `test_runner.js` to include new test suites
4. Document the new tests in this README