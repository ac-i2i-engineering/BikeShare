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
    this.isReturningForFriend = false;
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
      this.comm.handleCommunication('ERR_USR_COT_002',{
        unreturnedBikeName: this.lastCheckoutName,
        prevCheckoutDate: this.lastCheckoutDate,
        userEmail: this.email,
        entryRange: range
      });
      throw new Error('User already has an unreturned bike');
    }

    const bike = Bike.findByHash(checkoutLog.bikeHash);
    if (!bike) {
      this.comm.handleCommunication('ERR_USR_COT_003', {
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

    // send confirmation email
    this.comm.handleCommunication('CFM_USR_COT_001', {
      userEmail: this.email,
      bikeName: bike.bikeName,
      maxCheckoutHours: CONFIG.REGULATIONS.MAX_CHECKOUT_HOURS,
    });
  }

  returnBike(returnLog, usageHours = 0) {
    const bikeName = returnLog.bikeName;
    const timestamp = returnLog.timestamp;
    const bike = Bike.findByName(bikeName);
    if (!bike) {
      this.comm.handleCommunication('ERR_USR_RET_002', {
        userEmail: this.email,
        bikeName: bikeName,
        entryRange: returnLog.entryRange
      });
      throw new Error(`Bike ${bikeName} not found`);
    }
    if (!this.hasUnreturnedBike) {
      // Check if returning on behalf of a friend
      if (this.isReturningForFriend) {
        const friendEmail = returnLog.friendEmail;
        if (friendEmail) {
        const friendUser = User.findByEmail(friendEmail);
        if (friendUser.hasUnreturnedBike) {
          try {
            // Update friend's user record with the return details
            const friendReturnLog = ReturnLog.fromFriendReturnLog(returnLog);
            friendUser.returnBike(friendReturnLog, usageHours);
            // Notify user that bike was returned for a friend
            this.comm.handleCommunication('CFM_USR_RET_003', {
              userEmail: this.email,
              friendEmail: friendEmail,
              bikeName: bikeName,
            });
          }catch (error) {
            this.comm.handleCommunication('ERR_USR_RET_008', {
              userEmail: this.email,
              friendEmail: friendEmail,
              bikeName: bikeName,
              timestamp: timestamp,
              error: error.message
            });
            throw new Error(`Error returning bike for friend: ${error.message}`);
          }
        } else {
          // Friend has no unreturned bike
          this.comm.handleCommunication('ERR_USR_RET_003', {
            userEmail: this.email,
            friendEmail: friendEmail,
            bikeName: bikeName
          });
          throw new Error('Friend has no unreturned bike.');
        }
      } else {
        // Friend's email not provided
        this.comm.handleCommunication('ERR_USR_RET_004', {
          userEmail: this.email,
          bikeName: bikeName
        });
        throw new Error('Friend\'s email not provided for return.');
        }
        return;
      } else if (this.isFirstUsage) {
        // No record for last checkout
        this.comm.handleCommunication('ERR_USR_RET_005', {
        userEmail: this.email,
        bikeName: bikeName
        });
        throw new Error('Records for last checkout could not be found.');
      } else {
        // User has no unreturned bike
        this.comm.handleCommunication('ERR_USR_RET_006', {
        userEmail: this.email,
        bikeName: bikeName,
        lastCheckedOutBike: this.lastCheckoutName,
        lastCheckoutDate: this.lastCheckoutDate,
        lastReturnDate: this.lastReturnDate
        });
      }
    }

    if(this.lastCheckoutName !== bike.bikeName) {
      this.numberOfMismatches++;
      this.comm.handleCommunication('CFM_USR_RET_004', {
        userEmail: this.email,
        bikeName: bike.bikeName,
        lastCheckedOutBike: this.lastCheckoutName,
        entryRange: returnLog.entryRange
      });
      bike = Bike.findByName(this.lastCheckoutName);
    }
    
    if (this.lastCheckoutDate && (timestamp - this.lastCheckoutDate) > CONFIG.REGULATIONS.MAX_CHECKOUT_HOURS * 60 * 60 * 1000) {
      this.overdueReturns++;
    }

    bike.returnBike(usageHours);
    this.hasUnreturnedBike = false;
    this.lastReturnName = bikeName;
    this.lastReturnDate = timestamp;
    this.numberOfReturns++;
    this.usageHours += usageHours;
    this.save();

    // send confirmation email
    if (returnLog.isIndirectReturn) {
      this.comm.handleCommunication('CFM_USR_RET_002', {
        userEmail: this.email,
        friendEmail: returnLog.friendEmail,
        bikeName: bikeName,
      });
    } else {
      this.comm.handleCommunication('CFM_USR_RET_001', {
        userEmail: this.email,
        bikeName: bike.bikeName,
      });
    }
  }
  checkIfReturningForFriend(returnLog) {
    this.isReturningForFriend = returnLog.returningForFriend && returnLog.friendEmail;
  }
}