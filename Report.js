// =============================================================================
// REPORT CLASS
// =============================================================================
class Report {
  constructor() {
    this.timestamp = new Date();
    this.recordedBy = "Automated";
    this.frequencyInDays = CONFIG.REPORT_GENERATION.FREQUENCY;
    this.checkSpan = this.frequencyInDays * 24 * 60 * 60 * 1000; // convert days to milliseconds
    this.period = this.getPeriodNumber();
    this.db = new DatabaseManager();
    this.bikes = this.getAllBikes();
    this.users = this.getAllUsers();
  }
  generate() {
    
    return {
      timestamp: this.timestamp,
      recordedBy: this.recordedBy,
      period: this.period,
      totalBikes: this.bikes.length,
      bikesInRepair: this.bikes.filter(bike => bike.isInRepair()).length,
      checkedOutBikes: this.bikes.filter(bike => bike.isCheckedOut()).length,
      overdueBikes: this.bikes.filter(bike => bike.isOverdue()).length,
      readyForCheckout: this.bikes.filter(bike => bike.isReadyForCheckout()).length,
      newUsers: this.countNewUsersForPeriod(),
      lateReturnsCount: this.countOverdueReturns(),
      returnMismatches: this.countReturnMismatches(),
      reportedIssues: this.countReportedIssuesFromUsers(),
      totalUsageHours: this.countTotalUsageHours(),
      adminNotes: ''
    };
  }

  save(reportData) {
    const values = [
      reportData.timestamp,
      reportData.recordedBy,
      reportData.period,
      reportData.totalBikes,
      reportData.bikesInRepair,
      reportData.checkedOutBikes,
      reportData.overdueBikes,
      reportData.readyForCheckout,
      reportData.newUsers,
      reportData.lateReturnsCount,
      reportData.returnMismatches,
      reportData.reportedIssues,
      reportData.totalUsageHours,
      reportData.adminNotes
    ];
    // check if row with same period already exists and update it, else append a new row
    const existingRow = this.db.findRowByColumn(CONFIG.SHEETS.REPORTS.NAME, CONFIG.SHEETS.REPORTS.PERIOD_NUM_COLUMN, reportData.period);
    if (existingRow) {
      this.db.updateRow(CONFIG.SHEETS.REPORTS.NAME, existingRow.rowIndex, values);
      return;
    }
    this.db.appendRow(CONFIG.SHEETS.REPORTS.NAME, values);
  }

  getAllBikes() {
    const data = this.db.getAllData(CONFIG.SHEETS.BIKES_STATUS.NAME);
    return data.slice(1).map(row => Bike.fromSheetRow(row));
  }

  getAllUsers() {
    const data = this.db.getAllData(CONFIG.SHEETS.USER_STATUS.NAME);
    return data.slice(1).map(row => User.fromSheetRow(row));
  }
  // calculate the period number based on the first run date and round it to the nearest period
  getPeriodNumber() {
    const firstRunDate = new Date(CONFIG.REPORT_GENERATION.FIRST_GENERATION_DATE);
    const diffInMs = this.timestamp - firstRunDate;
    const weeks = Math.round(diffInMs / this.checkSpan);
    return weeks;
  }

  countNewUsersForPeriod() {
    const newUsers = this.users.filter(user => {
      return user.firstUsageDate && (this.timestamp - new Date(user.firstUsageDate)) <= this.checkSpan;
    });
    return newUsers.length;
  }

  countReportedIssuesFromUsers() {
    const logsInRange = this.returnLogsInCoverage();
    // count return logs with issues
    return logsInRange.filter(log => log.issuesConcerns != null && log.issuesConcerns.trim().length > 0).length;
  }

  countOverdueReturns() {
    const totalOverdueReturns = this.users.reduce((count, user) => {
      return count + user.overdueReturns;
    }, 0);
    const prevRecordedOverdueReturns = this.db.getColumnSum(CONFIG.SHEETS.REPORTS.NAME, CONFIG.SHEETS.REPORTS.OVERDUE_RETURNS_COLUMN);
    return totalOverdueReturns - prevRecordedOverdueReturns;
  }

  countReturnMismatches() {
    const currentPeriodMismatches = this.users.reduce((count, user) => {
      return count + user.numberOfMismatches;
    }, 0);
    const prevRecordedMismatches = this.db.getColumnSum(CONFIG.SHEETS.REPORTS.NAME, CONFIG.SHEETS.REPORTS.RETURN_MISMATCHES_COLUMN);
    return currentPeriodMismatches - prevRecordedMismatches;
  }

  countTotalUsageHours() {
    const totalUsageHours = this.users.reduce((sum, user) => {
      return sum + user.usageHours;
    }, 0);
    const prevRecordedUsageHours = this.db.getColumnSum(CONFIG.SHEETS.REPORTS.NAME, CONFIG.SHEETS.REPORTS.TOTAL_USAGE_HOURS_COLUMN);
    return totalUsageHours - prevRecordedUsageHours;
  }

  returnLogsInCoverage(){
    const returnLogs = this.db.getAllData(CONFIG.SHEETS.RETURN_LOGS.NAME);
    const logsInRange = returnLogs.filter(log => {
      const returnDate = new Date(log[CONFIG.SHEETS.RETURN_LOGS.DATE_COLUMN]);
      return (this.timestamp - returnDate) <= this.checkSpan;
    });
    return logsInRange;
  }

}
// =============================================================================