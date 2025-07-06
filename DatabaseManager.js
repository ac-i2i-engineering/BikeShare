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
  }
}
// =============================================================================