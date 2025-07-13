// =============================================================================
// USER CLASS
// =============================================================================
class User {
  constructor(email) {
    this.email = email;
    this.hasUnreturnedBike = false;
    this.lastCheckoutName = '';
    this.lastCheckoutDate = null;
    this.lastReturnName = '';
    this.lastReturnDate = null;
    this.numberOfCheckouts = 0;
    this.numberOfReturns = 0;
    this.numberOfMismatches = 0;
    this.usageHours = 0;
    this.overdueReturns = 0;
    this.firstUsageDate = null;
    this.isFirstUsage = this.firstUsageDate === null; 
    this.db = new DatabaseManager();
    this.comm = new Communicator();
  }

  static fromSheetRow(rowData) {
    const user = new User(rowData[0]);
    user.hasUnreturnedBike = rowData[1] === 'Yes';
    user.lastCheckoutName = rowData[2] || '';
    user.lastCheckoutDate = rowData[3];
    user.lastReturnName = rowData[4] || '';
    user.lastReturnDate = rowData[5];
    user.numberOfCheckouts = rowData[6] || 0;
    user.numberOfReturns = rowData[7] || 0;
    user.numberOfMismatches = rowData[8] || 0;
    user.usageHours = rowData[9] || 0;
    user.overdueReturns = rowData[10] || 0;
    user.firstUsageDate = rowData[11] || null;
    user.isFirstUsage = user.firstUsageDate === null;
    return user;
  }

  static findByEmail(email) {
    const db = new DatabaseManager();
    const userRecord = db.findRowByColumn(CONFIG.SHEETS.USER_STATUS.NAME, 0, email);
    return userRecord ? User.fromSheetRow(userRecord.data) : new User(email);
  }

  save() {
    const values = [
      this.email,
      this.hasUnreturnedBike ? 'Yes' : 'No',
      this.lastCheckoutName,
      this.lastCheckoutDate,
      this.lastReturnName,
      this.lastReturnDate,
      this.numberOfCheckouts,
      this.numberOfReturns,
      this.numberOfMismatches,
      this.usageHours,
      this.overdueReturns,
      this.firstUsageDate
    ];

    const existing = this.db.findRowByColumn(CONFIG.SHEETS.USER_STATUS.NAME, 0, this.email);
    if (existing) {
      this.db.updateRow(CONFIG.SHEETS.USER_STATUS.NAME, existing.row, values);
    } else {
      this.db.appendRow(CONFIG.SHEETS.USER_STATUS.NAME, values);
      this.db.sortByColumn(null, CONFIG.SHEETS.USER_STATUS.NAME);
    }
  }

  checkoutBike(checkoutLog, range) {
    if (this.hasUnreturnedBike && !CONFIG.REGULATIONS.CAN_CHECKOUT_WITH_UNRETURNED_BIKE) {
      this.comm.handleCommunication('ERR_USR_002',{
        unreturnedBikeName: this.lastCheckoutName,
        prevCheckoutDate: this.lastCheckoutDate,
        userEmail: this.email,
        entryRange: range
      });
      throw new Error('User already has an unreturned bike');
    }

    const bike = Bike.findByHash(checkoutLog.bikeHash);
    if (!bike) {
      this.comm.handleCommunication('ERR_USR_003', {
        userEmail: this.email,
        bikeHash: checkoutLog.bikeHash,
        entryRange: range
      });
      throw new Error('Bike not found');
    }

    bike.checkout(this.email, checkoutLog.timestamp);

    // Update user usage records
    if (this.isFirstUsage) {
      this.firstUsageDate = checkoutLog.timestamp;
    }
    this.hasUnreturnedBike = true;
    this.lastCheckoutName = bike.bikeName;
    this.lastCheckoutDate = checkoutLog.timestamp;
    this.numberOfCheckouts++;
    this.save();

    return bike;
  }

  returnBike(returnLog, usageHours = 0) {
    const bikeName = returnLog.bikeName;
    const timestamp = returnLog.timestamp;
    if (!this.hasUnreturnedBike) {
      throw new Error('User has no unreturned bike');
    }


    const bike = Bike.findByName(bikeName);
    if (!bike) {
      throw new Error('Bike not found');
    }

    if(this.lastCheckoutName !== bike.bikeName) {
      throw new Error(`Bike ${bike.bikeName} does not match the last checked out bike ${this.lastCheckoutName}`);
    }

    bike.returnBike(usageHours);
    this.hasUnreturnedBike = false;
    this.lastReturnName = bikeName;
    this.lastReturnDate = timestamp;
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