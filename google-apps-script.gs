// ── Router Data Collection — Google Apps Script ──────────────────────────────
// Paste this entire file into your Google Apps Script editor.
// Deploy as Web App: Execute as "Me", Who has access "Anyone"
// To update: Deploy > Manage Deployments > Edit > New Version > Deploy
// NOTE: The Web App URL stays the same after updating — no need to change .env

var ROUTES_SHEET   = "Routes";
var STOPS_SHEET    = "Stops";
var ALTS_SHEET     = "Alternatives";
var COMMENTS_SHEET = "Comments";
var XP_ADJ_SHEET   = "XPAdjustments";

var XP_PER_ENTRY = 120;
var XP_ALT       = 40;
var XP_PEAK      = 20;
var XP_CONDITION = 15;

// ── doGet ─────────────────────────────────────────────────────────────────────
function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : "get";
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    if (action === "comments") {
      var rows = getSheetRows(ss, COMMENTS_SHEET);
      rows = rows.map(function(r) {
        r.thumbsUpBy   = tryParse(r.thumbsUpBy,   []);
        r.thumbsDownBy = tryParse(r.thumbsDownBy, []);
        return r;
      });
      return jsonOut(rows);
    }
    if (action === "xpadjustments") {
      return jsonOut(getSheetRows(ss, XP_ADJ_SHEET));
    }
    return jsonOut(getAllRoutes(ss));
  } catch (err) {
    return jsonOut({ error: err.toString() });
  }
}

// ── doPost ────────────────────────────────────────────────────────────────────
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var action = data.action || "submit";
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    if (action === "submit")                return handleSubmit(ss, data);
    if (action === "edit")                  return handleEdit(ss, data);
    if (action === "addAltToOther")         return handleAddAltToOther(ss, data);
    if (action === "comment")               return handleComment(ss, data);
    if (action === "thumbs")                return handleThumbs(ss, data);
    if (action === "xpAdjust")             return handleXpAdjust(ss, data);
    if (action === "submitEditWithComment") return handleSubmitEditWithComment(ss, data);

    return jsonOut({ success: false, error: "Unknown action: " + action });
  } catch (err) {
    return jsonOut({ success: false, error: err.toString() });
  }
}

// ── Action: Submit new route ──────────────────────────────────────────────────
function handleSubmit(ss, data) {
  var routesSheet = getOrCreateSheet(ss, ROUTES_SHEET, [
    "id", "contributor", "contributorId", "from", "to", "vehicles",
    "baseFare", "peakFare", "offPeakFare", "negotiable",
    "negotiateTip", "dayType", "timeOfDay", "condition",
    "notes", "landmark", "timestamp", "ts", "xpEarned"
  ]);
  writeRouteRow(routesSheet, data);
  writeStops(ss, data);
  writeAlts(ss, data);
  return jsonOut({ success: true });
}

// ── Action: Edit existing route (no from/to changes) ─────────────────────────
function handleEdit(ss, data) {
  var routesSheet = ss.getSheetByName(ROUTES_SHEET);
  if (!routesSheet) return jsonOut({ success: false, error: "Routes sheet not found" });

  var sheetData = routesSheet.getDataRange().getValues();
  var headers   = sheetData[0].map(function(h) { return String(h).trim(); });
  var idCol     = headers.indexOf("id");
  if (idCol < 0) return jsonOut({ success: false, error: "No id column" });

  var rowIndex = -1;
  for (var i = 1; i < sheetData.length; i++) {
    if (String(sheetData[i][idCol]) === String(data.id)) { rowIndex = i + 1; break; }
  }
  if (rowIndex < 0) return jsonOut({ success: false, error: "Entry not found" });

  var allowedEdits = {
    "vehicles":    (data.vehicles || []).join(";"),
    "baseFare":    data.baseFare     || "",
    "peakFare":    data.peakFare     || "",
    "offPeakFare": data.offPeakFare  || "",
    "negotiable":  data.negotiable ? "TRUE" : "FALSE",
    "negotiateTip":data.negotiateTip || "",
    "dayType":     data.dayType      || "",
    "timeOfDay":   data.timeOfDay    || "",
    "condition":   data.condition    || "",
    "notes":       data.notes        || "",
    "landmark":    data.landmark     || "",
    "ts":          new Date().toISOString(),
    "timestamp":   new Date().toISOString()
  };

  headers.forEach(function(h, j) {
    if (allowedEdits[h] !== undefined) {
      routesSheet.getRange(rowIndex, j + 1).setValue(allowedEdits[h]);
    }
  });

  rewriteStops(ss, data);
  rewriteAlts(ss, data);
  return jsonOut({ success: true });
}

