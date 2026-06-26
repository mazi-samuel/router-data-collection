// ── Router Data Collection — Google Apps Script ──────────────────────────────
// Paste this entire file into your Google Apps Script editor.
// Deploy as Web App: Execute as "Me", Who has access "Anyone"
// To update: Deploy > Manage Deployments > Edit > New Version > Deploy
// NOTE: The Web App URL stays the same after updating — no need to change .env

var ROUTES_SHEET = "Routes";
var STOPS_SHEET  = "Stops";
var ALTS_SHEET   = "Alternatives";

// XP constants (must match the frontend values)
var XP_PER_ENTRY = 120;
var XP_ALT       = 40;
var XP_PEAK      = 20;
var XP_CONDITION = 15;

// ── doGet: Returns all route entries as JSON (powers the leaderboard) ─────────
function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var routesSheet = ss.getSheetByName(ROUTES_SHEET);

    if (!routesSheet) {
      return ContentService.createTextOutput("[]")
        .setMimeType(ContentService.MimeType.JSON);
    }

    var data = routesSheet.getDataRange().getValues();
    if (data.length <= 1) {
      return ContentService.createTextOutput("[]")
        .setMimeType(ContentService.MimeType.JSON);
    }

    var headers = data[0].map(function(h) { return String(h).trim(); });

    // Pre-fetch stops and alts keyed by routeId
    var stopsData  = getSheetRows(ss, STOPS_SHEET);
    var altsData   = getSheetRows(ss, ALTS_SHEET);

    var stopsMap = {};
    stopsData.forEach(function(s) {
      if (!stopsMap[s.routeId]) stopsMap[s.routeId] = [];
      stopsMap[s.routeId].push(s);
    });

    var altsMap = {};
    altsData.forEach(function(a) {
      if (!altsMap[a.routeId]) altsMap[a.routeId] = [];
      altsMap[a.routeId].push(a);
    });

    var entries = [];
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var entry = {};
      for (var j = 0; j < headers.length; j++) {
        var key = headers[j];
        var val = row[j];
        if (key === "negotiable") {
          entry[key] = (val === "TRUE" || val === true || String(val).toLowerCase() === "true");
        } else if (key === "vehicles") {
          if (!val) {
            entry[key] = [];
          } else {
            try {
              entry[key] = JSON.parse(val);
            } catch (err) {
              entry[key] = String(val).split(";").filter(function(x) { return x; });
            }
          }
        } else {
          entry[key] = (val !== undefined && val !== null) ? String(val) : "";
        }
      }

      // Ensure "ts" field is populated (from "timestamp" if that was used)
      entry.ts = entry.ts || entry.timestamp || "";

      // Attach stops and alts
      var routeId = entry.id || entry["id"];
      entry.stops = stopsMap[routeId] || [];
      entry.alts  = (altsMap[routeId] || []).map(function(a) {
        var altVehiclesStr = a.vehicles || a.vehicle || "";
        return {
          from:       a.altFrom || "",
          to:         a.altTo   || "",
          vehicles:   altVehiclesStr ? String(altVehiclesStr).split(";").filter(function(x){return x;}) : [],
          fare:       a.fare || "",
          peakFare:   a.peakFare || "",
          offPeakFare:a.offPeakFare || "",
          note:       a.note || "",
          stops:      (function() {
            var rawStops = a.altStops || a.stops || "";
            if (!rawStops) return [];
            try { return JSON.parse(rawStops); }
            catch(err) { return []; }
          })()
        };
      });

      // Calculate XP on the fly for older entries if missing
      var rawXp = entry.xpEarned;
      if (rawXp === undefined || rawXp === null || rawXp === "" || isNaN(Number(rawXp))) {
        var xp = XP_PER_ENTRY;
        if (entry.alts && entry.alts.length > 0) xp += XP_ALT;
        if (entry.peakFare) xp += XP_PEAK;
        if (entry.condition) xp += XP_CONDITION;
        entry.xpEarned = xp;
      } else {
        entry.xpEarned = Number(rawXp);
      }

      if (entry.id || entry.from || entry.contributor) entries.push(entry);
    }

    return ContentService.createTextOutput(JSON.stringify(entries))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ── doPost: Save a new route entry ────────────────────────────────────────────
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    // ── 1. Routes sheet ──────────────────────────────────────────────────────
    var routesSheet = getOrCreateSheet(ss, ROUTES_SHEET, [
      "id", "contributor", "contributorId", "from", "to", "vehicles",
      "baseFare", "peakFare", "offPeakFare", "negotiable",
      "negotiateTip", "dayType", "timeOfDay", "condition",
      "notes", "landmark", "timestamp", "ts", "xpEarned"
    ]);

    var routesHeaders = routesSheet.getRange(1, 1, 1, routesSheet.getLastColumn()).getValues()[0].map(function(h) { return String(h).trim(); });
    
    var routeRowData = {
      "id": data.id || "",
      "contributor": data.contributor || "",
      "contributorId": data.contributorId || "",
      "from": data.from || "",
      "to": data.to || "",
      "vehicles": (data.vehicles || []).join(";"),
      "baseFare": data.baseFare || "",
      "peakFare": data.peakFare || "",
      "offPeakFare": data.offPeakFare || "",
      "negotiable": data.negotiable ? "TRUE" : "FALSE",
      "negotiateTip": data.negotiateTip || "",
      "dayType": data.dayType || "",
      "timeOfDay": data.timeOfDay || "",
      "condition": data.condition || "",
      "notes": data.notes || "",
      "landmark": data.landmark || "",
      "timestamp": data.ts || new Date().toISOString(),
      "ts": data.ts || new Date().toISOString(),
      "xpEarned": data.xpEarned || 120
    };

    var routeRow = routesHeaders.map(function(h) {
      return routeRowData[h] !== undefined ? routeRowData[h] : "";
    });
    routesSheet.appendRow(routeRow);

    // ── 2. Stops sheet ───────────────────────────────────────────────────────
    if (Array.isArray(data.stops) && data.stops.length > 0) {
      var stopsSheet = getOrCreateSheet(ss, STOPS_SHEET, [
        "routeId", "stopIndex", "name", "fare", "note"
      ]);
      var stopsHeaders = stopsSheet.getRange(1, 1, 1, stopsSheet.getLastColumn()).getValues()[0].map(function(h) { return String(h).trim(); });
      
      data.stops.forEach(function(stop, index) {
        if (!stop.name) return;
        var stopRowData = {
          "routeId": data.id,
          "stopIndex": index + 1,
          "name": stop.name,
          "fare": stop.fare || "",
          "note": stop.note || ""
        };
        var stopRow = stopsHeaders.map(function(h) {
          return stopRowData[h] !== undefined ? stopRowData[h] : "";
        });
        stopsSheet.appendRow(stopRow);
      });
    }

    // ── 3. Alternatives sheet ─────────────────────────────────────────────────
    if (Array.isArray(data.alts) && data.alts.length > 0) {
      var altsSheet = getOrCreateSheet(ss, ALTS_SHEET, [
        "routeId", "altIndex", "altFrom", "altTo",
        "vehicles", "vehicle", "fare", "peakFare", "offPeakFare", "altStops", "stops", "note"
      ]);
      var altsHeaders = altsSheet.getRange(1, 1, 1, altsSheet.getLastColumn()).getValues()[0].map(function(h) { return String(h).trim(); });
      
      data.alts.forEach(function(alt, index) {
        if (!alt.vehicles || alt.vehicles.length === 0) return;
        var altRowData = {
          "routeId": data.id,
          "altIndex": index + 1,
          "altFrom": alt.from || "",
          "altTo": alt.to || "",
          "vehicles": (alt.vehicles || []).join(";"),
          "vehicle": (alt.vehicles || []).join(";"),
          "fare": alt.fare || "",
          "peakFare": alt.peakFare || "",
          "offPeakFare": alt.offPeakFare || "",
          "altStops": JSON.stringify(alt.stops || []),
          "stops": JSON.stringify(alt.stops || []),
          "note": alt.note || ""
        };
        var altRow = altsHeaders.map(function(h) {
          return altRowData[h] !== undefined ? altRowData[h] : "";
        });
        altsSheet.appendRow(altRow);
      });
    }

    return ContentService.createTextOutput(JSON.stringify({ success: true }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function getSheetRows(ss, name) {
  var s = ss.getSheetByName(name);
  if (!s || s.getLastRow() <= 1) return [];
  var data = s.getDataRange().getValues();
  var headers = data[0].map(function(h) { return String(h).trim(); });
  var rows = [];
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var item = {};
    for (var j = 0; j < headers.length; j++) {
      item[headers[j]] = row[j] !== undefined && row[j] !== null ? row[j] : "";
    }
    rows.push(item);
  }
  return rows;
}

function getOrCreateSheet(ss, name, headers) {
  var s = ss.getSheetByName(name);
  if (!s) {
    s = ss.insertSheet(name);
    s.appendRow(headers);
  } else if (s.getLastColumn() > 0) {
    var existingHeaders = s.getRange(1, 1, 1, s.getLastColumn()).getValues()[0];
    var existingHeadersSet = {};
    existingHeaders.forEach(function(h) {
      existingHeadersSet[String(h).trim()] = true;
    });
    
    headers.forEach(function(h) {
      if (!existingHeadersSet[h]) {
        s.getRange(1, s.getLastColumn() + 1).setValue(h);
      }
    });
  } else {
    s.appendRow(headers);
  }
  return s;
}
