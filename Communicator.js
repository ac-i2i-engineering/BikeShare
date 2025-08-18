// =============================================================================
// NOTIFICATION,ERROR, AND ENTRY LABELLING MANAGER CLASS
// =============================================================================
class Communicator {
  constructor(spreadsheetID) {
    this.db = new DatabaseManager(spreadsheetID);
    this.success = false;
  }
  handleCommunication(commID, context){
    const comm = this.getCommunication(commID);
    if (!comm) {
      throw new Error(`Communication with ID ${commID} not found.`);
    }
    // Handle the communication based on its type
    if(comm.notifyUser && CACHED_SETTINGS.VALUES.NOTIFICATION_SETTINGS.ENABLE_USER_NOTIFICATIONS){
      this.notifyUser(context.userEmail, this.fillPlaceholders(comm.notifyUser.subject, context), this.fillPlaceholders(comm.notifyUser.body, context));
    }
    if(comm.notifyAdmin && CACHED_SETTINGS.VALUES.NOTIFICATION_SETTINGS.ENABLE_ADMIN_NOTIFICATIONS){
      this.notifyAdmin(this.fillPlaceholders(comm.notifyAdmin.subject, context), this.fillPlaceholders(comm.notifyAdmin.body, context));
    }
    if(comm.notifyDeveloper && CACHED_SETTINGS.VALUES.NOTIFICATION_SETTINGS.ENABLE_DEV_NOTIFICATIONS){
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
      GmailApp.sendEmail(userEmail, subject, "Hi,\n\n"+body+"\n\nThank you,\nBike Share Team");
    } catch (error) {
      console.error('Error sending email to user:', error.message);
    }
  }

  notifyAdmin(subject, body) {
    try {
      GmailApp.sendEmail(CACHED_SETTINGS.VALUES.ADMIN_EMAIL, subject, "Hi,\n\n"+body+"\n\nThank you,\nBike Share Team");
    } catch (error) {
      console.error('Error sending email to admin:', error.message);
    }
  }

  notifyDeveloper(subject, body) {
    try {
      GmailApp.sendEmail(CACHED_SETTINGS.VALUES.DEVELOPER_EMAIL, subject, "Hi,\n\n"+body+"\n\nThank you,\nBike Share Team");
    } catch (error) {
      console.error('Error sending email to developer:', error.message);
    }
  }

  markEntry(range, color=null, note=null) {
    try {
      this.db.markEntry(range, color, note);
    } catch (error) {
      console.error('Error marking entry:', error.message);
    }
  }

  getCommunication(commID) {
    return CACHED_SETTINGS.VALUES.COMM_CODES[commID] || null;
  }

  fillPlaceholders(template, context) {
    return template.replace(/{{(.*?)}}/g, (match, p1) => {
      return context[p1.trim()] || '';
    });
  }
}