// ── Action: Add alternative to another contributor's route ────────────────────
function handleAddAltToOther(ss, data) {
  var altsSheet = getOrCreateSheet(ss, ALTS_SHEET, [
    "routeId", "altIndex", "altFrom", "altTo",
    "vehicles", "vehicle", "fare", "peakFare", "offPeakFare",
    "altStops", "stops", "note", "addedBy", "addedById", "ts"
  ]);
  var altsHeaders = altsSheet.getRange(1, 1, 1, altsSheet.getLastColumn())
    .getValues()[0].map(function(h) { return String(h).trim(); });

  // Find next altIndex for this route
  var allAltsData = altsSheet.getDataRange().getValues();
  var rIdCol = altsHeaders.indexOf("routeId");
  var aIdxCol = altsHeaders.indexOf("altIndex");
  var maxAltIdx = 0;
  for (var i = 1; i < allAltsData.length; i++) {
    if (String(allAltsData[i][rIdCol]) === String(data.routeId)) {
      var ai = Number(allAltsData[i][aIdxCol]) || 0;
      if (ai > maxAltIdx) maxAltIdx = ai;
    }
  }

  var alt = data.alt || {};
  var rowData = {
    "routeId":  data.routeId || "",
    "altIndex": maxAltIdx + 1,
    "altFrom":  alt.from  || "",
    "altTo":    alt.to    || "",
    "vehicles":   (alt.vehicles || []).join(";"),
    "vehicle":    (alt.vehicles || []).join(";"),
    "fare":       alt.fare        || "",
    "peakFare":   alt.peakFare    || "",
    "offPeakFare":alt.offPeakFare || "",
    "altStops": JSON.stringify(alt.stops || []),
    "stops":    JSON.stringify(alt.stops || []),
    "note":     alt.note          || "",
    "addedBy":  data.contributor  || "",
    "addedById":data.contributorId|| "",
    "ts":       new Date().toISOString()
  };
  altsSheet.appendRow(altsHeaders.map(function(h) { return rowData[h] !== undefined ? rowData[h] : ""; }));

  // Record XP adjustment for the person who added the alt
  recordXpAdjust(ss, {
    userId: data.contributorId, userName: data.contributor,
    type: "BOOST_ALT_OTHER",
    oldXP: data.oldXP || 0, newXP: data.newXP || 0,
    delta: (data.newXP || 0) - (data.oldXP || 0),
    reason: "Added alternative to route " + data.routeId
  });

  return jsonOut({ success: true });
}

// ── Action: Post a comment on a route ─────────────────────────────────────────
function handleComment(ss, data) {
  var commentsSheet = getOrCreateSheet(ss, COMMENTS_SHEET, [
    "commentId", "routeId", "commenterName", "commenterId",
    "text", "ts", "thumbsUpBy", "thumbsDownBy", "resolved", "editSubmitted"
  ]);
  var headers = commentsSheet.getRange(1, 1, 1, commentsSheet.getLastColumn())
    .getValues()[0].map(function(h) { return String(h).trim(); });

  var commentId = data.commentId || (Date.now().toString(36) + Math.random().toString(36).slice(2));
  var rowData = {
    "commentId":     commentId,
    "routeId":       data.routeId       || "",
    "commenterName": data.commenterName || "",
    "commenterId":   data.commenterId   || "",
    "text":          data.text          || "",
    "ts":            new Date().toISOString(),
    "thumbsUpBy":    "[]",
    "thumbsDownBy":  "[]",
    "resolved":      "false",
    "editSubmitted": "false"
  };
  commentsSheet.appendRow(headers.map(function(h) { return rowData[h] !== undefined ? rowData[h] : ""; }));
  return jsonOut({ success: true, commentId: commentId });
}

