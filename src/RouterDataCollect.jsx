import { useState, useEffect, useCallback, useRef } from "react";
import macbookImg from "./assets/macbook.jpg";
import iphoneImg from "./assets/iphone.jpg";
import oraimoImg from "./assets/oraimo.png";
import glassesImg from "./assets/glasses.jpg";
import crocsImg from "./assets/crocs.jpg";

const GOOGLE_SHEETS_URL = import.meta.env.VITE_GOOGLE_SHEETS_URL || "";

// ── Storage helpers ──────────────────────────────────────────────────────────
async function loadData(key) {
  try { const r = await window.storage.get(key, true); return r ? JSON.parse(r.value) : null; } catch { return null; }
}
async function saveData(key, val) {
  try { await window.storage.set(key, JSON.stringify(val), true); } catch {}
}

// ── Constants ─────────────────────────────────────────────────────────────────
const VEHICLES = [
  { id: "danfo",   label: "Danfo",        emoji: "🚌", color: "#F5A623" },
  { id: "brt",     label: "BRT",          emoji: "🚍", color: "#1A6B3C" },
  { id: "keke",    label: "Keke",         emoji: "🛺", color: "#E84D3C" },
  { id: "korope",  label: "Korope",       emoji: "🚐", color: "#8B5CF6" },
  { id: "okada",   label: "Okada",        emoji: "🏍️", color: "#F97316" },
  { id: "ferry",   label: "Ferry",        emoji: "⛴️", color: "#0EA5E9" },
  { id: "train",   label: "Train",        emoji: "🚂", color: "#64748B" },
  { id: "sienna",  label: "Sienna Cab",   emoji: "🚗", color: "#7C3AED" },
  { id: "hitch",   label: "Hitch a Ride", emoji: "🤙", color: "#10B981" },
];

const AREAS = ["Oshodi","VI","Lekki","Ajah","Ikeja","Yaba","Surulere","CMS/TBS","Ojota","Ketu","Maryland","Mile 2","Apapa","Ikorodu","Berger","Agege","Mushin","Ojuelegba","Festac","Alaba","Sangotedo","Badore","Epe","Okokomaiko","Ipaja","Egbeda","Abule Egba","Iyana Ipaja","Orile","Eko Atlantic"];
const TIMES  = ["All Times / Always same fare","Early Morning (5–7am)","Morning Rush (7–9am)","Mid Morning (9–11am)","Afternoon (11am–2pm)","Mid Afternoon (2–4pm)","Evening Rush (4–7pm)","Evening (7–9pm)","Night (9pm+)"];
const DAYS   = ["All Days / Every Day","Weekday (Mon–Fri)","Saturday","Sunday","Public Holiday"];

const XP_PER_ENTRY = 120;
const BONUS = { alt: 40, peak: 20, condition: 15 };
const BOOST = { altOtherDiv: 1.5, speedDiv: 1.2 };
const COMMENT_XP = { ownerUp: 1, commenterUp: 5, commenterDown: 1 };
const SPEED_BOOST_FLAT_XP = 316; // Max flat XP award for speed boost
const ALT_OTHER_FLAT_XP   = 215; // Flat XP award for adding alt to another's route
const DAILY_BOOST_TARGET  = 50;  // Routes per day to unlock the daily booster

const REWARDS = [
  { id: "macbook", title: "Apple MacBook Pro",       xp: 1500000, img: macbookImg, desc: "Supercharged for pro workflows. High-performance M-series chip with stunning Liquid Retina XDR display." },
  { id: "iphone",  title: "Apple iPhone 13 Pro",     xp: 1000000, img: iphoneImg,  desc: "Pro camera system with Telephoto, Wide, and Ultra Wide cameras. Super Retina XDR display with ProMotion." },
  { id: "oraimo",  title: "Oraimo BoomPop Pro",      xp: 250000,  img: oraimoImg,  desc: "Active Noise Cancelling over-ear headphones. Immersive sound, extra bass, and up to 40 hours of playtime." },
  { id: "glasses", title: "Photochromic Eyeglasses", xp: 100000,  img: glassesImg, desc: "Intelligent photochromism. Lenses automatically darken in direct sunlight and become transparent indoors." },
  { id: "crocs",   title: "Pair of Crocs",           xp: 50000,   img: crocsImg,   desc: "Lightweight, water-friendly, and buoyant. Iconic Crocs Comfort for everyday commuting convenience." },
];

// ── Helper functions ──────────────────────────────────────────────────────────
function xpToLevel(xp) {
  if (xp < 200)  return { n: 1, title: "Commuter Rookie",  next: 200  };
  if (xp < 500)  return { n: 2, title: "Bus Stop Scout",   next: 500  };
  if (xp < 1000) return { n: 3, title: "Route Explorer",   next: 1000 };
  if (xp < 2000) return { n: 4, title: "Danfo Detective",  next: 2000 };
  if (xp < 3500) return { n: 5, title: "Lagos Navigator",  next: 3500 };
  return              { n: 6, title: "Transport Legend",    next: 5000 };
}
function uid()            { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
function fmt(n)           { return `₦${Number(n).toLocaleString()}`; }
function applyBoost(xp, divisor) { return Math.round((xp * 2) / divisor); }
// Speed boost uses flat addition instead of the multiplier formula — math kept below for reference:
// function applySpeedBoostOld(xp) { return Math.round((xp * 2) / BOOST.speedDiv); }
function applySpeedBoost(xp) { return xp + SPEED_BOOST_FLAT_XP; }
// Alternative on other's route uses flat addition instead of the multiplier formula — math kept below for reference:
// function applyAltOtherBoostOld(xp, divisor) { return Math.round((xp * 2) / divisor); }
function applyAltOtherBoost(xp) { return xp + ALT_OTHER_FLAT_XP; }

// ── Sub-components ────────────────────────────────────────────────────────────
function VehicleChip({ v, selected, onToggle }) {
  return (
    <button onClick={() => onToggle(v.id)} style={{
      display: "flex", alignItems: "center", gap: 6, padding: "8px 14px",
      borderRadius: 999, border: `2px solid ${selected ? v.color : "#E2E8F0"}`,
      background: selected ? v.color + "22" : "#F8FAFC",
      color: selected ? v.color : "#64748B",
      fontWeight: selected ? 700 : 500, fontSize: 13, cursor: "pointer",
      transition: "all .15s", whiteSpace: "nowrap"
    }}>
      <span style={{ fontSize: 16 }}>{v.emoji}</span>{v.label}
    </button>
  );
}

function StopRow({ stop, idx, onChange, onRemove, canRemove }) {
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 10 }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 10 }}>
        <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#F5A623", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 12, flexShrink: 0 }}>{idx + 1}</div>
        {canRemove && <div style={{ width: 2, height: 8, background: "#E2E8F0" }} />}
      </div>
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <div>
          <label style={lbl}>Stop name / landmark</label>
          <input style={inp} placeholder="e.g. Under Bridge, Agege" value={stop.name} onChange={e => onChange(idx, "name", e.target.value)} list="areas-list" />
        </div>
        <div>
          <label style={lbl}>Boarding fare from here (₦)</label>
          <input style={inp} placeholder="e.g. 300" type="number" min="0" value={stop.fare} onChange={e => onChange(idx, "fare", e.target.value)} />
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          <label style={lbl}>Notes (optional)</label>
          <input style={inp} placeholder="Any extra info about this stop" value={stop.note} onChange={e => onChange(idx, "note", e.target.value)} />
        </div>
      </div>
      {canRemove && <button onClick={() => onRemove(idx)} style={{ marginTop: 8, background: "none", border: "none", cursor: "pointer", color: "#CBD5E0", fontSize: 18 }}>✕</button>}
    </div>
  );
}

function AltRow({ alt, idx, onChange, onRemove, mainFrom, mainTo }) {
  const toggleAltVehicle = (vid) => {
    const list = alt.vehicles || [];
    onChange(idx, "vehicles", list.includes(vid) ? list.filter(x => x !== vid) : [...list, vid]);
  };
  function addAltStop() { onChange(idx, "stops", [...(alt.stops || []), { name: "", fare: "", note: "" }]); }
  function removeAltStop(si) { onChange(idx, "stops", (alt.stops || []).filter((_, j) => j !== si)); }
  function updateAltStop(si, k, v) {
    const stops = [...(alt.stops || [])]; stops[si] = { ...stops[si], [k]: v };
    onChange(idx, "stops", stops);
  }
  const altStops = alt.stops || [];
  return (
    <div style={{ background: "#F0FDF4", border: "1px dashed #86EFAC", borderRadius: 12, padding: "14px 16px", marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <span style={{ fontWeight: 700, fontSize: 13, color: "#166534" }}>🔀 Alternative Route {idx + 1}</span>
        <button onClick={() => onRemove(idx)} style={{ background: "none", border: "none", cursor: "pointer", color: "#86EFAC", fontSize: 16 }}>✕</button>
      </div>
      <div style={{ background: "rgba(255,255,255,0.6)", borderRadius: 8, padding: "10px 12px", marginBottom: 12, fontSize: 12, color: "#166534" }}>
        ℹ️ Different path or vehicle — still from <strong>{mainFrom || "origin"}</strong> to <strong>{mainTo || "destination"}</strong>.
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
        <div><label style={lbl}>📍 Alt. starting point</label><input style={inp} list="areas-list" placeholder={mainFrom || "Same as main"} value={alt.from || ""} onChange={e => onChange(idx, "from", e.target.value)} /></div>
        <div><label style={lbl}>🏁 Alt. end point</label><input style={inp} list="areas-list" placeholder={mainTo || "Same as main"} value={alt.to || ""} onChange={e => onChange(idx, "to", e.target.value)} /></div>
      </div>
      <label style={lbl}>🚌 Vehicle type(s)</label>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 6, marginBottom: 14 }}>
        {VEHICLES.map(v => <VehicleChip key={v.id} v={v} selected={(alt.vehicles || []).includes(v.id)} onToggle={toggleAltVehicle} />)}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
        <div><label style={lbl}>Base fare (₦)</label><input style={inp} type="number" min="0" placeholder="400" value={alt.fare} onChange={e => onChange(idx, "fare", e.target.value)} /></div>
        <div><label style={lbl}>Peak fare (₦)</label><input style={inp} type="number" min="0" placeholder="600" value={alt.peakFare} onChange={e => onChange(idx, "peakFare", e.target.value)} /></div>
        <div><label style={lbl}>Off-peak (₦)</label><input style={inp} type="number" min="0" placeholder="300" value={alt.offPeakFare} onChange={e => onChange(idx, "offPeakFare", e.target.value)} /></div>
      </div>
      <div style={{ marginBottom: 10 }}>
        <label style={{ ...lbl, marginBottom: 8 }}>🚏 Stops along this alternate route</label>
        {altStops.length === 0 && <div style={{ fontSize: 12, color: "#4ADE80", marginBottom: 8, fontStyle: "italic" }}>No stops added yet</div>}
        {altStops.map((stop, si) => (
          <div key={si} style={{ display: "flex", gap: 6, alignItems: "flex-start", marginBottom: 8 }}>
            <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#16A34A", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 11, flexShrink: 0, marginTop: 9 }}>{si + 1}</div>
            <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              <div><label style={lbl}>Stop name</label><input style={inp} placeholder="e.g. Ojota" value={stop.name} onChange={e => updateAltStop(si, "name", e.target.value)} list="areas-list" /></div>
              <div><label style={lbl}>Fare from here (₦)</label><input style={inp} type="number" min="0" value={stop.fare} onChange={e => updateAltStop(si, "fare", e.target.value)} /></div>
              <div style={{ gridColumn: "1 / -1" }}><label style={lbl}>Notes</label><input style={inp} value={stop.note} onChange={e => updateAltStop(si, "note", e.target.value)} /></div>
            </div>
            {altStops.length > 1 && <button onClick={() => removeAltStop(si)} style={{ marginTop: 8, background: "none", border: "none", cursor: "pointer", color: "#86EFAC", fontSize: 16 }}>✕</button>}
          </div>
        ))}
        <button onClick={addAltStop} style={{ width: "100%", padding: "8px", background: "rgba(255,255,255,0.5)", color: "#166534", fontWeight: 700, border: "1px dashed #86EFAC", borderRadius: 8, cursor: "pointer", fontSize: 12, marginTop: 4 }}>+ Add Stop to This Alternate Route</button>
      </div>
      <div style={{ marginTop: 8 }}>
        <label style={lbl}>📝 Via / notes about this route</label>
        <input style={inp} placeholder="e.g. goes via Oshodi Expressway" value={alt.note} onChange={e => onChange(idx, "note", e.target.value)} />
      </div>
    </div>
  );
}

const lbl = { display: "block", fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 };
const inp = { width: "100%", boxSizing: "border-box", padding: "9px 12px", borderRadius: 8, border: "1.5px solid #E2E8F0", fontSize: 14, color: "#1E293B", background: "#fff", outline: "none", fontFamily: "inherit" };

// ── Challenge Countdown Widget (September 30 deadline) ────────────────────────
function CountdownWidget({ light }) {
  const targetDate = "2026-09-30T23:59:59";
  const calc = () => {
    const diff = +new Date(targetDate) - +new Date();
    if (diff <= 0) return { months: 0, weeks: 0, days: 0, hours: 0, minutes: 0, seconds: 0 };
    const totalSecs = Math.floor(diff / 1000);
    const totalMins = Math.floor(totalSecs / 60);
    const totalHrs  = Math.floor(totalMins / 60);
    const totalDays = Math.floor(totalHrs / 24);
    const m = Math.floor(totalDays / 30);
    const remDays = totalDays % 30;
    const w = Math.floor(remDays / 7);
    const d = remDays % 7;
    return { months: m, weeks: w, days: d, hours: totalHrs % 24, minutes: totalMins % 60, seconds: totalSecs % 60 };
  };
  const [timeLeft, setTimeLeft] = useState(calc());
  useEffect(() => { const t = setInterval(() => setTimeLeft(calc()), 1000); return () => clearInterval(t); }, []);
  const items = [
    { label: "Months", val: timeLeft.months }, { label: "Weeks",  val: timeLeft.weeks },
    { label: "Days",   val: timeLeft.days   }, { label: "Hours",  val: timeLeft.hours },
    { label: "Mins",   val: timeLeft.minutes }, { label: "Secs",  val: timeLeft.seconds }
  ];
  const boxBg      = light ? "rgba(0,0,0,0.05)"         : "rgba(255,255,255,0.15)";
  const labelColor = light ? "#475569"                   : "#93C5FD";
  const numColor   = light ? "#E87722"                   : "#F5A623";
  const borderClr  = light ? "rgba(0,0,0,0.05)"         : "rgba(255,255,255,0.05)";
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 6, marginTop: 14 }}>
      {items.map(x => (
        <div key={x.label} style={{ background: boxBg, borderRadius: 10, padding: "8px 4px", textAlign: "center", border: `1px solid ${borderClr}` }}>
          <div style={{ fontSize: 16, fontWeight: 950, color: numColor, lineHeight: 1.1 }}>{String(x.val).padStart(2, "0")}</div>
          <div style={{ fontSize: 8, color: labelColor, fontWeight: 700, textTransform: "uppercase", marginTop: 2 }}>{x.label}</div>
        </div>
      ))}
    </div>
  );
}

