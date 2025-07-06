// =============================================================================
// REPORT CLASS
// =============================================================================
class Report {
  constructor() {
    this.timestamp = new Date();
    this.recordedBy = Session.getActiveUser().getEmail();
    this.week = this.getWeekNumber();
    this.db = new DatabaseManager();
  }

  generate() {
    const bikes = this.getAllBikes();
    const users = this.getAllUsers();
    
    return {
      timestamp: this.timestamp,
      recordedBy: this.recordedBy,
      week: this.week,
      totalBikes: bikes.length,
      bikesInRepair: bikes.filter(bike => bike.needsMaintenance()).length,
      checkedOutBikes: bikes.filter(bike => bike.availability === 'Checked Out').length,
      overdueBikes: bikes.filter(bike => bike.isOverdue()).length,
      availableBikes: bikes.filter(bike => bike.availability === 'Available').length,
      newUsers: this.getNewUsersThisWeek(),
      lateReturners: users.filter(user => user.overdueReturns > 0).length,
      returnMismatches: users.reduce((sum, user) => sum + user.numberOfMismatches, 0),
      emailsWithMismatches: users.filter(user => user.numberOfMismatches > 0).map(user => user.email),
      reportedIssues: this.getReportedIssuesThisWeek(),
      totalUsageHours: users.reduce((sum, user) => sum + user.usageHours, 0),
      adminNotes: ''
    };
  }

  save(reportData) {
    const values = [
      reportData.timestamp,
      reportData.recordedBy,
      reportData.week,
      reportData.totalBikes,
      reportData.bikesInRepair,
      reportData.checkedOutBikes,
      reportData.overdueBikes,
      reportData.availableBikes,
      reportData.newUsers,
      reportData.lateReturners,
      reportData.returnMismatches,
      reportData.emailsWithMismatches.join(', '),
      reportData.reportedIssues,
      reportData.totalUsageHours,
      reportData.adminNotes
    ];
    this.db.appendRow(CONFIG.SHEETS.REPORTS, values);
  }

  getAllBikes() {
    const data = this.db.getAllData(CONFIG.SHEETS.BIKES_STATUS);
    return data.slice(1).map(row => Bike.fromSheetRow(row));
  }

  getAllUsers() {
    const data = this.db.getAllData(CONFIG.SHEETS.USER_STATUS);
    return data.slice(1).map(row => User.fromSheetRow(row));
  }

  getWeekNumber() {
    const now = new Date();
    const onejan = new Date(now.getFullYear(), 0, 1);
    return Math.ceil((((now - onejan) / 86400000) + onejan.getDay() + 1) / 7);
  }

  getNewUsersThisWeek() {
    // Implementation would check user creation dates
    return 0; // Placeholder
  }

  getReportedIssuesThisWeek() {
    // Implementation would count return logs with issues this week
    return 0; // Placeholder
  }
}
// =============================================================================