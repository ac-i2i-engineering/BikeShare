// ===============================================================================
// CHECKOUT LOG CLASS
// ===============================================================================
class CheckoutLog {
  constructor(e) {
    const sheet = e.source.getActiveSheet();
    //  Get the last row with data in the edited sheet
    const lastRowId = sheet.getLastRow();

    const responses = sheet.getRange(lastRowId, 1, 1, sheet.getLastColumn()).getValues()[0];
    
    this.timestamp = responses[0];
    this.emailAddress = responses[1];
    this.bikeCode = responses[2];
    this.confirmBikeCode = responses[3];
    this.keyAvailableCheck = responses[4];
    this.conditionConfirmation = responses[5];
    this.db = new DatabaseManager();
  }

  validate() {
    let status = true;
    let message = [];
    if (this.bikeCode !== this.confirmBikeCode) {
      status = false;
      message.push('Bike code confirmation does not match');
    }
    if (this.keyAvailableCheck !== 'Yes') {
      status = false;
      message.push('User did not confirm key availability');
    }
    return { status: status, message: message };
  }
}
// ===============================================================================