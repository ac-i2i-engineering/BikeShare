//==================================================================================
// RETURN LOG CLASS
//==================================================================================
class ReturnLog {
  constructor(data) {
    this.timestamp = data.timestamp || new Date();
    this.emailAddress = data.emailAddress;
    this.studentId = data.studentId;
    this.bikeName = data.bikeName;
    this.confirmBikeName = data.confirmBikeName;
    this.correctBikeRidden = data.correctBikeRidden;
    this.explanation = data.explanation || '';
    this.returningForFriend = data.returningForFriend;
    this.friendDetails = data.friendDetails || '';
    this.issues = data.issues || '';
    this.db = new DatabaseManager();
  }

  static fromFormResponse(formResponse) {
    const responses = formResponse.getItemResponses();
    return new ReturnLog({
      timestamp: formResponse.getTimestamp(),
      emailAddress: formResponse.getRespondentEmail(),
      studentId: responses[0].getResponse(),
      bikeName: responses[1].getResponse(),
      confirmBikeName: responses[2].getResponse(),
      correctBikeRidden: responses[3].getResponse(),
      explanation: responses[4] ? responses[4].getResponse() : '',
      returningForFriend: responses[5].getResponse(),
      friendDetails: responses[6] ? responses[6].getResponse() : '',
      issues: responses[7] ? responses[7].getResponse() : ''
    });
  }

  save() {
    const values = [
      this.timestamp,
      this.emailAddress,
      this.studentId,
      this.bikeName,
      this.confirmBikeName,
      this.correctBikeRidden,
      this.explanation,
      this.returningForFriend,
      this.friendDetails,
      this.issues
    ];
    this.db.appendRow(CONFIG.SHEETS.RETURN_LOGS, values);
  }

  validate() {
    if (this.bikeName !== this.confirmBikeName) {
      throw new Error('Bike name confirmation does not match');
    }
  }

  hasMismatch() {
    return this.correctBikeRidden !== 'Yes';
  }
}
// =============================================================================