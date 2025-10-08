class Settings {
  constructor() {
    this.management_ss_ID = "1Ux1Lt9KNXVNrE0KP6C-Wbf5xmeos5Yf-ybmAfRtEvmQ";
    this.management_ss = SpreadsheetApp.openById(this.management_ss_ID);
    this.cacheName = "configCache";
    this.cacheExpirationSeconds = 21600; // 6 hours (max for ScriptCache)
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
        errorMessages: "A22:H37",
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
    const loadStartTime = Date.now();
    try {
      let loadedConfigs = {};
      Logger.log('📊 Starting to load settings from management spreadsheet...');
      Logger.log(`📋 Management Spreadsheet ID: ${this.management_ss_ID}`);
      
      for (const sheetName in this.settingRangeMap) {
        Logger.log(`📄 Loading settings from sheet: ${sheetName}`);
        const sheet = this.management_ss.getSheetByName(sheetName);
        if (!sheet) {
          throw new Error(`Sheet '${sheetName}' not found in management spreadsheet`);
        }
        
        for (const tableName in this.settingRangeMap[sheetName]) {
          Logger.log(`📊 Loading table: ${tableName} from range: ${this.settingRangeMap[sheetName][tableName]}`);
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
      
      // Validate loaded configs
      if (!loadedConfigs || Object.keys(loadedConfigs).length === 0) {
        throw new Error('No configuration data loaded from spreadsheet');
      }
      
      const loadTime = Date.now() - loadStartTime;
      const configSections = Object.keys(loadedConfigs);
      Logger.log(`✅ Loaded ${configSections.length} configuration sections in ${loadTime}ms:`);
      Logger.log(`📋 Sections: ${configSections.join(', ')}`);
      
      CacheService.getScriptCache().put(
        this.cacheName,
        JSON.stringify(loadedConfigs),
        this.cacheExpirationSeconds
      );
      Logger.log(`💾 Settings cached successfully with ${this.cacheExpirationSeconds/3600}-hour persistence (ScriptCache)`);
    } catch (error) {
      Logger.log(`Error in setSettingsCache: ${error.message}`);
      throw error;
    }
  }
  // New unified method with enhanced cache error handling
  refreshCache(forceRefresh = false) {
    const startTime = Date.now();
    try {
      Logger.log(`⚙️  Settings refresh started - forceRefresh: ${forceRefresh}`);
      let configs = null;
      let cacheUsed = false;
      let loadSource = 'unknown';
      
      if (!forceRefresh) {
        try {
        configs = CacheService.getScriptCache().get(this.cacheName);
        Logger.log(`📦 ScriptCache retrieval result: ${configs ? 'found' : 'not found'}`);
        
        if (configs) {
            // Validate cache content before using
            const testParse = JSON.parse(configs);
            if (!testParse || typeof testParse !== 'object' || Object.keys(testParse).length === 0) {
              Logger.log('⚠️  Cache found but invalid - contains empty or malformed data');
              configs = null; // Force reload
              loadSource = 'cache-invalid';
            } else {
              Logger.log(`✅ Cache validated - contains ${Object.keys(testParse).length} config sections`);
              cacheUsed = true;
              loadSource = 'cache';
            }
          } else {
            loadSource = 'cache-miss';
          }
        } catch (cacheError) {
          Logger.log(`Cache retrieval/validation error: ${cacheError.message}`);
          configs = null; // Force reload on any cache errors
        }
      }
      
      if (forceRefresh || !configs) {
        loadSource = forceRefresh ? 'spreadsheet-forced' : 'spreadsheet-fallback';
        Logger.log(`📄 Loading settings from management spreadsheet (reason: ${loadSource})...`);
        try {
          this.setSettingsCache();
          configs = CacheService.getScriptCache().get(this.cacheName);
          if (!configs) {
            throw new Error('Failed to cache settings after loading from spreadsheet');
          }
          Logger.log('✅ Settings successfully loaded and cached from spreadsheet');
        } catch (spreadsheetError) {
          Logger.log(`❌ Error loading from spreadsheet: ${spreadsheetError.message}`);
          throw spreadsheetError;
        }
      }
      
      // Parse and validate final configs
      try {
        this.cacheValues = JSON.parse(configs);
        const loadTime = Date.now() - startTime;
        const sourceEmoji = loadSource.includes('cache') ? '📦' : '📄';
        Logger.log(`${sourceEmoji} Settings parsed successfully - Source: ${loadSource.toUpperCase()} (${loadTime}ms)`);
      } catch (parseError) {
        Logger.log(`❌ JSON parse error: ${parseError.message}`);
        throw new Error(`Settings data corrupted - cannot parse JSON: ${parseError.message}`);
      }
      
      if (!this.cacheValues || typeof this.cacheValues !== 'object') {
        throw new Error('Invalid cache values format - not an object');
      }
      
      // Additional validation with detailed reporting
      const requiredSections = ['bikesStatus', 'userStatus', 'checkoutLogs', 'returnLogs'];
      const missingSections = requiredSections.filter(section => !this.cacheValues[section]);
      if (missingSections.length > 0) {
        Logger.log(`⚠️  Missing configuration sections: ${missingSections.join(', ')}`);
      } else {
        Logger.log(`✅ All required configuration sections present (${requiredSections.length}/${requiredSections.length})`);
      }
      
      this.setGlobalConfigs();
      const totalTime = Date.now() - startTime;
      Logger.log(`🎯 Settings refresh completed successfully in ${totalTime}ms - Source: ${loadSource.toUpperCase()}`);
      return true;
      
    } catch (error) {
      Logger.log(`CRITICAL: Settings cache refresh failed: ${error.message}`);
      Logger.log('Stack trace:', error.stack);
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
    try {
      Logger.log('⚙️  Setting global configurations...');
      
      // Validate required cache sections
      const requiredSections = ['systemButtons', 'systemTime', 'coreConfig'];
      const missingSections = [];
      for (const section of requiredSections) {
        if (!this.cacheValues[section]) {
          missingSections.push(section);
          Logger.log(`⚠️  Missing required config section: ${section}`);
        }
      }
      
      if (missingSections.length === 0) {
        Logger.log(`✅ All required config sections present (${requiredSections.join(', ')})`);
      }
      
      this.VALUES = {
        DEBUG_MODE: true,
        ENABLE_FORCED_RESET: true,
        SYSTEM_ACTIVE: this.isSystemActive(),
        NEXT_SYSTEM_SHUTDOWN_DATE: this.cacheValues.systemTime?.NEXT_SYSTEM_SHUTDOWN_DATE || null,
        NEXT_SYSTEM_ACTIVATION_DATE: this.cacheValues.systemTime?.NEXT_SYSTEM_ACTIVATION_DATE || null,
      ADMIN_EMAIL: this.getAdminEmail(),
      ORG_EMAIL: 'ndayishimiyeemile96@gmail.com',
      MANAGEMENT_SS_ID: this.management_ss_ID,
      MAIN_DASHBOARD_SS_ID: '1XE9b58isw2MreAvcNSDiCTIIlL09zFRWMKcCBtTkbbE',
      SHEETS: {
        BIKES_STATUS: this.cacheValues.bikesStatus || { NAME: 'Bikes Status', RESET_RANGE: 'E2:L' },
        USER_STATUS: this.cacheValues.userStatus || { NAME: 'User Status', RESET_RANGE: 'A2:L' },
        CHECKOUT_LOGS: this.cacheValues.checkoutLogs || { NAME: 'Checkout Logs', RESET_RANGE: 'A2:D' },
        RETURN_LOGS: {
          ...(this.cacheValues.returnLogs || { NAME: 'Return Logs', RESET_RANGE: 'A2:I' }),
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
      Logger.log('=== ENHANCED CACHE DEBUG INFO ===');
      Logger.log(`Cache name: ${this.cacheName}`);
      
      // Check actual CacheService status
      const cache = CacheService.getScriptCache();
      const rawCacheData = cache.get(this.cacheName);
      Logger.log(`Raw cache exists: ${!!rawCacheData}`);
      Logger.log(`Raw cache length: ${rawCacheData ? rawCacheData.length : 0} characters`);
      
      if (rawCacheData) {
        try {
          const parsedCache = JSON.parse(rawCacheData);
          Logger.log(`Raw cache is valid JSON: true`);
          Logger.log(`Raw cache sections: ${Object.keys(parsedCache).join(', ')}`);
        } catch (parseError) {
          Logger.log(`Raw cache is valid JSON: false - ${parseError.message}`);
          Logger.log(`Raw cache preview: ${rawCacheData.substring(0, 200)}...`);
        }
      }
      
      // Check processed cache values
      Logger.log(`Processed cacheValues exists: ${!!this.cacheValues}`);
      if (this.cacheValues) {
        Logger.log(`Processed cache sections: ${Object.keys(this.cacheValues).join(', ')}`);
        Logger.log(`System buttons: ${JSON.stringify(this.cacheValues.systemButtons)}`);
        
        // Check critical sections
        const criticalSections = ['bikesStatus', 'userStatus', 'checkoutLogs', 'returnLogs'];
        const missingSections = criticalSections.filter(section => !this.cacheValues[section]);
        if (missingSections.length > 0) {
          Logger.log(`❌ Missing critical sections: ${missingSections.join(', ')}`);
        } else {
          Logger.log(`✅ All critical sections present`);
        }
      }
      
      // Check final VALUES
      Logger.log(`Final VALUES exists: ${!!this.VALUES}`);
      if (this.VALUES) {
        Logger.log(`COMM_CODES count: ${Object.keys(this.VALUES.COMM_CODES || {}).length}`);
        Logger.log(`SHEETS config: ${!!this.VALUES.SHEETS}`);
        if (this.VALUES.SHEETS) {
          const sheetNames = Object.keys(this.VALUES.SHEETS).map(key => 
            `${key}: "${this.VALUES.SHEETS[key]?.NAME}"`
          );
          Logger.log(`Sheet configurations: ${sheetNames.join(', ')}`);
        }
      }
      
      // Test spreadsheet connectivity
      try {
        const testSheet = this.management_ss.getSheetByName('mainConfig');
        Logger.log(`✅ Management spreadsheet accessible: ${!!testSheet}`);
      } catch (ssError) {
        Logger.log(`❌ Management spreadsheet error: ${ssError.message}`);
      }
      
      Logger.log('=== END ENHANCED CACHE DEBUG ===');
      
      return {
        rawCacheExists: !!rawCacheData,
        rawCacheValid: rawCacheData ? (() => {
          try { JSON.parse(rawCacheData); return true; } catch { return false; }
        })() : false,
        processedCacheExists: !!this.cacheValues,
        finalValuesExists: !!this.VALUES,
        spreadsheetAccessible: (() => {
          try { return !!this.management_ss.getSheetByName('mainConfig'); } catch { return false; }
        })()
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
      Logger.log('🔄 Forcing cache clear...');
      const cache = CacheService.getScriptCache();
      cache.remove(this.cacheName);
      Logger.log('✅ Cache cleared successfully');
      
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