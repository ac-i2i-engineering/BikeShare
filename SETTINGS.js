class Settings {
  constructor() {
    this.management_ss_ID = "1Ux1Lt9KNXVNrE0KP6C-Wbf5xmeos5Yf-ybmAfRtEvmQ";
    this.cacheName = "configCache";
    this.cacheValues = null;
    this.settingRangeMap = {
      mainConfig: {
        systemButtons: "A7:C13",
        systemTime: "F7:H9",
        coreConfig: "F14:H16",
        reportGenerationSettings: "F21:H23",
      },
      sheetsConfig: {
        bikesStatus: "A10:C13",
        reportSheet: "F10:H13",
        checkoutLogs: "A21:C24",
        userStatus: "F21:H24",
        returnLogs: "A32:C35",
      },
      notificationsConfig: {
        successMessages: "A13:H17",
        errorMessages: "A25:H34",
      },
    };
    this.fetchCache();
  }

  convertType(value, type) {
    if (typeof type !== "string") return value;
    switch (type.toLowerCase()) {
      case "number":
        return Number(value);
      case "button":
        return value.toString().toUpperCase() === "ON";
      case "datetime":
        return new Date(value);
      case "string":
      case "range":
      default:
        return value.toString();
    }
  }

  extractEmailFromString(text) {
    if (!text || text.trim() === "-") return null;

    const subjectMatch = text.match(/SUBJECT: '([^']*)'/);
    const bodyMatch = text.match(/BODY: '([^']*)'/);

    return {
      subject: subjectMatch ? subjectMatch[1] : "",
      body: bodyMatch ? bodyMatch[1].replace(/""/g, '"') : "",
    };
  }
  setSettingsCache() {
    let loadedConfigs = {};
    const ss = SpreadsheetApp.openById(this.management_ss_ID);
    for (const sheetName in this.settingRangeMap) {
      const sheet = ss.getSheetByName(sheetName);
      for (const tableName in this.settingRangeMap[sheetName]) {
        const tableRange = sheet.getRange(
          this.settingRangeMap[sheetName][tableName]
        );
        const table = tableRange.getValues();

        if (sheetName === "notificationsConfig") {
          let rowCounter = tableRange.getRow();
          loadedConfigs[tableName] = table.reduce((acc, curItem, index) => {
            let [col1, col2, col3, col4, col5, col6, col7, col8] = curItem;
            const currRow = rowCounter + index;
            const cellRange = `E${currRow}`;
            acc[col1] = {
              markEntry: {
                bgColor: sheet.getRange(cellRange).getBackground(),
                note: col5,
              },
              notifyUser: this.extractEmailFromString(col6),
              notifyAdmin: this.extractEmailFromString(col7),
              notifyDeveloper: this.extractEmailFromString(col8),
            };
            return acc;
          }, {});
          continue;
        }

        loadedConfigs[tableName] = table.reduce((acc, curItem) => {
          let [col1, col2, col3] = curItem;
          col3 = this.convertType(col3, col2);
          acc[col1] = col3;
          return acc;
        }, {});
      }
    }
    CacheService.getDocumentCache().put(
      this.cacheName,
      JSON.stringify(loadedConfigs)
    );
  }
  fetchCache() {
    try {
      let configs = CacheService.getDocumentCache().get(this.cacheName);
      if (!configs) {
        this.setSettingsCache();
        // Logger.log("Settings cache was empty, reloading...");
        configs = CacheService.getDocumentCache().get(this.cacheName);
      }
      this.cacheValues = JSON.parse(configs);
    } catch (error) {
      console.error("Error fetching cache:", error);
      return null;
    }
  }

  isSystemActive() {
    return this.cacheValues.systemButtons?.SYSTEM_ACTIVE ?? true;
  }

  canCheckoutWithUnreturnedBike() {
    return (
      this.cacheValues.systemButtons?.CAN_CHECKOUT_WITH_UNRETURNED_BIKE ?? false
    );
  }

  getMaxCheckoutHours() {
    return this.cacheValues.coreConfig?.MAX_CHECKOUT_HOURS ?? 72;
  }

  getFuzzyMatchingThreshold() {
    return this.cacheValues.coreConfig?.FUZZY_MATCHING_THRESHOLD ?? 0.3;
  }

  getAdminEmail() {
    return (
      this.cacheValues.coreConfig?.ADMIN_EMAIL ??
      "ndayishimiyeemile96@gmail.com"
    );
  }

  isAutoResetEnabled() {
    return this.cacheValues.coreConfig?.AUTO_RESET_ENABLED ?? true;
  }

  getReportGenerationSettings() {
    return (
      this.cacheValues.reportGenerationSettings ?? {
        ENABLED: true,
        DAYS_INTERVAL: 1,
        FIRST_GENERATION_DATE: "2025-07-01",
        GENERATION_HOUR: 2,
      }
    );
  }
}

