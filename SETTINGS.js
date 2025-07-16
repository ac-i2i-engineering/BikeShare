// =============================================================================
// CONFIGURATION AND CONSTANTS
// =============================================================================
const CONFIG = {
  DEBUG_MODE: true,
  AUTO_RESET_ENABLED: true,
  ADMIN_EMAIL:'ndayishimiyeemile96@gmail.com',
  SHEETS: {
    BIKES_STATUS: {
      NAME:'Bikes Status',
      SORT_COLUMN: 0, 
      SORT_ORDER: 'asc',
      AVAILABILITY_COL_OPTIONS: ['Available', 'Checked Out', 'Out of Service'],
      MAINTENANCE_COL_OPTIONS: ['Good', 'In Repair', 'Has Issues', 'Missing'],
      SIZE_COL_OPTIONS: ['S', 'M', 'L', 'XL'],
      RESET_RANGE: 'E2:L',
    },
    USER_STATUS: {
      NAME:'User Status',
      SORT_COLUMN: 0,
      SORT_ORDER: 'asc',
      RESET_RANGE: 'A2:L',
    },
    CHECKOUT_LOGS: {
      NAME:'Checkout Logs',
      SORT_COLUMN: 0,
      SORT_ORDER: 'desc',
      RESET_RANGE: 'A2:D',
    },
    RETURN_LOGS: {
      NAME:'Return Logs',
      SORT_COLUMN: 0,
      SORT_ORDER: 'desc',
      RESET_RANGE: 'A2:I',
    },
    REPORTS: {
      NAME:'Reports',
      SORT_COLUMN: 0,
      SORT_ORDER: 'desc',
      RESET_RANGE: 'A2:O',
    }
  },
  FORMS: {
    CHECKOUT_FORM_ID: '1ThxJFJLjtQkvzXuX7ZPa2vEYWzIokWK89GUbW507zpM',
    RETURN_FORM_ID: '1VFAY-49Qx2Ob5OdVZkI2rH9xbaT0DRF63q6fWZh-Pbc',
    CHECKOUT_FIELD_IDS: {
      EMAIL: 1337405542,
      BIKE_HASH: 697424273,
      KEY_AVAILABLE: 998220660,
      CONDITION_OK: 1671678893
    },
    RETURN_FIELD_IDS: {
      EMAIL: 1224208618,
      BIKE_NAME: 1916897857,
      CONFIRM_BIKE_NAME: 1814237596,
      ASSURE_RODE_BIKE: 788338430,
      BIKE_MISMATCH_EXPLANATION: 993479484,
      RETURNING_FOR_FRIEND: 2017212460,
      FRIEND_EMAIL: 552890597,
      ISSUES_CONCERNS: 71285803
    },
  },
  BIKE_NAMES:['Gates','Harris','Hitchcock','Humphrey','Meiklejohn','Moore','Olds','Seelye','Stearns'],
  BIKE_HASHES:['39B9B5','3A8BD0','3A81B8','3A8FC0','3E950E','3E9A87','4038A4','437D9E','437FE3'],
  REGULATIONS:{
    MAX_CHECKOUT_HOURS: 4,
    CAN_CHECKOUT_WITH_UNRETURNED_BIKE: false,
    CAN_CHECKOUT_UNAVAILABLE_BIKE: false,
    CAN_RETURN_WITH_MISMATCHED_NAME: false,
    NEED_USER_CONFIRM_KEY_ACCESS: false,
    MAX_CHECKOUT_HOURS: 72, //3 days
  },
  FUZZY_MATCHING_THRESHOLD: 0.3,
  NOTIFICATION_SETTINGS: {
    NOTIFICATION_ENABLED: true,
    SEND_USER_NOTIFICATIONS: true,
    SEND_ADMIN_NOTIFICATIONS: true,
    SEND_DEVELOPER_NOTIFICATIONS: false,
    NOTIFICATION_RETRY_ATTEMPTS: 3,
  },
};

