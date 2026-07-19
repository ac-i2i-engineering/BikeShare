class Settings {
  constructor() {
    this.management_ss_ID = "1IMvK9c8jWMqHCIoF4_yCQIrnreLB7VyqvgQSrASOimU";
    this.management_ss = SpreadsheetApp.openById(this.management_ss_ID);
    this.cacheName = "configCache";
    this.cacheExpirationSeconds = 21600; // 6 hours (max for ScriptCache)
    this.cacheValues = null;
    this.VALUES = {};
    this.settingRangeMap = {
      mainConfig: {
        systemButtons: "A7:C14",
        systemTime: "F7:H9",
        coreConfig: "F14:H15",
        reportGenerationSettings: "F20:H22",
        miscellaneous: "A20:C20",
      },
      sheetsConfig: {
        bikesStatus: "A10:C13",
        reportSheet: "F10:H13",
        checkoutLogs: "A21:C24",
        userStatus: "F21:H24",
        returnLogs: "A32:C35",
      },
      notificationsConfig: {
        successMessages: "A9:H13",
        errorMessages: "A21:H33",
      },
    };
    if (!this.refreshCache(false)) {
      throw new Error("Failed to initialize Settings: Cache refresh failed.");
    }
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
          .map((item) => item.trim().toLowerCase());
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
    } : null;
  }

  setSettingsCache() {
    const loadStartTime = Date.now();
    try {
      let loadedConfigs = {};
      Logger.log("📊 Starting to load settings from management spreadsheet...");
      Logger.log(`📋 Management Spreadsheet ID: ${this.management_ss_ID}`);

      for (const sheetName in this.settingRangeMap) {
        Logger.log(`📄 Loading settings from sheet: ${sheetName}`);
        const sheet = this.management_ss.getSheetByName(sheetName);
        if (!sheet) {
          throw new Error(
            `❌Sheet '${sheetName}' not found in management spreadsheet`
          );
        }

        for (const tableName in this.settingRangeMap[sheetName]) {
          Logger.log(
            `📊 Loading table: ${tableName} from range: ${this.settingRangeMap[sheetName][tableName]}`
          );
          const tableRange = sheet.getRange(
            this.settingRangeMap[sheetName][tableName]
          );
          const table = tableRange.getValues();

          if (sheetName === "notificationsConfig") {
            let rowCounter = tableRange.getRow();
            loadedConfigs[tableName] = table.reduce((acc, curItem, index) => {
              let [col1, , , , col5, col6, col7, col8] = curItem;
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

      // Validate loaded configs
      if (!loadedConfigs || Object.keys(loadedConfigs).length === 0) {
        throw new Error("No configuration data loaded from spreadsheet");
      }

      const loadTime = Date.now() - loadStartTime;
      const configSections = Object.keys(loadedConfigs);
      Logger.log(
        `✅ Loaded ${configSections.length} configuration sections in ${loadTime}ms:`
      );
      Logger.log(`📋 Sections: ${configSections.join(", ")}`);

      CacheService.getScriptCache().put(
        this.cacheName,
        JSON.stringify(loadedConfigs),
        this.cacheExpirationSeconds
      );
      Logger.log(
        `💾 Settings cached successfully with ${
          this.cacheExpirationSeconds / 3600
        }-hour persistence (ScriptCache)`
      );
    } catch (error) {
      Logger.log(`Error in setSettingsCache: ${error.message}`);
      throw error;
    }
  }
  // New unified method with enhanced cache error handling
  refreshCache(forceRefresh = false) {
    const startTime = Date.now();
    try {
      Logger.log(
        `⚙️  Settings refresh started - forceRefresh: ${forceRefresh}`
      );
      let configs = null;
      let loadSource = "unknown";

      if (!forceRefresh) {
        try {
          configs = CacheService.getScriptCache().get(this.cacheName);
          Logger.log(
            `📦 ScriptCache retrieval result: ${
              configs ? "found" : "not found"
            }`
          );

          if (configs) {
            // Validate cache content before using
            const testParse = JSON.parse(configs);
            if (
              !testParse ||
              typeof testParse !== "object" ||
              Object.keys(testParse).length === 0
            ) {
              Logger.log(
                "⚠️  Cache found but invalid - contains empty or malformed data"
              );
              configs = null; // Force reload
              loadSource = "cache-invalid";
            } else {
              Logger.log(
                `✅ Cache validated - contains ${
                  Object.keys(testParse).length
                } config sections`
              );
              loadSource = "cache";
            }
          } else {
            loadSource = "cache-miss";
          }
        } catch (cacheError) {
          Logger.log(`Cache retrieval/validation error: ${cacheError.message}`);
          configs = null; // Force reload on any cache errors
        }
      }

      if (forceRefresh || !configs) {
        loadSource = forceRefresh
          ? "spreadsheet-forced"
          : "spreadsheet-fallback";
        Logger.log(
          `📄 Loading settings from management spreadsheet (reason: ${loadSource})...`
        );
        try {
          this.setSettingsCache();
          configs = CacheService.getScriptCache().get(this.cacheName);
          if (!configs) {
            throw new Error(
              "Failed to cache settings after loading from spreadsheet"
            );
          }
          Logger.log(
            "✅ Settings successfully loaded and cached from spreadsheet"
          );
        } catch (spreadsheetError) {
          Logger.log(
            `❌ Error loading from spreadsheet: ${spreadsheetError.message}`
          );
          throw spreadsheetError;
        }
      }

      // Parse and validate final configs
      try {
        this.cacheValues = JSON.parse(configs);
        const loadTime = Date.now() - startTime;
        const sourceEmoji = loadSource.includes("cache") ? "📦" : "📄";
        Logger.log(
          `${sourceEmoji} Settings parsed successfully - Source: ${loadSource.toUpperCase()} (${loadTime}ms)`
        );
      } catch (parseError) {
        Logger.log(`❌ JSON parse error: ${parseError.message}`);
        throw new Error(
          `❌Settings data corrupted - cannot parse JSON: ${parseError.message}`
        );
      }

      if (!this.cacheValues || typeof this.cacheValues !== "object") {
        throw new Error("❌Invalid cache values format - not an object");
      }

      // Additional validation with detailed reporting
      const requiredSections = [
        "bikesStatus",
        "userStatus",
        "checkoutLogs",
        "returnLogs",
      ];
      const missingSections = requiredSections.filter(
        (section) => !this.cacheValues[section]
      );
      if (missingSections.length > 0) {
        Logger.log(
          `⚠️  Missing configuration sections: ${missingSections.join(", ")}`
        );
      } else {
        Logger.log(
          `✅ All required configuration sections present (${requiredSections.length}/${requiredSections.length})`
        );
      }

      this.setGlobalConfigs();
      const totalTime = Date.now() - startTime;
      Logger.log(
        `🎯 Settings refresh completed successfully in ${totalTime}ms - Source: ${loadSource.toUpperCase()}`
      );
      return true;
    } catch (error) {
      Logger.log(`CRITICAL: Settings cache refresh failed: ${error.message}`);
      Logger.log("Stack trace:", error.stack);
      return false;
    }
  }

  isSystemActive() {
    return this.cacheValues.systemButtons?.SYSTEM_ACTIVE ?? true;
  }

  getMaxCheckoutHours() {
    return this.cacheValues.coreConfig?.MAX_CHECKOUT_HOURS ?? 72;
  }

  getAdminEmail() {
    return this.cacheValues.coreConfig?.ADMIN_EMAIL ?? "bikeshare@amherst.edu";
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
    try {
      Logger.log("⚙️  Setting global configurations...");

      // Validate required cache sections
      const requiredSections = ["systemButtons", "systemTime", "coreConfig"];
      const missingSections = [];
      for (const section of requiredSections) {
        if (!this.cacheValues[section]) {
          missingSections.push(section);
          Logger.log(`⚠️  Missing required config section: ${section}`);
        }
      }

      if (missingSections.length === 0) {
        Logger.log(
          `✅ All required config sections present (${requiredSections.join(
            ", "
          )})`
        );
      }

      this.VALUES = {
        DEBUG_MODE: true,
        ENABLE_FORCED_RESET: true,
        SYSTEM_ACTIVE: this.isSystemActive(),
        NEXT_SYSTEM_SHUTDOWN_DATE:
          this.cacheValues.systemTime?.NEXT_SYSTEM_SHUTDOWN_DATE || null,
        NEXT_SYSTEM_ACTIVATION_DATE:
          this.cacheValues.systemTime?.NEXT_SYSTEM_ACTIVATION_DATE || null,
        ADMIN_EMAIL: this.getAdminEmail(),
        ORG_EMAIL: "bikeshare@amherst.edu",
        MANAGEMENT_SS_ID: this.management_ss_ID,
        MAIN_DASHBOARD_SS_ID: "1H_Tb-Ql71W1QEkucGiRByGkVDVI3B3RpTqljRonBecg",
        ALLOWED_EMAIL_DOMAIN: "amherst.edu",
        SHEETS: {
          BIKES_STATUS: this.cacheValues.bikesStatus || {
            NAME: "Bikes Status",
            RESET_RANGE: "E2:L",
          },
          USER_STATUS: this.cacheValues.userStatus || {
            NAME: "User Status",
            RESET_RANGE: "A2:L",
          },
          CHECKOUT_LOGS: this.cacheValues.checkoutLogs || {
            NAME: "Checkout Logs",
            RESET_RANGE: "A2:D",
          },
          RETURN_LOGS: {
            ...(this.cacheValues.returnLogs || {
              NAME: "Return Logs",
              RESET_RANGE: "A2:I",
            }),
            DATE_COLUMN: 0,
          },
          REPORTS: {
            ...this.cacheValues.reportSheet,
            OVERDUE_BIKES_COLUMN: 4,
            RETURN_MISMATCHES_COLUMN: 7,
            TOTAL_USAGE_HOURS_COLUMN: 9,
          },
        },
        FORMS: {
          CHECKOUT_FORM_ID: "1zSuyVnXF4zDuJNr3eHA5SjloBxARTY3F0KH_XB5-oRs",
          RETURN_FORM_ID: "14Ue4nG8eTqP2OSpGsiVzOJ1TUq8oKVTqbwCaYDSQzh4",
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
          NEED_USER_CONFIRM_KEY_ACCESS: false,
          MAX_CHECKOUT_HOURS: this.getMaxCheckoutHours(),
        },
        FUZZY_MATCHING_THRESHOLD: 0.3,
        NOTIFICATION_SETTINGS: {
          ENABLE_USER_NOTIFICATIONS:
            this.cacheValues.systemButtons?.ENABLE_USER_NOTIFICATIONS,
          ENABLE_ADMIN_NOTIFICATIONS:
            this.cacheValues.systemButtons?.ENABLE_ADMIN_NOTIFICATIONS,
          ENABLE_DEV_NOTIFICATIONS:
            this.cacheValues.systemButtons?.ENABLE_DEV_NOTIFICATIONS,
        },
        REPORT_GENERATION: {
          ...this.getReportGenerationSettings(),
          ENABLE_REPORT_GENERATION:
            this.cacheValues.systemButtons?.ENABLE_REPORT_GENERATION,
        },
        IGNORED_REPORT_STMTS_ON_RFORM:
          this.cacheValues.miscellaneous?.IGNORED_REPORT_STMTS_ON_RFORM || [],
        COMM_CODES: {
          ...(this.cacheValues.successMessages || {}),
          ...(this.cacheValues.errorMessages || {}),
        },
      };

      // Log key configuration details
      const sheetCount = Object.keys(this.VALUES.SHEETS).length;
      const commCodeCount = Object.keys(this.VALUES.COMM_CODES || {}).length;
      const systemActive = this.VALUES.SYSTEM_ACTIVE;

      Logger.log(`📊 Global configurations set successfully:`);
      Logger.log(`   🗂️  Sheets configured: ${sheetCount}`);
      Logger.log(`   📧 Communication codes: ${commCodeCount}`);
      Logger.log(`   🔄 System active: ${systemActive}`);
      Logger.log(`   👤 Admin email: ${this.VALUES.ADMIN_EMAIL}`);
    } catch (error) {
      Logger.log(`❌ Error in setGlobalConfigs: ${error.message}`);
      throw error;
    }
  }

  // Enhanced debug method to check cache status and errors
  debugCacheStatus() {
    try {
      Logger.log("=== ENHANCED CACHE DEBUG INFO ===");
      Logger.log(`Cache name: ${this.cacheName}`);

      // Check actual CacheService status
      const cache = CacheService.getScriptCache();
      const rawCacheData = cache.get(this.cacheName);
      Logger.log(`Raw cache exists: ${!!rawCacheData}`);
      Logger.log(
        `Raw cache length: ${rawCacheData ? rawCacheData.length : 0} characters`
      );

      if (rawCacheData) {
        try {
          const parsedCache = JSON.parse(rawCacheData);
          Logger.log(`Raw cache is valid JSON: true`);
          Logger.log(
            `Raw cache sections: ${Object.keys(parsedCache).join(", ")}`
          );
        } catch (parseError) {
          Logger.log(`Raw cache is valid JSON: false - ${parseError.message}`);
          Logger.log(`Raw cache preview: ${rawCacheData.substring(0, 200)}...`);
        }
      }

      // Check processed cache values
      Logger.log(`Processed cacheValues exists: ${!!this.cacheValues}`);
      if (this.cacheValues) {
        Logger.log(
          `Processed cache sections: ${Object.keys(this.cacheValues).join(
            ", "
          )}`
        );
        Logger.log(
          `System buttons: ${JSON.stringify(this.cacheValues.systemButtons)}`
        );

        // Check critical sections
        const criticalSections = [
          "bikesStatus",
          "userStatus",
          "checkoutLogs",
          "returnLogs",
        ];
        const missingSections = criticalSections.filter(
          (section) => !this.cacheValues[section]
        );
        if (missingSections.length > 0) {
          Logger.log(
            `❌ Missing critical sections: ${missingSections.join(", ")}`
          );
        } else {
          Logger.log(`✅ All critical sections present`);
        }
      }

      // Check final VALUES
      Logger.log(`Final VALUES exists: ${!!this.VALUES}`);
      if (this.VALUES) {
        Logger.log(
          `COMM_CODES count: ${
            Object.keys(this.VALUES.COMM_CODES || {}).length
          }`
        );
        Logger.log(`SHEETS config: ${!!this.VALUES.SHEETS}`);
        if (this.VALUES.SHEETS) {
          const sheetNames = Object.keys(this.VALUES.SHEETS).map(
            (key) => `${key}: "${this.VALUES.SHEETS[key]?.NAME}"`
          );
          Logger.log(`Sheet configurations: ${sheetNames.join(", ")}`);
        }
      }

      // Test spreadsheet connectivity
      try {
        const testSheet = this.management_ss.getSheetByName("mainConfig");
        Logger.log(`✅ Management spreadsheet accessible: ${!!testSheet}`);
      } catch (ssError) {
        Logger.log(`❌ Management spreadsheet error: ${ssError.message}`);
      }

      Logger.log("=== END ENHANCED CACHE DEBUG ===");

      return {
        rawCacheExists: !!rawCacheData,
        rawCacheValid: rawCacheData
          ? (() => {
              try {
                JSON.parse(rawCacheData);
                return true;
              } catch {
                return false;
              }
            })()
          : false,
        processedCacheExists: !!this.cacheValues,
        finalValuesExists: !!this.VALUES,
        spreadsheetAccessible: (() => {
          try {
            return !!this.management_ss.getSheetByName("mainConfig");
          } catch {
            return false;
          }
        })(),
      };
    } catch (error) {
      Logger.log(`❌ Error in debugCacheStatus: ${error.message}`);
      return { error: error.message };
    }
  }

  /**
   * Force clear the cache and reload from spreadsheet
   * Use this for troubleshooting cache issues
   */
  forceClearCache() {
    try {
      Logger.log("🔄 Forcing cache clear...");
      const cache = CacheService.getScriptCache();
      cache.remove(this.cacheName);
      Logger.log("✅ Cache cleared successfully");

      // Reset internal state
      this.cacheValues = null;
      this.VALUES = {};

      const result = this.refreshCache(true);
      Logger.log(`🔄 Cache rebuild result: ${result}`);
      return result;
    } catch (error) {
      Logger.log(`❌ Error in forceClearCache: ${error.message}`);
      return false;
    }
  }

  getCellByKeyName(key, tableName) {
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

function parseSettingsUpdate(e) {
  try {
    const editedSheet = e.source.getActiveSheet();
    const curSheetName = editedSheet.getName();
    const curCell = e.source.getActiveCell();
    const editedRange = editedSheet.getActiveRange();
    const editedCol = editedRange.getLastColumn();
    const editedRow = editedRange.getLastRow();
    const newValue = editedRange.getValue();
    const settingsUpdateDateCol = CACHED_SETTINGS.getCellByKeyName(
      "LAST_SETTINGS_UPDATED_DATE",
      "systemTime"
    );
    const curDate = new Date();
    const commContext = {};

    Logger.log(
      `📝 Settings update detected: Sheet=${curSheetName}, Range=${editedRange.getA1Notation()}, Value=${newValue}`
    );

    //Process systemButtons
    if (curSheetName == "mainConfig") {
      if (editedCol == 3) {
        const editedParam = editedSheet.getRange(editedRow, 1).getValue();
        //process the database reset
        if (editedParam === "FORCE_SYSTEM_RESET" && newValue === "ON") {
          cleanDatabase();
          //send success confirmation to the administrator
          commContext["resetDate"] = curDate;
          COMM.handleCommunication("CFM_ADMIN_RESET_001", commContext);
          curCell.setValue("OFF");
          curCell.setNote(`Last reset on ${curDate}`);
          CACHED_SETTINGS.getCellByKeyName(
            "FIRST_GENERATION_DATE",
            "reportGenerationSettings"
          ).setValue(curDate);
        }

        //process quick report generation
        if (editedParam === "GENERATE_QUICK_REPORT" && newValue === "ON") {
          Logger.log("📊 Quick report generation triggered via settings button");
          try {
            const reportResult = runReportPipeline();
            if (reportResult.success) {
              curCell.setNote(`Last instant report generated on ${curDate}`);
              Logger.log(`✅ Quick report generated successfully at ${reportResult.timestamp}`);
            } else {
              curCell.setNote(`Quick Report generation failed on ${curDate}: ${reportResult.error}`);
              Logger.log(`❌ Quick report generation failed: ${reportResult.error}`);
            }
          } catch (error) {
            curCell.setNote(`Quick Report generation error on ${curDate}: ${error.message}`);
            Logger.log(`❌ Quick report generation error: ${error.message}`);
          }
          curCell.setValue("OFF");
        }

        //process system operations pause or resume by disabling/enabling all forms
        if (editedParam === "SYSTEM_ACTIVE") {
          const isAcceptingResponses = newValue === "ON";
          setSystemActivationState(isAcceptingResponses);
        }
        CACHED_SETTINGS.getCellByKeyName(
          "FIRST_GENERATION_DATE",
          "reportGenerationSettings"
        ).setValue(curDate);
      }

      //Process SystemTime, CoreConfig & reportGenerationSettings
      if (editedCol == 8) {
        const editedParam = editedSheet.getRange(editedRow, 6).getValue();
        //NEXT_SYSTEM_SHUTDOWN_DATE or NEXT_SYSTEM_ACTIVATION_DATE
        const handlerToDelete =
        editedParam === "NEXT_SYSTEM_ACTIVATION_DATE"
            ? "handleScheduledSystemActivation"
            : "handleScheduledSystemShutdown";

        ScriptApp.getProjectTriggers()
          .filter((t) => t.getHandlerFunction() === handlerToDelete)
          .forEach((t) => ScriptApp.deleteTrigger(t));

        installScheduleSystemShutdownAndActivationTrigger(
          editedParam === "NEXT_SYSTEM_ACTIVATION_DATE" ? newValue : null,
          editedParam === "NEXT_SYSTEM_SHUTDOWN_DATE" ? newValue : null,
          editedParam
        );
      }
    }

    //update settings last update tracker
    const delay = 1000 * 6;
    if (curDate - settingsUpdateDateCol.getValue() > delay) {
      settingsUpdateDateCol.setValue(curDate);
      settingsUpdateDateCol.setNote(
        `Affected Range ${editedRange.getA1Notation()}`
      );
    }

    //load and save updated cache
    Logger.log("🔄 Attempting to refresh settings cache after update...");
    const cacheRefreshResult = CACHED_SETTINGS.refreshCache(true);
    if (!cacheRefreshResult) {
      Logger.log("❌ Failed to refresh settings cache after update.");
      throw new Error("Failed to refresh settings cache");
    } else {
      Logger.log("✅ Settings cache refreshed successfully after update.");
    }
  } catch (error) {
    Logger.log(`❌ Error in parseSettingsUpdate: ${error.message}`);
    throw error;
  }
}

/**
 * Toggles the accepting responses state for both the checkout and return forms.
 * @param {boolean} isAcceptingResponses - Indicates whether the forms should accept responses.
 */
function toogleFormAcceptResponses(isAcceptingResponses) {
  if (typeof isAcceptingResponses === "undefined") {
    Logger.log(
      "toogleFormAcceptResponses: ‼️isAcceptingResponses is undefined, aborting."
    );
    return;
  }
  Logger.log(
    `✅toogleFormAcceptResponses: Setting forms to ${
      isAcceptingResponses ? "accept" : "not accept"
    } responses.`
  );
  try {
    let c_form = FormApp.openById(
      CACHED_SETTINGS.VALUES.FORMS.CHECKOUT_FORM_ID
    )
    c_form.setAcceptingResponses(isAcceptingResponses);
    Logger.log("✅Checkout form response state updated successfully.");
  } catch (err) {
    Logger.log(`❌Error updating Checkout form: ${err.message}`);
  }
  try {
    let r_form = FormApp.openById(
      CACHED_SETTINGS.VALUES.FORMS.RETURN_FORM_ID
    )
    r_form.setAcceptingResponses(isAcceptingResponses);
    Logger.log("✅Return form response state updated successfully.");
  } catch (err) {
    Logger.log(`❌Error updating Return form: ${err.message}`);
  }
}


/**
 * Core logic for system activation/deactivation
 * Toggles form acceptance state and updates related settings
 * @param {boolean} isActive - true for activation, false for shutdown
 */
function setSystemActivationState(isActive) {
  const curDate = new Date();
  const statusText = isActive ? "activated" : "deactivated";
  
  try {
    Logger.log(`🔄 Setting system ${statusText}...`);
    
    // Toggle form responses
    toogleFormAcceptResponses(isActive);
    
    // Update SYSTEM_ACTIVE in settings
    const systemActiveCell = CACHED_SETTINGS.getCellByKeyName(
      "SYSTEM_ACTIVE",
      "systemButtons"
    );
    if (systemActiveCell) {
      const newValue = isActive ? "ON" : "OFF";
      systemActiveCell.setValue(newValue);
      systemActiveCell.setNote(`System ${statusText} on ${curDate}`);
      Logger.log(`✅ SYSTEM_ACTIVE updated to ${newValue}`);
    }
    
    // Update ENABLE_REPORT_GENERATION to match
    const reportGenCell = CACHED_SETTINGS.getCellByKeyName(
      "ENABLE_REPORT_GENERATION",
      "systemButtons"
    );
    if (reportGenCell) {
      const reportGenValue = isActive ? "ON" : "OFF";
      reportGenCell.setValue(reportGenValue);
      Logger.log(`✅ ENABLE_REPORT_GENERATION updated to ${reportGenValue}`);
    }
    
    Logger.log(`✅ System ${statusText} successfully`);
    return true;
  } catch (error) {
    Logger.log(`❌ Failed to set system ${statusText}: ${error.message}`);
    throw error;
  }
}