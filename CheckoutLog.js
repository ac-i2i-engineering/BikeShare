// ===============================================================================
// CHECKOUT LOG CLASS
// Deserializes form responses into a structured log object
// ===============================================================================
class CheckoutLog {
  constructor() {
    this.timestamp = null;
    this.userEmail = null;
    this.bikeHash = null;
    this.conditionConfirmation = null;
    this.db = null;
  }

  static fromFormResponse(responses) {
    const log = new CheckoutLog();
    log.timestamp = responses[0];
    log.userEmail = responses[1];
    log.bikeHash = responses[2];
    log.conditionConfirmation = responses[3];
    log.db = new DatabaseManager();
    return log;
  }
}
// ===============================================================================