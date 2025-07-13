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
      if (fuzzyMatch(data[i][columnIndex], value)) {
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
  }

  markEntry(range, bgColor=null, note= null) {
    if (!bgColor && !note) throw new Error("bgColor or note is required");
    if(bgColor) range.setBackground(bgColor);
    if (note) range.setNote(note);
  }

  // orders the sheet by a specific column
  sortByColumn(sheet=null,sheetName=null) {
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
      throw new Error(`No sort configuration found for sheet: ${sheetName}`);
    }

    const columnIndex = sheetConfig.SORT_COLUMN;
    const asc = sheetConfig.SORT_ORDER;
    const lastRow = sheet.getLastRow();
    const lastColumn = sheet.getLastColumn();
    
    // Only sort if there's more than just the header row
    if (lastRow <= 1) {
      return;
    }
    
    // Exclude header
    const range = sheet.getRange(2, 1, lastRow - 1, lastColumn);
    // order by false = (Z → A) or true = (A-Z)
    //use 0-based index for columnIndex
    range.sort({ column: columnIndex+1, ascending: (asc === 'asc' || asc === true) }) 
  }

  getSheetConfig(sheetName) {
    for (const key in CONFIG.SHEETS) {
      if (CONFIG.SHEETS[key].NAME === sheetName) {
        return CONFIG.SHEETS[key];
      }
    }
    return null;
  }

  resetDatabase() {
    if (!CONFIG.AUTO_RESET_ENABLED || !CONFIG.DEBUG_MODE) {
      throw new Error("Auto reset is disabled or debug mode is off.");
    }
    for (const key in CONFIG.SHEETS) {
      const sheetConfig = CONFIG.SHEETS[key];
      const sheet = this.getSheet(sheetConfig.NAME);
      if (sheet) {
        const range = sheet.getRange(sheetConfig.RESET_RANGE);
        range.clearContent();
        range.setBackground(null);
        range.setNote('');  
      }
    }
  }
}
// =============================================================================