// =============================================================================
// MAIN SERVICE CLASS
// =============================================================================
class BikeShareService {
  constructor() {
    this.db = new DatabaseManager();
  }

  processCheckout(formResponse) {
    try {
      const checkoutLog = CheckoutLog.fromFormResponse(formResponse);
      const validation = checkoutLog.validate();
      // Validate the checkout log
      if (!validation.success) {
        throw new Error(validation.message.join(', '));
      }
      Logger.log(`Processing checkout for user: ${checkoutLog.emailAddress} at ${checkoutLog.timestamp}`);
      const user = User.findByEmail(checkoutLog.emailAddress);
      Logger.log(`User found: ${user.email}`);
      const bike = user.checkoutBike(checkoutLog.bikeHash, checkoutLog.timestamp);
      Logger.log(`Bike checked out: ${bike.bikeName}`);
      // this.sendCheckoutConfirmation(user.email, bike.bikeId);
      return { success: true, message: `Bike ${bike.bikeName} checked out successfully` };
    } catch (error) {
      // this.sendErrorNotification(checkoutLog.emailAddress, error.message);
      return { success: false, error: error.message };
    }
  }

  processReturn(formResponse) {
    try {
      const returnLog = ReturnLog.fromFormResponse(formResponse);
      const validation = returnLog.validate();

      if (!validation.success) {
        throw new Error(validation.message.join(', '));
      }

      const user = User.findByEmail(returnLog.emailAddress);
      const usageHours = this.calculateUsageHours(returnLog.bikeCode);
      const bike = user.returnBike(returnLog.bikeCode, usageHours);

      if (returnLog.hasMismatch()) {
        user.recordMismatch();
      }

      this.sendReturnConfirmation(user.email, bike.bikeId);
      return { success: true, message: `Bike ${bike.bikeId} returned successfully` };
    } catch (error) {
      this.sendErrorNotification(formResponse.getRespondentEmail(), error.message);
      return { success: false, error: error.message };
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

  calculateUsageHours(bikeId) {
    const bike = Bike.findByName(bikeId);
    if (!bike || !bike.lastCheckoutDate) return 0;
    
    const now = new Date();
    const checkoutTime = new Date(bike.lastCheckoutDate);
    return Math.round((now - checkoutTime) / (1000 * 60 * 60) * 100) / 100;
  }

  sendCheckoutConfirmation(email, bikeId) {
    const subject = `Bike Checkout Confirmation - ${bikeId}`;
    const body = `Your checkout of bike ${bikeId} has been confirmed. Please return it within 24 hours.`;
    GmailApp.sendEmail(email, subject, body);
  }

  sendReturnConfirmation(email, bikeId) {
    const subject = `Bike Return Confirmation - ${bikeId}`;
    const body = `Your return of bike ${bikeId} has been confirmed. Thank you for using BikeShare!`;
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
        const subject = `Overdue Bike Return - ${bike.bikeId}`;
        const body = `Your bike ${bike.bikeId} is overdue. Please return it immediately.`;
        GmailApp.sendEmail(bike.mostRecentUser, subject, body);
      }
    });
  }

  healthCheck() {
    try {
      const startTime = new Date().getTime();
      
      // Test database connection
      const testSheet = this.db.getSheet(CONFIG.SHEETS.BIKES_STATUS.NAME);
      
      // Test basic operations
      const availableBikes = this.getAvailableBikes();
      
      const endTime = new Date().getTime();
      const responseTime = endTime - startTime;
      
      return {
        healthy: true,
        responseTime: responseTime,
        availableBikes: availableBikes.length,
        timestamp: new Date()
      };
    } catch (error) {
      return {
        healthy: false,
        error: error.message,
        timestamp: new Date()
      };
    }
  }

  safeProcessing(processingFunction, formResponse) {
    try {
      const startTime = new Date().getTime();
      const result = processingFunction(formResponse);
      const endTime = new Date().getTime();
      
      // Log processing time for monitoring
      console.log(`Processing completed in ${endTime - startTime}ms`);
      
      return result;
    } catch (error) {
      console.error('Processing error:', error);
      
      // Send error notification
      this.sendErrorNotification(
        formResponse.getRespondentEmail(), 
        error.message
      );
      
      // Return standardized error response
      return {
        success: false,
        error: error.message,
        timestamp: new Date()
      };
    }
  }
}
// =============================================================================