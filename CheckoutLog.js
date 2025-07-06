
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

  static fromFormResponse(e) {
    const sheet = e.source.getActiveSheet();
    const range = e.range;
    //  Get the last row with data in the edited sheet
    const lastRowId = sheet.getLastRow();

    const responses = sheet.getRange(lastRowId, 1, 1, sheet.getLastColumn()).getValues()[0];
    return new CheckoutLog({
      timestamp: responses[0],
      emailAddress: responses[1],
      bikeCode: responses[2],
      confirmBikeCode: responses[3],
      keyAvailableCheck: responses[4],
      conditionConfirmation: responses[5]
    });
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