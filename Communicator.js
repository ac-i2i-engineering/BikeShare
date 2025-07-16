// =============================================================================
// ERROR MANAGER CLASS
// =============================================================================
class Communicator {
  constructor() {
    this.db = new DatabaseManager();
    this.success = false;
  }
  handleCommunication(commID, context){
    const comm = this.getCommunication(commID);
    if (!comm) {
      throw new Error(`Communication with ID ${commID} not found.`);
    }
    // Handle the communication based on its type
    if(comm.notifyUser && CONFIG.NOTIFICATION_SETTINGS.SEND_USER_NOTIFICATIONS && CONFIG.NOTIFICATION_SETTINGS.NOTIFICATION_ENABLED){
      this.notifyUser(context.userEmail, this.fillPlaceholders(comm.notifyUser.subject, context), this.fillPlaceholders(comm.notifyUser.body, context));
    }
    if(comm.notifyAdmin && CONFIG.NOTIFICATION_SETTINGS.SEND_ADMIN_NOTIFICATIONS && CONFIG.NOTIFICATION_SETTINGS.NOTIFICATION_ENABLED){
      this.notifyAdmin(this.fillPlaceholders(comm.notifyAdmin.subject, context), this.fillPlaceholders(comm.notifyAdmin.body, context));
    }
    if(comm.notifyDeveloper && CONFIG.NOTIFICATION_SETTINGS.SEND_DEVELOPER_NOTIFICATIONS && CONFIG.NOTIFICATION_SETTINGS.NOTIFICATION_ENABLED){
      this.notifyDeveloper(this.fillPlaceholders(comm.notifyDeveloper.subject, context), this.fillPlaceholders(comm.notifyDeveloper.body, context));
    }
    if(comm.markEntry){
      this.markEntry(context.range, comm.markEntry.bgColor, this.fillPlaceholders(comm.markEntry.note, context));
    }
    // run that method if it exists
    if(comm.triggerMethod){
      this[comm.triggerMethod](context);
    }
  }
  notifyUser(userEmail, subject, body) {
    try {
      GmailApp.sendEmail(userEmail, subject, body);
    } catch (error) {
      console.error('Error sending email to user:', error);
    }
  }

  notifyAdmin(subject, body) {
    try {
      GmailApp.sendEmail(CONFIG.ADMIN_EMAIL, subject, body);
    } catch (error) {
      console.error('Error sending email to admin:', error);
    }
  }

  notifyDeveloper(subject, body) {
    try {
      GmailApp.sendEmail(CONFIG.DEVELOPER_EMAIL, subject, body);
    } catch (error) {
      console.error('Error sending email to developer:', error);
    }
  }

  markEntry(range, color=null, note=null) {
    try {
      this.db.markEntry(range, color, note);
    } catch (error) {
      console.error('Error marking entry:', error);
    }
  }

  getCommunication(commID) {
    return COMM_CODES[commID] || null;
  }
  fillPlaceholders(template, context) {
    return template.replace(/{{(.*?)}}/g, (match, p1) => {
      return context[p1.trim()] || '';
    });
  }
}
