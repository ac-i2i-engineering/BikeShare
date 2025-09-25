// =============================================================================
// FUNCTIONAL DATABASE OPERATIONS
// Pure functions for Google Sheets operations with batch optimization
// =============================================================================

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

  // Batch operations for multiple updates
  batchUpdate: (operations, spreadsheetId = null) => {
    const results = [];
    operations.forEach(op => {
      try {
        switch (op.type) {
          case 'update':
            results.push(DB.updateRow(op.sheetName, op.rowIndex, op.values, spreadsheetId));
            break;
          case 'append':
            results.push(DB.appendRow(op.sheetName, op.values, spreadsheetId));
            break;
          case 'updateByValue':
            results.push(DB.updateRowByUniqueValue(
              op.sheetName, op.searchColumn, op.searchValue, op.values, spreadsheetId
            ));
            break;
        }
      } catch (error) {
        results.push({ error: error.message, operation: op });
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