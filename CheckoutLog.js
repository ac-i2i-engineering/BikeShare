
// ===============================================================================
// CHECKOUT LOG CLASS
// ===============================================================================
class CheckoutLog {
  constructor(data) {
    this.timestamp = data.timestamp || new Date();
    this.emailAddress = data.emailAddress;
    this.bikeCode = data.bikeCode;
    this.confirmBikeCode = data.confirmBikeCode;
    this.keyAvailableCheck = data.keyAvailableCheck;
    this.conditionConfirmation = data.conditionConfirmation;
    this.db = new DatabaseManager();
  }

  static fromFormResponse(event) {
    const sheet = event.source.getActiveSheet();
    const responses = event.getItemResponses();
    console.log('Form responses:', responses);
    return new CheckoutLog({
      timestamp: event.getTimestamp(),
      emailAddress: responses[0].getResponse(),
      bikeCode: responses[1].getResponse(),
      confirmBikeCode: responses[2].getResponse(),
      keyAvailableCheck: responses[3].getResponse(),
      conditionConfirmation: responses[4].getResponse()
    });
  }

  save() {
    const values = [
      this.timestamp,
      this.emailAddress,
      this.bikeCode,
      this.confirmBikeCode,
      this.keyAvailableCheck,
      this.conditionConfirmation
    ];
    this.db.appendRow(CONFIG.SHEETS.CHECKOUT_LOGS, values);
  }

  validate() {
    if (this.bikeCode !== this.confirmBikeCode) {
      throw new Error('Bike code confirmation does not match');
    }
    if (this.keyAvailableCheck !== 'Yes') {
      throw new Error('User did not confirm key availability');
    }
    if (this.conditionConfirmation !== 'Yes') {
      throw new Error('User did not confirm bike condition');
    }
  }
}
// ===============================================================================