// ── Action: Thumbs up or down on a comment ────────────────────────────────────
function handleThumbs(ss, data) {
  var commentsSheet = ss.getSheetByName(COMMENTS_SHEET);
  if (!commentsSheet) return jsonOut({ success: false, error: "Comments sheet not found" });

  var sheetData    = commentsSheet.getDataRange().getValues();
  var headers      = sheetData[0].map(function(h) { return String(h).trim(); });
  var commentIdCol = headers.indexOf("commentId");
  var thumbsUpCol  = headers.indexOf("thumbsUpBy");
  var thumbsDownCol= headers.indexOf("thumbsDownBy");
  var resolvedCol  = headers.indexOf("resolved");

  var rowIndex = -1;
  for (var i = 1; i < sheetData.length; i++) {
    if (String(sheetData[i][commentIdCol]) === String(data.commentId)) { rowIndex = i + 1; break; }
  }
  if (rowIndex < 0) return jsonOut({ success: false, error: "Comment not found" });

  var thumbsUp   = tryParse(sheetData[rowIndex - 1][thumbsUpCol], []);
  var thumbsDown = tryParse(sheetData[rowIndex - 1][thumbsDownCol], []);

  if (data.direction === "up") {
    if (!thumbsUp.includes(data.voterId)) thumbsUp.push(data.voterId);
    thumbsDown = thumbsDown.filter(function(id) { return id !== data.voterId; });
  } else {
    if (!thumbsDown.includes(data.voterId)) thumbsDown.push(data.voterId);
    thumbsUp = thumbsUp.filter(function(id) { return id !== data.voterId; });
  }

  commentsSheet.getRange(rowIndex, thumbsUpCol + 1).setValue(JSON.stringify(thumbsUp));
  commentsSheet.getRange(rowIndex, thumbsDownCol + 1).setValue(JSON.stringify(thumbsDown));
  commentsSheet.getRange(rowIndex, resolvedCol + 1).setValue("true");

  return jsonOut({ success: true });
}

// ── Action: Record an XP adjustment ──────────────────────────────────────────
function handleXpAdjust(ss, data) {
  recordXpAdjust(ss, data);
  return jsonOut({ success: true });
}

// ── Action: Submit route edit AND award commenter XP ──────────────────────────
function handleSubmitEditWithComment(ss, data) {
  handleEdit(ss, data);

  // Mark the comment's editSubmitted flag
  var commentsSheet = ss.getSheetByName(COMMENTS_SHEET);
  if (commentsSheet && data.commentId) {
    var sheetData = commentsSheet.getDataRange().getValues();
    var headers   = sheetData[0].map(function(h) { return String(h).trim(); });
    var cidCol    = headers.indexOf("commentId");
    var editCol   = headers.indexOf("editSubmitted");
    for (var i = 1; i < sheetData.length; i++) {
      if (String(sheetData[i][cidCol]) === String(data.commentId)) {
        if (editCol >= 0) commentsSheet.getRange(i + 1, editCol + 1).setValue("true");
        break;
      }
    }
  }

  // Award +5 XP to commenter
  if (data.commenterId) {
    recordXpAdjust(ss, {
      userId: data.commenterId, userName: data.commenterName || "",
      type: "COMMENT_ACKNOWLEDGED",
      oldXP: data.commenterOldXP || 0, newXP: data.commenterNewXP || 0,
      delta: 5,
      reason: "Comment led to route edit on " + data.id
    });
  }

  // Award +1 XP to owner for acknowledging feedback
  if (data.contributorId) {
    recordXpAdjust(ss, {
      userId: data.contributorId, userName: data.contributor || "",
      type: "OWNER_THUMBS_UP",
      oldXP: 0, newXP: 1, delta: 1,
      reason: "Acknowledged community comment on route " + data.id
    });
  }

  return jsonOut({ success: true });
}

