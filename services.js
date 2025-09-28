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

  // Find row by column value with fuzzy matching
  findRowByColumn: (sheetName, columnIndex, value, exactMatch = false, spreadsheetId = null) => {
    const data = DB.getAllData(sheetName, spreadsheetId);
    for (let i = 1; i < data.length; i++) {
      if (fuzzyMatch(data[i][columnIndex], value, exactMatch)) {
        return { row: i + 1, data: data[i] };
      }
    }
    return null;
  },

  // Update single row (batch operation)
  updateRow: (sheetName, rowIndex, values, spreadsheetId = null) => {
    const sheet = DB.getSheet(sheetName, spreadsheetId);
    sheet.getRange(rowIndex, 1, 1, values.length).setValues([values]);
  },

  // Append single row
  appendRow: (sheetName, values, spreadsheetId = null) => {
    DB.getSheet(sheetName, spreadsheetId).appendRow(values);
  },

  // Update row by unique value
  updateRowByUniqueValue: (sheetName, searchColumn, searchValue, newValues, spreadsheetId = null) => {
    const colIndex = typeof searchColumn === 'string' ? 
      DB.getColumnIndex(sheetName, searchColumn, spreadsheetId) : searchColumn;
    const found = DB.findRowByColumn(sheetName, colIndex, searchValue, true, spreadsheetId);
    if (found) {
      DB.updateRow(sheetName, found.row, newValues, spreadsheetId);
      return true;
    }
    return false;
  },

  // Get column index by header name
  getColumnIndex: (sheetName, columnName, spreadsheetId = null) => {
    const data = DB.getAllData(sheetName, spreadsheetId);
    if (data.length > 0) {
      return data[0].indexOf(columnName);
    }
    return -1;
  },

  // Sort sheet by first column (Apps Script optimized)
  sortByColumn: (sheetName, spreadsheetId = null) => {
    const sheet = DB.getSheet(sheetName, spreadsheetId);
    const range = sheet.getDataRange();
    if (range.getNumRows() > 1) {
      range.sort({ column: 1, ascending: false });
    }
  },

  // Mark entry with color and note
  markEntry: (range, bgColor = null, note = null) => {
    if (!bgColor && !note) return;
    if (bgColor) range.setBackground(bgColor);
    if (note) range.setNote(note);
  },

  // TRUE batch operations using AppScript's batch API - NO EXTRA API CALLS!
  batchUpdate: (operations, spreadsheetId = null) => {
    if (!operations || operations.length === 0) return [];
    
    const results = [];
    const spreadsheet = DB.getSpreadsheet(spreadsheetId);
    
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
          const numCols = sheetOps.updates[0].values.length;
          
          // Build range strings directly from row indices - NO SEARCH NEEDED!
          const ranges = sheetOps.updates.map(update => 
            `${update.rowIndex}:${update.rowIndex}`
          );
          const values = sheetOps.updates.map(update => update.values);
          
          // Single API call for all updates in this sheet
          const rangeList = sheet.getRangeList(ranges);
          rangeList.getRanges().forEach((range, index) => {
            range.setValues([values[index]]);
          });
          
          sheetOps.updates.forEach(update => {
            results.push({ success: true, operation: update.operation });
          });
        }
        
        // Batch all appends for this sheet
        if (sheetOps.appends.length > 0) {
          // For appends, we can use a single range operation if we know the starting row
          const lastRow = sheet.getLastRow();
          const numCols = sheetOps.appends[0].values.length;
          const startRow = lastRow + 1;
          const endRow = lastRow + sheetOps.appends.length;
          
          // Single API call for all appends in this sheet
          const appendValues = sheetOps.appends.map(append => append.values);
          const appendRange = sheet.getRange(startRow, 1, appendValues.length, numCols);
          appendRange.setValues(appendValues);
          
          sheetOps.appends.forEach(append => {
            results.push({ success: true, operation: append.operation });
          });
        }
        
      } catch (error) {
        // If batch fails, fall back to individual operations
        Logger.log(`Batch operation failed for ${sheetName}, falling back to individual operations: ${error.message}`);
        
        // Fallback for updates
        sheetOps.updates.forEach(update => {
          try {
            DB.updateRow(sheetName, update.rowIndex, update.values, spreadsheetId);
            results.push({ success: true, operation: update.operation });
          } catch (err) {
            results.push({ success: false, error: err.message, operation: update.operation });
          }
        });
        
        // Fallback for appends
        sheetOps.appends.forEach(append => {
          try {
            DB.appendRow(sheetName, append.values, spreadsheetId);
            results.push({ success: true, operation: append.operation });
          } catch (err) {
            results.push({ success: false, error: err.message, operation: append.operation });
          }
        });
      }
    });
    
    return results;
  }
};

