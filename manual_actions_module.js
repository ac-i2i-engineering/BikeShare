function processManualDashboardActions(e) {
  Logger.log("📝 Manual dashboard change detected");

  // Only process if the change is in the Bikes Status sheet
  const sheet = e.source.getActiveSheet();
  const sheetName = sheet.getName();

  if (sheetName !== CACHED_SETTINGS.VALUES.SHEETS.BIKES_STATUS.NAME) {
    Logger.log(
      `Skipping: Change not in Bikes Status sheet (was in ${sheetName})`
    );
    return;
  }

  const range = e.range;
  const row = range.getRow();
  const col = range.getColumn();

  // Column 3 is maintenanceStatus (1-based indexing in Google Sheets)
  const MAINTENANCE_STATUS_COL = 3;

  // Only process if the edited column is maintenanceStatus
  if (col !== MAINTENANCE_STATUS_COL) {
    Logger.log(
      `Skipping: Changed column ${col} is not maintenance status column (${MAINTENANCE_STATUS_COL})`
    );
    return;
  }

  // Skip header row (assuming row 1 is header)
  if (row <= 1) {
    Logger.log("Skipping: Header row edit");
    return;
  }

  const oldValue = e.oldValue || "";
  const newValue = e.value || "";

  Logger.log(`Row ${row}, Col ${col}: "${oldValue}" → "${newValue}"`);

  // If the old value was "has issue", clear the note
  if (oldValue.toLowerCase().trim() === "has issue") {
    Logger.log(
      `Clearing note from row ${row}, column ${col} (was "has issue")`
    );
    range.clearNote();
    Logger.log("✅ Note cleared successfully");
  } else {
    Logger.log('No action needed: previous value was not "has issue"');
  }
}
