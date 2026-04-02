# Automating the Offline Sales Push Script

## Overview

Instead of manually clicking **Run** every day, we set up a **Time-driven Trigger** in Google Apps Script so `pushToWebApp` fires automatically at 9 AM every morning.

---

## Option 1 — Set Up Trigger via UI (Easiest)

1. Open your Google Sheet → **Extensions → Apps Script**
2. In the Apps Script editor, click the **clock icon** (Triggers) in the left sidebar
3. Click **+ Add Trigger** (bottom right)
4. Fill in:
   - **Function to run:** `pushToWebApp`
   - **Deployment:** Head
   - **Event source:** Time-driven
   - **Type:** Day timer
   - **Time of day:** 9 AM to 10 AM
5. Click **Save**

Done — it will now run automatically every morning between 9–10 AM.

---

## Option 2 — Set Up Trigger Programmatically (Recommended)

Add this function to your Apps Script file alongside `pushToWebApp`:

```javascript
/**
 * Run this ONCE manually to register the daily 9 AM trigger.
 * After running, delete or ignore this function — the trigger persists.
 */
function createDailyTrigger() {
  // Remove any existing triggers for pushToWebApp to avoid duplicates
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === "pushToWebApp") {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }

  // Create a new daily trigger at 9 AM
  ScriptApp.newTrigger("pushToWebApp")
    .timeBased()
    .everyDays(1)
    .atHour(9) // 9 AM in the script's timezone
    .create();

  Logger.log("Daily trigger created: pushToWebApp will run every day at 9 AM.");
}
```

**Steps:**

1. Paste this function into your Apps Script file
2. Select `createDailyTrigger` from the function dropdown
3. Click **Run** — do this **only once**
4. The trigger is now saved permanently in your project

---

## Verifying the Trigger Exists

```javascript
function listTriggers() {
  var triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(function (t) {
    Logger.log(
      "Function: " +
        t.getHandlerFunction() +
        " | Type: " +
        t.getEventType() +
        " | Source: " +
        t.getTriggerSource(),
    );
  });
}
```

Run `listTriggers` to confirm `pushToWebApp` is registered.

---

## Removing the Trigger

If you ever want to stop the automation:

```javascript
function removeDailyTrigger() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === "pushToWebApp") {
      ScriptApp.deleteTrigger(triggers[i]);
      Logger.log("Trigger removed.");
    }
  }
}
```

---

## Timezone Note

Google Apps Script uses the **script project's timezone**, not your local machine time.

To verify or change it:

1. Apps Script editor → **Project Settings** (gear icon)
2. Check **Time zone** — set it to your local timezone (e.g., `Asia/Kolkata` for IST)

If you're in IST and want it at 9 AM IST, make sure the script timezone is set to `Asia/Kolkata`. The `atHour(9)` call maps to whatever timezone the script is configured with.

---

## Execution Logs

After the trigger runs, you can view logs at:

**Apps Script editor → Executions** (left sidebar clock icon)

Each run shows:

- Start/end time
- Status (Completed / Failed)
- Any `Logger.log` output from `pushToWebApp`

---

## Full Script (Copy-Paste Ready)

```javascript
// ─── MAIN PUSH FUNCTION ──────────────────────────────────────────────────────

function pushToWebApp() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Offline");
  var allData = sheet.getDataRange().getValues();

  var url = "https://raj-kamal-mono-repo.vercel.app/api/offline-sales/push";
  var token = "rk_secure_push_25";

  var headers = allData[0];
  var dataRows = allData.slice(1);
  var batchSize = 2000;

  for (var i = 0; i < dataRows.length; i += batchSize) {
    var chunk = dataRows.slice(i, i + batchSize);
    chunk.unshift(headers);

    var options = {
      method: "post",
      contentType: "application/json",
      headers: { "x-sync-token": token },
      payload: JSON.stringify({ data: chunk, isFirstBatch: i === 0 }),
      muteHttpExceptions: true,
    };

    var response = UrlFetchApp.fetch(url, options);
    Logger.log(
      "Batch starting at row " + i + " | Status: " + response.getResponseCode(),
    );
  }
}

// ─── TRIGGER SETUP (run once) ────────────────────────────────────────────────

function createDailyTrigger() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === "pushToWebApp") {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }

  ScriptApp.newTrigger("pushToWebApp")
    .timeBased()
    .everyDays(1)
    .atHour(9)
    .create();

  Logger.log("Daily trigger created: pushToWebApp will run every day at 9 AM.");
}

// ─── UTILITIES ───────────────────────────────────────────────────────────────

function listTriggers() {
  var triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(function (t) {
    Logger.log(
      "Function: " + t.getHandlerFunction() + " | Type: " + t.getEventType(),
    );
  });
}

function removeDailyTrigger() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === "pushToWebApp") {
      ScriptApp.deleteTrigger(triggers[i]);
      Logger.log("Trigger removed.");
    }
  }
}
```

# REAL ACTUAL CODE :-

function pushToWebApp() {
var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Offline");
var allData = sheet.getDataRange().getValues();

// Update this to your PRODUCTION URL or ngrok
var url = "https://raj-kamal-mono-repo.vercel.app/api/offline-sales/push";
var token = "rk_secure_push_25";

var headers = allData[0]; // Keep the headers
var dataRows = allData.slice(1);
var batchSize = 2000; // We send 2000 rows at a time to stay under the limit

for (var i = 0; i < dataRows.length; i += batchSize) {
var chunk = dataRows.slice(i, i + batchSize);
chunk.unshift(headers); // Put headers back onto each chunk

    var options = {
      method: 'post',
      contentType: 'application/json',
      headers: { 'x-sync-token': token },
      payload: JSON.stringify({ data: chunk, isFirstBatch: i === 0 }),
      muteHttpExceptions: true
    };

    var response = UrlFetchApp.fetch(url, options);
    Logger.log("Seeding Batch starting at row " + i + " | Status: " + response.getResponseCode());

}
}
