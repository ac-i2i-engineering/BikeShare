// ===============================================================================
// CHECKOUT LOG CLASS
// Deserializes form responses into a structured log object
// ===============================================================================
class CheckoutLog {
  constructor() {
    this.timestamp = null;
    this.emailAddress = null;
    this.bikeHash = null;
    this.keyAvailableCheck = null;
    this.conditionConfirmation = null;
    this.db = null;
  }

  static fromFormResponse(responses) {
    const log = new CheckoutLog();
    log.timestamp = responses[0];
    log.emailAddress = responses[1];
    log.bikeHash = responses[2];
    log.keyAvailableCheck = responses[3];
    log.conditionConfirmation = responses[4];
    log.db = new DatabaseManager();
    //sort the checkout logs
    log.db.orderByColumn(null, CONFIG.SHEETS.CHECKOUT_LOGS.NAME);
    return log;
  }

  validate() {
    let response = {
      success:true,
      message:[]
    }
    if (this.keyAvailableCheck !== 'Yes') {
      response.success = false;
      response.message.push('User did not confirm key availability');
    }
    return response
  }
}
// ===============================================================================