// Anti-cheat: hasSubmittedThisSession is in-memory (cleared on refresh) so you must
// actually submit a route in the current browser session to be eligible.
function SpeedBoostWidget({ onClaim, claimed, hasSubmittedThisSession }) {
  const [secsLeft, setSecsLeft] = useState(60);
  const [winOpen, setWinOpen]   = useState(false);
  useEffect(() => {
    const tick = () => {
      const secsInMin = Math.floor((Date.now() / 1000) % 60);
      setSecsLeft(60 - secsInMin || 60);
      setWinOpen(secsInMin >= 0 && secsInMin < 5);
    };
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, []);

  if (winOpen) {
    const eligible = hasSubmittedThisSession;
    const btnDisabled = !eligible || claimed;
    return (
      <div style={{ margin: "12px 0", padding: "14px 16px", background: "linear-gradient(135deg, #7C3AED, #4F46E5)", borderRadius: 14, textAlign: "center", boxShadow: "0 0 20px rgba(124,58,237,0.5)", animation: "pulse 1s infinite" }}>
        <div style={{ color: "#E9D5FF", fontSize: 12, fontWeight: 700, marginBottom: 4 }}>⚡ SPEED BONUS WINDOW OPEN — 5 seconds!</div>
        {!eligible && (
          <div style={{ color: "#C4B5FD", fontSize: 11, marginBottom: 8, fontStyle: "italic" }}>
            Submit a route this session to unlock Speed Boost 🔒
          </div>
        )}
        <button
          onClick={btnDisabled ? undefined : onClaim}
          disabled={btnDisabled}
          style={{ padding: "12px 28px", background: btnDisabled ? "#6B7280" : "#F5A623", color: "#fff", fontWeight: 900, fontSize: 16, border: "none", borderRadius: 10, cursor: btnDisabled ? "not-allowed" : "pointer", letterSpacing: "-0.3px", opacity: btnDisabled ? 0.65 : 1 }}
        >
          {claimed ? "✅ Bonus Claimed! (+316 XP)" : eligible ? "⚡ CLAIM SPEED BOOST! (+316 XP)" : "🔒 Submit a Route First"}
        </button>
      </div>
    );
  }

  return (
    <div style={{ margin: "10px 0", padding: "10px 14px", background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.2)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <div style={{ fontSize: 12, color: "#7C3AED", fontWeight: 700 }}>⏱ Speed Bonus window in</div>
      <div style={{ fontWeight: 900, fontSize: 18, color: "#7C3AED" }}>{String(secsLeft).padStart(2, "0")}s</div>
    </div>
  );
}

// ── Daily 50-Routes Booster Widget ────────────────────────────────────────────
function DailyBoostWidget({ dailyCount, onClaim, dailyBoostClaimed, dailyBoostUnlocked, dailyWindowStart }) {
  const pct = Math.min((dailyCount / DAILY_BOOST_TARGET) * 100, 100);
  const remaining = Math.max(DAILY_BOOST_TARGET - dailyCount, 0);

  // 24h countdown timer
  const [timeRemainingStr, setTimeRemainingStr] = useState("");
  useEffect(() => {
    if (!dailyWindowStart) {
      setTimeRemainingStr("Not started yet");
      return;
    }
    const update = () => {
      const elapsed = Date.now() - dailyWindowStart;
      const left = 24 * 60 * 60 * 1000 - elapsed;
      if (left <= 0) {
        setTimeRemainingStr("Expired");
      } else {
        const h = Math.floor(left / (3600 * 1000));
        const m = Math.floor((left % (3600 * 1000)) / (60 * 1000));
        const s = Math.floor((left % (60 * 1000)) / 1000);
        setTimeRemainingStr(`${h}h ${m}m ${s}s remaining`);
      }
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [dailyWindowStart]);

  return (
    <div style={{ margin: "10px 0", padding: "14px 16px", background: "linear-gradient(135deg, rgba(16,185,129,0.1), rgba(5,150,105,0.08))", border: `1.5px solid ${dailyBoostUnlocked ? "#10B981" : "rgba(16,185,129,0.25)"}`, borderRadius: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: "#065F46", display: "flex", alignItems: "center", gap: 5 }}>
          🗓️ Daily Route Challenge
        </div>
        <div style={{ fontSize: 13, fontWeight: 900, color: dailyBoostUnlocked ? "#10B981" : "#047857" }}>
          {dailyCount}/{DAILY_BOOST_TARGET}
        </div>
      </div>
      {/* Progress bar */}
      <div style={{ background: "rgba(16,185,129,0.15)", borderRadius: 999, height: 8, marginBottom: 8, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: "linear-gradient(90deg, #10B981, #34D399)", borderRadius: 999, transition: "width 0.4s ease" }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4, marginBottom: 8 }}>
        <div style={{ fontSize: 11, color: "#047857", fontWeight: 700 }}>
          🕒 Cycle: {timeRemainingStr}
        </div>
      </div>
      {dailyBoostUnlocked ? (
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 11, color: "#065F46", fontWeight: 700, marginBottom: 6 }}>🎉 50 routes today! You earned a 2× Booster!</div>
          <button
            onClick={dailyBoostClaimed ? undefined : onClaim}
            disabled={dailyBoostClaimed}
            style={{ padding: "10px 22px", background: dailyBoostClaimed ? "#6B7280" : "linear-gradient(135deg,#10B981,#059669)", color: "#fff", fontWeight: 900, fontSize: 14, border: "none", borderRadius: 10, cursor: dailyBoostClaimed ? "not-allowed" : "pointer", opacity: dailyBoostClaimed ? 0.7 : 1 }}
          >
            {dailyBoostClaimed ? "✅ Daily Boost Claimed!" : "🚀 CLAIM 2× DAILY BOOST!"}
          </button>
        </div>
      ) : (
        <div style={{ fontSize: 11, color: "#047857", fontWeight: 600, fontStyle: "italic" }}>
          Complete daily {remaining > 0 ? `${remaining} more route${remaining > 1 ? "s" : ""}` : "50 routes"} and get a chance for a 2× booster!
        </div>
      )}
    </div>
  );
}

// ── API helpers ────────────────────────────────────────────────────────────────
async function apiGet(action) {
  const base = GOOGLE_SHEETS_URL || "/api/entries";
  const url = base + (base.includes("?") ? "&" : "?") + "action=" + action + "&t=" + Date.now();
  const res = await fetch(url);
  if (!res.ok) throw new Error("HTTP " + res.status);
  return res.json();
}

async function apiPost(payload) {
  const url = GOOGLE_SHEETS_URL || "/api/submit";
  const headers = GOOGLE_SHEETS_URL ? { "Content-Type": "text/plain" } : { "Content-Type": "application/json" };
  const res = await fetch(url, { method: "POST", headers, body: JSON.stringify(payload) });
  if (!res.ok) throw new Error("HTTP " + res.status);
  return res.json();
}

// ── MAIN APP ──────────────────────────────────────────────────────────────────
export default function App() {
  // ── screens ───────────────────────────────────────────────────────────────
  const [screen, setScreen]       = useState("home");
  // ── global data ───────────────────────────────────────────────────────────
  const [entries, setEntries]     = useState([]);
  const [comments, setComments]   = useState([]);
  const [xpAdjustments, setXpAdjustments] = useState([]);
  // ── current user ──────────────────────────────────────────────────────────
  const [myXP, setMyXP]           = useState(0);
  const [myStreak, setMyStreak]   = useState(0);
  const [myName, setMyName]       = useState("");
  const [myUserId, setMyUserId]   = useState("");
  const [nameInput, setNameInput] = useState("");
  // ── UI state ──────────────────────────────────────────────────────────────
  const [loading, setLoading]     = useState(true);
  const [toast, setToast]         = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [lastEntry, setLastEntry] = useState(null);
  // ── boost state ───────────────────────────────────────────────────────────
  const [boostClaimed, setBoostClaimed]           = useState(false);
  // hasSubmittedThisSession is intentionally in-memory only (not persisted).
  // Refreshing the page resets it, so you must actually submit a route per session.
  const [hasSubmittedThisSession, setHasSubmittedThisSession] = useState(false);
  const [lastSubmittedRouteId, setLastSubmittedRouteId] = useState("");
  const [claimedRouteIds, setClaimedRouteIds] = useState([]);
  // ── daily 50-routes booster state (persisted across reloads, resets every 24h) ─
  const [dailyCount, setDailyCount]               = useState(0);
  const [dailyBoostClaimed, setDailyBoostClaimed] = useState(false);
  const [dailyWindowStart, setDailyWindowStart]   = useState(null); // timestamp ms
  // ── community state ───────────────────────────────────────────────────────
  const [viewingRoute, setViewingRoute]     = useState(null);
  const [editingEntry, setEditingEntry]     = useState(null);
  const [pendingThumbsUp, setPendingThumbsUp] = useState(null); // { commentId, commenterId, commenterName }
  const [newComment, setNewComment]         = useState("");
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [addingAltToRoute, setAddingAltToRoute] = useState(null); // routeId
  const [communityAlt, setCommunityAlt]     = useState({ vehicles: [], from: "", to: "", fare: "", peakFare: "", offPeakFare: "", note: "", stops: [] });
  const [browseSearch, setBrowseSearch]     = useState("");
  const [browseTab, setBrowseTab]           = useState("all"); // "all" | "mine"
  // ── form state ────────────────────────────────────────────────────────────
  const emptyForm = useCallback(() => ({
    id: uid(), contributor: myName, from: "", to: "",
    vehicles: [], baseFare: "", peakFare: "", offPeakFare: "",
    negotiable: false, negotiateTip: "", dayType: "", timeOfDay: "",
    stops: [{ name: "", fare: "", note: "" }], alts: [],
    condition: "", securityHint: "", notes: "", landmark: "", ts: new Date().toISOString()
  }), [myName]);
  const [form, setForm]   = useState(() => ({ id: uid(), contributor: "", from: "", to: "", vehicles: [], baseFare: "", peakFare: "", offPeakFare: "", negotiable: false, negotiateTip: "", dayType: "", timeOfDay: "", stops: [{ name: "", fare: "", note: "" }], alts: [], condition: "", securityHint: "", notes: "", landmark: "", ts: new Date().toISOString() }));
  const [step, setStep]   = useState(0);
  const STEPS = ["Route & Vehicle", "Stops & Fares", "Timing & Conditions", "Alternatives"];
  // ── edit form state ────────────────────────────────────────────────────────
  const [editForm, setEditForm]   = useState(null);
  const [editStep, setEditStep]   = useState(0);
  const EDIT_STEPS = ["Vehicle & Fares", "Stops", "Timing & Conditions", "Alternatives"];

  // ── Compute user XP from all sources ──────────────────────────────────────
  const computeMyXP = useCallback((serverEntries, adjustments, name, userId) => {
    const nameKey = (name || "").trim().toLowerCase();
    // Base XP from route entries (by name match)
    const routeXP = serverEntries
      .filter(e => (e.contributor || "").trim().toLowerCase() === nameKey)
      .reduce((sum, e) => sum + (Number(e.xpEarned) || XP_PER_ENTRY), 0);
    // Bonus XP from adjustments (by userId or name)
    const adjXP = adjustments
      .filter(a => (a.userId && a.userId === userId) || (a.userName || "").trim().toLowerCase() === nameKey)
      .reduce((sum, a) => sum + (Number(a.delta) || 0), 0);
    return routeXP + adjXP;
  }, []);

  // ── Fetch all data (routes + comments + XP adjustments) ───────────────────
  const fetchAll = useCallback(async (name, userId, silent = false) => {
    try {
      const [routeData, commentData, adjData] = await Promise.all([
        apiGet("get"),
        apiGet("comments").catch(() => []),
        apiGet("xpadjustments").catch(() => [])
      ]);
      const serverEntries = Array.isArray(routeData) ? routeData : [];
      const serverComments = Array.isArray(commentData) ? commentData : [];
      const serverAdj = Array.isArray(adjData) ? adjData : [];

      if (serverEntries.length > 0) setEntries(serverEntries);
      setComments(serverComments);
      setXpAdjustments(serverAdj);

      if (name) {
        const totalXP = computeMyXP(serverEntries, serverAdj, name, userId);
        const streak = serverEntries.filter(e => (e.contributor || "").trim().toLowerCase() === (name || "").trim().toLowerCase()).length;
        setMyXP(totalXP);
        setMyStreak(streak);
        await saveData("router:state", { entries: serverEntries, myXP: totalXP, myStreak: streak, myName: name, myUserId: userId });
      }
      return serverEntries;
    } catch {
      if (!silent) showToast("Could not reach server", "warn");
      return null;
    }
  }, [computeMyXP]);

  // ── Load saved state on mount ──────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const saved = await loadData("router:state");
      let currentName = "", currentUserId = "";
      if (saved) {
        setMyXP(saved.myXP || 0);
        setMyStreak(saved.myStreak || 0);
        currentName = saved.myName || "";
        currentUserId = saved.myUserId || "";
        setMyName(currentName);
        setMyUserId(currentUserId);
        setEntries(saved.entries || []);
      }
      if (saved?.myName && !saved?.myUserId) {
        currentUserId = uid();
        setMyUserId(currentUserId);
      }
      // ── Load speed boost state ────────────────────────────────────────────
      const sbSaved = await loadData("router:speed_boost");
      if (sbSaved) {
        setLastSubmittedRouteId(sbSaved.lastSubmittedRouteId || "");
        setClaimedRouteIds(sbSaved.claimedRouteIds || []);
      }
      // ── Daily booster state is computed dynamically from server data below ─
      await fetchAll(currentName, currentUserId, true);
      setLoading(false);
    })();
  }, []);

  // ── Auto-refresh every 60s ─────────────────────────────────────────────────
  useEffect(() => {
    const id = setInterval(() => fetchAll(myName, myUserId, true), 60000);
    return () => clearInterval(id);
  }, [myName, myUserId, fetchAll]);

  // ── Dynamically compute daily booster progress from server data ────────────
  useEffect(() => {
    if (!myName) {
      setDailyCount(0);
      setDailyWindowStart(null);
      setDailyBoostClaimed(false);
      return;
    }
    const nameKey = myName.trim().toLowerCase();
    
    // 1. Find the latest "DAILY_50_BOOST" timestamp for this user
    let lastBoostTime = 0;
    xpAdjustments.forEach(a => {
      if ((a.userName || "").trim().toLowerCase() === nameKey && a.type === "DAILY_50_BOOST") {
        const t = new Date(a.ts || 0).getTime();
        if (t > lastBoostTime) lastBoostTime = t;
      }
    });

    // 2. Get all routes submitted by this contributor after lastBoostTime, sorted by time ascending
    const userSubmissions = entries
      .filter(e => (e.contributor || "").trim().toLowerCase() === nameKey)
      .map(e => ({ ...e, time: new Date(e.ts || e.timestamp || 0).getTime() }))
      .filter(e => e.time > lastBoostTime)
      .sort((a, b) => a.time - b.time);

    if (userSubmissions.length === 0) {
      setDailyCount(0);
      setDailyWindowStart(null);
      setDailyBoostClaimed(false);
      return;
    }

    const now = Date.now();
    let idx = 0;
    let foundActive = false;

    while (idx < userSubmissions.length) {
      const windowStart = userSubmissions[idx].time;
      const windowEnd = windowStart + 24 * 60 * 60 * 1000;
      
      let count = 0;
      let nextIdx = idx;
      while (nextIdx < userSubmissions.length && userSubmissions[nextIdx].time < windowEnd) {
        count++;
        nextIdx++;
      }

      if (now < windowEnd) {
        setDailyCount(count);
        setDailyWindowStart(windowStart);
        setDailyBoostClaimed(count >= DAILY_BOOST_TARGET);
        foundActive = true;
        break;
      }
      idx = nextIdx;
    }

    if (!foundActive) {
      setDailyCount(0);
      setDailyWindowStart(null);
      setDailyBoostClaimed(false);
    }
  }, [entries, xpAdjustments, myName]);

  const persist = useCallback(async (updates) => {
    const state = { entries, myXP, myStreak, myName, myUserId, ...updates };
    await saveData("router:state", state);
  }, [entries, myXP, myStreak, myName, myUserId]);

  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3200);
  }

  // ── Save name (looks up historical XP from fetched entries) ───────────────
  const handleSaveName = useCallback(async (n) => {
    const nameVal = n.trim();
    if (!nameVal) return;
    const nameKey = nameVal.toLowerCase();

    // Look for an existing contributorId in the historical routes
    let existingId = "";
    for (let i = 0; i < entries.length; i++) {
      const entryName = (entries[i].contributor || "").trim().toLowerCase();
      if (entryName === nameKey && entries[i].contributorId) {
        existingId = entries[i].contributorId;
        break;
      }
    }
    
    // Look for an existing userId in adjustments
    if (!existingId) {
      for (let i = 0; i < xpAdjustments.length; i++) {
        const adjName = (xpAdjustments[i].userName || "").trim().toLowerCase();
        if (adjName === nameKey && xpAdjustments[i].userId) {
          existingId = xpAdjustments[i].userId;
          break;
        }
      }
    }

    const finalId = existingId || uid();
    let xp = 0, streak = 0;
    entries.forEach(e => {
      if ((e.contributor || "").trim().toLowerCase() === nameKey) {
        xp += (Number(e.xpEarned) || XP_PER_ENTRY);
        streak++;
      }
    });

    const adjXP = xpAdjustments
      .filter(a => (a.userId && a.userId === finalId) || (a.userName || "").trim().toLowerCase() === nameKey)
      .reduce((sum, a) => sum + (Number(a.delta) || 0), 0);
    const totalXP = xp + adjXP;

    setMyName(nameVal); setMyUserId(finalId); setMyXP(totalXP); setMyStreak(streak);
    await saveData("router:state", { entries, myXP: totalXP, myStreak: streak, myName: nameVal, myUserId: finalId });
  }, [entries, xpAdjustments]);

  // ── Speed Boost claim (flat +316 XP, requires a submission this session) ───
  const handleClaimSpeedBoost = useCallback(async () => {
    if (!lastSubmittedRouteId || (claimedRouteIds && claimedRouteIds.includes(lastSubmittedRouteId)) || !myName || !hasSubmittedThisSession) return;
    const newXP = applySpeedBoost(myXP); // flat +316 XP
    // Old multiplier formula (commented out, toggle if needed):
    // const newXP = applyBoost(myXP, BOOST.speedDiv);
    const delta = newXP - myXP;
    const newClaimed = [...(claimedRouteIds || []), lastSubmittedRouteId];
    setClaimedRouteIds(newClaimed);
    await saveData("router:speed_boost", { lastSubmittedRouteId, claimedRouteIds: newClaimed });
    setMyXP(newXP);
    await persist({ myXP: newXP });
    try {
      await apiPost({ action: "xpAdjust", userId: myUserId, userName: myName, type: "SPEED_BOOST", oldXP: myXP, newXP, delta, reason: "Speed boost for route " + lastSubmittedRouteId, routeId: lastSubmittedRouteId });
    } catch {}
    showToast(`⚡ Speed Boost! +${delta.toLocaleString()} XP`);
  }, [claimedRouteIds, lastSubmittedRouteId, hasSubmittedThisSession, myXP, myName, myUserId, persist]);

  // ── Daily 50-routes booster claim (2× multiplier) ─────────────────────────
  const handleClaimDailyBoost = useCallback(async () => {
    if (!myName || dailyCount < DAILY_BOOST_TARGET) return;
    const newXP = applyBoost(myXP, 1); // ×2 ÷ 1 = double
    const delta = newXP - myXP;
    setMyXP(newXP);
    setDailyCount(0);
    setDailyBoostClaimed(false);
    await persist({ myXP: newXP });
    await saveData("router:daily", { dailyCount: 0, dailyBoostClaimed: false, windowStart: dailyWindowStart });
    try {
      const res = await apiPost({ action: "xpAdjust", userId: myUserId, userName: myName, type: "DAILY_50_BOOST", oldXP: myXP, newXP, delta, reason: "Daily 50-routes challenge booster claimed" });
      if (res?.success) {
        setXpAdjustments(prev => [...prev, { userId: myUserId, userName: myName, type: "DAILY_50_BOOST", oldXP: myXP, newXP, delta, reason: "Daily 50-routes challenge booster claimed", ts: new Date().toISOString() }]);
      }
    } catch {}
    showToast(`🚀 Daily 2× Boost! +${delta.toLocaleString()} XP`);
  }, [dailyCount, dailyWindowStart, myXP, myName, myUserId, persist]);

  // ── Form helpers ──────────────────────────────────────────────────────────
  function setF(k, v) { setForm(f => ({ ...f, [k]: v })); }
  function toggleVehicle(id) { setForm(f => ({ ...f, vehicles: f.vehicles.includes(id) ? f.vehicles.filter(x => x !== id) : [...f.vehicles, id] })); }
  function addStop()         { setForm(f => ({ ...f, stops: [...f.stops, { name: "", fare: "", note: "" }] })); }
  function removeStop(i)     { setForm(f => ({ ...f, stops: f.stops.filter((_, j) => j !== i) })); }
  function updateStop(i, k, v) { setForm(f => { const s = [...f.stops]; s[i] = { ...s[i], [k]: v }; return { ...f, stops: s }; }); }
  function addAlt()          { setForm(f => ({ ...f, alts: [...f.alts, { vehicles: [], from: "", to: "", fare: "", peakFare: "", offPeakFare: "", note: "", stops: [] }] })); }
  function removeAlt(i)      { setForm(f => ({ ...f, alts: f.alts.filter((_, j) => j !== i) })); }
  function updateAlt(i, k, v) { setForm(f => { const a = [...f.alts]; a[i] = { ...a[i], [k]: v }; return { ...f, alts: a }; }); }
  function canProceed() {
    if (step === 0) return form.from && form.to && form.vehicles.length > 0 && form.baseFare;
    if (step === 1) return form.stops.length > 0 && form.stops[0].name && form.stops[0].fare;
    return true;
  }

  // ── Submit new route ───────────────────────────────────────────────────────
  async function submit() {
    if (submitting) return;
    setSubmitting(true);
    const earnedXP = XP_PER_ENTRY + (form.alts.length > 0 ? BONUS.alt * form.alts.length : 0) + (form.peakFare ? BONUS.peak : 0) + (form.condition ? BONUS.condition : 0);
    const entry = { ...form, action: "submit", contributor: myName, contributorId: myUserId, xpEarned: earnedXP, ts: new Date().toISOString() };
    let saveSuccess = false;
    try {
      const r = await apiPost(entry);
      if (r?.success) saveSuccess = true;
    } catch {}
    const newEntries = [entry, ...entries];
    const newXP     = myXP + earnedXP;
    const newStreak = myStreak + 1;
    setEntries(newEntries); setMyXP(newXP); setMyStreak(newStreak);
    setLastEntry({ ...entry, earnedXP });
    setLastSubmittedRouteId(entry.id);
    await saveData("router:speed_boost", { lastSubmittedRouteId: entry.id, claimedRouteIds });
    // Mark that they have submitted at least once in this session (anti-cheat)
    setHasSubmittedThisSession(true);
    // ── Update daily booster counter ─────────────────────────────────────
    const now = Date.now();
    const winStart = dailyWindowStart || now;
    const isWithin24h = dailyWindowStart && (now - dailyWindowStart < 24 * 60 * 60 * 1000);
    const newDailyCount = isWithin24h ? dailyCount + 1 : 1;
    const newWindowStart = isWithin24h ? winStart : now;
    setDailyCount(newDailyCount);
    if (!isWithin24h) {
      setDailyWindowStart(newWindowStart);
      setDailyBoostClaimed(false); // reset if a new 24h window just started
    }
    await saveData("router:daily", { dailyCount: newDailyCount, dailyBoostClaimed: isWithin24h ? dailyBoostClaimed : false, windowStart: newWindowStart });
    await persist({ entries: newEntries, myXP: newXP, myStreak: newStreak, myName });
    setForm(emptyForm()); setStep(0); setScreen("success"); setSubmitting(false);
    showToast(saveSuccess ? "Synced to Google Sheets!" : "Saved locally (offline)", saveSuccess ? "success" : "warn");
  }

  // ── Edit form helpers ──────────────────────────────────────────────────────
  function setEF(k, v) { setEditForm(f => ({ ...f, [k]: v })); }
  function toggleEditVehicle(id) { setEditForm(f => ({ ...f, vehicles: f.vehicles.includes(id) ? f.vehicles.filter(x => x !== id) : [...f.vehicles, id] })); }
  function addEditStop()     { setEditForm(f => ({ ...f, stops: [...f.stops, { name: "", fare: "", note: "" }] })); }
  function removeEditStop(i) { setEditForm(f => ({ ...f, stops: f.stops.filter((_, j) => j !== i) })); }
  function updateEditStop(i, k, v) { setEditForm(f => { const s = [...f.stops]; s[i] = { ...s[i], [k]: v }; return { ...f, stops: s }; }); }
  function addEditAlt()      { setEditForm(f => ({ ...f, alts: [...f.alts, { vehicles: [], from: "", to: "", fare: "", peakFare: "", offPeakFare: "", note: "", stops: [] }] })); }
  function removeEditAlt(i)  { setEditForm(f => ({ ...f, alts: f.alts.filter((_, j) => j !== i) })); }
  function updateEditAlt(i, k, v) { setEditForm(f => { const a = [...f.alts]; a[i] = { ...a[i], [k]: v }; return { ...f, alts: a }; }); }

  // ── Submit edit ────────────────────────────────────────────────────────────
  async function submitEdit() {
    if (submitting || !editForm) return;
    setSubmitting(true);
    try {
      const payload = { ...editForm, action: pendingThumbsUp ? "submitEditWithComment" : "edit", contributorId: myUserId, contributor: myName };
      if (pendingThumbsUp) {
        payload.commentId       = pendingThumbsUp.commentId;
        payload.commenterId     = pendingThumbsUp.commenterId;
        payload.commenterName   = pendingThumbsUp.commenterName;
        payload.commenterOldXP  = 0;
        payload.commenterNewXP  = 5;
      }
      const r = await apiPost(payload);
      if (r?.success) {
        // If it was a thumbs-up edit, give current user +1 XP
        if (pendingThumbsUp) {
          const newXP = myXP + COMMENT_XP.ownerUp;
          setMyXP(newXP);
          await persist({ myXP: newXP });
          showToast("Route updated! +1 XP for acknowledging feedback 👍");
        } else {
          showToast("Route updated successfully!");
        }
        // Update entries in state
        setEntries(prev => prev.map(e => e.id === editForm.id ? { ...e, ...editForm } : e));
        setPendingThumbsUp(null);
        setEditingEntry(null);
        setEditForm(null);
        setEditStep(0);
        await fetchAll(myName, myUserId, true);
        setScreen("browse");
      } else {
        showToast("Failed to save edit", "warn");
      }
    } catch { showToast("Network error", "warn"); }
    setSubmitting(false);
  }

  // ── Comment actions ────────────────────────────────────────────────────────
  async function submitComment(routeId) {
    if (!newComment.trim() || !myName || commentSubmitting) return;
    setCommentSubmitting(true);
    const commentId = uid();
    try {
      const r = await apiPost({ action: "comment", commentId, routeId, commenterName: myName, commenterId: myUserId, text: newComment.trim() });
      if (r?.success) {
        setComments(prev => [...prev, { commentId, routeId, commenterName: myName, commenterId: myUserId, text: newComment.trim(), ts: new Date().toISOString(), thumbsUpBy: [], thumbsDownBy: [], resolved: "false", editSubmitted: "false" }]);
        setNewComment("");
        showToast("Comment posted!");
      }
    } catch { showToast("Failed to post comment", "warn"); }
    setCommentSubmitting(false);
  }

  async function handleThumbs(comment, direction, route) {
    if (!myName) return;
    const isOwner = route.contributor?.trim().toLowerCase() === myName.trim().toLowerCase() || route.contributorId === myUserId;
    if (!isOwner) { showToast("Only the route owner can respond to comments", "warn"); return; }

    // Optimistically update comments
    setComments(prev => prev.map(c => {
      if (c.commentId !== comment.commentId) return c;
      const up   = Array.isArray(c.thumbsUpBy)   ? c.thumbsUpBy   : [];
      const down = Array.isArray(c.thumbsDownBy) ? c.thumbsDownBy : [];
      if (direction === "up") {
        return { ...c, thumbsUpBy: [...up.filter(i => i !== myUserId), myUserId], thumbsDownBy: down.filter(i => i !== myUserId), resolved: "true" };
      } else {
        return { ...c, thumbsDownBy: [...down.filter(i => i !== myUserId), myUserId], thumbsUpBy: up.filter(i => i !== myUserId), resolved: "true" };
      }
    }));

    try {
      await apiPost({ action: "thumbs", commentId: comment.commentId, direction, voterId: myUserId, voterName: myName });
    } catch {}

    if (direction === "up") {
      // Owner gives 👍 → redirect to edit
      setPendingThumbsUp({ commentId: comment.commentId, commenterId: comment.commenterId, commenterName: comment.commenterName });
      setEditingEntry(route);
      setEditForm({
        ...route,
        stops: Array.isArray(route.stops) ? route.stops : [],
        alts:  Array.isArray(route.alts)  ? route.alts  : [],
        vehicles: Array.isArray(route.vehicles) ? route.vehicles : []
      });
      setEditStep(0);
      setScreen("editEntry");
      showToast("Acknowledged! Please edit the route below.");
    } else {
      // Owner gives 👎 → commenter gets +1 XP (server handles it on next action)
      showToast("Feedback dismissed. Commenter awarded +1 XP.");
      try {
        await apiPost({ action: "xpAdjust", userId: comment.commenterId, userName: comment.commenterName, type: "COMMENT_THUMBS_DOWN", oldXP: 0, newXP: 1, delta: 1, reason: "Comment dismissed on route " + route.id });
      } catch {}
    }
  }

  // ── Add community alternative ──────────────────────────────────────────────
  async function submitCommunityAlt(routeId, route) {
    if (!myName || !communityAlt.vehicles?.length) { showToast("Select at least one vehicle type", "warn"); return; }
    const isOwn = route.contributor?.trim().toLowerCase() === myName.trim().toLowerCase() || route.contributorId === myUserId;
    setSubmitting(true);
    try {
      const r = await apiPost({ action: "addAltToOther", routeId, alt: communityAlt, contributor: myName, contributorId: myUserId, oldXP: myXP, newXP: isOwn ? myXP : applyAltOtherBoost(myXP) });
      if (r?.success) {
        if (!isOwn && myXP > 0) {
          const newXP = applyAltOtherBoost(myXP);
          const boostGain = newXP - myXP;
          setMyXP(newXP);
          await persist({ myXP: newXP });
          showToast(`🚀 Booster XP! +${boostGain.toLocaleString()} XP for community contribution!`);
        } else {
          showToast("Alternative route added!");
        }
        // Update the local view of this route's alts
        setEntries(prev => prev.map(e => {
          if (e.id !== routeId) return e;
          return { ...e, alts: [...(e.alts || []), { ...communityAlt, addedBy: myName, addedById: myUserId }] };
        }));
        if (viewingRoute?.id === routeId) {
          setViewingRoute(prev => ({ ...prev, alts: [...(prev.alts || []), { ...communityAlt, addedBy: myName, addedById: myUserId }] }));
        }
        setCommunityAlt({ vehicles: [], from: "", to: "", fare: "", peakFare: "", offPeakFare: "", note: "", stops: [] });
        setAddingAltToRoute(null);
      } else {
        showToast("Failed to add alternative", "warn");
      }
    } catch { showToast("Network error", "warn"); }
    setSubmitting(false);
  }

  // ── Leaderboard data ──────────────────────────────────────────────────────
  const lbMap = {};
  entries.forEach(e => {
    const name    = e.contributor || "Anonymous";
    const nameKey = name.trim().toLowerCase();
    if (!lbMap[nameKey]) {
      lbMap[nameKey] = { name, xp: 0, entries: 0, ids: new Set() };
    }
    lbMap[nameKey].xp     += (Number(e.xpEarned) || XP_PER_ENTRY);
    lbMap[nameKey].entries += 1;
    if (e.contributorId) lbMap[nameKey].ids.add(e.contributorId);
  });
  xpAdjustments.forEach(a => {
    const name    = a.userName || "Anonymous";
    const nameKey = name.trim().toLowerCase();
    if (!lbMap[nameKey]) {
      lbMap[nameKey] = { name, xp: 0, entries: 0, ids: new Set() };
    }
    lbMap[nameKey].xp     += (Number(a.delta) || 0);
    if (a.userId) lbMap[nameKey].ids.add(a.userId);
  });

  const lb = Object.entries(lbMap)
    .map(([nameKey, d]) => ({ 
      id: Array.from(d.ids)[0] || nameKey, 
      ids: Array.from(d.ids),
      name: d.name, 
      xp: d.xp, 
      entries: d.entries 
    }))
    .sort((a, b) => b.xp - a.xp)
    .slice(0, 10);

  const myLevel = xpToLevel(myXP);
  const pct     = Math.min(100, Math.round((myXP / myLevel.next) * 100));

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 400, flexDirection: "column", gap: 12 }}>
      <div style={{ fontSize: 48 }}>🚌</div>
      <div style={{ color: "#64748B", fontWeight: 600 }}>Loading Router Data…</div>
    </div>
  );

  // ──────────────────────────────────────────────────────────────────────────
  // ── HOME ──────────────────────────────────────────────────────────────────
  // ──────────────────────────────────────────────────────────────────────────
  if (screen === "home") {
    return (
      <div style={{ fontFamily: "'Segoe UI', system-ui, sans-serif", maxWidth: 680, margin: "0 auto", padding: "0 0 60px" }}>
        <datalist id="areas-list">{AREAS.map(a => <option key={a} value={a} />)}</datalist>
        <div style={{ background: "linear-gradient(135deg, #0A1F3D 0%, #1A3A6C 100%)", padding: "32px 28px 24px", borderRadius: "0 0 24px 24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
            <div style={{ fontSize: 36 }}>🗺️</div>
            <div style={{ color: "#fff", fontWeight: 900, fontSize: 24, lineHeight: 1.1, letterSpacing: "-0.5px" }}>Jùrù Ányá Technologies</div>
          </div>
          <p style={{ color: "#93C5FD", fontSize: 14, margin: "0 0 12px 0", lineHeight: 1.6 }}>
            Record your daily commuting routes and earn XP. Detailed entries with accurate fares and stops earn more!
          </p>
          <div style={{ display: "inline-block", background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)", color: "#fff", fontWeight: 700, fontSize: 11, padding: "5px 12px", borderRadius: 999, marginBottom: 4 }}>
            ⏳ Entries close: September 30th, 11:59 PM
          </div>
          <CountdownWidget />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginTop: 20 }}>
            {[
              { label: "Routes logged", val: entries.length, emoji: "📍" },
              { label: "Bus stops",     val: entries.reduce((a, e) => a + (e.stops?.length || 0), 0), emoji: "🚏" },
              { label: "Top XP",        val: lb[0] ? lb[0].xp.toLocaleString() : "0", emoji: "⭐" }
            ].map(s => (
              <div key={s.label} style={{ background: "rgba(255,255,255,0.1)", borderRadius: 12, padding: "12px 14px", textAlign: "center" }}>
                <div style={{ fontSize: 20 }}>{s.emoji}</div>
                <div style={{ color: "#fff", fontWeight: 800, fontSize: 22 }}>{s.val}</div>
                <div style={{ color: "#93C5FD", fontSize: 11 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ padding: "24px 20px" }}>
          {/* Speed Boost Widget */}
          {myName && (
            <SpeedBoostWidget
              onClaim={handleClaimSpeedBoost}
              claimed={!!(lastSubmittedRouteId && claimedRouteIds.includes(lastSubmittedRouteId))}
              hasSubmittedThisSession={hasSubmittedThisSession}
            />
          )}

          {/* Daily 50-Routes Booster Widget */}
          {myName && (
            <DailyBoostWidget
              dailyCount={dailyCount}
              onClaim={handleClaimDailyBoost}
              dailyBoostClaimed={dailyBoostClaimed}
              dailyBoostUnlocked={dailyCount >= DAILY_BOOST_TARGET}
              dailyWindowStart={dailyWindowStart}
            />
          )}

          {!myName ? (
            <div style={{ background: "#FFFBEB", border: "2px solid #FDE68A", borderRadius: 16, padding: "20px 20px", marginBottom: 24 }}>
              <div style={{ fontWeight: 800, fontSize: 16, color: "#92400E", marginBottom: 6 }}>🙋 Who are you?</div>
              <p style={{ fontSize: 13, color: "#78350F", margin: "0 0 14px", lineHeight: 1.5 }}>Enter your name to appear on the leaderboard and track your XP across devices.</p>
              <div style={{ display: "flex", gap: 10 }}>
                <input style={{ ...inp, flex: 1 }} placeholder="Your name or nickname" value={nameInput} onChange={e => setNameInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && nameInput.trim()) handleSaveName(nameInput); }} />
                <button disabled={!nameInput.trim()} onClick={() => handleSaveName(nameInput)} style={{ padding: "9px 18px", background: "#F5A623", color: "#fff", fontWeight: 700, border: "none", borderRadius: 8, cursor: "pointer", fontSize: 14, opacity: nameInput.trim() ? 1 : 0.5 }}>Save</button>
              </div>
            </div>
          ) : (
            <div style={{ background: "linear-gradient(135deg, #0A1F3D, #1A3A6C)", borderRadius: 16, padding: "18px 20px", marginBottom: 24, color: "#fff" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 12, color: "#93C5FD", fontWeight: 600 }}>Welcome back,</div>
                  <div style={{ fontWeight: 800, fontSize: 18 }}>{myName}</div>
                  <div style={{ fontSize: 13, color: "#E87722", fontWeight: 700 }}>Level {myLevel.n} · {myLevel.title}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 11, color: "#93C5FD" }}>Total XP</div>
                  <div style={{ fontWeight: 900, fontSize: 26, color: "#F5A623" }}>{myXP.toLocaleString()}</div>
                  <div style={{ fontSize: 11, color: "#93C5FD" }}>🔥 {myStreak} entries</div>
                </div>
              </div>
              <div style={{ height: 6, background: "rgba(255,255,255,0.15)", borderRadius: 3, overflow: "hidden" }}>
                <div style={{ height: "100%", width: pct + "%", background: "#F5A623", borderRadius: 3, transition: "width 1s ease" }} />
              </div>
              <div style={{ fontSize: 11, color: "#93C5FD", marginTop: 6 }}>{pct}% to Level {myLevel.n + 1}</div>
            </div>
          )}

          {/* XP explainer */}
          <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 14, padding: "16px 18px", marginBottom: 24 }}>
            <div style={{ fontWeight: 800, fontSize: 14, color: "#166534", marginBottom: 10 }}>⚡ How XP works</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {[
                { pts: `+${XP_PER_ENTRY}`, desc: "Complete route entry" },
                { pts: `+${BONUS.alt}`,    desc: "Add an alternative route" },
                { pts: `+${BONUS.peak}`,   desc: "Include peak fare" },
                { pts: `+${BONUS.condition}`, desc: "Road/vehicle condition" },
                { pts: "×2÷1.5",  desc: "Add alt to another's route" },
                { pts: "+316 XP",  desc: "Speed bonus window" },
              ].map(r => (
                <div key={r.desc} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ background: "#DCFCE7", color: "#166534", fontWeight: 800, fontSize: 12, borderRadius: 8, padding: "4px 10px", whiteSpace: "nowrap" }}>{r.pts}</div>
                  <div style={{ fontSize: 13, color: "#166534" }}>{r.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* CTA buttons */}
          <button onClick={() => { if (!myName) { showToast("Please enter your name first", "warn"); return; } setForm(emptyForm()); setStep(0); setScreen("form"); }}
            style={{ width: "100%", padding: "16px", background: "#F5A623", color: "#fff", fontWeight: 900, fontSize: 18, border: "none", borderRadius: 14, cursor: "pointer", marginBottom: 12 }}>
            🚌 Add a Route
          </button>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
            <button onClick={() => setScreen("leaderboard")} style={{ padding: "14px", background: "#0A1F3D", color: "#fff", fontWeight: 700, fontSize: 15, border: "none", borderRadius: 14, cursor: "pointer" }}>🏆 Leaderboard</button>
            <button onClick={() => setScreen("browse")}      style={{ padding: "14px", background: "#7C3AED", color: "#fff", fontWeight: 700, fontSize: 15, border: "none", borderRadius: 14, cursor: "pointer" }}>🗺 Browse Routes</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
            <button onClick={() => setScreen("rewards")}   style={{ padding: "14px", background: "#10B981", color: "#fff", fontWeight: 700, fontSize: 15, border: "none", borderRadius: 14, cursor: "pointer" }}>🎁 View Rewards</button>
            <button onClick={() => setScreen("learnMore")} style={{ padding: "14px", background: "#64748B", color: "#fff", fontWeight: 700, fontSize: 15, border: "none", borderRadius: 14, cursor: "pointer" }}>📖 Learn More</button>
          </div>

          {entries.length > 0 && (
            <>
              <div style={{ fontWeight: 800, fontSize: 15, color: "#1E293B", marginBottom: 12 }}>Recent contributions</div>
              {entries.slice(0, 5).map(e => (
                <div key={e.id} style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, padding: "14px 16px", marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: "#1E293B" }}>{e.from} → {e.to}</div>
                      <div style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>
                        {(e.vehicles || []).map(vid => VEHICLES.find(v => v.id === vid)?.emoji).join(" ")} · {fmt(e.baseFare)} base · {e.stops?.length || 0} stops
                      </div>
                      <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 2 }}>by {e.contributor || "Anonymous"}</div>
                    </div>
                    <div style={{ background: "#FEF3C7", color: "#92400E", fontWeight: 700, fontSize: 12, borderRadius: 8, padding: "4px 10px" }}>+{e.xpEarned || XP_PER_ENTRY} XP</div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
        {toast && <Toast msg={toast.msg} type={toast.type} />}
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // ── SUCCESS ───────────────────────────────────────────────────────────────
  // ──────────────────────────────────────────────────────────────────────────
  if (screen === "success") {
    const newLevel = xpToLevel(myXP);
    return (
      <div style={{ fontFamily: "'Segoe UI', system-ui, sans-serif", maxWidth: 680, margin: "0 auto", padding: 24 }}>
        <div style={{ textAlign: "center", padding: "40px 24px 20px" }}>
          <div style={{ fontSize: 72, marginBottom: 16 }}>🎉</div>
          <div style={{ fontWeight: 900, fontSize: 28, color: "#0A1F3D", marginBottom: 8 }}>Route Logged!</div>
          <div style={{ color: "#64748B", fontSize: 15, marginBottom: 20 }}>{lastEntry?.from} → {lastEntry?.to} saved to the Router database.</div>
          <div style={{ background: "linear-gradient(135deg, #0A1F3D, #1A3A6C)", borderRadius: 20, padding: "28px 24px", color: "#fff", marginBottom: 20 }}>
            <div style={{ fontSize: 13, color: "#93C5FD", marginBottom: 4 }}>You earned</div>
            <div style={{ fontSize: 56, fontWeight: 900, color: "#F5A623", lineHeight: 1 }}>+{lastEntry?.earnedXP}</div>
            <div style={{ fontSize: 16, color: "#93C5FD" }}>XP</div>
            <div style={{ margin: "16px 0 10px", height: 6, background: "rgba(255,255,255,.15)", borderRadius: 3, overflow: "hidden" }}>
              <div style={{ height: "100%", width: pct + "%", background: "#F5A623", borderRadius: 3 }} />
            </div>
            <div style={{ fontSize: 13, color: "#93C5FD" }}>Level {newLevel.n} · {newLevel.title} · {myXP.toLocaleString()} total XP</div>
          </div>

          {/* Speed Boost Widget on success screen */}
          <SpeedBoostWidget
            onClaim={handleClaimSpeedBoost}
            claimed={!!(lastSubmittedRouteId && claimedRouteIds.includes(lastSubmittedRouteId))}
            hasSubmittedThisSession={hasSubmittedThisSession}
          />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 20 }}>
            <button onClick={() => { setForm(emptyForm()); setStep(0); setScreen("form"); }} style={{ padding: "14px", background: "#F5A623", color: "#fff", fontWeight: 700, border: "none", borderRadius: 12, cursor: "pointer", fontSize: 15 }}>➕ Add Another</button>
            <button onClick={() => setScreen("home")} style={{ padding: "14px", background: "#0A1F3D", color: "#fff", fontWeight: 700, border: "none", borderRadius: 12, cursor: "pointer", fontSize: 15 }}>🏠 Home</button>
          </div>
        </div>
        {toast && <Toast msg={toast.msg} type={toast.type} />}
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // ── LEADERBOARD ───────────────────────────────────────────────────────────
  // ──────────────────────────────────────────────────────────────────────────
  if (screen === "leaderboard") {
    const medals = ["🥇","🥈","🥉"];
    return (
      <div style={{ fontFamily: "'Segoe UI', system-ui, sans-serif", maxWidth: 680, margin: "0 auto", padding: "0 0 60px" }}>
        <div style={{ background: "linear-gradient(135deg, #0A1F3D, #1A3A6C)", padding: "24px 20px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <button onClick={() => setScreen("home")} style={{ background: "rgba(255,255,255,.15)", border: "none", color: "#fff", fontWeight: 700, padding: "8px 16px", borderRadius: 999, cursor: "pointer" }}>← Back</button>
            <button onClick={async () => { const ok = await fetchAll(myName, myUserId); showToast(ok ? "Refreshed!" : "Up to date", ok ? "success" : "warn"); }} style={{ background: "rgba(255,255,255,.15)", border: "1px solid rgba(255,255,255,.3)", color: "#fff", fontWeight: 700, padding: "8px 14px", borderRadius: 999, cursor: "pointer", fontSize: 12 }}>🔄 Refresh</button>
          </div>
          <div style={{ color: "#fff", fontWeight: 900, fontSize: 24 }}>🏆 Leaderboard</div>
          <div style={{ color: "#93C5FD", fontSize: 13, marginTop: 4 }}>{entries.length} routes logged across all contributors</div>
        </div>
        <div style={{ padding: "20px 20px" }}>
          {lb.length === 0 ? (
            <div style={{ textAlign: "center", padding: 48, color: "#94A3B8" }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🚌</div>
              <div style={{ fontWeight: 700 }}>No entries yet.</div>
              <button onClick={() => fetchAll(myName, myUserId)} style={{ marginTop: 16, padding: "10px 20px", background: "#F5A623", color: "#fff", fontWeight: 700, border: "none", borderRadius: 10, cursor: "pointer" }}>🔄 Try Refreshing</button>
            </div>
          ) : lb.map((item, i) => {
            const isMe = item.ids?.includes(myUserId) || item.name.trim().toLowerCase() === myName.trim().toLowerCase();
            return (
              <div key={item.id} style={{
                display: "flex", alignItems: "center", gap: 14,
                background: isMe ? "#FEF9EE" : (i === 0 ? "#FFFBEB" : "#fff"),
                border: isMe ? "2px solid #F5A623" : (i === 0 ? "2px solid #FDE68A" : "1px solid #E2E8F0"),
                borderRadius: 12, padding: "14px 16px", marginBottom: 10
              }}>
                <div style={{ fontSize: 22, width: 32, textAlign: "center", flexShrink: 0 }}>{medals[i] || `#${i + 1}`}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: "#1E293B" }}>
                    {item.name}
                    {isMe && <span style={{ background: "#FEF3C7", color: "#92400E", fontSize: 11, fontWeight: 700, borderRadius: 4, padding: "2px 6px", marginLeft: 4 }}>YOU</span>}
                  </div>
                  <div style={{ fontSize: 12, color: "#64748B" }}>Level {xpToLevel(item.xp).n} · {xpToLevel(item.xp).title} · {item.entries} route{item.entries !== 1 ? "s" : ""}</div>
                </div>
                <div style={{ fontWeight: 800, fontSize: 18, color: "#F5A623", textAlign: "right" }}>
                  {item.xp.toLocaleString()}<div style={{ fontSize: 11, color: "#94A3B8", fontWeight: 400 }}>XP</div>
                </div>
              </div>
            );
          })}
          <button onClick={() => setScreen("home")} style={{ width: "100%", marginTop: 16, padding: "14px", background: "#F5A623", color: "#fff", fontWeight: 700, border: "none", borderRadius: 12, cursor: "pointer" }}>➕ Add a Route</button>
        </div>
        {toast && <Toast msg={toast.msg} type={toast.type} />}
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // ── REWARDS ───────────────────────────────────────────────────────────────
  // ──────────────────────────────────────────────────────────────────────────
  if (screen === "rewards") {
    return (
      <div style={{ fontFamily: "'Segoe UI', system-ui, sans-serif", maxWidth: 680, margin: "0 auto", padding: "0 0 60px" }}>
        <div style={{ background: "linear-gradient(135deg, #10B981, #059669)", padding: "24px 20px 20px" }}>
          <button onClick={() => setScreen("home")} style={{ background: "rgba(255,255,255,.15)", border: "none", color: "#fff", fontWeight: 700, padding: "8px 16px", borderRadius: 999, cursor: "pointer", marginBottom: 16 }}>← Back</button>
          <div style={{ color: "#fff", fontWeight: 900, fontSize: 24 }}>🎁 Leaderboard Rewards</div>
          <div style={{ color: "#D1FAE5", fontSize: 13, marginTop: 4 }}>Your current balance: <strong style={{ color: "#FFFBEB", fontSize: 16 }}>{myXP.toLocaleString()} XP</strong></div>
        </div>
        <div style={{ padding: "20px 20px" }}>
          <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 14, padding: "16px 18px", marginBottom: 24 }}>
            <div style={{ fontWeight: 800, fontSize: 14, color: "#1E40AF", marginBottom: 6 }}>🏆 How to qualify:</div>
            <p style={{ fontSize: 13, color: "#1E3A8A", margin: 0, lineHeight: 1.6 }}>
              Record commuting routes with accurate fares and bus stops. Earn Booster XP by contributing to others' routes or clicking the Speed Bonus!
            </p>
            <div style={{ marginTop: 12, background: "#DBEAFE", color: "#1E40AF", fontWeight: 800, fontSize: 12, padding: "8px 12px", borderRadius: 8, display: "inline-block" }}>⏳ Campaign Deadline: September 30th, 11:59 PM</div>
            <CountdownWidget light={true} />
          </div>
          {REWARDS.map(r => {
            const isUnlocked = myXP >= r.xp;
            const progressPct = Math.min(100, Math.round((myXP / r.xp) * 100));
            return (
              <div key={r.id} style={{ background: "#fff", border: isUnlocked ? "2px solid #10B981" : "1px solid #E2E8F0", borderRadius: 16, overflow: "hidden", marginBottom: 20, boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" }}>
                <div style={{ position: "relative", width: "100%", height: 240, background: "#F8FAFC", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                  <img src={r.img} alt={r.title} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
                  <div style={{ position: "absolute", top: 12, right: 12, background: isUnlocked ? "#10B981" : "#64748B", color: "#fff", fontWeight: 800, fontSize: 12, padding: "6px 12px", borderRadius: 999 }}>
                    {isUnlocked ? "🎉 Qualified" : `${r.xp.toLocaleString()} XP`}
                  </div>
                </div>
                <div style={{ padding: 20 }}>
                  <h3 style={{ margin: "0 0 8px 0", fontSize: 18, color: "#0F172A", fontWeight: 800 }}>{r.title}</h3>
                  <p style={{ margin: "0 0 16px 0", fontSize: 13, color: "#64748B" }}>{r.desc}</p>
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 6 }}>
                      <span>Progress: {progressPct}%</span><span>{myXP.toLocaleString()} / {r.xp.toLocaleString()} XP</span>
                    </div>
                    <div style={{ height: 8, background: "#E2E8F0", borderRadius: 4, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${progressPct}%`, background: isUnlocked ? "#10B981" : "#3B82F6", borderRadius: 4 }} />
                    </div>
                  </div>
                  <button disabled={!isUnlocked} onClick={() => alert(`Congratulations! You have qualified for the ${r.title}. We will contact you soon.`)}
                    style={{ width: "100%", padding: "12px", background: isUnlocked ? "#10B981" : "#E2E8F0", color: isUnlocked ? "#fff" : "#94A3B8", fontWeight: 700, fontSize: 14, border: "none", borderRadius: 10, cursor: isUnlocked ? "pointer" : "not-allowed" }}>
                    {isUnlocked ? "Claim Reward" : "Locked (Insufficient XP)"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // ── BROWSE ALL ROUTES ─────────────────────────────────────────────────────
  // ──────────────────────────────────────────────────────────────────────────
  if (screen === "browse") {
    const filtered = entries.filter(e => {
      const matchTab = browseTab === "all" || ((e.contributor || "").trim().toLowerCase() === (myName || "").trim().toLowerCase() || e.contributorId === myUserId);
      const q = browseSearch.trim().toLowerCase();
      const matchSearch = !q || (e.from + e.to + (e.contributor || "")).toLowerCase().includes(q);
      return matchTab && matchSearch;
    }).sort((a, b) => new Date(b.ts || 0) - new Date(a.ts || 0));

    return (
      <div style={{ fontFamily: "'Segoe UI', system-ui, sans-serif", maxWidth: 680, margin: "0 auto", padding: "0 0 60px" }}>
        <div style={{ background: "linear-gradient(135deg, #7C3AED, #4F46E5)", padding: "24px 20px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <button onClick={() => setScreen("home")} style={{ background: "rgba(255,255,255,.15)", border: "none", color: "#fff", fontWeight: 700, padding: "8px 16px", borderRadius: 999, cursor: "pointer" }}>← Back</button>
            <button onClick={() => fetchAll(myName, myUserId)} style={{ background: "rgba(255,255,255,.15)", border: "1px solid rgba(255,255,255,.3)", color: "#fff", fontWeight: 700, padding: "8px 14px", borderRadius: 999, cursor: "pointer", fontSize: 12 }}>🔄 Refresh</button>
          </div>
          <div style={{ color: "#fff", fontWeight: 900, fontSize: 24 }}>🗺️ Browse Routes</div>
          <div style={{ color: "#DDD6FE", fontSize: 13, marginTop: 4 }}>{entries.length} routes in the database</div>
          <input
            style={{ width: "100%", boxSizing: "border-box", marginTop: 16, padding: "10px 14px", borderRadius: 10, border: "none", fontSize: 14, background: "rgba(255,255,255,0.15)", color: "#fff", outline: "none" }}
            placeholder="🔍 Search by area, route, or contributor…"
            value={browseSearch} onChange={e => setBrowseSearch(e.target.value)}
          />
        </div>

        {/* Tabs */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0, background: "#F1F5F9" }}>
          {["all", "mine"].map(tab => (
            <button key={tab} onClick={() => setBrowseTab(tab)} style={{ padding: "12px", background: browseTab === tab ? "#fff" : "transparent", fontWeight: browseTab === tab ? 800 : 500, color: browseTab === tab ? "#7C3AED" : "#64748B", border: "none", borderBottom: browseTab === tab ? "2px solid #7C3AED" : "2px solid transparent", cursor: "pointer", fontSize: 14 }}>
              {tab === "all" ? "🌍 All Routes" : "👤 My Routes"}
            </button>
          ))}
        </div>

        <div style={{ padding: "16px 20px" }}>
          {filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: 40, color: "#94A3B8" }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>🚫</div>
              <div style={{ fontWeight: 700 }}>{browseTab === "mine" ? "You haven't added any routes yet." : "No routes match your search."}</div>
              {browseTab === "mine" && <button onClick={() => { setForm(emptyForm()); setStep(0); setScreen("form"); }} style={{ marginTop: 16, padding: "10px 20px", background: "#F5A623", color: "#fff", fontWeight: 700, border: "none", borderRadius: 10, cursor: "pointer" }}>Add Your First Route</button>}
            </div>
          ) : filtered.map(e => {
            const vs = (e.vehicles || []).map(vid => VEHICLES.find(v => v.id === vid)).filter(Boolean);
            const isOwn = (e.contributor || "").trim().toLowerCase() === (myName || "").trim().toLowerCase() || e.contributorId === myUserId;
            const routeComments = comments.filter(c => c.routeId === e.id);
            return (
              <div key={e.id} style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14, padding: "16px 18px", marginBottom: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 15, color: "#0A1F3D" }}>{e.from} → {e.to}</div>
                    <div style={{ fontSize: 12, color: "#64748B", marginTop: 3 }}>
                      {vs.map(v => `${v.emoji} ${v.label}`).join(" · ")} · Base {fmt(e.baseFare)}{e.peakFare ? ` / Peak ${fmt(e.peakFare)}` : ""}
                    </div>
                  </div>
                  <div style={{ background: "#FEF3C7", color: "#92400E", fontWeight: 700, fontSize: 12, borderRadius: 8, padding: "4px 10px", whiteSpace: "nowrap" }}>+{e.xpEarned || XP_PER_ENTRY} XP</div>
                </div>
                {e.stops?.length > 0 && (
                  <div style={{ fontSize: 12, color: "#64748B", marginBottom: 6 }}>
                    🚏 {e.stops.filter(s => s.name).map(s => s.name).join(" → ")}
                  </div>
                )}
                {e.alts?.length > 0 && (
                  <div style={{ fontSize: 11, color: "#10B981", marginBottom: 6 }}>🔀 {e.alts.length} alternative route{e.alts.length > 1 ? "s" : ""}</div>
                )}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
                  <span style={{ fontSize: 11, color: "#94A3B8" }}>
                    by <strong>{e.contributor || "Anonymous"}</strong>
                    {isOwn && <span style={{ marginLeft: 4, background: "#DBEAFE", color: "#1E40AF", fontSize: 10, fontWeight: 700, borderRadius: 4, padding: "1px 5px" }}>YOU</span>}
                    {" · "}{new Date(e.ts || Date.now()).toLocaleDateString()}
                  </span>
                  <div style={{ display: "flex", gap: 8 }}>
                    {isOwn && (
                      <button onClick={() => {
                        setEditingEntry(e);
                        setEditForm({ ...e, stops: Array.isArray(e.stops) ? e.stops : [], alts: Array.isArray(e.alts) ? e.alts : [], vehicles: Array.isArray(e.vehicles) ? e.vehicles : [], securityHint: e.securityHint || "" });
                        setPendingThumbsUp(null); setEditStep(0); setScreen("editEntry");
                      }} style={{ padding: "6px 12px", background: "#EFF6FF", color: "#1D4ED8", fontWeight: 700, border: "1px solid #BFDBFE", borderRadius: 8, cursor: "pointer", fontSize: 12 }}>✏️ Edit</button>
                    )}
                    <button onClick={() => { setViewingRoute(e); setNewComment(""); setAddingAltToRoute(null); setScreen("routeDetail"); }}
                      style={{ padding: "6px 12px", background: "#F0FDF4", color: "#166534", fontWeight: 700, border: "1px solid #BBF7D0", borderRadius: 8, cursor: "pointer", fontSize: 12 }}>
                      💬 {routeComments.length > 0 ? `${routeComments.length} comment${routeComments.length > 1 ? "s" : ""}` : "Details"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {toast && <Toast msg={toast.msg} type={toast.type} />}
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // ── ROUTE DETAIL ──────────────────────────────────────────────────────────
  // ──────────────────────────────────────────────────────────────────────────
  if (screen === "routeDetail" && viewingRoute) {
    const route = entries.find(e => e.id === viewingRoute.id) || viewingRoute;
    const isOwn = (route.contributor || "").trim().toLowerCase() === (myName || "").trim().toLowerCase() || route.contributorId === myUserId;
    const routeComments = comments.filter(c => c.routeId === route.id).sort((a, b) => new Date(a.ts) - new Date(b.ts));
    const vs = (route.vehicles || []).map(vid => VEHICLES.find(v => v.id === vid)).filter(Boolean);

    return (
      <div style={{ fontFamily: "'Segoe UI', system-ui, sans-serif", maxWidth: 680, margin: "0 auto", padding: "0 0 60px" }}>
        <div style={{ background: "linear-gradient(135deg, #0A1F3D, #1A3A6C)", padding: "24px 20px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <button onClick={() => { setScreen("browse"); setViewingRoute(null); }} style={{ background: "rgba(255,255,255,.15)", border: "none", color: "#fff", fontWeight: 700, padding: "8px 16px", borderRadius: 999, cursor: "pointer" }}>← Back</button>
            {isOwn && <button onClick={() => { setEditingEntry(route); setEditForm({ ...route, stops: Array.isArray(route.stops) ? route.stops : [], alts: Array.isArray(route.alts) ? route.alts : [], vehicles: Array.isArray(route.vehicles) ? route.vehicles : [], securityHint: route.securityHint || "" }); setPendingThumbsUp(null); setEditStep(0); setScreen("editEntry"); }}
              style={{ background: "#F5A623", border: "none", color: "#fff", fontWeight: 700, padding: "8px 16px", borderRadius: 999, cursor: "pointer", fontSize: 13 }}>✏️ Edit Route</button>}
          </div>
          <div style={{ color: "#fff", fontWeight: 900, fontSize: 22 }}>{route.from} → {route.to}</div>
          <div style={{ color: "#93C5FD", fontSize: 13, marginTop: 4 }}>by {route.contributor || "Anonymous"} · {new Date(route.ts || Date.now()).toLocaleDateString()}</div>
        </div>

        <div style={{ padding: "20px 20px" }}>
          {/* Route info */}
          <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14, padding: "16px 18px", marginBottom: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: "#1E293B", marginBottom: 10 }}>🚌 Vehicle Types</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
              {vs.map(v => <span key={v.id} style={{ background: v.color + "22", color: v.color, border: `1px solid ${v.color}`, borderRadius: 999, padding: "4px 12px", fontSize: 13, fontWeight: 700 }}>{v.emoji} {v.label}</span>)}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              {[["Base Fare", fmt(route.baseFare)], ["Peak Fare", route.peakFare ? fmt(route.peakFare) : "—"], ["Off-Peak", route.offPeakFare ? fmt(route.offPeakFare) : "—"]].map(([label, val]) => (
                <div key={label} style={{ background: "#F8FAFC", borderRadius: 8, padding: "8px 10px" }}>
                  <div style={{ fontSize: 10, color: "#94A3B8", fontWeight: 700, textTransform: "uppercase" }}>{label}</div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: "#0A1F3D" }}>{val}</div>
                </div>
              ))}
            </div>
            {route.dayType && <div style={{ marginTop: 10, fontSize: 12, color: "#64748B" }}>📅 {route.dayType}{route.timeOfDay ? ` · ${route.timeOfDay}` : ""}</div>}
            {route.condition && <div style={{ fontSize: 12, color: "#64748B", marginTop: 4 }}>🛣️ {route.condition}</div>}
            {route.securityHint && (
              <div style={{ fontSize: 12, color: "#64748B", marginTop: 4 }}>
                🛡️ <strong>Safety Hint:</strong> {
                  route.securityHint === "safe-anytime" ? "Safe at all times" :
                  route.securityHint === "caution-nights" ? "Caution: Avoid late nights / dark hours" :
                  route.securityHint === "caution-pickpockets" ? "Caution: High pickpocket area" :
                  route.securityHint === "caution-robbery" ? "Caution: Frequent traffic robberies / one-chance risk" :
                  route.securityHint === "high-risk" ? "High Risk — travel with extreme caution" : route.securityHint
                }
              </div>
            )}
            {route.notes && <div style={{ fontSize: 12, color: "#64748B", marginTop: 4 }}>📝 {route.notes}</div>}
          </div>

          {/* Stops */}
          {route.stops?.filter(s => s.name).length > 0 && (
            <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14, padding: "16px 18px", marginBottom: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: "#1E293B", marginBottom: 12 }}>🚏 Stops Along Route</div>
              {route.stops.filter(s => s.name).map((s, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                  <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#F5A623", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 11, flexShrink: 0 }}>{i + 1}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{s.name}</div>
                    {s.note && <div style={{ fontSize: 11, color: "#94A3B8" }}>{s.note}</div>}
                  </div>
                  {s.fare && <div style={{ fontWeight: 700, fontSize: 14, color: "#166534" }}>{fmt(s.fare)}</div>}
                </div>
              ))}
            </div>
          )}

          {/* Existing alternatives */}
          {route.alts?.length > 0 && (
            <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 14, padding: "16px 18px", marginBottom: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: "#166534", marginBottom: 12 }}>🔀 Alternative Routes</div>
              {route.alts.map((a, i) => {
                const altVs = (a.vehicles || []).map(vid => VEHICLES.find(v => v.id === vid)).filter(Boolean);
                return (
                  <div key={i} style={{ background: "rgba(255,255,255,0.6)", borderRadius: 10, padding: "10px 12px", marginBottom: 8 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: "#166534", marginBottom: 4 }}>Alternative {i + 1} {a.addedBy && a.addedBy !== route.contributor ? <span style={{ fontSize: 11, fontWeight: 400, color: "#16A34A" }}>— added by {a.addedBy}</span> : ""}</div>
                    {(a.from || a.to) && <div style={{ fontSize: 12, color: "#15803D" }}>📍 {a.from || route.from} → {a.to || route.to}</div>}
                    <div style={{ fontSize: 12, color: "#15803D" }}>{altVs.map(v => `${v.emoji} ${v.label}`).join(", ")} · {a.fare ? fmt(a.fare) : "—"}</div>
                    {a.note && <div style={{ fontSize: 11, color: "#16A34A", marginTop: 2 }}>{a.note}</div>}
                  </div>
                );
              })}
            </div>
          )}

          {/* Add community alternative */}
          <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 14, padding: "16px 18px", marginBottom: 16 }}>
            <div style={{ fontWeight: 800, fontSize: 14, color: "#1E40AF", marginBottom: 6 }}>🔀 Add Alternative Route</div>
            {!myName ? (
              <div style={{ fontSize: 13, color: "#1E3A8A" }}>Please enter your name on the home screen to contribute an alternative route.</div>
            ) : addingAltToRoute === route.id ? (
              <div>
                 {!isOwn && <div style={{ fontSize: 12, color: "#1D4ED8", marginBottom: 12, padding: "8px 12px", background: "rgba(124,58,237,0.1)", borderRadius: 8 }}>
                  🚀 <strong>Booster XP!</strong> Adding an alt to another contributor's route earns you +215 XP!
                </div>}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
                  <div><label style={lbl}>📍 Alt. starting point</label><input style={inp} list="areas-list" placeholder={route.from} value={communityAlt.from} onChange={e => setCommunityAlt(a => ({ ...a, from: e.target.value }))} /></div>
                  <div><label style={lbl}>🏁 Alt. end point</label><input style={inp} list="areas-list" placeholder={route.to} value={communityAlt.to} onChange={e => setCommunityAlt(a => ({ ...a, to: e.target.value }))} /></div>
                </div>
                <label style={lbl}>🚌 Vehicles — select all that apply</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, margin: "8px 0 14px" }}>
                  {VEHICLES.map(v => (
                    <VehicleChip key={v.id} v={v} selected={(communityAlt.vehicles || []).includes(v.id)} onToggle={vid => setCommunityAlt(a => ({ ...a, vehicles: a.vehicles.includes(vid) ? a.vehicles.filter(x => x !== vid) : [...a.vehicles, vid] }))} />
                  ))}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
                  <div><label style={lbl}>Base fare (₦)</label><input style={inp} type="number" min="0" value={communityAlt.fare} onChange={e => setCommunityAlt(a => ({ ...a, fare: e.target.value }))} /></div>
                  <div><label style={lbl}>Peak fare (₦)</label><input style={inp} type="number" min="0" value={communityAlt.peakFare} onChange={e => setCommunityAlt(a => ({ ...a, peakFare: e.target.value }))} /></div>
                  <div><label style={lbl}>Off-peak (₦)</label><input style={inp} type="number" min="0" value={communityAlt.offPeakFare} onChange={e => setCommunityAlt(a => ({ ...a, offPeakFare: e.target.value }))} /></div>
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label style={lbl}>📝 Notes</label>
                  <input style={inp} placeholder="e.g. via Third Mainland, faster during off-peak" value={communityAlt.note} onChange={e => setCommunityAlt(a => ({ ...a, note: e.target.value }))} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <button onClick={() => setAddingAltToRoute(null)} style={{ padding: "11px", background: "#F1F5F9", color: "#475569", fontWeight: 700, border: "none", borderRadius: 10, cursor: "pointer" }}>Cancel</button>
                  <button disabled={submitting || !communityAlt.vehicles?.length} onClick={() => submitCommunityAlt(route.id, route)}
                    style={{ padding: "11px", background: submitting ? "#6B7280" : "#7C3AED", color: "#fff", fontWeight: 700, border: "none", borderRadius: 10, cursor: submitting ? "not-allowed" : "pointer" }}>
                    {submitting ? "Saving…" : "Save Alternative"}
                  </button>
                </div>
              </div>
            ) : (
              <button onClick={() => setAddingAltToRoute(route.id)} style={{ width: "100%", padding: "11px", background: "#EFF6FF", color: "#1D4ED8", fontWeight: 700, border: "2px dashed #BFDBFE", borderRadius: 10, cursor: "pointer", fontSize: 14 }}>
                + Add a Different Route from {route.from} → {route.to}
                {!isOwn && myXP > 0 && <div style={{ fontSize: 11, fontWeight: 400, marginTop: 2 }}>🚀 Earns +215 XP!</div>}
              </button>
            )}
          </div>

          {/* Comments section */}
          <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14, padding: "16px 18px", marginBottom: 16 }}>
            <div style={{ fontWeight: 800, fontSize: 14, color: "#1E293B", marginBottom: 12 }}>
              💬 Community Comments {routeComments.length > 0 && `(${routeComments.length})`}
            </div>

            {routeComments.length === 0 ? (
              <div style={{ fontSize: 13, color: "#94A3B8", marginBottom: 16, fontStyle: "italic" }}>No comments yet. Be the first to point out anything inaccurate.</div>
            ) : routeComments.map((c, ci) => {
              const alreadyUp   = Array.isArray(c.thumbsUpBy)   && c.thumbsUpBy.includes(myUserId);
              const alreadyDown = Array.isArray(c.thumbsDownBy) && c.thumbsDownBy.includes(myUserId);
              const upCount     = Array.isArray(c.thumbsUpBy)   ? c.thumbsUpBy.length   : 0;
              const downCount   = Array.isArray(c.thumbsDownBy) ? c.thumbsDownBy.length : 0;
              const editDone    = c.editSubmitted === "true" || c.editSubmitted === true;

              return (
                <div key={c.commentId || ci} style={{ borderTop: ci === 0 ? "none" : "1px solid #F1F5F9", paddingTop: ci === 0 ? 0 : 12, marginTop: ci === 0 ? 0 : 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                    <span style={{ fontWeight: 700, fontSize: 13, color: "#1E293B" }}>{c.commenterName || "Anonymous"}</span>
                    <span style={{ fontSize: 11, color: "#94A3B8" }}>{c.ts ? new Date(c.ts).toLocaleDateString() : ""}</span>
                  </div>
                  <p style={{ fontSize: 13, color: "#374151", margin: "0 0 8px", lineHeight: 1.5 }}>{c.text}</p>
                  {editDone && <div style={{ fontSize: 11, color: "#10B981", fontWeight: 700, marginBottom: 8 }}>✅ Owner acknowledged and updated this route</div>}
                  {isOwn && !editDone && c.resolved !== "true" && (
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <span style={{ fontSize: 11, color: "#64748B" }}>Is this correct?</span>
                      <button onClick={() => handleThumbs(c, "up", route)} disabled={alreadyUp}
                        style={{ padding: "4px 12px", background: alreadyUp ? "#DCFCE7" : "#F0FDF4", color: "#166534", fontWeight: 700, border: "1px solid #86EFAC", borderRadius: 999, cursor: alreadyUp ? "default" : "pointer", fontSize: 12 }}>
                        👍 {upCount > 0 ? upCount : "Yes"}
                      </button>
                      <button onClick={() => handleThumbs(c, "down", route)} disabled={alreadyDown}
                        style={{ padding: "4px 12px", background: alreadyDown ? "#FEE2E2" : "#FEF2F2", color: "#DC2626", fontWeight: 700, border: "1px solid #FCA5A5", borderRadius: 999, cursor: alreadyDown ? "default" : "pointer", fontSize: 12 }}>
                        👎 {downCount > 0 ? downCount : "No"}
                      </button>
                    </div>
                  )}
                  {!isOwn && (upCount > 0 || downCount > 0) && (
                    <div style={{ display: "flex", gap: 8, fontSize: 12, color: "#64748B" }}>
                      <span>👍 {upCount}</span><span>👎 {downCount}</span>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Add comment */}
            {myName ? (
              <div style={{ marginTop: 16 }}>
                <label style={lbl}>Leave a comment</label>
                <textarea
                  style={{ ...inp, height: 70, resize: "vertical", marginBottom: 8 }}
                  placeholder="e.g. The fare from Oshodi is actually ₦400, not ₦300. I travel this route daily."
                  value={newComment} onChange={e => setNewComment(e.target.value)}
                />
                <button disabled={!newComment.trim() || commentSubmitting} onClick={() => submitComment(route.id)}
                  style={{ width: "100%", padding: "10px", background: newComment.trim() ? "#0A1F3D" : "#E2E8F0", color: newComment.trim() ? "#fff" : "#94A3B8", fontWeight: 700, border: "none", borderRadius: 10, cursor: newComment.trim() ? "pointer" : "not-allowed" }}>
                  {commentSubmitting ? "Posting…" : "Post Comment"}
                </button>
              </div>
            ) : (
              <div style={{ fontSize: 13, color: "#94A3B8", marginTop: 12, fontStyle: "italic" }}>Enter your name on the home screen to leave a comment.</div>
            )}
          </div>
        </div>
        {toast && <Toast msg={toast.msg} type={toast.type} />}
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // ── EDIT ENTRY ────────────────────────────────────────────────────────────
  // ──────────────────────────────────────────────────────────────────────────
  if (screen === "editEntry" && editForm) {
    const orig = editingEntry || editForm;
    function canEditProceed() {
      if (editStep === 0) return editForm.vehicles.length > 0 && editForm.baseFare;
      if (editStep === 1) return editForm.stops.length > 0 && editForm.stops[0].name;
      return true;
    }
    return (
      <div style={{ fontFamily: "'Segoe UI', system-ui, sans-serif", maxWidth: 680, margin: "0 auto", padding: "0 0 60px" }}>
        <datalist id="areas-list">{AREAS.map(a => <option key={a} value={a} />)}</datalist>
        <div style={{ background: "linear-gradient(135deg, #0A1F3D, #1A3A6C)", padding: "20px 20px 16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <button onClick={() => { setScreen(pendingThumbsUp ? "routeDetail" : "browse"); setPendingThumbsUp(null); setEditingEntry(null); setEditForm(null); setEditStep(0); }}
              style={{ background: "rgba(255,255,255,.15)", border: "none", color: "#fff", fontWeight: 700, padding: "7px 14px", borderRadius: 999, cursor: "pointer", fontSize: 12 }}>← Cancel</button>
            <div style={{ background: "#F5A623", color: "#fff", fontWeight: 800, fontSize: 12, borderRadius: 999, padding: "5px 14px" }}>
              Step {editStep + 1} of {EDIT_STEPS.length}
            </div>
          </div>
          <div style={{ color: "#fff", fontWeight: 800, fontSize: 20 }}>✏️ {EDIT_STEPS[editStep]}</div>
          {/* Show route being edited */}
          <div style={{ color: "#93C5FD", fontSize: 13, marginTop: 4 }}>
            Editing: <strong style={{ color: "#fff" }}>{orig.from} → {orig.to}</strong>
          </div>
          <div style={{ height: 4, background: "rgba(255,255,255,.15)", borderRadius: 2, marginTop: 14, overflow: "hidden" }}>
            <div style={{ height: "100%", width: ((editStep + 1) / EDIT_STEPS.length * 100) + "%", background: "#F5A623", borderRadius: 2, transition: "width .3s" }} />
          </div>
        </div>

        {pendingThumbsUp && (
          <div style={{ background: "#FEF3C7", border: "1px solid #FDE68A", padding: "12px 20px", fontSize: 13, color: "#92400E", fontWeight: 600 }}>
            ✅ You acknowledged a comment by <strong>{pendingThumbsUp.commenterName}</strong>. Fix the route below — they'll earn +5 XP when you submit!
          </div>
        )}

        <div style={{ padding: "20px 20px" }}>
          {/* From/To shown as read-only */}
          <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 10, padding: "10px 14px", marginBottom: 20, display: "flex", gap: 12, alignItems: "center" }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#0A1F3D" }}>📍 {orig.from}</span>
            <span style={{ color: "#94A3B8" }}>→</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#0A1F3D" }}>🏁 {orig.to}</span>
            <span style={{ marginLeft: "auto", fontSize: 10, color: "#94A3B8", fontWeight: 600 }}>ROUTE LOCKED</span>
          </div>

          {/* EDIT STEP 0: Vehicle & Fares */}
          {editStep === 0 && (
            <div>
              <label style={lbl}>🚌 Vehicle type(s)</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8, marginBottom: 20 }}>
                {VEHICLES.map(v => <VehicleChip key={v.id} v={v} selected={editForm.vehicles.includes(v.id)} onToggle={toggleEditVehicle} />)}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
                <div><label style={lbl}>💰 Base fare (₦)</label><input style={inp} type="number" min="0" value={editForm.baseFare} onChange={e => setEF("baseFare", e.target.value)} /></div>
                <div><label style={lbl}>📈 Peak fare (₦)</label><input style={inp} type="number" min="0" value={editForm.peakFare} onChange={e => setEF("peakFare", e.target.value)} /></div>
                <div><label style={lbl}>📉 Off-peak (₦)</label><input style={inp} type="number" min="0" value={editForm.offPeakFare} onChange={e => setEF("offPeakFare", e.target.value)} /></div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, background: "#FFFBEB", borderRadius: 10, padding: "12px 14px" }}>
                <input type="checkbox" id="editNeg" checked={editForm.negotiable} onChange={e => setEF("negotiable", e.target.checked)} style={{ width: 18, height: 18, cursor: "pointer" }} />
                <label htmlFor="editNeg" style={{ fontSize: 14, color: "#92400E", fontWeight: 600, cursor: "pointer" }}>Fare is negotiable</label>
              </div>
              {editForm.negotiable && (
                <div style={{ marginBottom: 16 }}><label style={lbl}>💬 Negotiation tip</label><input style={inp} value={editForm.negotiateTip} onChange={e => setEF("negotiateTip", e.target.value)} /></div>
              )}
              <div style={{ marginBottom: 16 }}><label style={lbl}>🏛️ Known landmark</label><input style={inp} value={editForm.landmark} onChange={e => setEF("landmark", e.target.value)} /></div>
            </div>
          )}

          {/* EDIT STEP 1: Stops */}
          {editStep === 1 && (
            <div>
              {editForm.stops.map((stop, i) => (
                <StopRow key={i} stop={stop} idx={i} onChange={updateEditStop} onRemove={removeEditStop} canRemove={editForm.stops.length > 1} />
              ))}
              <button onClick={addEditStop} style={{ width: "100%", padding: "12px", background: "#EFF6FF", color: "#1D4ED8", fontWeight: 700, border: "2px dashed #BFDBFE", borderRadius: 10, cursor: "pointer", fontSize: 14 }}>+ Add Another Stop</button>
            </div>
          )}

          {/* EDIT STEP 2: Timing */}
          {editStep === 2 && (
            <div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                <div><label style={lbl}>📅 Day type</label><select style={inp} value={editForm.dayType} onChange={e => setEF("dayType", e.target.value)}><option value="">Select…</option>{DAYS.map(d => <option key={d} value={d}>{d}</option>)}</select></div>
                <div><label style={lbl}>🕐 Time of day</label><select style={inp} value={editForm.timeOfDay} onChange={e => setEF("timeOfDay", e.target.value)}><option value="">Select…</option>{TIMES.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={lbl}>🛣️ Road / vehicle condition</label>
                <select style={inp} value={editForm.condition} onChange={e => setEF("condition", e.target.value)}>
                  <option value="">Select if applicable…</option>
                  <option value="good">Good — smooth road, no traffic</option>
                  <option value="moderate">Moderate — some traffic, road OK</option>
                  <option value="heavy-traffic">Heavy traffic — go-slow most of route</option>
                  <option value="bad-road">Bad road — potholes, rough</option>
                  <option value="flooded">Flooded / impassable sections</option>
                  <option value="under-construction">Under construction</option>
                  <option value="vehicle-full">Vehicle usually very full/overloaded</option>
                </select>
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={lbl}>🛡️ Route security / safety hint</label>
                <select style={inp} value={editForm.securityHint} onChange={e => setEF("securityHint", e.target.value)}>
                  <option value="">Select if applicable…</option>
                  <option value="safe-anytime">Safe at all times</option>
                  <option value="caution-nights">Caution: Avoid late nights / dark hours</option>
                  <option value="caution-pickpockets">Caution: High pickpocket area</option>
                  <option value="caution-robbery">Caution: Frequent traffic robberies / one-chance risk</option>
                  <option value="high-risk">High Risk — travel with extreme caution</option>
                </select>
              </div>
              <div><label style={lbl}>📝 Any other notes</label><textarea style={{ ...inp, height: 80, resize: "vertical" }} value={editForm.notes} onChange={e => setEF("notes", e.target.value)} /></div>
            </div>
          )}

          {/* EDIT STEP 3: Alternatives */}
          {editStep === 3 && (
            <div>
              <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 12, padding: "12px 16px", marginBottom: 20, fontSize: 13, color: "#166534" }}>
                💡 You can update or add alternative routes below. Community alternatives added by others are preserved.
              </div>
              {editForm.alts.filter(a => !a.addedById || a.addedById === myUserId).map((alt, i) => (
                <AltRow key={i} alt={alt} idx={i} onChange={updateEditAlt} onRemove={removeEditAlt} mainFrom={orig.from} mainTo={orig.to} />
              ))}
              {editForm.alts.filter(a => a.addedById && a.addedById !== myUserId).length > 0 && (
                <div style={{ background: "#F0FDF4", borderRadius: 10, padding: "10px 14px", marginBottom: 10, fontSize: 12, color: "#166534" }}>
                  🔒 {editForm.alts.filter(a => a.addedById && a.addedById !== myUserId).length} community-added alternative{editForm.alts.filter(a => a.addedById && a.addedById !== myUserId).length > 1 ? "s" : ""} (cannot be edited here — they're from other contributors)
                </div>
              )}
              <button onClick={addEditAlt} style={{ width: "100%", padding: "13px", background: "#F0FDF4", color: "#166534", fontWeight: 700, border: "2px dashed #86EFAC", borderRadius: 12, cursor: "pointer", fontSize: 15 }}>🔀 Add Alternative Route</button>
            </div>
          )}

          {/* Navigation */}
          <div style={{ display: "grid", gridTemplateColumns: editStep > 0 ? "1fr 1fr" : "1fr", gap: 12, marginTop: 24 }}>
            {editStep > 0 && (
              <button onClick={() => setEditStep(s => s - 1)} style={{ padding: "14px", background: "#F1F5F9", color: "#475569", fontWeight: 700, border: "none", borderRadius: 12, cursor: "pointer", fontSize: 15 }}>← Back</button>
            )}
            {editStep < EDIT_STEPS.length - 1 ? (
              <button disabled={!canEditProceed()} onClick={() => setEditStep(s => s + 1)}
                style={{ padding: "14px", background: canEditProceed() ? "#F5A623" : "#E2E8F0", color: canEditProceed() ? "#fff" : "#94A3B8", fontWeight: 700, border: "none", borderRadius: 12, cursor: canEditProceed() ? "pointer" : "not-allowed" }}>
                {EDIT_STEPS[editStep + 1]} →
              </button>
            ) : (
              <button disabled={submitting} onClick={submitEdit}
                style={{ padding: "14px", background: submitting ? "#64748B" : "#166534", color: "#fff", fontWeight: 700, border: "none", borderRadius: 12, cursor: submitting ? "not-allowed" : "pointer" }}>
                {submitting ? "⌛ Saving…" : "✅ Save Changes"}
              </button>
            )}
          </div>
        </div>
        {toast && <Toast msg={toast.msg} type={toast.type} />}
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // ── LEARN MORE / GUIDE ────────────────────────────────────────────────────
  // ──────────────────────────────────────────────────────────────────────────
  if (screen === "learnMore") {
    return (
      <div style={{ fontFamily: "'Segoe UI', system-ui, sans-serif", maxWidth: 680, margin: "0 auto", padding: "0 0 60px", color: "#1E293B" }}>
        <div style={{ background: "linear-gradient(135deg, #475569, #334155)", padding: "24px 20px 20px" }}>
          <button onClick={() => setScreen("home")} style={{ background: "rgba(255,255,255,.15)", border: "none", color: "#fff", fontWeight: 700, padding: "8px 16px", borderRadius: 999, cursor: "pointer", marginBottom: 16 }}>← Back</button>
          <div style={{ color: "#fff", fontWeight: 900, fontSize: 24 }}>📖 Welcome to the Challenge</div>
          <div style={{ color: "#CBD5E1", fontSize: 13, marginTop: 4 }}>How to participate, log routes, and earn points</div>
        </div>
        <div style={{ padding: "20px 20px", lineHeight: 1.6 }}>
          {/* Hiding the 'What is the Challenge?' section for now - can toggle back on later
          <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 14, padding: "16px 18px", marginBottom: 24 }}>
            <h3 style={{ margin: "0 0 8px 0", color: "#1E40AF", fontWeight: 800, fontSize: 16 }}>🗺️ What is the Challenge?</h3>
            <p style={{ margin: 0, fontSize: 14 }}>
              Lagos transit can be chaotic. Fares fluctuate, routes change, and alternative options aren't always clear. The <strong>Jùrù Ányá Technologies Router Data Collection Challenge</strong> is a crowdsourced initiative to build a comprehensive, high-quality, and up-to-date transit database for Lagos.
            </p>
          </div>
          */}

          <h3 style={{ borderBottom: "2px solid #E2E8F0", paddingBottom: 6, color: "#0F172A", fontWeight: 800, fontSize: 17 }}>📋 How to Participate & Submit Routes</h3>
          <div style={{ fontSize: 14, marginBottom: 24 }}>
            <p>{/* To ensure the data is useful, */}entries must follow a structured format:</p>
            <ul style={{ paddingLeft: 20 }}>
              <li style={{ marginBottom: 10 }}><strong>Step 1: Route & Vehicle Details</strong>: Select origin and destination from our list of major Lagos hubs (e.g. Oshodi, VI, Ikeja). Select all transit modes used (Danfo, BRT, Keke, etc.), and provide standard base, peak, and off-peak fares.</li>
              <li style={{ marginBottom: 10 }}><strong>Step 2: Stops & Fares</strong>: Add major bus stops in sequence. Input the boarding fare from each stop to the destination to help commuters pay correctly mid-way.</li>
              <li style={{ marginBottom: 10 }}><strong>Step 3: Timing & Road Conditions</strong>: Tell us when you traveled (weekday/weekend, rush hour) and the road/vehicle quality (potholes, traffic).</li>
              <li style={{ marginBottom: 10 }}><strong>Step 4: Alternatives</strong>: Document alternative vehicle types or paths for the same route to earn bonus XP.</li>
            </ul>
          </div>

          <h3 style={{ borderBottom: "2px solid #E2E8F0", paddingBottom: 6, color: "#0F172A", fontWeight: 800, fontSize: 17 }}>⚡ XP & Point Calculations</h3>
          <div style={{ fontSize: 14, marginBottom: 24 }}>
            <p>Every action you take earns you Experience Points (XP):</p>
            
            <h4 style={{ margin: "14px 0 6px", fontWeight: 700, fontSize: 15 }}>Base Points</h4>
            <ul style={{ paddingLeft: 20 }}>
              <li><strong>Complete route entry</strong>: <span style={{ background: "#DCFCE7", color: "#166534", fontWeight: 700, padding: "2px 6px", borderRadius: 4 }}>+120 XP</span></li>
              <li><strong>Include peak fare</strong>: <span style={{ background: "#DCFCE7", color: "#166534", fontWeight: 700, padding: "2px 6px", borderRadius: 4 }}>+20 XP</span></li>
              <li><strong>Complete road/vehicle condition</strong>: <span style={{ background: "#DCFCE7", color: "#166534", fontWeight: 700, padding: "2px 6px", borderRadius: 4 }}>+15 XP</span></li>
              <li><strong>Add alternative route (as owner)</strong>: <span style={{ background: "#DCFCE7", color: "#166534", fontWeight: 700, padding: "2px 6px", borderRadius: 4 }}>+40 XP each</span></li>
            </ul>

            <h4 style={{ margin: "18px 0 6px", fontWeight: 700, fontSize: 15 }}>Massive Boosters 🚀</h4>
            <ul style={{ paddingLeft: 20 }}>
              <li style={{ marginBottom: 10 }}>
                <strong>Community Alternatives Booster</strong>: Suggest an alternative on another contributor's route to earn a flat bonus!
                <div style={{ background: "#F8FAFC", padding: "8px 12px", borderRadius: 8, marginTop: 4 }}>
                  Award: <span style={{ color: "#E87722", fontWeight: 700 }}>+215 XP</span>
                </div>
              </li>
              <li style={{ marginBottom: 10 }}>
                <strong>5-Second Speed Boost Window</strong>: A site-wide cyclic timer runs continuously. Every minute, between :00 and :05 seconds, a 5-second speed boost button activates. Click it to earn a flat bonus!
                <div style={{ background: "#F8FAFC", padding: "8px 12px", borderRadius: 8, marginTop: 4 }}>
                  Award: <span style={{ color: "#E87722", fontWeight: 700 }}>+316 XP</span> (requires a route submission in the current session)
                </div>
              </li>
              <li style={{ marginBottom: 10 }}>
                <strong>Daily 50-Routes Challenge Booster</strong>: Complete 50 routes within a 24-hour cycle to unlock a 2× daily booster!
                <div style={{ background: "#F8FAFC", padding: "8px 12px", borderRadius: 8, marginTop: 4 }}>
                  Award: <span style={{ color: "#10B981", fontWeight: 700 }}>2× multiplier</span> (doubles your total XP, then refreshes progress to 0/50)
                </div>
              </li>
            </ul>

            <h4 style={{ margin: "18px 0 6px", fontWeight: 700, fontSize: 15 }}>Accuracy Reviews</h4>
            <ul style={{ paddingLeft: 20 }}>
              <li><strong>Owner approves your comment (👍)</strong>: Commenter gets <span style={{ color: "#166534", fontWeight: 700 }}>+5 XP</span>, Owner gets <span style={{ color: "#166534", fontWeight: 700 }}>+1 XP</span></li>
              <li><strong>Owner dismisses your comment (👎)</strong>: Commenter gets <span style={{ color: "#166534", fontWeight: 700 }}>+1 XP</span></li>
            </ul>
          </div>

          <h3 style={{ borderBottom: "2px solid #E2E8F0", paddingBottom: 6, color: "#0F172A", fontWeight: 800, fontSize: 17 }}>🏆 Levels & Ranks</h3>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14, marginBottom: 24, textAlign: "left" }}>
            <thead>
              <tr style={{ background: "#F8FAFC", borderBottom: "2px solid #E2E8F0" }}>
                <th style={{ padding: 8 }}>Level</th>
                <th style={{ padding: 8 }}>Rank Title</th>
                <th style={{ padding: 8 }}>XP Threshold</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: "1px solid #E2E8F0" }}><td style={{ padding: 8 }}>1</td><td style={{ padding: 8 }}>🟢 Commuter Rookie</td><td style={{ padding: 8 }}>0 – 199 XP</td></tr>
              <tr style={{ borderBottom: "1px solid #E2E8F0" }}><td style={{ padding: 8 }}>2</td><td style={{ padding: 8 }}>🔵 Bus Stop Scout</td><td style={{ padding: 8 }}>200 – 499 XP</td></tr>
              <tr style={{ borderBottom: "1px solid #E2E8F0" }}><td style={{ padding: 8 }}>3</td><td style={{ padding: 8 }}>🟡 Route Explorer</td><td style={{ padding: 8 }}>500 – 999 XP</td></tr>
              <tr style={{ borderBottom: "1px solid #E2E8F0" }}><td style={{ padding: 8 }}>4</td><td style={{ padding: 8 }}>🟠 Danfo Detective</td><td style={{ padding: 8 }}>1,000 – 1,999 XP</td></tr>
              <tr style={{ borderBottom: "1px solid #E2E8F0" }}><td style={{ padding: 8 }}>5</td><td style={{ padding: 8 }}>🔴 Lagos Navigator</td><td style={{ padding: 8 }}>2,000 – 3,499 XP</td></tr>
              <tr style={{ borderBottom: "1px solid #E2E8F0" }}><td style={{ padding: 8 }}>6</td><td style={{ padding: 8 }}>🔥 Transport Legend</td><td style={{ padding: 8 }}>3,500+ XP</td></tr>
            </tbody>
          </table>

          <h3 style={{ borderBottom: "2px solid #E2E8F0", paddingBottom: 6, color: "#0F172A", fontWeight: 800, fontSize: 17 }}>🎁 Milestones & Rewards</h3>
          <div style={{ fontSize: 14 }}>
            <ul style={{ listStyleType: "none", padding: 0 }}>
              <li style={{ padding: "8px 0", borderBottom: "1px solid #F1F5F9" }}>🐊 <strong>50,000 XP</strong>: Pair of Crocs</li>
              <li style={{ padding: "8px 0", borderBottom: "1px solid #F1F5F9" }}>👓 <strong>100,000 XP</strong>: Photochromic Eyeglasses</li>
              <li style={{ padding: "8px 0", borderBottom: "1px solid #F1F5F9" }}>🎧 <strong>250,000 XP</strong>: Oraimo BoomPop Pro ANC</li>
              <li style={{ padding: "8px 0", borderBottom: "1px solid #F1F5F9" }}>📱 <strong>1,000,000 XP</strong>: Apple iPhone 13 Pro</li>
              <li style={{ padding: "8px 0", borderBottom: "1px solid #F1F5F9" }}>💻 <strong>1,500,000 XP</strong>: Apple MacBook Pro</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // ── FORM (New Route) ──────────────────────────────────────────────────────
  // ──────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ fontFamily: "'Segoe UI', system-ui, sans-serif", maxWidth: 680, margin: "0 auto", padding: "0 0 60px" }}>
      <datalist id="areas-list">{AREAS.map(a => <option key={a} value={a} />)}</datalist>
      <div style={{ background: "linear-gradient(135deg, #0A1F3D, #1A3A6C)", padding: "20px 20px 16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <button onClick={() => { setScreen("home"); setStep(0); setForm(emptyForm()); }} style={{ background: "rgba(255,255,255,.15)", border: "none", color: "#fff", fontWeight: 700, padding: "7px 14px", borderRadius: 999, cursor: "pointer", fontSize: 12 }}>← Back</button>
          <div style={{ background: "#F5A623", color: "#fff", fontWeight: 800, fontSize: 12, borderRadius: 999, padding: "5px 14px" }}>Step {step + 1} of {STEPS.length}</div>
        </div>
        <div style={{ color: "#fff", fontWeight: 800, fontSize: 20 }}>🗺️ {STEPS[step]}</div>
        <div style={{ height: 4, background: "rgba(255,255,255,.15)", borderRadius: 2, marginTop: 14, overflow: "hidden" }}>
          <div style={{ height: "100%", width: ((step + 1) / STEPS.length * 100) + "%", background: "#F5A623", borderRadius: 2, transition: "width .3s" }} />
        </div>
      </div>

      <div style={{ padding: "20px 20px" }}>
        {step === 0 && (
          <div>
            <div style={{ background: "#EFF6FF", borderRadius: 12, padding: "12px 16px", marginBottom: 20, fontSize: 13, color: "#1D4ED8" }}>
              💡 Fill in where this route starts and ends, then select every type of vehicle that serves this route.
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
              <div><label style={lbl}>📍 From (origin)</label><input style={inp} placeholder="e.g. Oshodi" value={form.from} onChange={e => setF("from", e.target.value)} list="areas-list" /></div>
              <div><label style={lbl}>🏁 To (destination)</label><input style={inp} placeholder="e.g. Victoria Island" value={form.to} onChange={e => setF("to", e.target.value)} list="areas-list" /></div>
            </div>
            <label style={lbl}>🚌 Vehicle type(s) — select all that apply</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8, marginBottom: 20 }}>
              {VEHICLES.map(v => <VehicleChip key={v.id} v={v} selected={form.vehicles.includes(v.id)} onToggle={toggleVehicle} />)}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
              <div><label style={lbl}>💰 Base fare (₦)</label><input style={inp} type="number" min="0" placeholder="300" value={form.baseFare} onChange={e => setF("baseFare", e.target.value)} /></div>
              <div><label style={lbl}>📈 Peak fare (₦) <span style={{ background: "#DCFCE7", color: "#166534", fontWeight: 700, fontSize: 9, borderRadius: 4, padding: "1px 5px" }}>+{BONUS.peak} XP</span></label><input style={inp} type="number" min="0" placeholder="500" value={form.peakFare} onChange={e => setF("peakFare", e.target.value)} /></div>
              <div><label style={lbl}>📉 Off-peak (₦)</label><input style={inp} type="number" min="0" placeholder="250" value={form.offPeakFare} onChange={e => setF("offPeakFare", e.target.value)} /></div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, background: "#FFFBEB", borderRadius: 10, padding: "12px 14px" }}>
              <input type="checkbox" id="neg" checked={form.negotiable} onChange={e => setF("negotiable", e.target.checked)} style={{ width: 18, height: 18, cursor: "pointer" }} />
              <label htmlFor="neg" style={{ fontSize: 14, color: "#92400E", fontWeight: 600, cursor: "pointer" }}>Fare is negotiable with driver/conductor</label>
            </div>
            {form.negotiable && <div style={{ marginBottom: 16 }}><label style={lbl}>💬 Negotiation tip</label><input style={inp} placeholder='e.g. "Best you can get is ₦400"' value={form.negotiateTip} onChange={e => setF("negotiateTip", e.target.value)} /></div>}
            <div style={{ marginBottom: 16 }}><label style={lbl}>🏛️ Known landmark at origin</label><input style={inp} placeholder='e.g. "Beside First Bank, under the bridge"' value={form.landmark} onChange={e => setF("landmark", e.target.value)} /></div>
          </div>
        )}

        {step === 1 && (
          <div>
            <div style={{ background: "#EFF6FF", borderRadius: 12, padding: "12px 16px", marginBottom: 20, fontSize: 13, color: "#1D4ED8" }}>
              💡 Add every bus stop in order. Include the boarding fare at each stop.
            </div>
            {form.stops.map((stop, i) => <StopRow key={i} stop={stop} idx={i} onChange={updateStop} onRemove={removeStop} canRemove={form.stops.length > 1} />)}
            <button onClick={addStop} style={{ width: "100%", padding: "12px", background: "#EFF6FF", color: "#1D4ED8", fontWeight: 700, border: "2px dashed #BFDBFE", borderRadius: 10, cursor: "pointer", fontSize: 14, marginBottom: 20 }}>+ Add Another Stop</button>
          </div>
        )}

        {step === 2 && (
          <div>
            <div style={{ background: "#EFF6FF", borderRadius: 12, padding: "12px 16px", marginBottom: 20, fontSize: 13, color: "#1D4ED8" }}>
              💡 When did you travel this route? This helps verify fares under different conditions.
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
              <div><label style={lbl}>📅 Day type</label><select style={inp} value={form.dayType} onChange={e => setF("dayType", e.target.value)}><option value="">Select…</option>{DAYS.map(d => <option key={d} value={d}>{d}</option>)}</select></div>
              <div><label style={lbl}>🕐 Time of day</label><select style={inp} value={form.timeOfDay} onChange={e => setF("timeOfDay", e.target.value)}><option value="">Select…</option>{TIMES.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={lbl}>🛣️ Road / vehicle condition <span style={{ background: "#DCFCE7", color: "#166534", fontWeight: 700, fontSize: 9, borderRadius: 4, padding: "1px 5px" }}>+{BONUS.condition} XP</span></label>
              <select style={inp} value={form.condition} onChange={e => setF("condition", e.target.value)}>
                <option value="">Select if applicable…</option>
                <option value="good">Good — smooth road, no traffic</option>
                <option value="moderate">Moderate — some traffic, road OK</option>
                <option value="heavy-traffic">Heavy traffic — go-slow most of route</option>
                <option value="bad-road">Bad road — potholes, rough</option>
                <option value="flooded">Flooded / impassable sections</option>
                <option value="under-construction">Under construction</option>
                <option value="vehicle-full">Vehicle usually very full/overloaded</option>
              </select>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={lbl}>🛡️ Route security / safety hint</label>
              <select style={inp} value={form.securityHint} onChange={e => setF("securityHint", e.target.value)}>
                <option value="">Select if applicable…</option>
                <option value="safe-anytime">Safe at all times</option>
                <option value="caution-nights">Caution: Avoid late nights / dark hours</option>
                <option value="caution-pickpockets">Caution: High pickpocket area</option>
                <option value="caution-robbery">Caution: Frequent traffic robberies / one-chance risk</option>
                <option value="high-risk">High Risk — travel with extreme caution</option>
              </select>
            </div>
            <div><label style={lbl}>📝 Any other notes</label><textarea style={{ ...inp, height: 80, resize: "vertical" }} placeholder="e.g. Danfo only runs in the morning. After 7pm, take keke." value={form.notes} onChange={e => setF("notes", e.target.value)} /></div>
          </div>
        )}

        {step === 3 && (
          <div>
            <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 12, padding: "12px 16px", marginBottom: 20, fontSize: 13, color: "#166534" }}>
              💡 Know a different vehicle or route that also goes from <strong>{form.from}</strong> to <strong>{form.to}</strong>? Add it here! Each alternative earns <strong>+{BONUS.alt} XP</strong>.
            </div>
            {form.alts.length === 0 && (
              <div style={{ textAlign: "center", padding: "28px 20px", color: "#94A3B8" }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>🔀</div>
                <div style={{ fontWeight: 600 }}>No alternatives added yet</div>
                <div style={{ fontSize: 13, marginTop: 4 }}>Optional — skip if there's only one way to travel this route</div>
              </div>
            )}
            {form.alts.map((alt, i) => <AltRow key={i} alt={alt} idx={i} onChange={updateAlt} onRemove={removeAlt} mainFrom={form.from} mainTo={form.to} />)}
            <button onClick={addAlt} style={{ width: "100%", padding: "13px", background: "#F0FDF4", color: "#166534", fontWeight: 700, border: "2px dashed #86EFAC", borderRadius: 12, cursor: "pointer", fontSize: 15, marginBottom: 24 }}>🔀 Add Alternative Route / Vehicle</button>

            {/* Summary */}
            <div style={{ background: "#0A1F3D", borderRadius: 14, padding: "18px 20px", color: "#fff" }}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12, color: "#93C5FD" }}>📋 Entry Summary</div>
              <div style={{ fontSize: 13, lineHeight: 2, color: "#E2E8F0" }}>
                <div>📍 <strong>{form.from}</strong> → <strong>{form.to}</strong></div>
                <div>🚌 {form.vehicles.map(vid => { const v = VEHICLES.find(x => x.id === vid); return v ? `${v.emoji} ${v.label}` : vid; }).join(", ") || "—"}</div>
                <div>💰 Base: {form.baseFare ? fmt(form.baseFare) : "—"}{form.peakFare ? ` · Peak: ${fmt(form.peakFare)}` : ""}</div>
                <div>🚏 {form.stops.filter(s => s.name).length} stop{form.stops.filter(s => s.name).length !== 1 ? "s" : ""} logged</div>
                {form.alts.length > 0 && <div>🔀 {form.alts.length} alternative{form.alts.length > 1 ? "s" : ""}</div>}
              </div>
              <div style={{ marginTop: 14, background: "rgba(255,255,255,.1)", borderRadius: 10, padding: "12px 14px" }}>
                <div style={{ fontSize: 12, color: "#93C5FD", marginBottom: 6 }}>XP you'll earn:</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {[
                    { label: "Base entry", pts: XP_PER_ENTRY, show: true },
                    { label: "Alternatives", pts: BONUS.alt * form.alts.length, show: form.alts.length > 0 },
                    { label: "Peak fare", pts: BONUS.peak, show: !!form.peakFare },
                    { label: "Conditions", pts: BONUS.condition, show: !!form.condition },
                  ].filter(x => x.show).map(x => (
                    <div key={x.label} style={{ background: "#F5A623", color: "#fff", fontWeight: 700, fontSize: 12, borderRadius: 6, padding: "4px 10px" }}>+{x.pts} {x.label}</div>
                  ))}
                </div>
                <div style={{ marginTop: 10, fontWeight: 900, fontSize: 20, color: "#F5A623" }}>
                  Total: +{XP_PER_ENTRY + (form.alts.length > 0 ? BONUS.alt * form.alts.length : 0) + (form.peakFare ? BONUS.peak : 0) + (form.condition ? BONUS.condition : 0)} XP
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div style={{ display: "grid", gridTemplateColumns: step > 0 ? "1fr 1fr" : "1fr", gap: 12, marginTop: 24 }}>
          {step > 0 && <button onClick={() => setStep(s => s - 1)} style={{ padding: "14px", background: "#F1F5F9", color: "#475569", fontWeight: 700, border: "none", borderRadius: 12, cursor: "pointer", fontSize: 15 }}>← Back</button>}
          {step < STEPS.length - 1 ? (
            <button disabled={!canProceed()} onClick={() => setStep(s => s + 1)}
              style={{ padding: "14px", background: canProceed() ? "#F5A623" : "#E2E8F0", color: canProceed() ? "#fff" : "#94A3B8", fontWeight: 700, border: "none", borderRadius: 12, cursor: canProceed() ? "pointer" : "not-allowed" }}>
              {STEPS[step + 1]} →
            </button>
          ) : (
            <button disabled={!canProceed() || submitting} onClick={submit}
              style={{ padding: "14px", background: submitting ? "#64748B" : "#166534", color: "#fff", fontWeight: 700, border: "none", borderRadius: 12, cursor: submitting ? "not-allowed" : "pointer" }}>
              {submitting ? "⌛ Submitting..." : "✅ Submit & Earn XP"}
            </button>
          )}
        </div>
      </div>
      {toast && <Toast msg={toast.msg} type={toast.type} />}
    </div>
  );
}

function Toast({ msg, type }) {
  const bg  = type === "warn" ? "#FEF9C3" : "#DCFCE7";
  const col = type === "warn" ? "#92400E" : "#166534";
  return (
    <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", background: bg, color: col, fontWeight: 700, fontSize: 14, padding: "12px 24px", borderRadius: 999, boxShadow: "0 4px 20px rgba(0,0,0,0.15)", zIndex: 9999, whiteSpace: "nowrap", maxWidth: "90vw", textAlign: "center" }}>
      {msg}
    </div>
  );
}
