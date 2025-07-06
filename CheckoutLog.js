// ===============================================================================
// CHECKOUT LOG CLASS
// ===============================================================================
class CheckoutLog {
  constructor() {
    this.timestamp = null;
    this.emailAddress = null;
    this.bikeCode = null;
    this.confirmBikeCode = null;
    this.keyAvailableCheck = null;
    this.conditionConfirmation = null;
    this.db = null;
  }

  static fromFormResponse(responses) {
    const log = new CheckoutLog();
    log.timestamp = responses[0];
    log.emailAddress = responses[1];
    log.bikeCode = responses[2];
    log.confirmBikeCode = responses[3];
    log.keyAvailableCheck = responses[4];
    log.conditionConfirmation = responses[5];
    log.db = new DatabaseManager();
    return log;
  }

  validate() {
    let response = {
      success:true,
      message:[]
    }
    if (this.bikeCode !== this.confirmBikeCode) {
      response.success = false;
      response.message.push('Bike code confirmation does not match');
    }
    if (this.keyAvailableCheck !== 'Yes') {
      response.success = false;
      response.message.push('User did not confirm key availability');
    }
    return response
  }
}
// ===============================================================================