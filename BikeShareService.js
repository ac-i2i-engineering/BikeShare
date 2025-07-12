// =============================================================================
// MAIN SERVICE CLASS
// =============================================================================
class BikeShareService {
  constructor() {
    this.db = new DatabaseManager();
    this.errorManager = new ErrorManager();
  }

  processCheckout(formResponse, range) {
    try {
      const checkoutLog = CheckoutLog.fromFormResponse(formResponse);      
      const user = User.findByEmail(checkoutLog.emailAddress);
      const bike = user.checkoutBike(checkoutLog.bikeHash, checkoutLog.timestamp);
      
      // Ensure database operations complete before sorting
      SpreadsheetApp.flush();
      this.db.sortByColumn(null, CONFIG.SHEETS.CHECKOUT_LOGS.NAME);

      // this.sendCheckoutConfirmation(checkoutLog.emailAddress, bike.bikeName);
      return { success: true, message: `Bike ${bike.bikeName} checked out successfully` };
    } catch (error) {
      const errorCode = this.determineSystemErrorCode(error);
      const managedError = this.errorManager.handleError(errorCode, {
        userEmail: formResponse.getRespondentEmail(),
        originalError: error.message,
        operation: 'checkout'
      });
      
      this.db.addErrorFlag(range, managedError.description, managedError.color);
      SpreadsheetApp.flush();
      this.db.sortByColumn(null, CONFIG.SHEETS.CHECKOUT_LOGS.NAME);
      
      return { success: false, error: managedError.description, errorCode: managedError.code };
    }
  }

  processReturn(formResponse, range) {
    try {
      const returnLog = ReturnLog.fromFormResponse(formResponse);
      const validation = returnLog.validate();

      if (!validation.success) {
        const errorCode = this.determineReturnErrorCode(validation.message, returnLog);
        const error = this.errorManager.handleError(errorCode, {
          userEmail: returnLog.emailAddress,
          bikeName: returnLog.bikeName,
          confirmBikeName: returnLog.confirmBikeName,
          validationErrors: validation.message
        });
        
        this.db.addErrorFlag(range, error.description, error.color);
        SpreadsheetApp.flush();
        this.db.sortByColumn(null, CONFIG.SHEETS.RETURN_LOGS.NAME);
        
        return { success: false, error: error.description, errorCode: error.code };
      }

      const user = User.findByEmail(returnLog.emailAddress);
      const usageHours = this.calculateUsageHours(returnLog.bikeName);
      const bike = user.returnBike(returnLog, usageHours);
      
      // Ensure database operations complete before sorting
      SpreadsheetApp.flush();
      this.db.sortByColumn(null, CONFIG.SHEETS.RETURN_LOGS.NAME);

      // this.sendReturnConfirmation(returnLog.emailAddress, bike.bikeName);
      return { success: true, message: `Bike ${bike.bikeName} returned successfully` };
    } catch (error) {
      const errorCode = this.determineSystemErrorCode(error);
      const managedError = this.errorManager.handleError(errorCode, {
        userEmail: formResponse.getRespondentEmail(),
        originalError: error.message,
        operation: 'return'
      });
      
      this.db.addErrorFlag(range, managedError.description, managedError.color);
      SpreadsheetApp.flush();
      this.db.sortByColumn(null, CONFIG.SHEETS.RETURN_LOGS.NAME);
      
      return { success: false, error: managedError.description, errorCode: managedError.code };
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

  sendCheckoutConfirmation(email, bikeName) {
    const subject = `Bike Checkout Confirmation - ${bikeName}`;
    const body = `You'll pick a key with name ${bikeName}.`;
    GmailApp.sendEmail(email, subject, body);
  }

  sendReturnConfirmation(email, bikeName) {
    const subject = `Bike Return Confirmation - ${bikeName}`;
    const body = `Your return of bike ${bikeName} has been confirmed. Thank you for using BikeShare!`;
    GmailApp.sendEmail(email, subject, body);
  }

  sendErrorNotification(email, errorMessage) {
    const subject = 'BikeShare System Error';
    const body = `There was an error processing your request: ${errorMessage}. Please contact support.`;
    GmailApp.sendEmail(email, subject, body);
  }

  sendOverdueNotifications() {
    const overdues = this.getOverdueBikes();
    overdues.forEach(bike => {
      if (bike.mostRecentUser) {
        const subject = `Overdue Bike Return - ${bike.bikeName}`;
        const body = `Your bike ${bike.bikeName} is overdue. Please return it immediately.`;
        GmailApp.sendEmail(bike.mostRecentUser, subject, body);
      }
    });
  }
}
// =============================================================================