// =============================================================================
// ERROR MANAGEMENT SETUP
// ===============================================================================
const COMM_SEVERITY = {
  HINT : { bgColor: '#9effd5ff'},
  INFO: { bgColor: '#d9a1ffff'},
  WARNING: { bgColor: '#f8e0c7ff'},
  ERROR: { bgColor: '#e9b2a8ff'},
  CRITICAL: { bgColor: '#ff7979c5'}
};
// STRUCTURE:commType_involvedEntity_relatedAction_commID
const COMM_CODES = {
  // Confirm codes
  'CFM_USR_COT_001': {
    triggerMethod: null,
    notifyDeveloper: null,
    notifyUser: {
      subject: 'Bike Checkout Confirmation',
      body: 'Your bike checkout is confirmed. Use the key labeled "{{bikeName}}" to unlock your bike. Please return it within {{maxCheckoutHours}} hours. Thank you for using BikeShare!'
    },
    notifyAdmin: null,
    markEntry: null,
  },
  'CFM_USR_RET_001': {
    triggerMethod: null,
    notifyDeveloper: null,
    notifyUser: {
      subject: 'Bike Return Confirmation',
      body: 'Thank you for returning bike "{{bikeName}}". We hope you had a great ride!'
    },
    notifyAdmin: null,
    markEntry: null,
  },
  'CFM_USR_RET_002': {
    triggerMethod: null,
    notifyDeveloper: null,
    notifyUser: {
      subject: 'Bike Returned on Your Behalf',
      body: 'Your friend "{{friendEmail}}" has returned the bike "{{bikeName}}" for you. Thanks for using BikeShare!'
    },
    notifyAdmin: null,
    markEntry: {
      bgColor: COMM_SEVERITY.INFO.bgColor,
      note: 'Bike returned on behalf of "{{userEmail}}" by "{{friendEmail}}" for bike "{{bikeName}}"'
    },
  },
  'CFM_USR_RET_003': {
    triggerMethod: null,
    notifyDeveloper: null,
    notifyUser: {
      subject: 'Bike Returned for a Friend',
      body: 'You’ve successfully returned bike "{{bikeName}}" for your friend "{{friendEmail}}". Thank you for your help and for using BikeShare!'
    },
    notifyAdmin: null,
    markEntry: {
      bgColor: COMM_SEVERITY.HINT.bgColor,
      note: 'Bike returned for a friend: "{{friendEmail}}" returned bike "{{bikeName}}"'
    },
  },
  'CFM_USR_RET_004': {
    triggerMethod: null,
    notifyDeveloper: null,
    notifyUser: {
      subject: 'Return Warning: Bike Name Mismatch',
      body: 'The return was processed, but the bike name "{{bikeName}}" does not match your last checked out bike "{{lastCheckoutName}}". If this seems incorrect, please contact support.'
    },
    notifyAdmin: null,
    markEntry: {
      bgColor: COMM_SEVERITY.INFO.bgColor,
      note: 'Return processed with name mismatch: returned bike "{{bikeName}}" ≠ last checkout "{{lastCheckoutName}}"'
    }
  },

  // Error codes
  'ERR_USR_COT_001': {
    triggerMethod: null,
    notifyDeveloper: null,
    notifyUser: {
      subject: 'Bike Name Mismatch',
      body: 'The bike name entered doesn’t match the confirmation field. Please make sure both fields are identical before submitting.'
    },
    notifyAdmin: {
      subject: 'Bike Name Mismatch for {{userEmail}}',
      body: 'User entered bike name: "{{bikeName}}", confirmed name: "{{confirmName}}". Please review.'
    },
    markEntry: {
      bgColor: COMM_SEVERITY.INFO.bgColor,
      note: 'Bike name mismatch detected during checkout'
    }
  },
  'ERR_USR_COT_002': {
    triggerMethod: null,
    notifyDeveloper: null,
    notifyUser: {
      subject: 'Unreturned Bike Detected',
      body: 'You still have bike "{{unreturnedBikeName}}" checked out since {{lastCheckoutDate}}. Please return it before checking out another.'
    },
    notifyAdmin: null,
    markEntry: {
      bgColor: COMM_SEVERITY.WARNING.bgColor,
      note: 'Checkout blocked: user has unreturned bike "{{unreturnedBikeName}}" since {{lastCheckoutDate}}'
    }
  },
  'ERR_USR_COT_003': {
    triggerMethod: null,
    notifyDeveloper: null,
    notifyUser: {
      subject: 'Bike Not Found',
      body: 'Bike with hash "{{bikeHash}}" was not found. Please double-check the hash and try again. If the issue continues, contact support.'
    },
    notifyAdmin: null,
    markEntry: {
      bgColor: COMM_SEVERITY.ERROR.bgColor,
      note: 'Checkout failed: bike with hash "{{bikeHash}}" not found'
    },
  },
  'ERR_USR_RET_001': {
    triggerMethod: null,
    notifyDeveloper: null,
    notifyUser: {
      subject: 'Return Failed: Name Mismatch',
      body: 'The bike name "{{bikeName}}" does not match the confirmation "{{confirmBikeName}}". Please ensure both fields are identical before submitting.'
    },
    notifyAdmin: null,
    markEntry: {
      bgColor: COMM_SEVERITY.ERROR.bgColor,
      note: 'Return failed: "{{bikeName}}" ≠ confirmation "{{confirmBikeName}}"'
    }
  },
  'ERR_USR_RET_002': {
    triggerMethod: null,
    notifyDeveloper: null,
    notifyUser: {
      subject: 'Return Failed: Bike Not Found',
      body: 'We couldn’t find the bike named "{{bikeName}}". Please check the name and try again. Contact support if the issue persists.'
    },
    notifyAdmin: null,
    markEntry: {
      bgColor: COMM_SEVERITY.ERROR.bgColor,
      note: 'Return failed: bike "{{bikeName}}" not found'
    }
  },
  'ERR_USR_RET_003': {
    triggerMethod: null,
    notifyDeveloper: null,
    notifyUser: {
      subject: 'Friend Has No Unreturned Bike',
      body: 'No unreturned bike found for "{{friendEmail}}". Please verify the email and try again.'
    },
    notifyAdmin: null,
    markEntry: {
      bgColor: COMM_SEVERITY.ERROR.bgColor,
      note: 'Return failed: no unreturned bike for "{{friendEmail}}"'
    }
  },
  'ERR_USR_RET_004': {
    triggerMethod: null,
    notifyDeveloper: null,
    notifyUser: {
      subject: 'Friend\'s Email Not Provided',
      body: 'It seems you were trying to return a bike for a friend but didn’t provide their email. Please enter their email to proceed.'
    },
    notifyAdmin: null,
    markEntry: {
      bgColor: COMM_SEVERITY.ERROR.bgColor,
      note: 'Return failed: no userEmail provided for friend'
    }
  },
  'ERR_USR_RET_005': {
    triggerMethod: null,
    notifyDeveloper: null,
    notifyUser: {
      subject: 'Return Failed: No Checkout Record Found',
      body: 'We couldn’t find a record of your last bike checkout. If returning for a friend, please use the appropriate form. Contact support if this seems incorrect.'
    },
    notifyAdmin: null,
    markEntry: {
      bgColor: COMM_SEVERITY.ERROR.bgColor,
      note: 'Return failed: no record found for last checkout'
    }
  },
  'ERR_USR_RET_006': {
    triggerMethod: null,
    notifyDeveloper: null,
    notifyUser: {
      subject: 'Return Failed: No Unreturned Bike',
      body: 'You have no unreturned bikes. Your last checkout was bike "{{lastCheckoutName}}" on {{lastCheckoutDate}}, returned on {{lastReturnDate}}. If returning for a friend, please complete the form accordingly. Contact support if needed.'
    },
    notifyAdmin: null,
    markEntry: {
      bgColor: COMM_SEVERITY.ERROR.bgColor,
      note: 'Return failed: no unreturned bike. Last checked out: "{{lastCheckoutName}}" on {{lastCheckoutDate}}, returned {{lastReturnDate}}'
    }
  },
  'ERR_USR_RET_007': {
    triggerMethod: null,
    notifyDeveloper: null,
    notifyUser: {
      subject: 'Return Failed: Bike Name Mismatch',
      body: 'The bike "{{bikeName}}" does not match your last checked out bike "{{lastCheckoutName}}". Please verify the name on your key and try again.'
    },
    notifyAdmin: null,
    markEntry: {
      bgColor: COMM_SEVERITY.ERROR.bgColor,
      note: 'Return failed: "{{bikeName}}" ≠ last checkout "{{lastCheckoutName}}"'
    }
  },
  'ERR_USR_RET_008': {
    triggerMethod: null,
    notifyDeveloper: {
      subject: 'Return Failed: Could Not Process Friend Return',
      body: 'On {{timestamp}}, user "{{userEmail}}" attempted to return bike "{{bikeName}}" for friend "{{friendEmail}}" but failed. Error: {{errorMessage}}'
    },
    notifyUser: {
      subject: 'Return Failed: Could Not Return for a Friend',
      body: 'We encountered a problem while processing the return of bike "{{bikeName}}" on behalf of "{{friendEmail}}". Please try again later or contact support.'
    },
    notifyAdmin: {
      subject: 'Return Failed: Could Not Return for Friend',
      body: 'On {{timestamp}}, user "{{userEmail}}" attempted to return bike "{{bikeName}}" for friend "{{friendEmail}}" but the process failed. Error: {{errorMessage}} [Copy sent to developers]'
    },
    markEntry: {
      bgColor: COMM_SEVERITY.ERROR.bgColor,
      note: 'Return failed: "{{userEmail}}" could not return "{{bikeName}}" for "{{friendEmail}}", error: "{{errorMessage}}"'
    }
  }
}

