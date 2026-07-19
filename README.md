# BikeShare

Google Apps Script system for campus bike-share operations. Users check out and return bikes through Google Forms; Google Sheets store fleet, user, and log data; a separate management spreadsheet drives live configuration.

## Overview

BikeShare automates checkout/return validation, fleet and user status updates, email notifications, usage timers, scheduled open/close of the system, and periodic reports. The system use `LockService` so form submits, dashboard edits, and scheduled jobs do not race.

**Stack**

| Layer | Technology |
|-------|------------|
| User input | Google Forms (checkout + return) |
| Runtime | Google Apps Script (V8) |
| Data store | Google Sheets (main dashboard) |
| Config | Management spreadsheet + `CacheService` (6h) |
| Mail | `GmailApp` via communication templates |
| Deploy | [`clasp`](https://github.com/google/clasp) (`.clasp.json` is gitignored) |

---

## Architecture

### Spreadsheet topology

```
┌─────────────────────────────┐     ┌──────────────────────────────────┐
│  Management spreadsheet     │     │  Main dashboard spreadsheet      │
│  (settings only)            │     │  (operational data)              │
│                             │     │                                  │
│  • mainConfig               │     │  • Bikes Status                  │
│  • sheetsConfig             │────▶│  • User Status                   │
│  • notificationsConfig      │load │  • Checkout Logs  ◀── Checkout Form
│                             │     │  • Return Logs    ◀── Return Form
└─────────────────────────────┘     │  • Reports                       │
         onChange                   └──────────────────────────────────┘
            │                              ▲ onFormSubmit / onEdit
            ▼                              │
     handleSettingsUpdate            handleOnFormSubmit
                                     handleManualDashboardChanges
```

- **Management SS** — source of truth for toggles, schedules, sheet names, and notification templates. Edits sync via `handleSettingsUpdate`.
- **Main dashboard SS** — fleet inventory, users, form-linked logs, reports. Forms append to log sheets; script updates bike/user rows.

Resource IDs (spreadsheets, forms, org email, allowed domain) are currently set in `settings_module.js` (`setGlobalConfigs` / constructor). Treat them as per-deploy values when cloning for another campus.

### Runtime topology

```
                    Script load
                         │
                         ▼
              CACHED_SETTINGS = new Settings()
              (CacheService or management SS → VALUES)
                         │
                         ▼
┌────────────────────────────────────────────────────────────┐
│  gateway.js  — all triggers enter here under withLock()    │
└────────────────────────────────────────────────────────────┘
         │         │          │           │          │
         ▼         ▼          ▼           ▼          ▼
   cot_ret_*   settings   report_gen  routine_verif  manual_actions
         │         │          │           │          │
         └─────────┴──── DB / COMM / helpers ────────┘
```

### Module map

| File | Role |
|------|------|
| `gateway.js` | Trigger façade + `withLock` (30s script lock) |
| `settings_module.js` | `Settings` class, `CACHED_SETTINGS`, settings-change side effects, form open/close, activation state |
| `cot_ret_module.js` | Form event orchestration, `pipe()`, validation pipeline steps |
| `cot_ret_core.js` | Transaction transforms, state-change specs, `commitStateChanges` |
| `db_module.js` | Spreadsheet DAO: read, batch update, sort, soft/hard reset |
| `cross_module_utils.js` | Sheet row ↔ object mapping, form response parsing, loaders |
| `comm_service.js` | Template lookup, placeholder fill, user/admin/dev email, row marking |
| `helpers.js` | Trigger install/reinstall, fuzzy match, column letters, `cleanDatabase` |
| `manual_actions_module.js` | Admin `onEdit` on Bikes Status (maintenance + manual return sync) |
| `routine_verification_module.js` | Periodic `currentUsageTimer` refresh and overdue count |
| `report_gen_module.js` | Scheduled metrics snapshot → Reports sheet |
| `appsscript.json` | Manifest (timezone `America/New_York`, V8) |

There is no `SETTINGS.js` or `routine_verif_module.js`; those names in older docs referred to `settings_module.js` and `routine_verification_module.js`.

---

## Design

### Functional pipelines

Checkout and return are composed with a left-to-right `pipe(...fns)` over a shared data bag (`formData`, `currentState`, `eventContext`, plus accumulated `error` / `stateChanges` / `notifications`).

Validators short-circuit when `data.error` is already set (first failure wins). Business steps queue sheet ops; `commitStateChanges` performs writes and communications.

**Checkout**

```
validateEmailDomain
  → validateSystemActive
  → validateBikeExists          (by bikeHash)
  → validateBikeAvailable       (available + maintenance good)
  → validateUserEligible        (no unreturned bike; create user if missing)
  → processCheckoutTransaction
  → updateBikeStatus
  → updateUserStatus
  → generateNotifications
  → commitStateChanges
```

**Return**

```
validateEmailDomain
  → validateSystemActive
  → validateBikeExists          (exact name, then fuzzyMatch)
  → validateReturnEligible      (direct or friend-return rules)
  → validateBikeCheckedOut
  → processReturnTransaction
  → updateBikeStatus
  → updateUserStatus
  → calculateUsageHours
  → generateNotifications
  → commitStateChanges
```

Friend return: if `returningForFriend` is set, eligibility checks the friend’s account and bike ownership, then swaps so the owner’s user row is updated and the submitter is CC’d on success mail (`CFM_USR_RET_003`).

### Concurrency

Every gateway handler acquires `LockService.getScriptLock()` before domain logic. That serializes form submits, settings updates, reports, timer ticks, activation/shutdown, and dashboard edits.

### Configuration caching

1. On load, `Settings` reads ScriptCache key `configCache` (TTL 6 hours).
2. Miss or force → pull mapped ranges from the management spreadsheet → JSON into cache → `setGlobalConfigs()` builds `CACHED_SETTINGS.VALUES`.
3. Management sheet `onChange` → `parseSettingsUpdate` → side effects → `refreshCache(true)`.

### Separation of concerns

| Concern | Owner |
|---------|--------|
| Trigger routing + locking | `gateway.js` |
| Validation order / eligibility | `cot_ret_module.js` |
| Mutations + commit | `cot_ret_core.js` |
| Persistence primitives | `db_module.js` |
| Row schemas / form field maps | `cross_module_utils.js` |
| Outbound mail + log highlighting | `comm_service.js` |
| Live admin config | Management SS + `settings_module.js` |

Form log rows are written by Google Forms before the script runs; the pipeline updates Bikes Status and User Status, then may mark the log row via `COMM`.

---

## Implementation

### Triggers

Install or refresh all triggers with `reInstallAllTriggers()` in `helpers.js` (clears existing project triggers, then reinstalls).

| Installer | Event | Handler |
|-----------|-------|---------|
| `installOnSubmitTrigger` | `onFormSubmit` (active / dashboard SS) | `handleOnFormSubmit` |
| `installHandleSettingsUpdateTrigger` | `onChange` (management SS) | `handleSettingsUpdate` |
| `installHandleManualDashboardChangesTrigger` | `onEdit` (dashboard SS) | `handleManualDashboardChanges` |
| `installExecuteReportGenerationTrigger` | Time-driven daily (`DAYS_INTERVAL`, `GENERATION_HOUR`) | `executeReportGeneration` |
| `installUpdateUsageTimersTrigger` | Every 10 minutes | `executeUsageTimerUpdate` |
| `installScheduleSystemShutdownAndActivationTrigger` | One-shot `.at(date)` | `handleScheduledSystemActivation` / `handleScheduledSystemShutdown` |

`executeReportGeneration` no-ops if `REPORT_GENERATION.ENABLE_REPORT_GENERATION` is off.

### Checkout / return end-to-end

1. User submits Checkout or Return form → Forms appends a row to Checkout Logs or Return Logs.
2. `handleOnFormSubmit` → lock → `processFormSubmissionEvent`.
3. Sheet name selects operation (`checkout` vs `return`); `parseFormResponse` maps columns to fields.
4. `loadSystemState` loads bikes + users from sheets and attaches `CACHED_SETTINGS.VALUES`.
5. Pipeline validates and builds `stateChanges` + notifications.
6. `commitStateChanges`: `DB.batchUpdate` → `COMM.handleCommunication` per notification → sort log (and sheets that received appends).
7. Validation failures still go through notifications/commit for error codes (no bike/user mutation when the pipeline sets `error` before business steps produce updates—business steps still run only if earlier steps passed).

### Manual dashboard actions

`processManualDashboardActions` listens to Bikes Status edits:

- **Maintenance** (column 3): `"has issue"` / `"in repair"` while available → set availability to `"out of service"`; leaving `"has issue"` clears the cell note.
- **Availability** (column 4): `"checked out"` → `"available"` runs a manual return sync (`updateUserStatusFromManualAction`) on the most recent user when `lastCheckoutName` matches the bike. No email/log row.

### Usage timers

`runTimerUpdate` loads checked-out bikes, recomputes hours since `lastCheckoutDate` into `currentUsageTimer`, batch-updates Bikes Status, and logs how many exceed `REGULATIONS.MAX_CHECKOUT_HOURS`. It does not email users or increment `overdueReturns`.

### Reports

`runReportPipeline` aggregates fleet/user/return-log metrics for the configured interval, appends a Reports row, sorts, and sends `CFM_RPT_001` or `ERR_RPT_001`. Quick reports can also be triggered from management config (`GENERATE_QUICK_REPORT` = ON).

### Communications

`COMM.handleCommunication(commID, context)`:

1. Resolves `VALUES.COMM_CODES[commID]` (merged success + error templates from `notificationsConfig`).
2. Fills `{{placeholders}}`; blocks send if keys are missing.
3. Optionally emails user / admin / developer per flags in `NOTIFICATION_SETTINGS`.
4. Optionally `DB.markEntry` on the form response range (background + note).

Error codes from validation (e.g. `ERR_USR_COT_001`) are used as `commID`s. Success examples: `CFM_USR_COT_001`, `CFM_USR_RET_001`, `CFM_USR_RET_003` (friend return).

### Settings side effects (`parseSettingsUpdate`)

Limited to `mainConfig` edits. Notable behaviors:

| Edit | Effect |
|------|--------|
| `FORCE_SYSTEM_RESET` → ON | `cleanDatabase()`, admin confirm mail, flip OFF, reset report first-gen date |
| `GENERATE_QUICK_REPORT` → ON | `runReportPipeline()`, flip OFF |
| `SYSTEM_ACTIVE` | `setSystemActivationState` (forms accept/close responses; sync related cells) |
| Activation / shutdown dates (value column) | Delete old one-shot trigger; reinstall schedule |
| Any handled change | `refreshCache(true)`; throttled `LAST_SETTINGS_UPDATED_DATE` stamp |

### Data shapes (dashboard sheets)

**Bikes Status** (via `processBikesData`): name, size, maintenance, availability, last checkout/return, usage timer, total hours, three recent users, temp recent, bike hash, plus `_rowIndex`.

**User Status** (via `processUsersData`): email, has unreturned bike, last checkout/return name+date, checkout/return/mismatch counts, usage hours, overdue returns, first usage date, plus `_rowIndex`.

**Checkout form row** → timestamp, email, bikeHash, condition confirmation.

**Return form row** → timestamp, email, bikeName, confirmBikeName, assure rode, mismatch explanation, returning for friend, friend email, issues/concerns.

String sheet values are lowercased/trimmed by `convertSheetValue(..., 'string')`.

### Management spreadsheet ranges

Defined in `Settings.settingRangeMap`:

| Sheet | Tables (ranges) |
|-------|-----------------|
| `mainConfig` | systemButtons `A7:C14`, systemTime `F7:H9`, coreConfig `F14:H15`, reportGenerationSettings `F20:H22`, miscellaneous `A20:C20` |
| `sheetsConfig` | bikesStatus, reportSheet, checkoutLogs, userStatus, returnLogs |
| `notificationsConfig` | successMessages `A9:H13`, errorMessages `A21:H33` |

Types in the sheet (`number`, `button`, `datetime`, `array` with `___` separator, etc.) are coerced in `convertType`.

### Key `VALUES` namespaces

Built in `setGlobalConfigs()`:

- System: `SYSTEM_ACTIVE`, `DEBUG_MODE`, `ENABLE_FORCED_RESET`, schedule dates  
- Identity: `ADMIN_EMAIL`, `ORG_EMAIL`, `ALLOWED_EMAIL_DOMAIN`, spreadsheet/form IDs  
- `SHEETS.*` — names, reset ranges, sort columns, report column indices  
- `FORMS.*` — form IDs and item field IDs  
- `REGULATIONS.MAX_CHECKOUT_HOURS`  
- `NOTIFICATION_SETTINGS`, `REPORT_GENERATION`, `COMM_CODES`, `IGNORED_REPORT_STMTS_ON_RFORM`  
- `FUZZY_MATCHING_THRESHOLD` (default `0.3`)

Call sites should prefer `CACHED_SETTINGS.VALUES` (and nested keys like `REGULATIONS.MAX_CHECKOUT_HOURS`) rather than inventing parallel top-level keys.

### Database API (`DB`)

| Method | Use |
|--------|-----|
| `getSpreadsheet` / `getSheet` / `getAllData` | Reads (default SS = `MAIN_DASHBOARD_SS_ID`) |
| `batchUpdate` | Grouped update-by-row / append + notes |
| `sortByColumn` | Post-write ordering from sheet config |
| `markEntry` | Background + note (used by COMM) |
| `resetDatabase` / `hardResetDatabase` | Soft clear / row delete (gated by debug + forced-reset flags; hard reset skips Bikes Status inventory wipe) |

### Ops helpers

| Function | Purpose |
|----------|---------|
| `reInstallAllTriggers()` | Full trigger reinstall |
| `quickTest()` | Force cache refresh; log `SYSTEM_ACTIVE` |
| `cleanDatabase()` | Soft + hard reset on main dashboard |
| `printFormFieldInfo(formId)` | Dump form item IDs (for wiring `FORMS.*_FIELD_IDS`) |
| `forceClearCache()` (on Settings) | Drop ScriptCache and reload from management SS |

---

## Setup

1. Create (or bind) an Apps Script project for the main dashboard spreadsheet; push this repo with clasp if desired.
2. Create a management spreadsheet with `mainConfig`, `sheetsConfig`, and `notificationsConfig` matching the ranges above.
3. Set management SS ID, dashboard SS ID, form IDs, org/admin email, and allowed domain in `settings_module.js` (or migrate those to Script Properties for multi-campus deploys).
4. Link Checkout / Return forms to the corresponding log sheets; align form item IDs with `VALUES.FORMS`.
5. Authorize Gmail, Sheets, Forms, and ScriptApp scopes on first run.
6. Run `reInstallAllTriggers()`.
7. Run `quickTest()` and submit a test checkout/return.

---

## Key handlers (quick reference)

| Function | Module | Description |
|----------|--------|-------------|
| `handleOnFormSubmit` | gateway | Locked form pipeline |
| `handleSettingsUpdate` | gateway | Locked management sync |
| `handleManualDashboardChanges` | gateway | Locked bike sheet edits |
| `executeReportGeneration` | gateway | Locked report job (if enabled) |
| `executeUsageTimerUpdate` | gateway | Locked timer refresh |
| `handleScheduledSystemActivation` / `Shutdown` | gateway | Flip system + forms |
| `processFormSubmissionEvent` | cot_ret_module | Checkout/return orchestration |
| `runReportPipeline` | report_gen_module | Build + save + notify report |
| `runTimerUpdate` | routine_verification_module | Usage timer batch update |
| `parseSettingsUpdate` | settings_module | Management change side effects |
| `setSystemActivationState` | settings_module | Forms + `SYSTEM_ACTIVE` cells |

---

## Project layout

```
BikeShare/
├── appsscript.json
├── gateway.js
├── settings_module.js
├── cot_ret_module.js
├── cot_ret_core.js
├── db_module.js
├── cross_module_utils.js
├── comm_service.js
├── helpers.js
├── manual_actions_module.js
├── routine_verification_module.js
├── report_gen_module.js
├── README.md
└── LICENSE
```

---

## License

See [LICENSE](LICENSE).
