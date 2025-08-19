# BikeShare System - Administrator Guide

## Table of Contents
1. [Overview](#overview)
2. [Configuration Management](#configuration-management)
3. [System Buttons & Controls](#system-buttons--controls)
   - [Primary System Controls](#primary-system-controls)
   - [Notification Controls](#notification-controls)
   - [Parameter Interdependencies](#parameter-interdependencies)
4. [Core System Parameters](#core-system-parameters)
   - [Contact Information](#contact-information)
   - [Operational Rules](#operational-rules)
   - [Time Management](#time-management)
5. [Communication & Notification Management](#communication--notification-management)
   - [Communication Code Structure](#communication-code-structure)
   - [Email Template System](#email-template-system)
   - [Entry Marking System](#entry-marking-system)
6. [Report Generation Settings](#report-generation-settings)
7. [Advanced Configuration](#advanced-configuration)
   - [Database Configuration (sheetsConfig Sheet)](#database-configuration-sheetsconfig-sheet)
   - [Fuzzy Matching Algorithm](#fuzzy-matching-algorithm)

---

## Overview

The BikeShare System uses a **centralized configuration management approach** through the Management Spreadsheet to control all system operations. This guide explains each parameter, its purpose, impact on the system, and best practices for administrators.

### Key Architecture Points:
- **Settings Cache**: Configuration is loaded once at startup and cached for performance
- **Real-time Updates**: Changes to settings require cache refresh to take effect
- **Multi-layer Configuration**: System controls, operational rules, and communication settings
- **Safety Mechanisms**: Critical settings have safeguards to prevent data loss

---

## Configuration Management

### Settings Architecture

The system uses a **three-sheet configuration structure**:

1. **mainConfig Sheet**: Core system controls and operational parameters
2. **sheetsConfig Sheet**: Database structure and sorting configurations
3. **notificationsConfig Sheet**: Communication templates and error handling

---

## System Buttons & Controls

### Primary System Controls

#### `SYSTEM_ACTIVE`
- **Type**: Button (ON/OFF)
- **Current Value**: `ON`
- **Purpose**: Master switch for the entire BikeShare system
- **Impact**: 
  - When `OFF`: All checkout/return operations are blocked
  - Users receive error message `ERR_OPR_COR_001` 
  - System continues to function for administrative tasks
  - **📊 Cascading Effect**: Automatically sets `ENABLE_REPORT_GENERATION` to the same value (ON/OFF)
  - **🔄 Form Management**: Automatically pauses/resumes Google Forms accessibility
- **When to Use**: 
  - During maintenance periods
  - When preparing for system shutdown
  - Emergency situations requiring immediate system halt
- **⚠️ Warning**: Turning off blocks all user operations immediately and disables report generation

#### `ENABLE_FORCED_RESET`
- **Type**: Button (ON/OFF)
- **Current Value**: `ON`
- **Purpose**: Safety mechanism to prevent accidental database resets
- **Impact**: 
  - When `ON`: `FORCE_SYSTEM_RESET` can be used to reset(clear) database 
  - When `OFF`: Database reset is completely disabled
- **When to Use**: 
  - Keep `ON` for normal operations
  - Turn `OFF` only if reset capability must be completely disabled
- **Best Practice**: Always keep it `OFF` as a safety measure.

#### `FORCE_SYSTEM_RESET`
- **Type**: Button (ON/OFF)
- **Current Value**: `OFF`
- **Purpose**: Triggers complete database reset (DANGER)
- **Impact**: 
  - When `ON`: Clears ALL data except bike names and sizes
  - Irreversible operation
  - Generates admin confirmation email `CFM_ADMIN_RESET_001`
  - **📊 Cascading Effects**:
    - Automatically resets to `OFF` after execution
    - Updates `FIRST_GENERATION_DATE` to current date (resets report periods)
    - Adds timestamp note to track when reset was performed
- **When to Use**: 
  - Start of new semester/period
  - After major system issues requiring clean slate
  - **NEVER** use unless absolutely necessary
- **⚠️ CRITICAL**: This will delete all user data, logs, and historical records

### Notification Controls

#### `ENABLE_USER_NOTIFICATIONS`
- **Type**: Button (ON/OFF)
- **Current Value**: `ON`
- **Purpose**: Controls email notifications to users
- **Impact**: 
  - When `OFF`: Users receive no email confirmations or error messages
  - All user communication is disabled
- **When to Use**: 
  - Turn `OFF` during testing phases
  - Keep `ON` for production environment
- **Side Effects**: Users will have no feedback for their actions

#### `ENABLE_ADMIN_NOTIFICATIONS`
- **Type**: Button (ON/OFF)
- **Current Value**: `ON`
- **Purpose**: Controls email notifications to administrators
- **Impact**: 
  - When `OFF`: Admins receive no system alerts or error reports
  - Critical issues may go unnoticed
- **When to Use**: 
  - Keep `ON` for production systems
  - Turn `OFF` only during heavy testing to reduce email noise
- **⚠️ Warning**: Disabling may cause you to miss critical system issues

#### `ENABLE_DEV_NOTIFICATIONS`
- **Type**: Button (ON/OFF)
- **Current Value**: `ON`
- **Purpose**: Controls technical notifications to developers
- **Impact**: 
  - When `OFF`: Developers receive no technical error reports
  - System debugging becomes more difficult
- **When to Use**: 
  - Keep `ON` if you have technical support
  - Turn `OFF` if no developer support is available

#### `ENABLE_REPORT_GENERATION`
- **Type**: Button (ON/OFF)
- **Current Value**: `ON`
- **Purpose**: Controls automatic report generation
- **Impact**: 
  - When `OFF`: No automated system reports are generated
  - Historical data collection stops
  - **🔗 Linked Parameter**: This value is automatically synchronized with `SYSTEM_ACTIVE`
    - When `SYSTEM_ACTIVE` is turned ON/OFF, this parameter automatically changes to match
    - When system is inactive generates null reports
- **When to Use**: 
  - Keep `ON` for data collection and analysis
  - Turn `OFF` when system is idle
  - **Note**: Manual changes may be overridden by `SYSTEM_ACTIVE` changes
- **⚠️ Important**: This parameter is dependent on `SYSTEM_ACTIVE` status

#### `CAN_CHECKOUT_WITH_UNRETURNED_BIKE`
- **Type**: Button (ON/OFF)
- **Current Value**: `OFF`
- **Purpose**: Controls multiple bike checkouts per user
- **Impact**: 
  - When `ON`: Users can check out multiple bikes simultaneously
  - When `OFF`: Users must return their current bike before checking out another
  - **⚙️ System Integration**: Affects checkout validation logic in `User.checkoutBike()`
    - Directly controls error message `ERR_USR_COT_002` (user has unreturned bike)
- **When to Use**: 
  - Keep `OFF` for standard operations (recommended)
  - Turn `ON` only for special events or administrative needs
- **System Impact**: Changes checkout validation logic and error handling

### Parameter Interdependencies

Several system parameters have **automatic cascading effects** when changed:

#### Primary Dependencies:

1. **`SYSTEM_ACTIVE` ↔ `ENABLE_REPORT_GENERATION`**
   - When `SYSTEM_ACTIVE` is changed to ON/OFF
   - `ENABLE_REPORT_GENERATION` automatically matches the same value
   - **Reason**: Reports should only generate when system is active

2. **`FORCE_SYSTEM_RESET` → Multiple Parameters**
   - When triggered (set to ON):
     - Automatically resets back to `OFF` after execution
     - Updates `FIRST_GENERATION_DATE` to current date
     - Adds execution timestamp note
   - **Reason**: Prevents accidental repeated resets and resets reporting periods

3. **`NEXT_SYSTEM_SHUTDOWN_DATE` → System Triggers**
   - When changed: Automatically reinstalls all system triggers
   - **Reason**: Updates scheduled shutdown automation

#### Secondary Dependencies:

4. **All Setting Changes → `LAST_SETTINGS_UPDATED_DATE`**
   - Any parameter change updates this timestamp
   - Includes note about which range was affected
   - **Reason**: Tracks system configuration history

**🔄 Best Practice**: Always check dependent parameters after making changes to ensure system consistency.

---

## Core System Parameters

### Contact Information

#### `ADMIN_EMAIL`
- **Type**: Email address
- **Current Value**: `studentEmail@gmail.com`
- **Purpose**: Primary email for administrative notifications
- **Impact**: All admin alerts, error reports, and system notifications go here
- **When to Update**: 
  - When administrative responsibility changes
- **⚠️ Critical**: Must be a valid, monitored email address

### Operational Rules

#### `MAX_CHECKOUT_HOURS`
- **Type**: Number
- **Current Value**: `48`
- **Purpose**: Maximum time (in hours) a bike can be checked out before considered overdue
- **Impact**: 
  - Affects overdue calculations in reports
  - Triggers late return notifications
  - Used in user confirmation emails
- **Recommended Values**: 
  - **24 hours**: Strict daily return policy
  - **48 or 78 hours**: Standard & Relaxed policy
- **When to Adjust**: 
  - Beginning of semester based on usage patterns
  - For special events or holidays

#### `FUZZY_MATCHING_THRESHOLD`
- **Type**: Number (0.0 - 1.0)
- **Current Value**: `0.3`
- **Purpose**: Tolerance level for matching bike names during returns
- **Impact**: 
  - Lower values = stricter matching (fewer false positives)
  - Higher values = more lenient matching (more false positives)
  - Affects return validation and mismatch detection
- **Recommended Values**: 
  - **0.1-0.2**: Very strict (for consistent naming)
  - **0.3**: Balanced (recommended default)
  - **0.4-0.5**: Lenient (for uncommon/difficult-spell names)
- **When to Adjust**: 
  - If users frequently have return issues due to naming
  - After changing bike naming conventions
  - Based on mismatch report patterns
- **⚠️ Critical**: Higher values allow more error tolerance == more data inconsistency & less data integrity

### Time Management

#### `NEXT_SYSTEM_SHUTDOWN_DATE`
- **Type**: DateTime
- **Current Value**: `8/19/2025 0:00:00`
- **Purpose**: Scheduled automatic system shutdown
- **Impact**: 
  - System will automatically turn OFF at this date/time
  - **🔄 Cascading Effect**: Changing this value automatically reinstalls all system triggers
    - Updates scheduled shutdown automation
    - Reconfigures time-based triggers for new schedule
- **When to Set**: 
  - End of academic semesters
  - Before planned maintenance periods
  - During extended holidays

#### `NEXT_SYSTEM_ACTIVATION_DATE`
- **Type**: DateTime
- **Current Value**: `8/20/2025 0:00:00`
- **Purpose**: Scheduled automatic system startup
- **Impact**: 
  - System will automatically turn ON at this dateTime
  - **🔄 Cascading Effect**: Changing this value automatically reinstalls all system triggers
    - Updates scheduled activation automation
    - Reconfigures time-based triggers for new schedule
- **When to Set**: 
  - Start of new semesters
  - After maintenance periods
  - Return from holidays
- **Best Practice**: Set to align with campus schedules and user needs

---

## Communication & Notification Management

### Communication Code Structure

The system uses standardized communication codes following the pattern:
**`commType_involvedEntity_relatedAction_commID`**

Examples:
- `CFM_USR_COT_001`: Confirmation - User - Checkout - 001
- `ERR_USR_RET_002`: Error - User - Return - 002

### Email Template System

#### Template Editing Guidelines

**✅ SAFE TO MODIFY:**
- **SUBJECT content**: Change subject text while keeping `SUBJECT` label
- **BODY content**: Rewrite email body text while keeping `BODY` label
- **Placeholder usage**: Use any allowed placeholders for each communication code
- **Text formatting**: Add line breaks, punctuation, and styling
- **Professional tone**: Customize messaging style

**❌ DO NOT MODIFY:**
- **Communication Code IDs**: Never change `CFM_USR_COT_001`, etc.
- **Structure labels**: Must keep `SUBJECT` and `BODY` labels exactly as written
- **Placeholder syntax**: Must use `{{variableName}}` format exactly (case-sensitive)
- **Invalid placeholders**: Only use variables available for each specific communication code
- **Template structure**: Each communication must have both SUBJECT and BODY sections

#### Placeholder Reference by Communication Code

**Standard Variables Available in ALL Communications:**
- `{{userEmail}}` - User's email address
- `{{timestamp}}` - Current date/time when action occurred

**CFM_USR_COT_001** (Successful Checkout Confirmation):
- `{{userEmail}}`, `{{timestamp}}`, `{{bikeName}}`, `{{maxCheckoutHours}}`

**CFM_USR_RET_001** (Successful Return Confirmation):
- `{{userEmail}}`, `{{timestamp}}`, `{{bikeName}}`, `{{usageHours}}`

**CFM_USR_RET_002** (Bike Returned on User's Behalf):
- `{{userEmail}}`, `{{timestamp}}`, `{{bikeName}}`, `{{usageHours}}`

**CFM_USR_RET_003** (User Returned Bike for Friend):
- `{{userEmail}}`, `{{timestamp}}`, `{{bikeName}}`, `{{friendEmail}}`, `{{usageHours}}`

**CFM_USR_RET_004** (Return with Name Mismatch Warning):
- `{{userEmail}}`, `{{timestamp}}`, `{{bikeName}}`, `{{responseBikeName}}`, `{{usageHours}}`

**CFM_ADMIN_RESET_001** (System Reset Confirmation):
- `{{resetDate}}`

**ERR_OPR_COR_001** (System Offline Error):
- `{{userEmail}}`, `{{timestamp}}`

**ERR_USR_COT_002** (User Has Unreturned Bike):
- `{{userEmail}}`, `{{timestamp}}`, `{{errorMessage}}`, `{{unreturnedBikeName}}`, `{{lastCheckoutDate}}`, `{{maxCheckoutHours}}`

**ERR_USR_COT_003** (Bike Not Found by Hash):
- `{{userEmail}}`, `{{timestamp}}`, `{{errorMessage}}`

**ERR_USR_RET_001** (Return Name Mismatch):
- `{{userEmail}}`, `{{timestamp}}`, `{{bikeName}}`, `{{errorMessage}}`

**ERR_USR_RET_002** (Bike Not Found for Return):
- `{{userEmail}}`, `{{timestamp}}`, `{{bikeName}}`, `{{errorMessage}}`

**ERR_USR_RET_006** (No Unreturned Bike):
- `{{userEmail}}`, `{{timestamp}}`, `{{errorMessage}}`

**ERR_USR_RET_007** (Return Validation Error):
- `{{userEmail}}`, `{{timestamp}}`, `{{bikeName}}`, `{{confirmBikeName}}`, `{{errorMessage}}`

#### Template Format Requirements

**Correct Template Structure:**
```
CFM_USR_COT_001
SUBJECT: Bike Checkout Confirmation - {{bikeName}}
BODY: Your bike {{bikeName}} has been successfully checked out at {{timestamp}}. Please return within {{maxCheckoutHours}} hours.
```

**Common Template Errors:**
- ❌ `Subject:` (wrong case) → ✅ `SUBJECT:`
- ❌ `Body:` (wrong case) → ✅ `BODY:`
- ❌ `{userEmail}` (single braces) → ✅ `{{userEmail}}`
- ❌ `{{UserEmail}}` (wrong case) → ✅ `{{userEmail}}`
- ❌ Using `{{bikeHash}}` in checkout → ✅ Use `{{bikeName}}`

#### Best Practices

1. **Test Templates**: Always test email templates after changes
2. **Placeholder Validation**: Verify all placeholders exist for the communication code
3. **Clear Messaging**: Ensure error messages provide actionable information
### Entry Marking System

Visual feedback system for spreadsheet entries:

| Status | Background Color | Usage |
|--------|-----------------|-------|
| Success | Green | Successful operations |
| Warning | Yellow/Orange | Warnings or mismatches |
| Error | Red | Failed operations |
| Info | Blue | Informational entries |
| Critical | Dark Red | Critical system errors |

---

## Report Generation Settings

### Configuration Parameters

#### `FIRST_GENERATION_DATE`
- **Type**: Date (YYYY-MM-DD)
- **Current Value**: `2025-08-18`
- **Purpose**: Starting date for report calculations
- **Impact**: 
  - Determines baseline for period numbering
  - Affects historical data analysis
  - Used for "days since start" calculations
  - **🔗 Auto-Updated By**: 
    - `FORCE_SYSTEM_RESET`: Sets to current date when database is reset
    - Any system configuration change: Updates to current date to track changes
- **When to Set**: 
  - Beginning of each semester
  - After system resets
  - When starting new reporting periods
- **⚠️ Note**: This parameter is frequently auto-updated by system operations

#### `GENERATION_HOUR`
- **Type**: Number (0-23, 24-hour format)
- **Current Value**: `2`
- **Purpose**: Hour of day when reports are automatically generated
- **Impact**: 
  - Determines when daily/periodic reports run
  - Should be during low-usage hours
  - Affects system performance timing
- **Recommended Values**: 
  - **2-4**: Early morning (minimal usage)
  - **23-1**: Late night (after daily activities)
- **Considerations**: 
  - Campus usage patterns
  - Maintenance schedules

#### `DAYS_INTERVAL`
- **Type**: Number
- **Current Value**: `1`
- **Purpose**: Days between automatic report generation
- **Impact**: 
  - `1` = Daily reports
  - `7` = Weekly reports
  - `30` = Monthly reports
- **When to Adjust**: 
  - Based on data analysis needs
  - System performance considerations
  - Storage space limitations

---
## Advanced Configuration

### Database Configuration (sheetsConfig Sheet)

#### Overview
The sheetsConfig sheet defines how the system interacts with each worksheet in the main database. All five main sheets share the same four configuration parameters that control sorting, data clearing, and sheet identification.

#### Universal Sheet Parameters

**NAME** (string)
- **Purpose**: Exact name of the worksheet in Google Sheets
- **Use Cases**: 
  - Renaming sheets for different languages or naming conventions
  - Organizing sheets with prefixes (e.g., "2025_Bikes Status")
- **⚠️ Critical**: If NAME doesn't match actual sheet name exactly (case-sensitive), all operations on that sheet will fail with "Sheet not found" errors

**SORT_ORDER** (string: "asc" | "desc")
- **Purpose**: Direction for automatic sorting after data operations
- **Use Cases**:
  - `"asc"` for Bikes Status (alphabetical bike names)
  - `"desc"` for logs (newest entries first)
  - Change to `"asc"` for chronological log viewing (oldest first)
- **⚠️ Impact**: Wrong value causes data to sort in opposite direction, making recent entries hard to find

**SORT_COLUMN** (number, 0-based)
- **Purpose**: Column index for automatic sorting (0=Column A, 1=Column B, etc.)
- **Use Cases**:
  - `0` for Bikes Status (sort by bike names in Column A)
  - `0` for all logs (sort by timestamp in Column A)
- **⚠️ Critical**: If value exceeds actual column count, sorting fails and breaks data operations

**RESET_RANGE** (string, cell range)
- **Purpose**: Defines which cells get cleared during system resets
- **Format**: `"StartCell:EndColumn"` (e.g., `"A2:L"` = rows 2+ in columns A through L)
- **⚠️ Critical**: Wrong range can clear headers (`"A1:L"`) or miss operational data

#### Common Configuration Errors

**Incorrect RESET_RANGE Examples**:
- ❌ `"A1:L"` → Clears headers, breaking sheet structure
- ❌ `"E2:Z"` → Attempts to clear non-existent columns, causes errors
- ❌ `"E:L"` → Missing row specification, unpredictable behavior
- ✅ `"E2:L"` → Correctly clears data rows in specified columns

**Incorrect SORT_COLUMN Examples**:
- ❌ `15` → Column P doesn't exist in most sheets, sorting fails
- ❌ `-1` → Negative values cause errors
- ❌ `"A"` → Must be number, not letter
- ✅ `0` → Column A (first column)

### Fuzzy Matching Algorithm

The system uses Levenshtein distance for bike name matching:

- **0.0**: Exact match required
- **0.1-0.2**: Minor typos allowed (1-2 character differences)
- **0.3**: Moderate differences (recommended)
- **0.4-0.5**: Significant differences allowed
- **0.6+**: Very loose matching (not recommended)