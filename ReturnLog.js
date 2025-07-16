//==================================================================================
// RETURN LOG CLASS
//==================================================================================
class ReturnLog {
  constructor() {
    this.timestamp = null;
    this.userEmail = null;
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
    log.userEmail = responses[1];
    log.bikeName = responses[2];
    log.confirmBikeName = responses[3];
    log.assureRodeBike = responses[4];
    log.mismatchExplanation = responses[5];
    log.returningForFriend = responses[6];
    log.friendEmail = responses[7];
    log.issuesConcerns = responses[8];
    return log;
  }

  static fromFriendReturnLog(friendReturnLog) {
    const log = new ReturnLog();
    log.timestamp = friendReturnLog.timestamp;
    log.userEmail = friendReturnLog.friendEmail;
    log.bikeName = friendReturnLog.bikeName;
    log.confirmBikeName = friendReturnLog.confirmBikeName;
    log.assureRodeBike = `Friend said: ${friendReturnLog.assureRodeBike}`;
    log.mismatchExplanation = `Friend said: ${friendReturnLog.mismatchExplanation}`;
    log.returningForFriend = false;
    log.friendEmail = friendReturnLog.userEmail;
    log.issuesConcerns = `Friend said: ${friendReturnLog.issuesConcerns}`;
    log.isIndirectReturn = true; // Mark as indirect return
    return log;
  }

  validate(range) {
    const commContext = this
    commContext['range'] = range;
    if (!fuzzyMatch(this.bikeName, this.confirmBikeName)) {
      this.comm.handleCommunication('ERR_USR_RET_001', commContext);
      throw new Error('Bike names do not match');
    }
  }
}
// =============================================================================