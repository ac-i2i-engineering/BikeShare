# BikeShare System

A functional Google Apps Script system for managing bike sharing operations using Google Sheets as a database and Google Forms for user interactions.

## Overview

The BikeShare system automates bike checkout and return processes, tracks usage, generates reports, and manages user accounts. It uses a cross-spreadsheet architecture with separate management and operational spreadsheets.

## Architecture

- **Frontend**: Google Forms for user interactions
- **Backend**: Google Apps Script with functional programming approach
- **Database**: Google Sheets for data storage
- **Management**: Separate management spreadsheet for settings and configuration

## Key Features

- **Automated Checkout/Return**: Form-based bike transactions with validation
- **User Management**: Track users, usage hours, and return history
- **Bike Status Tracking**: Monitor availability, maintenance, and usage
- **Scheduled Operations**: Automatic system activation/shutdown and report generation
- **Settings Management**: Live configuration updates via management spreadsheet
- **Email Notifications**: Automated user and admin notifications
- **Usage Analytics**: Comprehensive reporting and metrics

## Main Components

- `gateway.js` - Main trigger handlers and locking mechanisms
- `cot_ret_module.js` - Functional pipelines for checkout/return processing
- `cot_ret_core.js` - Core business logic and validation functions
- `settings_module.js` - Configuration management and caching
- `db_module.js` - Database operations and batch processing
- `comm_service.js` - Communication and notification handling
- `helpers.js` - Utility functions and trigger management

## Setup

1. Deploy the script to Google Apps Script bound to your main dashboard spreadsheet
2. Configure spreadsheet IDs and form IDs in `settings_module.js`
3. Set up the management spreadsheet with proper configuration ranges
4. Run `reInstallAllTriggers()` to initialize all triggers
5. Test with `quickTest()` to verify configuration

## Key Functions
- `reInstallAllTriggers()` - Reinstall all system triggers
- `cleanDatabase()` - Reset system data (debug mode only)
- `quickTest()` - Quick configuration verification

## Configuration

Settings are managed via a separate management spreadsheet with sections for:
- System buttons and controls
- Form field mappings
- Notification settings
- Report generation settings
- Sheet configurations

The system automatically refreshes configuration cache when management spreadsheet changes are detected.