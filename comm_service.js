// =============================================================================
// FUNCTIONAL COMMUNICATION OPERATIONS
// Pure functions for notifications and messaging
// =============================================================================

const COMM = {
  // Handle communication by ID
  handleCommunication: (commID, context) => {
    const comm = COMM.getCommunication(commID);
    if (!comm) {
      Logger.log(`Communication ID ${commID} not found`);
      throw new Error(`Communication ID ${commID} not found`);
    }

    Logger.log(`Processing communication ${commID} with context:`, JSON.stringify(context));
    const results = [];
    
    if (comm.notifyUser && CACHED_SETTINGS.VALUES.NOTIFICATION_SETTINGS.ENABLE_USER_NOTIFICATIONS) {
      Logger.log(`Sending user notification to ${context.userEmail}`);
      const userResult = COMM.notifyUser(
        context.userEmail,
        COMM.fillPlaceholders(comm.notifyUser.subject, context),
        COMM.fillPlaceholders(comm.notifyUser.body, context)
      );
      Logger.log(`User notification result: ${JSON.stringify(userResult)}`);
      results.push(userResult);
    } else {
      Logger.log(`Skipping user notification - notifyUser: ${!!comm.notifyUser}, enabled: ${CACHED_SETTINGS.VALUES.NOTIFICATION_SETTINGS.ENABLE_USER_NOTIFICATIONS}`);
    }

    if (comm.notifyAdmin && CACHED_SETTINGS.VALUES.NOTIFICATION_SETTINGS.ENABLE_ADMIN_NOTIFICATIONS) {
      Logger.log(`Sending admin notification`);
      const adminResult = COMM.notifyAdmin(
        COMM.fillPlaceholders(comm.notifyAdmin.subject, context),
        COMM.fillPlaceholders(comm.notifyAdmin.body, context)
      );
      Logger.log(`Admin notification result: ${JSON.stringify(adminResult)}`);
      results.push(adminResult);
    } else {
      Logger.log(`Skipping admin notification - notifyAdmin: ${!!comm.notifyAdmin}, enabled: ${CACHED_SETTINGS.VALUES.NOTIFICATION_SETTINGS.ENABLE_ADMIN_NOTIFICATIONS}`);
    }

    if (comm.notifyDeveloper && CACHED_SETTINGS.VALUES.NOTIFICATION_SETTINGS.ENABLE_DEV_NOTIFICATIONS) {
      Logger.log(`Sending developer notification`);
      const devResult = COMM.notifyDeveloper(
        COMM.fillPlaceholders(comm.notifyDeveloper.subject, context),
        COMM.fillPlaceholders(comm.notifyDeveloper.body, context)
      );
      Logger.log(`Developer notification result: ${JSON.stringify(devResult)}`);
      results.push(devResult);
    } else {
      Logger.log(`Skipping developer notification - notifyDeveloper: ${!!comm.notifyDeveloper}, enabled: ${CACHED_SETTINGS.VALUES.NOTIFICATION_SETTINGS.ENABLE_DEV_NOTIFICATIONS}`);
    }

    if (comm.markEntry && context.range) {
      Logger.log(`Marking entry per admin config - Code: ${commID}, Color: ${comm.markEntry.bgColor}, Note: ${comm.markEntry.note}`);
      const markResult = COMM.markEntry(
        context.range,
        comm.markEntry.bgColor,
        COMM.fillPlaceholders(comm.markEntry.note, context)
      );
      Logger.log(`Mark entry result: ${JSON.stringify(markResult)}`);
      results.push(markResult);
    } else {
      Logger.log(`Skipping entry marking - markEntry: ${comm.markEntry ? 'configured as null' : 'not configured'}, range: ${!!context.range}`);
    }

    return results;
  },

  // Send user notification
  notifyUser: (userEmail, subject, body) => {
    try {
      GmailApp.sendEmail(
        userEmail,
        subject,
        `Hi,\n\n${body}\n\nThank you,\nBike Share Team`,
        { from: CACHED_SETTINGS.VALUES.ORG_EMAIL }
      );
      return { success: true, recipient: userEmail };
    } catch (error) {
      Logger.log(`Error sending email to user: ${error.message}`);
      return { success: false, error: error.message };
    }
  },

  // Send admin notification
  notifyAdmin: (subject, body) => {
    try {
      GmailApp.sendEmail(
        CACHED_SETTINGS.VALUES.ADMIN_EMAIL,
        subject,
        `Hi,\n\n${body}\n\nThank you,\nBike Share Team`,
        { from: CACHED_SETTINGS.VALUES.ORG_EMAIL }
      );
      return { success: true, recipient: 'admin' };
    } catch (error) {
      Logger.log(`Error sending email to admin: ${error.message}`);
      return { success: false, error: error.message };
    }
  },

  // Send developer notification
  notifyDeveloper: (subject, body) => {
    try {
      GmailApp.sendEmail(
        CACHED_SETTINGS.VALUES.DEVELOPER_EMAIL,
        subject,
        `Hi,\n\n${body}\n\nThank you,\nBike Share Team`,
        { from: CACHED_SETTINGS.VALUES.ORG_EMAIL }
      );
      return { success: true, recipient: 'developer' };
    } catch (error) {
      Logger.log(`Error sending email to developer: ${error.message}`);
      return { success: false, error: error.message };
    }
  },

  // Mark sheet entry
  markEntry: (range, color = null, note = null) => {
    try {
      if (!range) return { success: false, error: 'No range provided' };
      DB.markEntry(range, color, note);
      return { success: true };
    } catch (error) {
      Logger.log(`Error marking entry: ${error.message}`);
      return { success: false, error: error.message };
    }
  },

  // Get communication config by ID
  getCommunication: (commID) => CACHED_SETTINGS.VALUES.COMM_CODES[commID] || null,

  // Fill template placeholders
  fillPlaceholders: (template, context) => 
    template.replace(/{{(.*?)}}/g, (match, key) => context[key.trim()] || ''),

  // Batch send notifications
  batchNotify: (notifications) => {
    return notifications.map(notification => {
      switch (notification.type) {
        case 'user':
          return COMM.notifyUser(notification.email, notification.subject, notification.body);
        case 'admin':
          return COMM.notifyAdmin(notification.subject, notification.body);
        case 'developer':
          return COMM.notifyDeveloper(notification.subject, notification.body);
        default:
          return { success: false, error: 'Unknown notification type' };
      }
    });
  }
};