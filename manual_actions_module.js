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
  const AVAILABILITY_COL = 4;

  // Only process if the edited column is maintenanceStatus
  if (col !== MAINTENANCE_STATUS_COL && col !== AVAILABILITY_COL) {
    Logger.log(
      `Skipping: Changed column ${col} is not maintenance: ${MAINTENANCE_STATUS_COL} or availability: ${AVAILABILITY_COL} status column`
    );
    return;
  }

  // Skip header row (assuming row 1 is header)
  if (row <= 1) {
    Logger.log("Skipping: Header row edit");
    return;
  }

  const oldValue = convertSheetValue(e.oldValue, 'string');
  const newValue = convertSheetValue(e.value, 'string');

  Logger.log(`Row ${row}, Col ${col}: "${oldValue}" → "${newValue}"`);

  // Descriptive conditions
  const isMaintenanceChange = col === MAINTENANCE_STATUS_COL;
  const isAvailabilityChange = col === AVAILABILITY_COL;
  const isBikeNowUnserviceable = newValue === "has issue" || newValue === "in repair";
  const wasMarkedWithIssue = oldValue === "has issue";
  const isManualReturn = oldValue === "checked out" && newValue === "available";

  let actionTaken = false;

  // Auto-set availability to "out of service" when maintenance status indicates bike is unserviceable
  if (isMaintenanceChange && isBikeNowUnserviceable) {
    const availabilityRange = sheet.getRange(row, AVAILABILITY_COL);
    const currentAvailability = availabilityRange.getValue();
    if (currentAvailability === "available") {
      availabilityRange.setValue("out of service");
      Logger.log(`✅ Availability set to "out of service" for row ${row} (maintenance: ${newValue})`);
      actionTaken = true;
    } else {
      Logger.log(`⚠️ Availability not changed (currently "${currentAvailability}") - bike may need manual handling after return`);
    }
  }

  // Clear issue note when maintenance status changes from "has issue"
  if (wasMarkedWithIssue) {
    Logger.log(`Clearing note from row ${row}, column ${col} (was "has issue")`);
    range.clearNote();
    Logger.log("✅ Note cleared successfully");
    actionTaken = true;
  } 
  // Handle manual return: admin changes availability from "checked out" to "available"
  else if (isAvailabilityChange && isManualReturn) {
    updateUserStatusFromManualAction(row);
    actionTaken = true;
  }
  
  if (!actionTaken) {
    Logger.log('No action needed for this edit');
  }
}
// TODO: Write the logic to update bike status.
function updateUserStatusFromManualAction(row){

  const rawBikesData = loadAllBikesData()
  const bikes = processBikesData(rawBikesData)
  const bike = bikes.find(bike => bike._rowIndex == row) // subtract 2 since header is skipped and rows are 1 based.

  if (!bike) {
    throw new Error(`Auto update user status on manual bike availability change failed: Bike not found for row ${row}.`);
  }

  let bikeName = bike.bikeName
  let recentUserEmail = bike.mostRecentUser

  // find the user with this email in user status 
  const rawUsersData = loadAllUsersData()
  const usersData = processUsersData(rawUsersData)
  const recentUser = usersData.find(user => user.userEmail === recentUserEmail)

  if(!recentUser){
    throw new Error(`Auto update user status on manual bike availability change failed: user with '${recentUserEmail}' email not found in records`)
  }

  if(recentUser.lastCheckoutName !== bikeName){
    throw new Error(`Auto update user status on manual bike availability change failed:: ${recentUserEmail} last checkout is "${recentUser.lastCheckoutName}" not "${bikeName}"`)
  }

  //update user status
  let lastReturnDate = new Date()
  let numberOfReturns = recentUser.numberOfReturns + 1
  let elapsedUsageTime = (lastReturnDate - recentUser.lastCheckoutDate) / (1000 * 60 * 60)
  let usageHours = recentUser.usageHours + elapsedUsageTime
  //TODO: add overdue return logic

  const updatedUserStatus = {
    ...recentUser,
    hasUnreturnedBike: "No",
    lastReturnDate: lastReturnDate,
    numberOfReturns: numberOfReturns,
    usageHours: usageHours
  };

  // Save updated user status back to sheet
  try {
    DB.updateRow(
      CACHED_SETTINGS.VALUES.SHEETS.USER_STATUS.NAME,
      recentUser._rowIndex,
      Object.values(updatedUserStatus).slice(0, -1) // remove _rowIndex property
    );


  } catch (error) {
    Logger.log(`❌ Failed to update user status for ${recentUser.userEmail} on Manual bike return: ${error.message}`);
    throw error;
  }

  // update bike status
  const updatedBikeStatus = {
    ...bike,
    lastReturnDate: lastReturnDate,
    totalUsageHours: bike. totalUsageHours + elapsedUsageTime,
    currentUsageTimer: 0,
    // Optionally update other fields if needed
  };

  try {
    DB.updateRow(
      CACHED_SETTINGS.VALUES.SHEETS.BIKES_STATUS.NAME,
      bike._rowIndex,
      Object.values(updatedBikeStatus).slice(0, -1) // remove _rowIndex property
    );
    Logger.log(`✅ Bike status updated for ${bike.bikeName} after manual availability change.`);
  } catch (error) {
    Logger.log(`❌ Failed to update bike status for ${bike.bikeName} on Manual availability change: ${error.message}`);
    throw error;
  }

  Logger.log(`✅ User status updated for ${recentUser.userEmail} after manual bike availability change.`);
}