class Settings {
  constructor() {
    this.management_ss_ID = "1Ux1Lt9KNXVNrE0KP6C-Wbf5xmeos5Yf-ybmAfRtEvmQ";
    this.management_ss = SpreadsheetApp.openById(this.management_ss_ID);
    this.cacheName = "configCache";
    this.cacheValues = null;
    this.VALUES = {};
    this.settingRangeMap = {
      mainConfig: {
        systemButtons: "A7:C14",
        systemTime: "F7:H9",
        coreConfig: "F14:H16",
        reportGenerationSettings: "F21:H23",
        miscellaneous: "A20:C21",
      },
      sheetsConfig: {
        bikesStatus: "A10:C13",
        reportSheet: "F10:H13",
        checkoutLogs: "A21:C24",
        userStatus: "F21:H24",
        returnLogs: "A32:C35",
      },
      notificationsConfig: {
        successMessages: "A9:H14",
        errorMessages: "A22:H32",
      },
    };
    if (!this.refreshCache(false)) {
      throw new Error("Failed to initialize Settings: Cache refresh failed.");
    };
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
      case "array":
        if (typeof value !== "string") return [];
        const separator = "___";
        const cleaned = value
          .split(separator)
          .map(item => item.trim().toLowerCase())
        return cleaned;
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

  extractNoteFromString(cellRange, sheet, text) {
    const unAllowedNotes = ["", "-", "none"];
    return !unAllowedNotes.includes(text.trim().toLowerCase()) ? {
      bgColor: sheet.getRange(cellRange).getBackground(),
      note: text,
    } : null
  }

  setSettingsCache() {
    let loadedConfigs = {};
    for (const sheetName in this.settingRangeMap) {
      const sheet = this.management_ss.getSheetByName(sheetName);
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
              markEntry: this.extractNoteFromString(cellRange, sheet, col5),
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
  // New unified method
  refreshCache(forceRefresh = false) {
    try {
      let configs = null;
      configs = CacheService.getDocumentCache().get(this.cacheName);
      if(forceRefresh || !configs){
         // Load from management spreadsheet
        this.setSettingsCache();
        configs = CacheService.getDocumentCache().get(this.cacheName);
      }
      this.cacheValues = JSON.parse(configs);
      this.setGlobalConfigs();
      return true;
    } catch (error) {
      console.error("Error managing cache:", error);
      return false;
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
      "studentEmail@gmail.com"
    );
  }

  isAutoResetEnabled() {
    return this.cacheValues.coreConfig?.ENABLE_FORCED_RESET ?? true;
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

  setGlobalConfigs() {
  this.VALUES = {
      DEBUG_MODE: true,
      ENABLE_FORCED_RESET: true,
      SYSTEM_ACTIVE: this.isSystemActive(),
      NEXT_SYSTEM_SHUTDOWN_DATE:this.cacheValues.systemTime.NEXT_SYSTEM_SHUTDOWN_DATE,
      NEXT_SYSTEM_ACTIVATION_DATE:this.cacheValues.systemTime.NEXT_SYSTEM_ACTIVATION_DATE,
      ADMIN_EMAIL: this.getAdminEmail(),
      ORG_EMAIL: 'ndayishimiyeemile96@gmail.com',
      MANAGEMENT_SS_ID: this.management_ss_ID,
      MAIN_DASHBOARD_SS_ID: '1XE9b58isw2MreAvcNSDiCTIIlL09zFRWMKcCBtTkbbE',
      SHEETS: {
        BIKES_STATUS: this.cacheValues.bikesStatus,
        USER_STATUS: this.cacheValues.userStatus,
        CHECKOUT_LOGS: this.cacheValues.checkoutLogs,
        RETURN_LOGS: {
          ...this.cacheValues.returnLogs,
          DATE_COLUMN: 0,
        },
        REPORTS: {
          ...this.cacheValues.reportSheet,
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
        MAX_CHECKOUT_HOURS: this.getMaxCheckoutHours(),
      },
      FUZZY_MATCHING_THRESHOLD: this.getFuzzyMatchingThreshold(),
      NOTIFICATION_SETTINGS: {
        ENABLE_USER_NOTIFICATIONS: this.cacheValues.systemButtons?.ENABLE_USER_NOTIFICATIONS,
        ENABLE_ADMIN_NOTIFICATIONS: this.cacheValues.systemButtons?.ENABLE_ADMIN_NOTIFICATIONS,
        ENABLE_DEV_NOTIFICATIONS: this.cacheValues.systemButtons?.ENABLE_DEV_NOTIFICATIONS,
      },
      REPORT_GENERATION: {...this.getReportGenerationSettings(),
      ENABLE_REPORT_GENERATION: this.cacheValues.systemButtons?.ENABLE_REPORT_GENERATION},
      IGNORED_REPORT_STMTS_ON_RFORM: this.cacheValues.miscellaneous?.IGNORED_REPORT_STMTS_ON_RFORM || [],
      COMM_CODES: {
        ...this.cacheValues.successMessages,
        ...this.cacheValues.errorMessages,
      },
    }
  }

  getValueCellByKeyName(key, tableName) {
    for (const sheetName in this.settingRangeMap) {
      for (const table in this.settingRangeMap[sheetName]) {
        if (table === tableName) {
          const sheet = this.management_ss.getSheetByName(sheetName);
          const range = this.settingRangeMap[sheetName][table];
          const tableRange = sheet.getRange(range);
          const tableValues = tableRange.getValues();
          for (let i = 0; i < tableValues.length; i++) {
            if (tableValues[i][0] === key) {
              // Value is always in the 3rd column (index 3 in A1 notation)
              return sheet.getRange(
                tableRange.getRow() + i,
                tableRange.getColumn() + 2
              );
            }
          }
          return null;
        }
      }
    }
    return null;
  }

}

// =============================================================================
// CONFIGURATION AND CONSTANTS
// =============================================================================
const CACHED_SETTINGS = new Settings();