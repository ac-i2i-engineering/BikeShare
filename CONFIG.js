// =============================================================================
// CONFIGURATION AND CONSTANTS
// =============================================================================
const CONFIG = {
  DEBUG_MODE: true,
  SHEETS: {
    BIKES_STATUS: 'Bikes Status',
    USER_STATUS: 'User Status', 
    CHECKOUT_LOGS: 'Checkout Logs',
    RETURN_LOGS: 'Return Logs',
    REPORTS: 'Reports'
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
    CAN_CHECKOUT_WITH_UNRETURNED_BIKE: true,
    CAN_CHECKOUT_UNAVAILABLE_BIKE: true,
    NEED_USER_CONFIRM_KEY_ACCESS: false,
    MAX_CHECKOUT_HOURS: 24,
  }
};