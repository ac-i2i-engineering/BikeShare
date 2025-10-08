const DB = {
  // Get spreadsheet instance
  getSpreadsheet: (id = null) => 
    id ? SpreadsheetApp.openById(id) : SpreadsheetApp.getActiveSpreadsheet(),

  // Get sheet by name
  getSheet: (sheetName, spreadsheetId = null) => 
    DB.getSpreadsheet(spreadsheetId).getSheetByName(sheetName),

  // Get all data from sheet (batch operation)
  getAllData: (sheetName, spreadsheetId = null) => 
    DB.getSheet(sheetName, spreadsheetId).getDataRange().getValues(),

  // Sort sheet using cached settings (API optimized)
  sortByColumn: (sheetName, spreadsheetId = null) => {
    try {
      // Get sheet config from cache - inline the getSheetConfig functionality
      let sheetConfig = null;
      try {
        const sheets = CACHED_SETTINGS?.VALUES?.SHEETS;
        if (sheets) {
          // Find sheet config by name (case-insensitive)
          for (const [key, config] of Object.entries(sheets)) {
            if (config?.NAME === sheetName) {
              sheetConfig = config;
              break;
            }
          }
        }
      } catch (error) {
        Logger.log(`Error getting sheet config for '${sheetName}': ${error.message}`);
      }
      
      if (!sheetConfig || sheetConfig.SORT_COLUMN === undefined) {
        Logger.log(`Skipping sort for '${sheetName}' - no sort config found`);
        return;
      }

      const sheet = DB.getSheet(sheetName, spreadsheetId);
      if (!sheet) {
        throw new Error(`Sheet '${sheetName}' not found`);
      }
      
      // More efficient: use getLastRow() instead of getDataRange() - saves an API call
      const numRows = sheet.getLastRow();
      
      if (numRows <= 1) {
        Logger.log(`Skipping sort for '${sheetName}' - only ${numRows} rows`);
        return;
      }
      
      // Use cached sort settings
      const sortColumn = (sheetConfig.SORT_COLUMN || 0) + 1; // Convert to 1-based
      const ascending = (sheetConfig.SORT_ORDER || 'desc') === 'asc';
      
      // Skip header row and sort data - get column count efficiently
      const numCols = sheet.getLastColumn();
      const dataRange = sheet.getRange(2, 1, numRows - 1, numCols);
      dataRange.sort({ column: sortColumn, ascending: ascending });
      
      Logger.log(`Sorted '${sheetName}' by column ${sortColumn} (${ascending ? 'asc' : 'desc'}) - ${numRows - 1} rows`);
      
    } catch (error) {
      Logger.log(`Error sorting sheet '${sheetName}': ${error.message}`);
      throw error; // Re-throw to let caller handle
    }
  },

  // Mark entry with color and note
  markEntry: (range, bgColor = null, note = null) => {
    if (!range) {
      Logger.log('DB.markEntry: No range provided');
      return;
    }
    if (!bgColor && !note) {
      Logger.log('DB.markEntry: No color or note provided');
      return;
    }
    
    try {
      if (bgColor) range.setBackground(bgColor);
      if (note) range.setNote(note);
      Logger.log(`DB.markEntry: Successfully marked range with color: ${bgColor}, note: ${note}`);
    } catch (error) {
      Logger.log(`DB.markEntry: Error marking range - ${error.message}`);
      throw error;
    }
  },

  // TRUE batch operations using AppScript's batch API - NO EXTRA API CALLS!
  batchUpdate: (operations, spreadsheetId = null) => {
    if (!operations || operations.length === 0) return [];
    
    const results = [];
    
    // Group operations by sheet for true batching
    const operationsBySheet = {};
    operations.forEach(op => {
      if (!operationsBySheet[op.sheetName]) {
        operationsBySheet[op.sheetName] = {
          sheet: null,
          updates: [],
          appends: []
        };
      }
      operationsBySheet[op.sheetName].sheet = DB.getSheet(op.sheetName, spreadsheetId);
      
      if (op.type === 'updateByRowIndex') {
        // Use the row index directly from loaded data - NO API CALL NEEDED!
        operationsBySheet[op.sheetName].updates.push({
          rowIndex: op.rowIndex,
          values: op.values,
          operation: op
        });
      } else if (op.type === 'append') {
        operationsBySheet[op.sheetName].appends.push({
          values: op.values,
          operation: op
        });
      }
    });
    
    // Execute batch operations per sheet
    Object.keys(operationsBySheet).forEach(sheetName => {
      const sheetOps = operationsBySheet[sheetName];
      const sheet = sheetOps.sheet;
      
      try {
        // Batch all updates for this sheet in one API call using known row indices
        if (sheetOps.updates.length > 0) {
          Logger.log(`Batch updating ${sheetOps.updates.length} rows in sheet: ${sheetName}`);
          const numCols = sheetOps.updates[0].values.length;
          
          // Create proper A1 notation ranges to avoid table header issues (e.g., "A2:D2" not "2:2")
          const getColumnLetter = (col) => {
            let result = '';
            while (col > 0) {
              col--;
              result = String.fromCharCode(65 + (col % 26)) + result;
              col = Math.floor(col / 26);
            }
            return result;
          };
          const columnEnd = getColumnLetter(numCols);
          const ranges = sheetOps.updates.map(update => 
            `A${update.rowIndex}:${columnEnd}${update.rowIndex}`
          );
          const values = sheetOps.updates.map(update => update.values);
          
          Logger.log(`Using ranges: ${ranges.join(', ')}`);
          
          // TRUE batch operation - single API call for all updates
          const rangeList = sheet.getRangeList(ranges);
          rangeList.getRanges().forEach((range, index) => {
            range.setValues([values[index]]);
          });
          
          Logger.log(`Successfully batch updated ${sheetOps.updates.length} rows`);
          
          sheetOps.updates.forEach(update => {
            results.push({ success: true, operation: update.operation });
          });
        }
        
        // Batch all appends for this sheet
        if (sheetOps.appends.length > 0) {
          Logger.log(`Batch appending ${sheetOps.appends.length} rows to sheet: ${sheetName}`);
          // For appends, we can use a single range operation if we know the starting row
          const lastRow = sheet.getLastRow();
          const numCols = sheetOps.appends[0].values.length;
          const startRow = lastRow + 1;
          
          Logger.log(`Appending to rows ${startRow} to ${startRow + sheetOps.appends.length - 1}`);
          
          // Single API call for all appends in this sheet
          const appendValues = sheetOps.appends.map(append => append.values);
          const appendRange = sheet.getRange(startRow, 1, appendValues.length, numCols);
          appendRange.setValues(appendValues);
          Logger.log(`Successfully appended ${appendValues.length} rows`);
          
          sheetOps.appends.forEach(append => {
            results.push({ success: true, operation: append.operation });
          });
        }
        
      } catch (error) {
        // If batch fails, fall back to individual operations
        Logger.log(`Batch operation failed for ${sheetName}, falling back to individual operations: ${error.message}`);
        
        // Fallback for updates - inline the updateRow functionality
        sheetOps.updates.forEach(update => {
          try {
            sheet.getRange(update.rowIndex, 1, 1, update.values.length).setValues([update.values]);
            results.push({ success: true, operation: update.operation });
          } catch (err) {
            results.push({ success: false, error: err.message, operation: update.operation });
          }
        });
        
        // Fallback for appends - inline the appendRow functionality
        sheetOps.appends.forEach(append => {
          try {
            sheet.appendRow(append.values);
            results.push({ success: true, operation: append.operation });
          } catch (err) {
            results.push({ success: false, error: err.message, operation: append.operation });
          }
        });
      }
    });
    
    return results;
  },

  // Reset database by clearing specified ranges in all configured sheets(rows are not deleted)
  resetDatabase: () => {
    if (!CACHED_SETTINGS.VALUES.ENABLE_FORCED_RESET || !CACHED_SETTINGS.VALUES.DEBUG_MODE) {
      throw new Error("Auto reset is disabled or debug mode is off.");
    }
    
    for (const key in CACHED_SETTINGS.VALUES.SHEETS) {
      const sheetConfig = CACHED_SETTINGS.VALUES.SHEETS[key];
      const sheet = DB.getSheet(sheetConfig.NAME);
      if (sheet) {
        const range = sheet.getRange(sheetConfig.RESET_RANGE);
        range.clearContent();
        range.setBackground(null);
        range.setNote('');  
      }
    }
  },

  // Reset database by clearing specified ranges in all configured sheets
  hardResetDatabase: () => {
    if (!CACHED_SETTINGS.VALUES.ENABLE_FORCED_RESET || !CACHED_SETTINGS.VALUES.DEBUG_MODE) {
      throw new Error("Auto reset is disabled or debug mode is off.");
    }
    for (const key in CACHED_SETTINGS.VALUES.SHEETS) {
      if(key == 'BIKES_STATUS') continue;
      const sheetConfig = CACHED_SETTINGS.VALUES.SHEETS[key];
      const sheet = DB.getSheet(sheetConfig.NAME);
      if (sheet) {
        const lastRow = sheet.getLastRow()
        const startRow = 2
        const numRows = lastRow-1
        if(numRows < 1){
          Logger.log(`couldn't Reset ${key} : it's already empty`)
          continue;
        }
        try{
          sheet.deleteRows(startRow,numRows) 
          Logger.log(`successfully deleted rows ${startRow}-${numRows} in ${key}`)
        }catch(error){
          Logger.log(`Error deleting rows ${startRow}-${numRows} in ${key}: ${error.message}`)
        }
      }
    }
  }
};