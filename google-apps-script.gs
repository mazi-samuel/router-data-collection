// ── Router Data Collection — Google Apps Script ──────────────────────────────
// Deploy as Web App: Execute as "Me", Who has access "Anyone"
// After updating: Deploy > Manage Deployments > create new version (keeps same URL)

var SHEET_NAME = "Sheet1";       // Main routes data sheet
var STOPS_SHEET = "Stops";       // Individual bus stops sheet
var ALTS_SHEET = "Alternatives"; // Alternative routes sheet

// ── GET: Return all entries as JSON — powers the leaderboard ─────────────────
function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) return jsonResponse([]);

    var data = sheet.getDataRange().getValues();
    if (data.length <= 1) return jsonResponse([]);

    var headers = data[0].map(function(h) { return String(h).trim(); });
    var entries = [];

    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var entry = {};
      for (var j = 0; j < headers.length; j++) {
        var key = headers[j];
        var val = row[j];
        if (key === "vehicles" || key === "stops" || key === "alts") {
          try { entry[key] = val ? JSON.parse(val) : []; }
          catch(err) {
            entry[key] = (typeof val === "string" && val.includes(";"))
              ? val.split(";").filter(function(x){return x;}) : (val ? [val] : []);
          }
        } else if (key === "negotiable") {
          entry[key] = val === true || val === "TRUE" || val === "true";
        } else if (key === "xpEarned") {
          entry[key] = Number(val) || 120;
        } else {
          entry[key] = (val !== undefined && val !== null) ? String(val) : "";
        }
      }
      if (entry.id || entry.from || entry.contributor) entries.push(entry);
    }
    return jsonResponse(entries);
  } catch(err) {
    return jsonResponse({ error: err.toString() });
  }
}

// ── POST: Save a new route entry ──────────────────────────────────────────────
function doPost(e) {
  try {
    var entry = JSON.parse(e.postData ? e.postData.contents : "{}");
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    // 1. Main routes sheet
    var sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
    var headers = ["id","contributor","contributorId","from","to","vehicles","baseFare","peakFare",
                   "offPeakFare","negotiable","negotiateTip","dayType","timeOfDay","stops","alts",
                   "condition","notes","landmark","ts","xpEarned"];
    if (sheet.getLastRow() === 0) sheet.appendRow(headers);

    sheet.appendRow([
      entry.id || "", entry.contributor || "", entry.contributorId || "",
      entry.from || "", entry.to || "",
      JSON.stringify(entry.vehicles || []),
      entry.baseFare || "", entry.peakFare || "", entry.offPeakFare || "",
      entry.negotiable ? "TRUE" : "FALSE", entry.negotiateTip || "",
      entry.dayType || "", entry.timeOfDay || "",
      JSON.stringify(entry.stops || []),
      JSON.stringify(entry.alts || []),
      entry.condition || "", entry.notes || "", entry.landmark || "",
      entry.ts || new Date().toISOString(), entry.xpEarned || 120
    ]);

    // 2. Stops sheet
    if (entry.stops && entry.stops.length > 0) {
      var stopsSheet = ss.getSheetByName(STOPS_SHEET) || ss.insertSheet(STOPS_SHEET);
      if (stopsSheet.getLastRow() === 0)
        stopsSheet.appendRow(["routeId","stopIndex","name","fare","note"]);
      entry.stops.forEach(function(stop, idx) {
        if (stop.name) stopsSheet.appendRow([entry.id, idx+1, stop.name, stop.fare||"", stop.note||""]);
      });
    }

    // 3. Alternatives sheet (now includes altFrom, altTo, altStops)
    if (entry.alts && entry.alts.length > 0) {
      var altsSheet = ss.getSheetByName(ALTS_SHEET) || ss.insertSheet(ALTS_SHEET);
      if (altsSheet.getLastRow() === 0)
        altsSheet.appendRow(["routeId","altIndex","altFrom","altTo","vehicles","fare","peakFare","offPeakFare","stops","note"]);
      entry.alts.forEach(function(alt, idx) {
        altsSheet.appendRow([
          entry.id, idx+1,
          alt.from || "", alt.to || "",
          JSON.stringify(alt.vehicles || []),
          alt.fare || "", alt.peakFare || "", alt.offPeakFare || "",
          JSON.stringify(alt.stops || []),
          alt.note || ""
        ]);
      });
    }

    return jsonResponse({ success: true });
  } catch(err) {
    return jsonResponse({ success: false, error: err.toString() });
  }
}

function jsonResponse(data) {
  var out = ContentService.createTextOutput(JSON.stringify(data));
  out.setMimeType(ContentService.MimeType.JSON);
  return out;
}
