// =============================================================================
// USER CLASS
// =============================================================================
class User {
  constructor(userEmail) {
    this.userEmail = userEmail;
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

  static findByEmail(userEmail) {
    const db = new DatabaseManager();
    const userRecord = db.findRowByColumn(CONFIG.SHEETS.USER_STATUS.NAME, 0, userEmail);
    return userRecord ? User.fromSheetRow(userRecord.data) : new User(userEmail);
  }

  save() {
    const values = [
      this.userEmail,
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

    const existing = this.db.findRowByColumn(CONFIG.SHEETS.USER_STATUS.NAME, 0, this.userEmail);
    if (existing) {
      this.db.updateRow(CONFIG.SHEETS.USER_STATUS.NAME, existing.row, values);
    } else {
      this.db.appendRow(CONFIG.SHEETS.USER_STATUS.NAME, values);
      this.db.sortByColumn(null, CONFIG.SHEETS.USER_STATUS.NAME);
    }
  }

  checkoutBike(commContext) {
    commContext['maxCheckoutHours'] = CONFIG.REGULATIONS.MAX_CHECKOUT_HOURS;
    if (this.hasUnreturnedBike && !CONFIG.REGULATIONS.CAN_CHECKOUT_WITH_UNRETURNED_BIKE) {
      const errorMessage = 'User already has an unreturned bike';
      commContext['errorMessage'] = errorMessage;
      commContext['unreturnedBikeName'] = this.lastCheckoutName
      commContext['lastCheckoutDate'] = this.lastCheckoutDate
      this.comm.handleCommunication('ERR_USR_COT_002', commContext);
      throw new Error(errorMessage);
    }

    const bike = Bike.findByHash(commContext.bikeHash);
    if (!bike) {
      const errorMessage = 'Bike not found';
      commContext['errorMessage'] = errorMessage;
      this.comm.handleCommunication('ERR_USR_COT_003', commContext);
      throw new Error(errorMessage);
    }

    if(!bike.isReadyForCheckout()){
      const errorMessage = 'Bike is not ready for checkout';
      commContext['errorMessage'] = errorMessage;
      commContext['bikeName'] = bike.bikeName
      Logger.log(bike.bikeName)
      this.comm.handleCommunication('ERR_USR_COT_001', commContext);
      throw new Error(errorMessage);
    }
    
    bike.checkout(commContext);

    // Update user usage records
    if (this.isFirstUsage) {
      this.firstUsageDate = commContext.timestamp;
    }
    this.hasUnreturnedBike = true;
    this.lastCheckoutName = bike.bikeName;
    this.lastCheckoutDate = commContext.timestamp;
    this.numberOfCheckouts++;
    this.save();

    // send confirmation userEmail
    commContext['bikeName'] = bike.bikeName;
    this.comm.handleCommunication('CFM_USR_COT_001', commContext);
  }

  returnBike(commContext) {
    let bike = Bike.findByName(commContext.bikeName);
    commContext['responseBikeName'] = commContext.bikeName
    if (!bike) {
      if (fuzzyMatch(commContext.bikeName, this.lastCheckoutName)) {
        bike = Bike.findByName(this.lastCheckoutName);
      } else {
        const errorMessage = `Bike ${commContext.bikeName} not found`;
        commContext['errorMessage'] = errorMessage;
        this.comm.handleCommunication('ERR_USR_RET_002', commContext);
        throw new Error(errorMessage);
      }
    }
    commContext['bikeName'] = bike.bikeName; // re-assign context to collect fuzzy matches
    if (!this.hasUnreturnedBike) {
      // Check if returning on behalf of a friend
      if (this.isReturningForFriend && commContext.isDirectReturn) {
        const friendEmail = commContext.friendEmail;
        if (friendEmail) {
          const friendUser = User.findByEmail(friendEmail);
          commContext['friendEmail'] = friendEmail; // re-assign context to collect fuzzy email matches
          if (friendUser.hasUnreturnedBike) {
            try {
              // Update friend's user record with the return details
              const friendReturnLog = ReturnLog.fromFriendReturnLog(commContext);
              const friendContext = {
                ...friendReturnLog,
                usageHours: commContext.usageHours,
                range: commContext.range
              }
              friendUser.returnBike(friendContext);
              // Notify user that bike was returned for a friend
              commContext['usageHours'] = 0; // indicate no usage for the user returning for a friend
              this.comm.handleCommunication('CFM_USR_RET_003', commContext);
            } catch (error) {
              const errorMessage = `Error returning bike for friend: ${error.message}`;
              commContext['errorMessage'] = errorMessage;
              this.comm.handleCommunication('ERR_USR_RET_008', commContext);
              throw new Error(errorMessage);
            }
          } else {
            const errorMessage = 'Friend has no unreturned bike.';
            commContext['errorMessage'] = errorMessage;
            this.comm.handleCommunication('ERR_USR_RET_003', commContext);
            throw new Error(errorMessage);
          }
        } else {
          const errorMessage = 'Friend\'s userEmail not provided for return.';
          commContext['errorMessage'] = errorMessage;
          this.comm.handleCommunication('ERR_USR_RET_004', commContext);
          throw new Error(errorMessage);
        }    
      } else if (this.isFirstUsage) {
        const errorMessage = 'Records for last checkout could not be found.';
        commContext['errorMessage'] = errorMessage;
        this.comm.handleCommunication('ERR_USR_RET_005', commContext);
        throw new Error(errorMessage);
      } else {
        const errorMessage = 'User has no unreturned bike.';
        commContext['errorMessage'] = errorMessage;
        this.comm.handleCommunication('ERR_USR_RET_006', commContext);
      }
      //record the return

      this.numberOfReturns++;
      this.save();
      return;
    }

    if (this.lastCheckoutName !== bike.bikeName && commContext.isDirectReturn) {
      this.numberOfMismatches++;
      bike = Bike.findByName(this.lastCheckoutName);
      commContext['bikeName'] = bike.bikeName; // re-assign context to collect mismatch
      commContext['isCollectedMismatch'] = true;
    }
    
    if (this.lastCheckoutDate && (commContext.timestamp - this.lastCheckoutDate) > CONFIG.REGULATIONS.MAX_CHECKOUT_HOURS * 60 * 60 * 1000) {
      this.overdueReturns++;
    }

    bike.returnBike(commContext);
    this.hasUnreturnedBike = false;
    this.lastReturnName = commContext.bikeName;
    this.lastReturnDate = commContext.timestamp;
    this.numberOfReturns++;
    this.usageHours += commContext.usageHours;
    this.save();

    // send confirmation userEmail
    if (!commContext.isDirectReturn) {
      this.comm.handleCommunication('CFM_USR_RET_002', commContext);
    } else if (commContext.isCollectedMismatch) {
      commContext['lastCheckoutName'] = this.lastCheckoutName
      this.comm.handleCommunication('CFM_USR_RET_004', commContext);
    } else {
      this.comm.handleCommunication('CFM_USR_RET_001', commContext);
    }
  }
  checkIfReturningForFriend(returnLog) {
    this.isReturningForFriend = returnLog.returningForFriend && returnLog.friendEmail;
  }
}