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
    this.isIndirectReturn = false;
    this.db = new DatabaseManager();
    this.comm = new Communicator();
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
    return log;
  }

  static fromFriendReturnLog(returnLog) {
    const log = new ReturnLog();
    log.timestamp = returnLog.timestamp;
    log.emailAddress = returnLog.friendEmail;
    log.bikeName = returnLog.bikeName;
    log.confirmBikeName = returnLog.confirmBikeName;
    log.assureRodeBike = `Friend said: ${returnLog.assureRodeBike}`;
    log.mismatchExplanation = `Friend said: ${returnLog.mismatchExplanation}`;
    log.returningForFriend = false;
    log.friendEmail = returnLog.emailAddress;
    log.issuesConcerns = `Friend said: ${returnLog.issuesConcerns}`;
    log.isIndirectReturn = true; // Mark as indirect return
    return log;
  }

  validate(range) {
    if (!fuzzyMatch(this.bikeName, this.confirmBikeName)) {
      this.comm.handleCommunication('ERR_USR_RET_001', {
        userEmail: this.emailAddress,
        bikeName: this.bikeName,
        confirmBikeName: this.confirmBikeName,
        entryRange: range
      });
      throw new Error('Bike names do not match');
    }
  }
}
// =============================================================================