// ── Helper: Get all routes (joins stops + alts) ────────────────────────────────
function getAllRoutes(ss) {
  var routesSheet = ss.getSheetByName(ROUTES_SHEET);
  if (!routesSheet) return [];

  var data = routesSheet.getDataRange().getValues();
  if (data.length <= 1) return [];

  var headers  = data[0].map(function(h) { return String(h).trim(); });
  var stopsMap = buildMap(getSheetRows(ss, STOPS_SHEET), "routeId");
  var altsMap  = buildMap(getSheetRows(ss, ALTS_SHEET),  "routeId");

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
        var parsed = tryParse(String(val), null);
        if (Array.isArray(parsed)) {
          entry[key] = parsed;
        } else {
          entry[key] = val ? String(val).split(";").filter(Boolean) : [];
        }
      } else {
        entry[key] = (val !== undefined && val !== null) ? String(val) : "";
      }
    }

    entry.ts    = entry.ts || entry.timestamp || "";
    var routeId = entry.id;

    entry.stops = stopsMap[routeId] || [];
    entry.alts  = (altsMap[routeId] || []).map(function(a) {
      var vStr = a.vehicles || a.vehicle || "";
      return {
        from: a.altFrom || "", to: a.altTo || "",
        vehicles: vStr ? String(vStr).split(";").filter(Boolean) : [],
        fare: a.fare || "", peakFare: a.peakFare || "", offPeakFare: a.offPeakFare || "",
        note: a.note || "",
        addedBy: a.addedBy || "", addedById: a.addedById || "",
        stops: tryParse(a.altStops || a.stops || "", [])
      };
    });

    var rawXp = entry.xpEarned;
    if (!rawXp || isNaN(Number(rawXp)) || Number(rawXp) === 0) {
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
  return entries;
}

// ── Write helpers ─────────────────────────────────────────────────────────────
function writeRouteRow(routesSheet, data) {
  var headers = routesSheet.getRange(1, 1, 1, routesSheet.getLastColumn())
    .getValues()[0].map(function(h) { return String(h).trim(); });
  var rowData = {
    "id": data.id || "", "contributor": data.contributor || "",
    "contributorId": data.contributorId || "",
    "from": data.from || "", "to": data.to || "",
    "vehicles": (data.vehicles || []).join(";"),
    "baseFare": data.baseFare || "", "peakFare": data.peakFare || "",
    "offPeakFare": data.offPeakFare || "",
    "negotiable": data.negotiable ? "TRUE" : "FALSE",
    "negotiateTip": data.negotiateTip || "",
    "dayType": data.dayType || "", "timeOfDay": data.timeOfDay || "",
    "condition": data.condition || "", "notes": data.notes || "",
    "landmark": data.landmark || "",
    "timestamp": data.ts || new Date().toISOString(),
    "ts": data.ts || new Date().toISOString(),
    "xpEarned": data.xpEarned || 120
  };
  routesSheet.appendRow(headers.map(function(h) { return rowData[h] !== undefined ? rowData[h] : ""; }));
}

function writeStops(ss, data) {
  if (!Array.isArray(data.stops) || !data.stops.length) return;
  var sheet = getOrCreateSheet(ss, STOPS_SHEET, ["routeId", "stopIndex", "name", "fare", "note"]);
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(function(h) { return String(h).trim(); });
  data.stops.forEach(function(stop, i) {
    if (!stop.name) return;
    var rd = { routeId: data.id, stopIndex: i + 1, name: stop.name, fare: stop.fare || "", note: stop.note || "" };
    sheet.appendRow(headers.map(function(h) { return rd[h] !== undefined ? rd[h] : ""; }));
  });
}

