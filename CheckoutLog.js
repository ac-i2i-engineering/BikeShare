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