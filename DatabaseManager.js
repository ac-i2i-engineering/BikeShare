// =============================================================================
// BASE DATABASE CLASS
// =============================================================================
class DatabaseManager {
  constructor(spreadsheetId = null) {
    this.spreadsheet = spreadsheetId ? 
      SpreadsheetApp.openById(spreadsheetId) : 
      SpreadsheetApp.getActiveSpreadsheet();
  }

  getSheet(sheetName) {
    return this.spreadsheet.getSheetByName(sheetName);
  }

  getAllData(sheetName) {
    const sheet = this.getSheet(sheetName);
    return sheet.getDataRange().getValues();
  }

  findRowByColumn(sheetName, columnIndex, value) {
    const data = this.getAllData(sheetName);
    for (let i = 1; i < data.length; i++) {
      if (data[i][columnIndex] === value) {
        return { row: i + 1, data: data[i] };
      }
    }
    return null;
  }

  updateRow(sheetName, rowIndex, values) {
    const sheet = this.getSheet(sheetName);
    sheet.getRange(rowIndex, 1, 1, values.length).setValues([values]);
  }

  appendRow(sheetName, values) {
    const sheet = this.getSheet(sheetName);
    sheet.appendRow(values);
    this.orderByColumn(sheet, sheetName);
  }

  // orders the sheet by a specific column
  orderByColumn(sheet=null,sheetName=null) {
    if (!sheet && !sheetName) {
      throw new Error("Either 'sheet' or 'sheetName' must be provided.");
    }

    if (!sheet) {
      sheet = this.getSheet(sheetName);
    }

    if (!sheet) {
      throw new Error(`Sheet with name ${sheetName} not found.`);
    }

    if(!sheetName){
      sheetName = sheet.getSheetName();
    }

    // Find the correct CONFIG key for this sheet name
    const sheetConfig = this.getSheetConfig(sheetName);
    if (!sheetConfig) {
      console.log(`No sort configuration found for sheet: ${sheetName}`);
      return; // Skip sorting if no config found
    }

    const columnIndex = sheetConfig.SORT_COLUMN;
    const asc = sheetConfig.SORT_ORDER;
    const lastRow = sheet.getLastRow();
    const lastColumn = sheet.getLastColumn();
    
    // Only sort if there's more than just the header row
    if (lastRow <= 1) {
      return;
    }
    
    // Define range excluding the header row (assumes header is in row 1)
    const range = sheet.getRange(2, 1, lastRow - 1, lastColumn);
    // Sort by desired column in false = (Z → A) or true = (A-Z)
    range.sort({ column: columnIndex+1, ascending: (asc === 'asc' || asc === true) }) //use columnIndex + 1 because sort method is 1-based index
  }

  // Helper method to find the correct config for a sheet name
  getSheetConfig(sheetName) {
    for (const key in CONFIG.SHEETS) {
      if (CONFIG.SHEETS[key].NAME === sheetName) {
        return CONFIG.SHEETS[key];
      }
    }
    return null;
  }
}
// =============================================================================