// =============================================================================
// CONFIGURATION AND CONSTANTS
// =============================================================================
const settings = new Settings();
let CONFIG = {
  DEBUG_MODE: true,
  AUTO_RESET_ENABLED: true,
  ADMIN_EMAIL: settings.getAdminEmail(),
  SHEETS: {
    BIKES_STATUS: settings.cacheValues.bikesStatus,
    USER_STATUS: settings.cacheValues.userStatus,
    CHECKOUT_LOGS: settings.cacheValues.checkoutLogs,
    RETURN_LOGS: {
      ...settings.cacheValues.returnLogs,
      DATE_COLUMN: 0,
    },
    REPORTS: {
      ...settings.cacheValues.reportSheet,
      OVERDUE_RETURNS_COLUMN: 6,
      RETURN_MISMATCHES_COLUMN: 10,
      TOTAL_USAGE_HOURS_COLUMN: 12,
      PERIOD_NUM_COLUMN: 2,
    },
  },
  FORMS: {
    CHECKOUT_FORM_ID: "1ThxJFJLjtQkvzXuX7ZPa2vEYWzIokWK89GUbW507zpM",
    RETURN_FORM_ID: "1VFAY-49Qx2Ob5OdVZkI2rH9xbaT0DRF63q6fWZh-Pbc",
    CHECKOUT_FIELD_IDS: {
      EMAIL: 1337405542,
      BIKE_HASH: 697424273,
      KEY_AVAILABLE: 998220660,
      CONDITION_OK: 1671678893,
    },
    RETURN_FIELD_IDS: {
      EMAIL: 1224208618,
      BIKE_NAME: 1916897857,
      CONFIRM_BIKE_NAME: 1814237596,
      ASSURE_RODE_BIKE: 788338430,
      BIKE_MISMATCH_EXPLANATION: 993479484,
      RETURNING_FOR_FRIEND: 2017212460,
      FRIEND_EMAIL: 552890597,
      ISSUES_CONCERNS: 71285803,
    },
  },
  REGULATIONS: {
    CAN_CHECKOUT_WITH_UNRETURNED_BIKE: false,
    NEED_USER_CONFIRM_KEY_ACCESS: false,
    MAX_CHECKOUT_HOURS: settings.getMaxCheckoutHours(),
  },
  FUZZY_MATCHING_THRESHOLD: settings.getFuzzyMatchingThreshold(),
  NOTIFICATION_SETTINGS: {
    ENABLE_USER_NOTIFICATIONS: settings.cacheValues.systemButtons?.ENABLE_USER_NOTIFICATIONS,
    ENABLE_ADMIN_NOTIFICATIONS: settings.cacheValues.systemButtons?.ENABLE_ADMIN_NOTIFICATIONS,
    ENABLE_DEV_NOTIFICATIONS: settings.cacheValues.systemButtons?.ENABLE_DEV_NOTIFICATIONS,
  },
  REPORT_GENERATION: settings.getReportGenerationSettings(),
  COMM_CODES: {
    ...settings.cacheValues.successMessages,
    ...settings.cacheValues.errorMessages,
  },
};
