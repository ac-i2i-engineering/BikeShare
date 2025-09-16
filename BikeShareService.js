// =============================================================================
// MAIN SERVICE CLASS
// =============================================================================
class BikeShareService {
  constructor(spreadsheetID) {
    this.db = new DatabaseManager(spreadsheetID);
    this.comm = new Communicator(spreadsheetID);
  }

  processCheckout(formResponse, range) {
    try {
      const checkoutLog = CheckoutLog.fromFormResponse(formResponse);
      const user = User.findByEmail(checkoutLog.userEmail);
      const commContext = {
        ...checkoutLog,
        range: range
      };
      if (CACHED_SETTINGS.VALUES.SYSTEM_ACTIVE) {
        user.checkoutBike(commContext);
      } else {
        //system out of service
        user.comm.handleCommunication('ERR_OPR_COR_001', commContext);
      }
    } catch (error) {
      Logger.log(`Error processing checkout: ${error.message}`);
    }
  }

  processReturn(formResponse, range) {
    try {
      const returnLog = ReturnLog.fromFormResponse(formResponse);
      returnLog.validate(range);
      const user = User.findByEmail(returnLog.userEmail);
      user.checkIfReturningForFriend(returnLog);
      const commContext = {
        ...returnLog,
        range: range
      };
      if (CACHED_SETTINGS.VALUES.SYSTEM_ACTIVE) {
        user.returnBike(commContext);
      } else {
        // we are currently offline
        user.comm.handleCommunication('ERR_OPR_COR_001', commContext);
      }
    } catch (error) {
      Logger.log(`Error processing return: ${error.message}`);
    }
  }

  generatePeriodicReport() {
    if(!CACHED_SETTINGS.VALUES.REPORT_GENERATION.ENABLE_REPORT_GENERATION){
      return // disable report generation
    }
    const report = new Report();
    const reportData = report.generate();
    report.save(reportData);
    return reportData;
  }

  manageFormsAccessibility(action){
    // stop accepting responses for return and checkout form
    const state = action === "resume" ? activateSystem() : shutdownSystem();
  }

  updateUsageTimersForAllCheckedoutBikes(){
    const bikesData = this.db.getAllData(CACHED_SETTINGS.VALUES.SHEETS.BIKES_STATUS.NAME);
    const bikes = bikesData.filter(row => row[3] === 'Checked Out');
    const checkedOutBikes = bikes.map(row => Bike.fromSheetRow(row));
    checkedOutBikes.forEach(bike => {
      const usageDays = bike.getUsageHours()  / 24; // returns in days to be able to work with spreadsheet formatting (e.g: [h]" hrs" m" mins")
      bike.updateCurrentUsageTimer(usageDays);
    });
  }
}
// =============================================================================