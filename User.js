// =============================================================================
// USER CLASS
// =============================================================================
class User {
  constructor(email) {
    this.email = email;
    this.hasUnreturnedBike = false;
    this.lastCheckoutId = '';
    this.lastCheckoutDate = null;
    this.lastReturnId = '';
    this.lastReturnDate = null;
    this.numberOfCheckouts = 0;
    this.numberOfReturns = 0;
    this.numberOfMismatches = 0;
    this.usageHours = 0;
    this.overdueReturns = 0;
    this.db = new DatabaseManager();
  }

  static fromSheetRow(rowData) {
    const user = new User(rowData[0]);
    user.hasUnreturnedBike = rowData[1] || false;
    user.lastCheckoutId = rowData[2] || '';
    user.lastCheckoutDate = rowData[3];
    user.lastReturnId = rowData[4] || '';
    user.lastReturnDate = rowData[5];
    user.numberOfCheckouts = rowData[6] || 0;
    user.numberOfReturns = rowData[7] || 0;
    user.numberOfMismatches = rowData[8] || 0;
    user.usageHours = rowData[9] || 0;
    user.overdueReturns = rowData[10] || 0;
    return user;
  }

  static findByEmail(email) {
    const db = new DatabaseManager();
    const result = db.findRowByColumn(CONFIG.SHEETS.USER_STATUS, 0, email);
    return result ? User.fromSheetRow(result.data) : new User(email);
  }

  save() {
    const values = [
      this.email,
      this.hasUnreturnedBike,
      this.lastCheckoutId,
      this.lastCheckoutDate,
      this.lastReturnId,
      this.lastReturnDate,
      this.numberOfCheckouts,
      this.numberOfReturns,
      this.numberOfMismatches,
      this.usageHours,
      this.overdueReturns
    ];

    const existing = this.db.findRowByColumn(CONFIG.SHEETS.USER_STATUS, 0, this.email);
    if (existing) {
      this.db.updateRow(CONFIG.SHEETS.USER_STATUS, existing.row, values);
    } else {
      this.db.appendRow(CONFIG.SHEETS.USER_STATUS, values);
    }
  }

  checkoutBike(bikeId) {
    if (this.hasUnreturnedBike) {
      throw new Error('User already has an unreturned bike');
    }

    const bike = Bike.findById(bikeId);
    if (!bike) {
      throw new Error('Bike not found');
    }

    bike.checkout(this.email);
    this.hasUnreturnedBike = true;
    this.lastCheckoutId = bikeId;
    this.lastCheckoutDate = new Date();
    this.numberOfCheckouts++;
    this.save();

    return bike;
  }

  returnBike(bikeId, usageHours = 0) {
    const bike = Bike.findById(bikeId);
    if (!bike) {
      throw new Error('Bike not found');
    }

    bike.returnBike(usageHours);
    this.hasUnreturnedBike = false;
    this.lastReturnId = bikeId;
    this.lastReturnDate = new Date();
    this.numberOfReturns++;
    this.usageHours += usageHours;
    this.save();

    return bike;
  }

  recordMismatch() {
    this.numberOfMismatches++;
    this.save();
  }

  recordOverdueReturn() {
    this.overdueReturns++;
    this.save();
  }
}