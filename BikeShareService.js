// =============================================================================
// MAIN SERVICE CLASS
// =============================================================================
class BikeShareService {
  constructor() {
    this.db = new DatabaseManager();
    this.comm = new Communicator();
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
      const usageHours = this.calculateUsageHours(returnLog.bikeName);
      const commContext = {
        ...returnLog,
        usageHours: usageHours,
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
    const report = new Report();
    const reportData = report.generate();
    report.save(reportData);
    return reportData;
  }
  calculateUsageHours(bikeName) {
    const bike = Bike.findByName(bikeName);
    if (!bike || !bike.lastCheckoutDate) return 0;
    
    const now = new Date();
    const checkoutTime = new Date(bike.lastCheckoutDate);
    return Math.round((now - checkoutTime) / (1000 * 60 * 60) * 100) / 100;
  }

  manageFormsAccessibility(){
    // stop accepting responses for return and checkout form
    FormApp.openById(CACHED_SETTINGS.VALUES.FORMS.CHECKOUT_FORM_ID).setAcceptingResponses(CACHED_SETTINGS.VALUES.SYSTEM_ACTIVE)
    FormApp.openById(CACHED_SETTINGS.VALUES.FORMS.RETURN_FORM_ID).setAcceptingResponses(CACHED_SETTINGS.VALUES.SYSTEM_ACTIVE)
  }
}
// =============================================================================