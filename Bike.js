// =============================================================================
// BIKE CLASS
// =============================================================================
class Bike {
  constructor(bikeName, bikeHash, size, maintenanceStatus = 'Good', availability = 'Available') {
    this.bikeName = bikeName;
    this.bikeHash = bikeHash;
    this.size = size;
    this.maintenanceStatus = maintenanceStatus;
    this.availability = availability;
    this.lastCheckoutDate = null;
    this.lastReturnDate = null;
    this.currentUsageTimer = 0;
    this.totalUsageHours = 0;
    this.mostRecentUser = '';
    this.secondRecentUser = '';
    this.thirdRecentUser = '';
    this.tempRecent = '';
    this.db = new DatabaseManager();
    this.comm = new Communicator();
  }

  static fromSheetRow(rowData) {
    const bike = new Bike(rowData[0], rowData[12], rowData[1], rowData[2], rowData[3]);
    bike.lastCheckoutDate = rowData[4];
    bike.lastReturnDate = rowData[5];
    bike.currentUsageTimer = rowData[6] || 0;
    bike.totalUsageHours = rowData[7] || 0;
    bike.mostRecentUser = rowData[8] || '';
    bike.secondRecentUser = rowData[9] || '';
    bike.thirdRecentUser = rowData[10] || '';
    bike.tempRecent = rowData[11] || '';
    return bike;
  }

  static findByName(bikeName) {
    const db = new DatabaseManager();
    const result = db.findRowByColumn(CACHED_SETTINGS.VALUES.SHEETS.BIKES_STATUS.NAME, 0, bikeName);
    return result ? Bike.fromSheetRow(result.data) : null;
  }

  static findByHash(bikeHash) {
    const db = new DatabaseManager();
    const result = db.findRowByColumn(CACHED_SETTINGS.VALUES.SHEETS.BIKES_STATUS.NAME, 12, bikeHash);
    return result ? Bike.fromSheetRow(result.data) : null;
  }

  save() {
    const values = [
      this.bikeName,
      this.size,
      this.maintenanceStatus,
      this.availability,
      this.lastCheckoutDate,
      this.lastReturnDate,
      this.currentUsageTimer,
      this.totalUsageHours,
      this.mostRecentUser,
      this.secondRecentUser,
      this.thirdRecentUser,
      this.tempRecent
    ];

    const existing = this.db.findRowByColumn(CACHED_SETTINGS.VALUES.SHEETS.BIKES_STATUS.NAME, 0, this.bikeName);
    if (existing) {
      this.db.updateRow(CACHED_SETTINGS.VALUES.SHEETS.BIKES_STATUS.NAME, existing.row, values);
    } else {
      this.db.appendRow(CACHED_SETTINGS.VALUES.SHEETS.BIKES_STATUS.NAME, values);
      this.db.sortByColumn(null, CACHED_SETTINGS.VALUES.SHEETS.BIKES_STATUS.NAME);
    }
  }

  checkout(commContext) {
    if (this.availability !== 'Available' || this.maintenanceStatus !== 'Good') {
      throw new Error(`Bike ${this.bikeName} is not available for checkout`); 
    }

    this.availability = 'Checked Out';
    this.lastCheckoutDate = commContext.timestamp;
    this.updateRecentUsers(commContext.userEmail);
    this.save();
  }

  returnBike(commContext) {
    if(commContext.issuesConcerns != ""){
      this.maintenanceStatus = "Has Issue"
    }
    this.availability = 'Available';
    this.lastReturnDate = commContext.timestamp;
    this.currentUsageTimer = 0;
    this.totalUsageHours += commContext.usageHours;
    this.save();
  }

  updateRecentUsers(newUser) {
    this.tempRecent = this.thirdRecentUser;
    this.thirdRecentUser = this.secondRecentUser;
    this.secondRecentUser = this.mostRecentUser;
    this.mostRecentUser = newUser;
  }

  isOverdue(maxHours = CACHED_SETTINGS.VALUES.REGULATIONS.MAX_CHECKOUT_HOURS) {
    if (!this.lastCheckoutDate || this.availability === 'Available') {
      return false;
    }
    const hoursSinceCheckout = (new Date() - new Date(this.lastCheckoutDate)) / (1000 * 60 * 60);
    return hoursSinceCheckout > maxHours;
  }

  isInRepair() {
    return this.maintenanceStatus === 'In Repair';
  }

  isCheckedOut() {
    return this.availability === 'Checked Out';
  }

  isReadyForCheckout() {
    return this.availability === 'Available' && this.maintenanceStatus === 'Good';
  }

  isOutOfService() {
    return this.availability === 'Out of Service';
  }


  findByFuzzyName(bikeName) {
    const bikes = this.db.getAllData(CACHED_SETTINGS.VALUES.SHEETS.BIKES_STATUS.NAME);
    for (let i = 1; i < bikes.length; i++) {
      if (fuzzyMatch(bikes[i][0], bikeName)) {
        return Bike.fromSheetRow(bikes[i]);
      }
    }
    return null;
  }
}
// =============================================================================