function writeAlts(ss, data) {
  if (!Array.isArray(data.alts) || !data.alts.length) return;
  var sheet = getOrCreateSheet(ss, ALTS_SHEET, [
    "routeId", "altIndex", "altFrom", "altTo",
    "vehicles", "vehicle", "fare", "peakFare", "offPeakFare",
    "altStops", "stops", "note", "addedBy", "addedById", "ts"
  ]);
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(function(h) { return String(h).trim(); });
  data.alts.forEach(function(alt, i) {
    if (!alt.vehicles || !alt.vehicles.length) return;
    var rd = {
      routeId: data.id, altIndex: i + 1,
      altFrom: alt.from || "", altTo: alt.to || "",
      vehicles: (alt.vehicles || []).join(";"), vehicle: (alt.vehicles || []).join(";"),
      fare: alt.fare || "", peakFare: alt.peakFare || "", offPeakFare: alt.offPeakFare || "",
      altStops: JSON.stringify(alt.stops || []), stops: JSON.stringify(alt.stops || []),
      note: alt.note || "", addedBy: alt.addedBy || "", addedById: alt.addedById || "",
      ts: new Date().toISOString()
    };
    sheet.appendRow(headers.map(function(h) { return rd[h] !== undefined ? rd[h] : ""; }));
  });
}

function rewriteStops(ss, data) {
  var sheet = ss.getSheetByName(STOPS_SHEET);
  if (!sheet) { writeStops(ss, data); return; }
  deleteRowsForRoute(sheet, data.id);
  writeStops(ss, data);
}

function rewriteAlts(ss, data) {
  var sheet = ss.getSheetByName(ALTS_SHEET);
  if (!sheet) { writeAlts(ss, data); return; }
  // Only delete alts that were originally from this contributor (not community-added alts)
  var sheetData = sheet.getDataRange().getValues();
  var headers   = sheetData[0].map(function(h) { return String(h).trim(); });
  var rIdCol    = headers.indexOf("routeId");
  var addedByCol= headers.indexOf("addedById");
  for (var i = sheetData.length - 1; i >= 1; i--) {
    if (String(sheetData[i][rIdCol]) === String(data.id)) {
      // Only delete if addedById is empty or matches the original contributor
      var addedById = String(sheetData[i][addedByCol] || "");
      if (!addedById || addedById === String(data.contributorId)) {
        sheet.deleteRow(i + 1);
      }
    }
  }
  writeAlts(ss, data);
}

function deleteRowsForRoute(sheet, routeId) {
  if (sheet.getLastRow() <= 1) return;
  var sheetData = sheet.getDataRange().getValues();
  var headers   = sheetData[0].map(function(h) { return String(h).trim(); });
  var rIdCol    = headers.indexOf("routeId");
  for (var i = sheetData.length - 1; i >= 1; i--) {
    if (String(sheetData[i][rIdCol]) === String(routeId)) sheet.deleteRow(i + 1);
  }
}

function recordXpAdjust(ss, data) {
  var sheet = getOrCreateSheet(ss, XP_ADJ_SHEET, [
    "adjustmentId", "userId", "userName", "type", "oldXP", "newXP", "delta", "reason", "ts"
  ]);
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(function(h) { return String(h).trim(); });
  var rd = {
    adjustmentId: Date.now().toString(36) + Math.random().toString(36).slice(2),
    userId: data.userId || "", userName: data.userName || "",
    type: data.type || "", oldXP: data.oldXP || 0, newXP: data.newXP || 0,
    delta: data.delta || 0, reason: data.reason || "",
    ts: data.ts || new Date().toISOString()
  };
  sheet.appendRow(headers.map(function(h) { return rd[h] !== undefined ? rd[h] : ""; }));
}

// ── Utilities ─────────────────────────────────────────────────────────────────
function buildMap(rows, keyField) {
  var map = {};
  rows.forEach(function(r) {
    var k = r[keyField];
    if (!map[k]) map[k] = [];
    map[k].push(r);
  });
  return map;
}

function tryParse(val, fallback) {
  if (!val) return fallback;
  try { return JSON.parse(val); } catch(e) { return fallback; }
}

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
      item[headers[j]] = (row[j] !== undefined && row[j] !== null) ? row[j] : "";
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
    var existing = s.getRange(1, 1, 1, s.getLastColumn()).getValues()[0];
    var existingSet = {};
    existing.forEach(function(h) { existingSet[String(h).trim()] = true; });
    headers.forEach(function(h) { if (!existingSet[h]) s.getRange(1, s.getLastColumn() + 1).setValue(h); });
  } else {
    s.appendRow(headers);
  }
  return s;
}

function jsonOut(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
