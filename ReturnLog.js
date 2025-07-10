//==================================================================================
// RETURN LOG CLASS
//==================================================================================
class ReturnLog {
  constructor() {
    this.timestamp = null;
    this.emailAddress = null;
    this.bikeName = null;
    this.confirmBikeName = null;
    this.assureRodeBike = null;
    this.mismatchExplanation = null;
    this.returningForFriend = null;
    this.friendEmail = null;
    this.issuesConcerns = null;
    this.db = new DatabaseManager();
  }

  static fromFormResponse(responses) {
    const log = new ReturnLog();
    log.timestamp = responses[0];
    log.emailAddress = responses[1];
    log.bikeName = responses[2];
    log.confirmBikeName = responses[3];
    log.assureRodeBike = responses[4];
    log.mismatchExplanation = responses[5];
    log.returningForFriend = responses[6];
    log.friendEmail = responses[7];
    log.issuesConcerns = responses[8];
    //sort the return logs
    log.db.orderByColumn(null, CONFIG.SHEETS.RETURN_LOGS.NAME);
    return log;
  }

  validate() {
    let response = {
      success:true,
      message:[]
    }
    if (this.bikeName !== this.confirmBikeName) {
      response.success = false;
      response.message.push('Bike code confirmation does not match');
    }
    if (this.assureRodeBike !== 'Yes') {
      response.success = false;
      response.message.push(`User does not assure riding the bike\nReason: ${this.mismatchExplanation}`);
    }
    return response;
  }
}
// =============================================================================