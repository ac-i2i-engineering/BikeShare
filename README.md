# BikeShare System

A functional Google Apps Script system for managing bike sharing operations using Google Sheets as a database and Google Forms for user interactions.

## Overview

The BikeShare system automates bike checkout and return processes, tracks usage, generates reports, and manages user accounts. It uses a cross-spreadsheet architecture with separate management and operational spreadsheets.

## Architecture

- **Frontend**: Google Forms for user interactions
- **Backend**: Google Apps Script with functional programming approach (pipelines)
- **Database**: Google Sheets for data storage
- **Management**: Separate management spreadsheet for settings and configuration
- **Concurrency**: Script locking mechanism to prevent race conditions

## Key Features

- **Automated Checkout/Return**: Form-based bike transactions with validation pipelines
- **User Management**: Track users, usage hours, and return history
- **Bike Status Tracking**: Monitor availability, maintenance, and usage timers
- **Manual Dashboard Actions**: Admin-level bike availability and user status updates
- **Routine Verification**: Automatic usage timer updates and overdue bike detection
- **Scheduled Operations**: Automatic system activation/shutdown and report generation
- **Settings Management**: Live configuration updates via management spreadsheet with caching
- **Email Notifications**: Automated user and admin notifications
- **Usage Analytics**: Comprehensive reporting and metrics

## Main Components

| File | Description |
|------|-------------|
| `gateway.js` | Main trigger handlers with centralized locking mechanism |
| `cot_ret_module.js` | Functional pipelines for checkout/return processing |
| `cot_ret_core.js` | Core business logic and validation functions |
| `SETTINGS.js` | Settings class with configuration management and caching |
| `db_module.js` | Database operations and batch processing |
| `comm_service.js` | Communication and notification handling |
| `helpers.js` | Utility functions and trigger management |
| `cross_module_utils.js` | Shared utilities for data processing and type conversion |
| `manual_actions_module.js` | Manual dashboard change handlers for admin actions |
| `routine_verif_module.js` | Routine verification for usage timers and overdue bikes |
| `report_gen_module.js` | Functional report generation with batch data loading |

## Setup

1. Deploy the script to Google Apps Script bound to your main dashboard spreadsheet
2. Configure the management spreadsheet ID in `SETTINGS.js`
3. Set up the management spreadsheet with proper configuration ranges
4. Run `reInstallAllTriggers()` to initialize all triggers
5. Test with `quickTest()` to verify configuration

## Key Functions

| Function | Description |
|----------|-------------|
| `reInstallAllTriggers()` | Reinstall all system triggers |
| `cleanDatabase()` | Reset system data (debug mode only) |
| `quickTest()` | Quick configuration verification |
| `handleOnFormSubmit(e)` | Main form submission handler with locking |
| `executeReportGeneration()` | Triggered automatic report generation |
| `executeUsageTimerUpdate()` | Triggered automatic usage timer updates |
| `handleSettingsUpdate(e)` | Sync settings on management spreadsheet changes |

## Functional Pipelines

The system uses a functional programming approach with composable pipelines:

**Checkout Pipeline:**
```
validateEmailDomain → validateSystemActive → validateBikeExists → 
validateBikeAvailable → validateUserEligible → processCheckoutTransaction → 
updateBikeStatus → updateUserStatus → generateNotifications
```

**Return Pipeline:**
```
validateEmailDomain → validateSystemActive → validateBikeExists → 
validateBikeCheckedOut → validateReturnEligible → processReturnTransaction → 
updateBikeStatus → updateUserStatus → calculateUsageHours → generateNotifications
```

## Configuration

Settings are managed via a separate management spreadsheet with sections for:
- System buttons and controls
- System time configuration
- Core configuration
- Report generation settings
- Sheet configurations (Bikes Status, Users, Checkout/Return Logs, Reports)
- Notification settings (success and error messages)

The system uses a 6-hour cache for configuration with automatic refresh when management spreadsheet changes are detected.

## Manual Dashboard Actions

Admins can manually update bike status via the dashboard:
- Changing maintenance status clears issue notes automatically
- Changing availability from "checked out" to "available" automatically updates the associated user status

## License

See [LICENSE](LICENSE) for details.