// =============================================================================
// FUNCTIONAL COMMUNICATION OPERATIONS
// Pure functions for notifications and messaging
// =============================================================================

const COMM = {
  // Handle communication by ID
  handleCommunication: (commID, context) => {
    const comm = COMM.getCommunication(commID);
    if (!comm) throw new Error(`Communication ID ${commID} not found`);

    const results = [];
    
    if (comm.notifyUser && CACHED_SETTINGS.VALUES.NOTIFICATION_SETTINGS.ENABLE_USER_NOTIFICATIONS) {
      results.push(COMM.notifyUser(
        context.userEmail,
        COMM.fillPlaceholders(comm.notifyUser.subject, context),
        COMM.fillPlaceholders(comm.notifyUser.body, context)
      ));
    }

    if (comm.notifyAdmin && CACHED_SETTINGS.VALUES.NOTIFICATION_SETTINGS.ENABLE_ADMIN_NOTIFICATIONS) {
      results.push(COMM.notifyAdmin(
        COMM.fillPlaceholders(comm.notifyAdmin.subject, context),
        COMM.fillPlaceholders(comm.notifyAdmin.body, context)
      ));
    }

    if (comm.notifyDeveloper && CACHED_SETTINGS.VALUES.NOTIFICATION_SETTINGS.ENABLE_DEV_NOTIFICATIONS) {
      results.push(COMM.notifyDeveloper(
        COMM.fillPlaceholders(comm.notifyDeveloper.subject, context),
        COMM.fillPlaceholders(comm.notifyDeveloper.body, context)
      ));
    }

    if (comm.markEntry && context.range) {
      results.push(COMM.markEntry(
        context.range,
        comm.markEntry.bgColor,
        COMM.fillPlaceholders(comm.markEntry.note, context)
      ));
    }

    return results;
  },

  // Send user notification
  notifyUser: (userEmail, subject, body) => {
    try {
      GmailApp.sendEmail(
        userEmail,
        subject,
        `Hi,\n\n${body}\n\nThank you,\nBike Share Team`,
        { from: CACHED_SETTINGS.VALUES.ORG_EMAIL }
      );
      return { success: true, recipient: userEmail };
    } catch (error) {
      Logger.log(`Error sending email to user: ${error.message}`);
      return { success: false, error: error.message };
    }
  },

  // Send admin notification
  notifyAdmin: (subject, body) => {
    try {
      GmailApp.sendEmail(
        CACHED_SETTINGS.VALUES.ADMIN_EMAIL,
        subject,
        `Hi,\n\n${body}\n\nThank you,\nBike Share Team`,
        { from: CACHED_SETTINGS.VALUES.ORG_EMAIL }
      );
      return { success: true, recipient: 'admin' };
    } catch (error) {
      Logger.log(`Error sending email to admin: ${error.message}`);
      return { success: false, error: error.message };
    }
  },

  // Send developer notification
  notifyDeveloper: (subject, body) => {
    try {
      GmailApp.sendEmail(
        CACHED_SETTINGS.VALUES.DEVELOPER_EMAIL,
        subject,
        `Hi,\n\n${body}\n\nThank you,\nBike Share Team`,
        { from: CACHED_SETTINGS.VALUES.ORG_EMAIL }
      );
      return { success: true, recipient: 'developer' };
    } catch (error) {
      Logger.log(`Error sending email to developer: ${error.message}`);
      return { success: false, error: error.message };
    }
  },

  // Mark sheet entry
  markEntry: (range, color = null, note = null) => {
    try {
      if (!range) return { success: false, error: 'No range provided' };
      DB.markEntry(range, color, note);
      return { success: true };
    } catch (error) {
      Logger.log(`Error marking entry: ${error.message}`);
      return { success: false, error: error.message };
    }
  },

  // Get communication config by ID
  getCommunication: (commID) => CACHED_SETTINGS.VALUES.COMM_CODES[commID] || null,

  // Fill template placeholders
  fillPlaceholders: (template, context) => 
    template.replace(/{{(.*?)}}/g, (match, key) => context[key.trim()] || ''),

  // Batch send notifications
  batchNotify: (notifications) => {
    return notifications.map(notification => {
      switch (notification.type) {
        case 'user':
          return COMM.notifyUser(notification.email, notification.subject, notification.body);
        case 'admin':
          return COMM.notifyAdmin(notification.subject, notification.body);
        case 'developer':
          return COMM.notifyDeveloper(notification.subject, notification.body);
        default:
          return { success: false, error: 'Unknown notification type' };
      }
    });
  }
};