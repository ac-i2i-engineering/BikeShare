// =============================================================================
// MAIN SERVICE CLASS
// =============================================================================
class BikeShareService {
  constructor() {
    this.db = new DatabaseManager();
    this.comm = new Communicator();
  }

  processCheckout(formResponse, range) {
    try {
      const checkoutLog = CheckoutLog.fromFormResponse(formResponse);
      const user = User.findByEmail(checkoutLog.userEmail);
      user.checkoutBike(checkoutLog, range);
    } catch (error) {
      Logger.log(`Error processing checkout: ${error}`);
    }
  }

  processReturn(formResponse, range) {
    try {
      const returnLog = ReturnLog.fromFormResponse(formResponse);
      returnLog.validate(range);
      const user = User.findByEmail(returnLog.userEmail);
      user.checkIfReturningForFriend(returnLog);
      const usageHours = this.calculateUsageHours(returnLog.bikeName);
      user.returnBike(returnLog, usageHours);
    } catch (error) {
      Logger.log(`Error processing return: ${error}`);
    }
  }

  generateWeeklyReport() {
    const report = new Report();
    const reportData = report.generate();
    report.save(reportData);
    return reportData;
  }

  getAvailableBikes() {
    const data = this.db.getAllData(CONFIG.SHEETS.BIKES_STATUS.NAME);
    return data.slice(1)
      .map(row => Bike.fromSheetRow(row))
      .filter(bike => bike.availability === 'Available' && !bike.needsMaintenance());
  }

  getOverdueBikes() {
    const data = this.db.getAllData(CONFIG.SHEETS.BIKES_STATUS.NAME);
    return data.slice(1)
      .map(row => Bike.fromSheetRow(row))
      .filter(bike => bike.isOverdue());
  }

  calculateUsageHours(bikeName) {
    const bike = Bike.findByName(bikeName);
    if (!bike || !bike.lastCheckoutDate) return 0;
    
    const now = new Date();
    const checkoutTime = new Date(bike.lastCheckoutDate);
    return Math.round((now - checkoutTime) / (1000 * 60 * 60) * 100) / 100;
  }
}
// =============================================================================