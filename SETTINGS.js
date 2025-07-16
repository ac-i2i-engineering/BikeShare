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
    SEND_USER_NOTIFICATIONS: false,
    SEND_ADMIN_NOTIFICATIONS: false,
    SEND_DEVELOPER_NOTIFICATIONS: false,
    NOTIFICATION_RETRY_ATTEMPTS: 3,
  },
};

// =============================================================================
// ERROR MANAGEMENT SETUP
// ===============================================================================
const COMM_SEVERITY = {
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
      body: 'Thank you for using BikeShare! You can unlock your checked-out bike using the key named "{{bikeName}}". Please return it within {{maxCheckoutHours}} hours.'
    },
    notifyAdmin: null,
    markEntry: null,
  },
  'CFM_USR_RET_001': {
    triggerMethod: null,
    notifyDeveloper: null,
    notifyUser: {
      subject: 'Bike Return Confirmation',
      body: 'Thank you for returning the bike "{{bikeName}}". We hope you enjoyed your ride!'
    },
    notifyAdmin: null,
    markEntry: null,
  },
  'CFM_USR_RET_002': {
    triggerMethod: null,
    notifyDeveloper: null,
    notifyUser: {
      subject: 'Bike Returned on your Behalf',
      body: 'Your friend "{{friendEmail}}" has returned the bike "{{bikeName}}" on your behalf. Thank you for using BikeShare!'
    },
    notifyAdmin: null,
    markEntry: {
      bgColor: COMM_SEVERITY.INFO.bgColor,
      note: 'Bike returned on behalf of user "{{userEmail}}" by friend "{{friendEmail}}" for bike "{{bikeName}}"'
    },
  },
  'CFM_USR_RET_003': {
    triggerMethod: null,
    notifyDeveloper: null,
    notifyUser: {
      subject: 'Bike Returned for a Friend',
      body: 'You have successfully returned the bike "{{bikeName}}" for your friend "{{friendEmail}}". Thank you for using BikeShare!'
    },
    notifyAdmin: null,
    markEntry: null,
  },
  'CFM_USR_RET_004': {
    triggerMethod: null,
    notifyDeveloper: null,
    notifyUser: {
      subject: 'RETURN WARNING: Returned name does not match checkout',
      body: 'Return processed. However, the returned bike name "{{bikeName}}" does not match the last checked out bike "{{lastCheckoutName}}". If this is an error, please contact support.'
    },
    notifyAdmin: null,
    markEntry: {
      bgColor: COMM_SEVERITY.INFO.bgColor,
      note: 'Return processed with name mismatch: returned bike "{{bikeName}}" does not match last checked out bike "{{lastCheckoutName}}"'
    }
  },
  // Error codes
  'ERR_USR_COT_001': {
    triggerMethod: null,
    notifyDeveloper: null,
    notifyUser: {
      subject: 'Bike Name Mismatch',
      body: 'The bike name you entered does not match the confirmation. Please ensure both fields are identical before submitting.'
    },
    notifyAdmin: {
      subject: 'Bike Name Mismatch for {{userEmail}}',
      body: 'User entered bike name: "{{bikeName}}", confirmed name: "{{confirmName}}". Please review the submission.'
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
      body: 'You still have "{{unreturnedBikeName}}" checked out since {{lastCheckoutDate}}. Please return it before checking out another bike.'
    },
    notifyAdmin: null,
    markEntry: {
      bgColor: COMM_SEVERITY.WARNING.bgColor,
      note: 'Checkout blocked: user has unreturned bike "{{unreturnedBikeName}}" from {{lastCheckoutDate}}'
    }
  },
  'ERR_USR_COT_003': {
    triggerMethod: null,
    notifyDeveloper: null,
    notifyUser: {
      subject: 'Bike Not Found',
      body: 'The bike with hash "{{bikeHash}}" could not be found. Please retry and ensure the bike hash is correct. If the issue persists, contact support.'
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
      subject: 'Bike Return Failed: Name Mismatch',
      body: 'The bike name "{{bikeName}}" does not match the confirmation "{{confirmBikeName}}". Please ensure both fields are identical before submitting.'
    },
    notifyAdmin: null,
    markEntry: {
      bgColor: COMM_SEVERITY.ERROR.bgColor,
      note: 'Return failed: bike name "{{bikeName}}" does not match confirmation "{{confirmBikeName}}"'
    }
  },
  'ERR_USR_RET_002': {
    triggerMethod: null,
    notifyDeveloper: null,
    notifyUser: {
      subject: 'RETURN FAILED: Couldn\'t Find Bike',
      body: 'The bike with name "{{bikeName}}" could not be found. Verify the bike name and try again. If the issue persists, contact support.'
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
      subject: 'Friend has no Unreturned Bike',
      body: 'The userEmail "{{friendEmail}}" does not have any unreturned bike records. Please verify the userEmail and try again.'
    },
    notifyAdmin: null,
    markEntry: {
      bgColor: COMM_SEVERITY.ERROR.bgColor,
      note: 'Return failed: friend\'s userEmail "{{friendEmail}}" has no unreturned bike'
    }
  },
  'ERR_USR_RET_004': {
    triggerMethod: null,
    notifyDeveloper: null,
    notifyUser: {
      subject: 'Friend\'s Email Not Provided',
      body: 'Seems like you were trying to return a bike on behalf of a friend, but their userEmail was not provided. Please provide the friend\'s userEmail to proceed.'
    },
    notifyAdmin: null,
    markEntry: {
      bgColor: COMM_SEVERITY.ERROR.bgColor,
      note: 'Return failed: friend\'s userEmail not provided'
    }
  },
  'ERR_USR_RET_005': {
    triggerMethod: null,
    notifyDeveloper: null,
    notifyUser: {
      subject: 'RETURN FAILED: No Record for Last Checkout',
      body: 'It seems you have no record of the last bike checkout. If you are returning for a friend, please fill the return form accordingly. Else, If you believe this is an error, contact support.'
    },
    notifyAdmin: null,
    markEntry: {
      bgColor: COMM_SEVERITY.ERROR.bgColor,
      note: 'Return failed: no record for last checkout'
    }
  },
  'ERR_USR_RET_006': {
    triggerMethod: null,
    notifyDeveloper: null,
    notifyUser: {
      subject: 'RETURN FAILED: No Unreturned Bike',
      body: 'You have no unreturned bike records. You lastly checked out bike {{lastCheckoutName}} on {{lastCheckoutDate}}, but it\'s been returned on {{lastReturnDate}}. If you are returning for a friend, please fill the return form accordingly. Else, If you believe this is an error, contact support.'
    },
    notifyAdmin: null,
    markEntry: {
      bgColor: COMM_SEVERITY.ERROR.bgColor,
      note: 'Return failed: user has no unreturned bike, last checked out bike "{{lastCheckoutName}}" on "{{lastCheckoutDate}}", returned on "{{lastReturnDate}}"'
    }
  },
  'ERR_USR_RET_007': {
    triggerMethod: null,
    notifyDeveloper: null,
    notifyUser: {
      subject: 'RETURN FAILED: Bike Name Mismatch',
      body: 'The bike "{{bikeName}}" does not match the last checked out bike "{{lastCheckoutName}}". Verify name on your key and try again.'
    },
    notifyAdmin: null,
    markEntry: {
      bgColor: COMM_SEVERITY.ERROR.bgColor,
      note: 'Return failed: bike "{{bikeName}}" does not match last checked out bike "{{lastCheckoutName}}"'
    }
  },
  'ERR_USR_RET_008': {
    triggerMethod: null,
    notifyDeveloper: {
      subject: 'RETURN FAILED: User could not return for a friend',
      body: 'On {{timestamp}}, user "{{userEmail}}" tried to return bike "{{bikeName}}" for friend "{{friendEmail}}", but the operation failed. Error: {{error}}'
    },
    notifyUser: {
      subject: 'RETURN FAILED: Could not return bike for a friend',
      body: 'We encountered an issue while trying to return the bike "{{bikeName}}" for your friend "{{friendEmail}}". Please try again later or contact support if the issue persists.'
    },
    notifyAdmin: {
      subject: 'RETURN FAILED: User could not return bike for a friend',
      body: 'On {{timestamp}}, user "{{userEmail}}" tried to return bike "{{bikeName}}" for friend "{{friendEmail}}", but the operation failed. Error: {{error}}[copy sent to developers to assess the issue]'
    },
    markEntry: {
      bgColor: COMM_SEVERITY.ERROR.bgColor,
      note: 'Return failed: user "{{userEmail}}" could not return bike "{{bikeName}}" for friend "{{friendEmail}}", error: "{{error}}"'
    }
  }
}
