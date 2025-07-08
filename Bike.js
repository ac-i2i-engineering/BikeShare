// =============================================================================
// BIKE CLASS
// =============================================================================
class Bike {
  constructor(bikeId, size, maintenanceStatus = 'Good', availability = 'Available') {
    this.bikeId = bikeId;
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
  }

  static fromSheetRow(rowData) {
    const bike = new Bike(rowData[0], rowData[1], rowData[2], rowData[3]);
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

  static findById(bikeId) {
    const db = new DatabaseManager();
    const result = db.findRowByColumn(CONFIG.SHEETS.BIKES_STATUS, 0, bikeId);
    return result ? Bike.fromSheetRow(result.data) : null;
  }

  save() {
    const values = [
      this.bikeId,
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

    const existing = this.db.findRowByColumn(CONFIG.SHEETS.BIKES_STATUS, 0, this.bikeId);
    if (existing) {
      this.db.updateRow(CONFIG.SHEETS.BIKES_STATUS, existing.row, values);
    } else {
      this.db.appendRow(CONFIG.SHEETS.BIKES_STATUS, values);
    }
  }

  checkout(userEmail,timestamp) {
    if (this.availability !== 'Available' && !CONFIG.REGULATIONS.CAN_CHECKOUT_UNAVAILABLE_BIKE) {
      throw new Error(`Bike ${this.bikeId} is not available for checkout`);
    }

    this.availability = 'Checked Out';
    this.lastCheckoutDate = timestamp;
    this.updateRecentUsers(userEmail);
    this.save();
  }

  returnBike(actualUsageHours = 0) {
    this.availability = 'Available';
    this.lastReturnDate = new Date();
    this.currentUsageTimer = 0;
    this.totalUsageHours += actualUsageHours;
    this.save();
  }

  updateRecentUsers(newUser) {
    this.thirdRecentUser = this.secondRecentUser;
    this.secondRecentUser = this.mostRecentUser;
    this.mostRecentUser = newUser;
  }

  isOverdue(maxHours = 24) {
    if (!this.lastCheckoutDate || this.availability === 'Available') {
      return false;
    }
    const hoursSinceCheckout = (new Date() - new Date(this.lastCheckoutDate)) / (1000 * 60 * 60);
    return hoursSinceCheckout > maxHours;
  }

  needsMaintenance() {
    return this.maintenanceStatus !== 'Good';
  }
}
// =============================================================================