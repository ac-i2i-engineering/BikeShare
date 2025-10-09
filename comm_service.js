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
      throw new Error(`❌Communication ID ${commID} not found`);
    }

    Logger.log(`Processing communication ${commID} with context:${JSON.stringify(context)}`);
    const results = [];
    
    if (comm.notifyUser && CACHED_SETTINGS.VALUES.NOTIFICATION_SETTINGS.ENABLE_USER_NOTIFICATIONS) {
      Logger.log(`Preparing user notification to ${context.userEmail} for ${commID}`);
      
      // Fill placeholders with validation
      const subjectResult = COMM.fillPlaceholders(comm.notifyUser.subject, context, commID);
      const bodyResult = COMM.fillPlaceholders(comm.notifyUser.body, context, commID);
      
      if (subjectResult.hasErrors || bodyResult.hasErrors) {
        Logger.log(`❌ Cannot send user notification for ${commID} - missing data: ${[...new Set([...subjectResult.missingKeys || [], ...bodyResult.missingKeys || []])].join(', ')}`);
        results.push({ success: false, error: 'Missing placeholder data', commID });
      } else {
        const userResult = COMM.notifyUser(
          context.userEmail,
          subjectResult.result,
          bodyResult.result,
          commID,
          context.isReturningForFriend ? context.friendEmail : null
        );
        results.push(userResult);
      }
    } else {
      Logger.log(`Skipping user notification - notifyUser: ${!!comm.notifyUser}, enabled: ${CACHED_SETTINGS.VALUES.NOTIFICATION_SETTINGS.ENABLE_USER_NOTIFICATIONS}`);
    }

    if (comm.notifyAdmin && CACHED_SETTINGS.VALUES.NOTIFICATION_SETTINGS.ENABLE_ADMIN_NOTIFICATIONS) {
      Logger.log(`Preparing admin notification for ${commID}`);
      
      const subjectResult = COMM.fillPlaceholders(comm.notifyAdmin.subject, context, commID);
      const bodyResult = COMM.fillPlaceholders(comm.notifyAdmin.body, context, commID);
      
      const adminResult = COMM.notifyAdmin(
        subjectResult.result || comm.notifyAdmin.subject,
        bodyResult.result || comm.notifyAdmin.body
      );
      Logger.log(`Admin notification result: ${JSON.stringify(adminResult)}`);
      results.push(adminResult);
    } else {
      Logger.log(`Skipping admin notification - notifyAdmin: ${!!comm.notifyAdmin}, enabled: ${CACHED_SETTINGS.VALUES.NOTIFICATION_SETTINGS.ENABLE_ADMIN_NOTIFICATIONS}`);
    }

    if (comm.notifyDeveloper && CACHED_SETTINGS.VALUES.NOTIFICATION_SETTINGS.ENABLE_DEV_NOTIFICATIONS) {
      Logger.log(`Preparing developer notification for ${commID}`);
      
      const subjectResult = COMM.fillPlaceholders(comm.notifyDeveloper.subject, context, commID);
      const bodyResult = COMM.fillPlaceholders(comm.notifyDeveloper.body, context, commID);
      
      const devResult = COMM.notifyDeveloper(
        subjectResult.result || comm.notifyDeveloper.subject,
        bodyResult.result || comm.notifyDeveloper.body
      );
      Logger.log(`Developer notification result: ${JSON.stringify(devResult)}`);
      results.push(devResult);
    } else {
      Logger.log(`Skipping developer notification - notifyDeveloper: ${!!comm.notifyDeveloper}, enabled: ${CACHED_SETTINGS.VALUES.NOTIFICATION_SETTINGS.ENABLE_DEV_NOTIFICATIONS}`);
    }

    if (comm.markEntry && context.range) {
      Logger.log(`Marking entry per admin config - Code: ${commID}, Color: ${comm.markEntry.bgColor}, Note: ${comm.markEntry.note}`);
      
      const noteResult = COMM.fillPlaceholders(comm.markEntry.note, context, commID);
      const markResult = COMM.markEntry(
        context.range,
        comm.markEntry.bgColor,
        noteResult.result || comm.markEntry.note
      );
      Logger.log(`Mark entry result: ${JSON.stringify(markResult)}`);
      results.push(markResult);
    } else {
      Logger.log(`Skipping entry marking - markEntry: ${comm.markEntry ? 'configured as null' : 'not configured'}, range: ${!!context.range}`);
    }

    return results;
  },

  // Send user notification with validation
  notifyUser: (userEmail, subject, body, commID = 'unknown', friendEmail = null) => {
    let subjectStr = '';
    let bodyStr = '';
    try {
      // Validate email
      if (!userEmail || typeof userEmail !== 'string' || !userEmail.includes('@')) {
        throw new Error('Invalid or missing email address');
      }
      
      // Ensure subject and body are strings
  subjectStr = typeof subject === 'string' ? subject : String(subject || '');
  bodyStr = typeof body === 'string' ? body : String(body || '');
      
      // Check for malformed content (missing placeholders)
      if (subjectStr.includes('[MISSING:') || bodyStr.includes('[MISSING:')) {
        Logger.log(`❌ Blocking malformed email to ${userEmail} for ${commID} - contains missing placeholders`);
        throw new Error('Email contains missing placeholder data');
      }
      
      GmailApp.sendEmail(
        userEmail,
        subjectStr,
        `Hi,\n\n${bodyStr}\n\nThank you,\nBike Share Team`,
        { from: CACHED_SETTINGS.VALUES.ORG_EMAIL,
          cc:friendEmail
         }
      );
      Logger.log(`✅ Email sent successfully to ${userEmail} for ${commID}`);
      return { success: true, recipient: userEmail };
    } catch (error) {
      Logger.log(`❌ Failed to send email to ${userEmail} for ${commID}: ${error.message}`);
      
      // Notify admin of email failure
      try {
        COMM.notifyAdmin(
          `Email Delivery Failure - ${commID}`,
          `Failed to send notification to ${userEmail}.\n\nError: ${error.message}\n\nSubject: ${subjectStr}\n\nBody: ${bodyStr}`
        );
      } catch (adminError) {
        Logger.log(`❌ Also failed to notify admin of email failure: ${adminError.message}`);
      }
      
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

  // Fill template placeholders with validation
  fillPlaceholders: (template, context, commID = 'unknown') => {
    if (!template || typeof template !== 'string') {
      return { result: template || '', hasErrors: false, missingKeys: [] };
    }
    if (!context || typeof context !== 'object') {
      return { result: template, hasErrors: false, missingKeys: [] };
    }
    
    let hasErrors = false;
    const missingKeys = [];
    
    const result = template.replace(/{{(.*?)}}/g, (match, key) => {
      const trimmedKey = key.trim();
      const value = context[trimmedKey];
      
      if (value === undefined || value === null || value === '') {
        hasErrors = true;
        missingKeys.push(trimmedKey);
        Logger.log(`❌ Missing placeholder data for '${trimmedKey}' in ${commID}. available: ${Object.keys(context).join(', ')}`);
        //DEBUG
        Object.entries(context).forEach(([contextKey, contextValue]) => {
          Logger.log(`Context key: '${contextKey}', value: '${contextValue}'`);
        });
        ///
        return `[MISSING: ${trimmedKey}]`; // Clear indicator of missing data
      }
      
      Logger.log(`✅ Filled placeholder '${trimmedKey}' with '${value}' in ${commID}`);
      return String(value);
    });
    
    if (hasErrors) {
      Logger.log(`⚠️ Template filling errors in ${commID}. Missing keys: ${missingKeys.join(', ')}`);
    }
    
    return { result, hasErrors, missingKeys };
  },

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