import { useState, useEffect, useCallback } from "react";
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

// ── Helpers ──────────────────────────────────────────────────────────────────
const VEHICLES = [
  { id: "danfo",   label: "Danfo",      emoji: "🚌", color: "#F5A623" },
  { id: "brt",     label: "BRT",        emoji: "🚍", color: "#1A6B3C" },
  { id: "keke",    label: "Keke",       emoji: "🛺", color: "#E84D3C" },
  { id: "korope",  label: "Korope",     emoji: "🚐", color: "#8B5CF6" },
  { id: "okada",   label: "Okada",      emoji: "🏍️", color: "#F97316" },
  { id: "ferry",   label: "Ferry",      emoji: "⛴️", color: "#0EA5E9" },
  { id: "train",   label: "Train",      emoji: "🚂", color: "#64748B" },
  { id: "sienna",  label: "Sienna Cab", emoji: "🚗", color: "#7C3AED" },
  { id: "hitch",   label: "Hitch a Ride", emoji: "🤙", color: "#10B981" },
];

const AREAS = ["Oshodi","VI","Lekki","Ajah","Ikeja","Yaba","Surulere","CMS/TBS","Ojota","Ketu","Maryland","Mile 2","Apapa","Ikorodu","Berger","Agege","Mushin","Ojuelegba","Festac","Alaba","Sangotedo","Badore","Epe","Okokomaiko","Ipaja","Egbeda","Abule Egba","Iyana Ipaja","Orile","Eko Atlantic"];
const TIMES  = ["Early Morning (5–7am)","Morning Rush (7–9am)","Mid Morning (9–11am)","Afternoon (11am–2pm)","Mid Afternoon (2–4pm)","Evening Rush (4–7pm)","Evening (7–9pm)","Night (9pm+)"];
const DAYS   = ["Weekday (Mon–Fri)","Saturday","Sunday","Public Holiday"];
const XP_PER_ENTRY = 120;
const BONUS = { alt: 40, peak: 20, condition: 15 };

const REWARDS = [
  {
    id: "macbook",
    title: "Apple MacBook Pro",
    xp: 1500000,
    img: macbookImg,
    desc: "Supercharged for pro workflows. High-performance M-series chip with stunning Liquid Retina XDR display."
  },
  {
    id: "iphone",
    title: "Apple iPhone 13 Pro",
    xp: 1000000,
    img: iphoneImg,
    desc: "Pro camera system with Telephoto, Wide, and Ultra Wide cameras. Super Retina XDR display with ProMotion."
  },
  {
    id: "oraimo",
    title: "Oraimo BoomPop Pro",
    xp: 250000,
    img: oraimoImg,
    desc: "Active Noise Cancelling over-ear headphones. Immersive sound, extra bass, and up to 40 hours of playtime."
  },
  {
    id: "glasses",
    title: "Photochromic Eyeglasses",
    xp: 100000,
    img: glassesImg,
    desc: "Intelligent photochromism. Lenses automatically darken in direct sunlight and become transparent indoors."
  },
  {
    id: "crocs",
    title: "Pair of Crocs",
    xp: 50000,
    img: crocsImg,
    desc: "Lightweight, water-friendly, and buoyant. Iconic Crocs Comfort for everyday commuting convenience."
  }
];

function xpToLevel(xp) {
  if (xp < 200) return { n: 1, title: "Commuter Rookie",    next: 200  };
  if (xp < 500) return { n: 2, title: "Bus Stop Scout",     next: 500  };
  if (xp < 1000)return { n: 3, title: "Route Explorer",     next: 1000 };
  if (xp < 2000)return { n: 4, title: "Danfo Detective",    next: 2000 };
  if (xp < 3500)return { n: 5, title: "Lagos Navigator",    next: 3500 };
  return              { n: 6, title: "Transport Legend",     next: 5000 };
}

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
function fmt(n) { return `₦${Number(n).toLocaleString()}`; }

// ── Sub-components ─────────────────────────────────────────────────────────
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
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0, paddingTop: 10 }}>
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
          <label style={lbl}>Notes (optional — e.g. "only at rush hour")</label>
          <input style={inp} placeholder="Any extra info about this stop" value={stop.note} onChange={e => onChange(idx, "note", e.target.value)} />
        </div>
      </div>
      {canRemove && (
        <button onClick={() => onRemove(idx)} style={{ marginTop: 8, background: "none", border: "none", cursor: "pointer", color: "#CBD5E0", fontSize: 18, padding: "4px 0" }}>✕</button>
      )}
    </div>
  );
}

function AltRow({ alt, idx, onChange, onRemove, mainFrom, mainTo }) {
  const toggleAltVehicle = (vid) => {
    const list = alt.vehicles || [];
    const newList = list.includes(vid) ? list.filter(x => x !== vid) : [...list, vid];
    onChange(idx, "vehicles", newList);
  };

  function addAltStop() {
    const stops = [...(alt.stops || [])];
    stops.push({ name: "", fare: "", note: "" });
    onChange(idx, "stops", stops);
  }
  function removeAltStop(si) {
    const stops = (alt.stops || []).filter((_, j) => j !== si);
    onChange(idx, "stops", stops);
  }
  function updateAltStop(si, k, v) {
    const stops = [...(alt.stops || [])];
    stops[si] = { ...stops[si], [k]: v };
    onChange(idx, "stops", stops);
  }

  const altStops = alt.stops || [];

  return (
    <div style={{ background: "#F0FDF4", border: "1px dashed #86EFAC", borderRadius: 12, padding: "14px 16px", marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <span style={{ fontWeight: 700, fontSize: 13, color: "#166534" }}>🔀 Alternative Route {idx + 1}</span>
        <button onClick={() => onRemove(idx)} style={{ background: "none", border: "none", cursor: "pointer", color: "#86EFAC", fontSize: 16 }}>✕</button>
      </div>

      {/* Origin / Destination — may differ from main route */}
      <div style={{ background: "rgba(255,255,255,0.6)", borderRadius: 8, padding: "10px 12px", marginBottom: 12, fontSize: 12, color: "#166534" }}>
        ℹ️ This can be an entirely different path and vehicle — as long as it travels from <strong>{mainFrom || "origin"}</strong> to <strong>{mainTo || "destination"}</strong>.
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
        <div>
          <label style={lbl}>📍 Alt. starting point</label>
          <input style={inp} list="areas-list" placeholder={mainFrom || "Same as main"} value={alt.from || ""} onChange={e => onChange(idx, "from", e.target.value)} />
        </div>
        <div>
          <label style={lbl}>🏁 Alt. end point</label>
          <input style={inp} list="areas-list" placeholder={mainTo || "Same as main"} value={alt.to || ""} onChange={e => onChange(idx, "to", e.target.value)} />
        </div>
      </div>

      <label style={lbl}>🚌 Vehicle type(s) — select all that apply</label>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 6, marginBottom: 14 }}>
        {VEHICLES.map(v => (
          <VehicleChip
            key={v.id}
            v={v}
            selected={(alt.vehicles || []).includes(v.id)}
            onToggle={toggleAltVehicle}
          />
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
        <div>
          <label style={lbl}>Base fare (₦)</label>
          <input style={inp} type="number" min="0" placeholder="e.g. 400" value={alt.fare} onChange={e => onChange(idx, "fare", e.target.value)} />
        </div>
        <div>
          <label style={lbl}>Peak fare (₦)</label>
          <input style={inp} type="number" min="0" placeholder="e.g. 600" value={alt.peakFare} onChange={e => onChange(idx, "peakFare", e.target.value)} />
        </div>
        <div>
          <label style={lbl}>Off-peak fare (₦)</label>
          <input style={inp} type="number" min="0" placeholder="e.g. 300" value={alt.offPeakFare} onChange={e => onChange(idx, "offPeakFare", e.target.value)} />
        </div>
      </div>

      {/* Stops along this alternate route */}
      <div style={{ marginBottom: 10 }}>
        <label style={{ ...lbl, marginBottom: 8 }}>🚏 Stops along this alternate route</label>
        {altStops.length === 0 && (
          <div style={{ fontSize: 12, color: "#4ADE80", marginBottom: 8, fontStyle: "italic" }}>No stops added yet — tap below to add</div>
        )}
        {altStops.map((stop, si) => (
          <div key={si} style={{ display: "flex", gap: 6, alignItems: "flex-start", marginBottom: 8 }}>
            <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#16A34A", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 11, flexShrink: 0, marginTop: 9 }}>{si + 1}</div>
            <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              <div>
                <label style={lbl}>Stop name</label>
                <input style={inp} placeholder="e.g. Ojota Bus Stop" value={stop.name} onChange={e => updateAltStop(si, "name", e.target.value)} list="areas-list" />
              </div>
              <div>
                <label style={lbl}>Fare from here (₦)</label>
                <input style={inp} type="number" min="0" placeholder="e.g. 200" value={stop.fare} onChange={e => updateAltStop(si, "fare", e.target.value)} />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={lbl}>Notes (optional)</label>
                <input style={inp} placeholder="e.g. only available in the morning" value={stop.note} onChange={e => updateAltStop(si, "note", e.target.value)} />
              </div>
            </div>
            {altStops.length > 1 && (
              <button onClick={() => removeAltStop(si)} style={{ marginTop: 8, background: "none", border: "none", cursor: "pointer", color: "#86EFAC", fontSize: 16, padding: "4px 0" }}>✕</button>
            )}
          </div>
        ))}
        <button onClick={addAltStop} style={{ width: "100%", padding: "8px", background: "rgba(255,255,255,0.5)", color: "#166534", fontWeight: 700, border: "1px dashed #86EFAC", borderRadius: 8, cursor: "pointer", fontSize: 12, marginTop: 4 }}>
          + Add Stop to This Alternate Route
        </button>
      </div>

      <div style={{ marginTop: 8 }}>
        <label style={lbl}>📝 Via / notes about this route</label>
        <input style={inp} placeholder="e.g. goes via Oshodi Expressway, faster but pricier" value={alt.note} onChange={e => onChange(idx, "note", e.target.value)} />
      </div>
    </div>
  );
}

const lbl = { display: "block", fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 };
const inp = { width: "100%", boxSizing: "border-box", padding: "9px 12px", borderRadius: 8, border: "1.5px solid #E2E8F0", fontSize: 14, color: "#1E293B", background: "#fff", outline: "none", fontFamily: "inherit" };

function CountdownWidget({ light }) {
  const targetDate = "2026-09-30T23:59:59";
  const calculateTimeLeft = () => {
    const diff = +new Date(targetDate) - +new Date();
    if (diff <= 0) return { months: 0, weeks: 0, days: 0, hours: 0, minutes: 0, seconds: 0 };

    const totalSecs = Math.floor(diff / 1000);
    const totalMins = Math.floor(totalSecs / 60);
    const totalHrs = Math.floor(totalMins / 60);
    const totalDays = Math.floor(totalHrs / 24);

    const m = Math.floor(totalDays / 30);
    const remDays = totalDays % 30;
    const w = Math.floor(remDays / 7);
    const d = remDays % 7;

    return {
      months: m,
      weeks: w,
      days: d,
      hours: totalHrs % 24,
      minutes: totalMins % 60,
      seconds: totalSecs % 60
    };
  };

  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const items = [
    { label: "Months", val: timeLeft.months },
    { label: "Weeks",  val: timeLeft.weeks },
    { label: "Days",   val: timeLeft.days },
    { label: "Hours",  val: timeLeft.hours },
    { label: "Mins",   val: timeLeft.minutes },
    { label: "Secs",   val: timeLeft.seconds }
  ];

  const boxBg = light ? "rgba(0, 0, 0, 0.05)" : "rgba(255, 255, 255, 0.15)";
  const labelColor = light ? "#475569" : "#93C5FD";
  const numColor = light ? "#E87722" : "#F5A623";
  const borderColor = light ? "rgba(0, 0, 0, 0.05)" : "rgba(255, 255, 255, 0.05)";

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 6, marginTop: 14 }}>
      {items.map(x => (
        <div key={x.label} style={{ background: boxBg, borderRadius: 10, padding: "8px 4px", textAlign: "center", border: `1px solid ${borderColor}` }}>
          <div style={{ fontSize: 16, fontWeight: 950, color: numColor, lineHeight: 1.1 }}>{String(x.val).padStart(2, "0")}</div>
          <div style={{ fontSize: 8, color: labelColor, fontWeight: 700, textTransform: "uppercase", marginTop: 2 }}>{x.label}</div>
        </div>
      ))}
    </div>
  );
}

// ── MAIN APP ──────────────────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen]       = useState("home"); // home | form | leaderboard | success
  const [entries, setEntries]     = useState([]);
  const [myXP, setMyXP]           = useState(0);
  const [myStreak, setMyStreak]   = useState(0);
  const [myName, setMyName]       = useState("");
  const [myUserId, setMyUserId]   = useState("");
  const [nameInput, setNameInput] = useState("");
  const [lastEntry, setLastEntry] = useState(null);
  const [loading, setLoading]     = useState(true);
  const [toast, setToast]         = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // ── Load saved state ──────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      let savedEntries = [];
      const saved = await loadData("router:state");
      let currentUserId = "";
      let currentName = "";
      if (saved) {
        savedEntries = saved.entries || [];
        setMyXP(saved.myXP || 0);
        setMyStreak(saved.myStreak || 0);
        currentName = saved.myName || "";
        setMyName(currentName);
        currentUserId = saved.myUserId || "";
        setMyUserId(currentUserId);
      }
      // If user has a name but no userId, generate and persist it
      if (saved && saved.myName && !saved.myUserId) {
        currentUserId = uid();
        setMyUserId(currentUserId);
        await saveData("router:state", { ...saved, myUserId: currentUserId });
      }
      try {
        // doGet on the Apps Script handles all GET requests — no ?action=get needed
        const fetchUrl = GOOGLE_SHEETS_URL || "/api/entries";
        const res = await fetch(fetchUrl);
        if (res.ok) {
          const json = await res.json();
          // Apps Script doGet returns a plain JSON array
          const serverEntries = Array.isArray(json) ? json : (json.data || json.entries || []);
          if (serverEntries.length > 0) {
            setEntries(serverEntries);
            
            // Recalculate myXP/Streak from server entries based on name (case-insensitive)
            if (currentName) {
              const myNameClean = currentName.trim().toLowerCase();
              let calculatedXP = 0;
              let calculatedStreak = 0;
              serverEntries.forEach(e => {
                if (e.contributor && e.contributor.trim().toLowerCase() === myNameClean) {
                  calculatedXP += (Number(e.xpEarned) || XP_PER_ENTRY);
                  calculatedStreak++;
                }
              });
              if (calculatedXP > 0) {
                setMyXP(calculatedXP);
                setMyStreak(calculatedStreak);
                await saveData("router:state", {
                  entries: serverEntries,
                  myXP: calculatedXP,
                  myStreak: calculatedStreak,
                  myName: currentName,
                  myUserId: currentUserId || (saved ? saved.myUserId : "")
                });
              }
            }
          } else {
            setEntries(savedEntries);
          }
        } else {
          setEntries(savedEntries);
        }
      } catch (err) {
        console.error("Failed to fetch entries from server:", err);
        setEntries(savedEntries);
      }
      setLoading(false);
    })();
  }, []);

  const persist = useCallback(async (updates) => {
    const state = { entries, myXP, myStreak, myName, myUserId, ...updates };
    await saveData("router:state", state);
  }, [entries, myXP, myStreak, myName, myUserId]);

  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  const handleSaveName = useCallback(async (n) => {
    const nameVal = n.trim();
    if (!nameVal) return;
    const newId = uid();
    
    // Look up historical entries in the fetched list
    const myNameClean = nameVal.toLowerCase();
    let calculatedXP = 0;
    let calculatedStreak = 0;
    entries.forEach(e => {
      if (e.contributor && e.contributor.trim().toLowerCase() === myNameClean) {
        calculatedXP += (Number(e.xpEarned) || XP_PER_ENTRY);
        calculatedStreak++;
      }
    });

    setMyName(nameVal);
    setMyUserId(newId);
    setMyXP(calculatedXP);
    setMyStreak(calculatedStreak);
    
    await saveData("router:state", {
      entries,
      myXP: calculatedXP,
      myStreak: calculatedStreak,
      myName: nameVal,
      myUserId: newId
    });
  }, [entries]);

  // ── Form state ────────────────────────────────────────────────────────────
  const emptyForm = () => ({
    id: uid(),
    contributor: myName,
    from: "", to: "",
    vehicles: [],
    baseFare: "", peakFare: "", offPeakFare: "",
    negotiable: false, negotiateTip: "",
    dayType: "", timeOfDay: "",
    stops: [{ name: "", fare: "", note: "" }],
    alts: [],
    condition: "", notes: "", landmark: "",
    ts: new Date().toISOString()
  });
  const [form, setForm] = useState(emptyForm());
  const [step, setStep] = useState(0);
  const STEPS = ["Route & Vehicle","Stops & Fares","Timing & Conditions","Alternatives"];

  function setF(k, v) { setForm(f => ({ ...f, [k]: v })); }

  function toggleVehicle(id) {
    setForm(f => ({
      ...f,
      vehicles: f.vehicles.includes(id) ? f.vehicles.filter(x => x !== id) : [...f.vehicles, id]
    }));
  }

  function addStop() { setForm(f => ({ ...f, stops: [...f.stops, { name: "", fare: "", note: "" }] })); }
  function removeStop(i) { setForm(f => ({ ...f, stops: f.stops.filter((_, j) => j !== i) })); }
  function updateStop(i, k, v) {
    setForm(f => { const s = [...f.stops]; s[i] = { ...s[i], [k]: v }; return { ...f, stops: s }; });
  }

  function addAlt() { setForm(f => ({ ...f, alts: [...f.alts, { vehicles: [], from: "", to: "", fare: "", peakFare: "", offPeakFare: "", note: "", stops: [] }] })); }
  function removeAlt(i) { setForm(f => ({ ...f, alts: f.alts.filter((_, j) => j !== i) })); }
  function updateAlt(i, k, v) {
    setForm(f => { const a = [...f.alts]; a[i] = { ...a[i], [k]: v }; return { ...f, alts: a }; });
  }

  function canProceed() {
    if (step === 0) return form.from && form.to && form.vehicles.length > 0 && form.baseFare;
    if (step === 1) return form.stops.length > 0 && form.stops[0].name && form.stops[0].fare;
    return true;
  }

  async function submit() {
    if (submitting) return;
    setSubmitting(true);

    const earnedXP = XP_PER_ENTRY
      + (form.alts.length > 0 ? BONUS.alt : 0)
      + (form.peakFare ? BONUS.peak : 0)
      + (form.condition ? BONUS.condition : 0);

    const entry = {
      ...form,
      contributor: myName,
      contributorId: myUserId,
      xpEarned: earnedXP,
      ts: new Date().toISOString()
    };

    let saveSuccess = false;
    try {
      const submitUrl = GOOGLE_SHEETS_URL || "/api/submit";
      // Google Sheets Apps Script does not support CORS preflight (OPTIONS checks) on application/json.
      // We use text/plain for Google Sheets requests to make it a simple request and avoid preflight failures.
      const headers = GOOGLE_SHEETS_URL
        ? { "Content-Type": "text/plain" }
        : { "Content-Type": "application/json" };

      const res = await fetch(submitUrl, {
        method: "POST",
        headers: headers,
        body: JSON.stringify(entry)
      });
      if (res.ok) {
        saveSuccess = true;
      }
    } catch (err) {
      console.error("Failed to submit to backend:", err);
    }

    const newEntries = [entry, ...entries];
    const newXP      = myXP + earnedXP;
    const newStreak  = myStreak + 1;

    setEntries(newEntries);
    setMyXP(newXP);
    setMyStreak(newStreak);
    setLastEntry({ ...entry, earnedXP });
    await persist({ entries: newEntries, myXP: newXP, myStreak: newStreak, myName });
    setForm(emptyForm());
    setStep(0);
    setScreen("success");
    setSubmitting(false);

    if (saveSuccess) {
      showToast(GOOGLE_SHEETS_URL ? "Synced to Google Sheets successfully!" : "Saved to Excel & database successfully!");
    } else {
      showToast("Saved locally (offline)", "warn");
    }
  }

  // ── Helper to fetch all entries from server ────────────────────────────────
  const fetchServerEntries = useCallback(async () => {
    try {
      // doGet handles all GETs — just append a cache-bust param
      const base = GOOGLE_SHEETS_URL || "/api/entries";
      const fetchUrl = base + (base.includes("?") ? "&" : "?") + "t=" + Date.now();
      const res = await fetch(fetchUrl);
      if (res.ok) {
        const json = await res.json();
        const serverEntries = Array.isArray(json) ? json : (json.data || json.entries || []);
        if (serverEntries.length > 0) {
          setEntries(serverEntries);

          // Recalculate myXP/Streak from server entries based on name (case-insensitive)
          if (myName) {
            const myNameClean = myName.trim().toLowerCase();
            let calculatedXP = 0;
            let calculatedStreak = 0;
            serverEntries.forEach(e => {
              if (e.contributor && e.contributor.trim().toLowerCase() === myNameClean) {
                calculatedXP += (Number(e.xpEarned) || XP_PER_ENTRY);
                calculatedStreak++;
              }
            });
            if (calculatedXP > 0) {
              setMyXP(calculatedXP);
              setMyStreak(calculatedStreak);
              await saveData("router:state", {
                entries: serverEntries,
                myXP: calculatedXP,
                myStreak: calculatedStreak,
                myName,
                myUserId
              });
            }
          }
          return true;
        }
      }
    } catch {}
    return false;
  }, [myName, myUserId]);

  // ── Auto-refresh entries every 60s so all contributors are visible
  useEffect(() => {
    const interval = setInterval(fetchServerEntries, 60000);
    return () => clearInterval(interval);
  }, [fetchServerEntries]);

  // ── Leaderboard data ──────────────────────────────────────────────────────
  // First, find a mapping from contributor name to contributorId
  const nameToIdMap = {};
  if (myName && myUserId) {
    nameToIdMap[myName.trim().toLowerCase()] = myUserId;
  }
  entries.forEach(e => {
    if (e.contributor && e.contributorId) {
      nameToIdMap[e.contributor.trim().toLowerCase()] = e.contributorId;
    }
  });

  const lbMap = entries.reduce((acc, e) => {
    const name = e.contributor || "Anonymous";
    const nameKey = name.trim().toLowerCase();
    const id = e.contributorId || nameToIdMap[nameKey] || nameKey;
    if (!acc[id]) {
      acc[id] = { name, xp: 0, entries: 0 };
    }
    acc[id].xp += (Number(e.xpEarned) || XP_PER_ENTRY);
    acc[id].entries += 1;
    return acc;
  }, {});

  const lb = Object.entries(lbMap)
    .map(([id, data]) => ({ id, name: data.name, xp: data.xp, entries: data.entries }))
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

  // ── HOME ──────────────────────────────────────────────────────────────────
  if (screen === "home") {
    return (
      <div style={{ fontFamily: "'Segoe UI', system-ui, sans-serif", maxWidth: 680, margin: "0 auto", padding: "0 0 60px" }}>
        {/* Header */}
        <div style={{ background: "linear-gradient(135deg, #0A1F3D 0%, #1A3A6C 100%)", padding: "32px 28px 24px", borderRadius: "0 0 24px 24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
            <div style={{ fontSize: 36 }}>🗺️</div>
            <div>
              <div style={{ color: "#fff", fontWeight: 900, fontSize: 24, lineHeight: 1.1, letterSpacing: "-0.5px" }}>Jùrù Ányá Technologies</div>
            </div>
          </div>
          <p style={{ color: "#93C5FD", fontSize: 14, margin: "0 0 12px 0", lineHeight: 1.6 }}>
            Record your daily commuting routes and earn XP. Enter detailed route navigation with accurate fares and bus stops. More correct entries give you more XP to qualify for amazing rewards!
          </p>
          <div style={{ display: "inline-block", background: "rgba(255, 255, 255, 0.15)", border: "1px solid rgba(255, 255, 255, 0.25)", color: "#fff", fontWeight: 700, fontSize: 11, padding: "5px 12px", borderRadius: 999, marginBottom: 4 }}>
            ⏳ Entries close: September 30th, 11:59 PM
          </div>
          <CountdownWidget />

          {/* Stats row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginTop: 20 }}>
            {[
              { label: "Routes logged", val: entries.length, emoji: "📍" },
              { label: "Bus stops", val: entries.reduce((a, e) => a + (e.stops?.length || 0), 0), emoji: "🚏" },
              { label: "Top XP", val: lb[0] ? lb[0].xp.toLocaleString() : "0", emoji: "⭐" }
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
          {/* Name entry if needed */}
          {!myName ? (
            <div style={{ background: "#FFFBEB", border: "2px solid #FDE68A", borderRadius: 16, padding: "20px 20px", marginBottom: 24 }}>
              <div style={{ fontWeight: 800, fontSize: 16, color: "#92400E", marginBottom: 6 }}>🙋 Who are you?</div>
              <p style={{ fontSize: 13, color: "#78350F", margin: "0 0 14px", lineHeight: 1.5 }}>Enter your name to appear on the leaderboard and track your XP across devices.</p>
              <div style={{ display: "flex", gap: 10 }}>
                <input style={{ ...inp, flex: 1 }} placeholder="Your name or nickname" value={nameInput} onChange={e => setNameInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && nameInput.trim()) { handleSaveName(nameInput); } }} />
                <button
                  disabled={!nameInput.trim()}
                  onClick={() => handleSaveName(nameInput)}
                  style={{ padding: "9px 18px", background: "#F5A623", color: "#fff", fontWeight: 700, border: "none", borderRadius: 8, cursor: "pointer", fontSize: 14, opacity: nameInput.trim() ? 1 : 0.5 }}>
                  Save
                </button>
              </div>
            </div>
          ) : (
            /* XP card */
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

          {/* Rewards explanation */}
          <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 14, padding: "16px 18px", marginBottom: 24 }}>
            <div style={{ fontWeight: 800, fontSize: 14, color: "#166534", marginBottom: 10 }}>⚡ How XP works</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {[
                { pts: `+${XP_PER_ENTRY}`, desc: "Complete route entry" },
                { pts: `+${BONUS.alt}`,    desc: "Add an alternative route" },
                { pts: `+${BONUS.peak}`,   desc: "Include peak fare" },
                { pts: `+${BONUS.condition}`,desc:"Road/vehicle condition" },
              ].map(r => (
                <div key={r.desc} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ background: "#DCFCE7", color: "#166534", fontWeight: 800, fontSize: 13, borderRadius: 8, padding: "4px 10px", whiteSpace: "nowrap" }}>{r.pts}</div>
                  <div style={{ fontSize: 13, color: "#166534" }}>{r.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* CTA buttons */}
          <button onClick={() => { if (!myName) { showToast("Please enter your name first", "warn"); return; } setScreen("form"); }}
            style={{ width: "100%", padding: "16px", background: "#F5A623", color: "#fff", fontWeight: 900, fontSize: 18, border: "none", borderRadius: 14, cursor: "pointer", marginBottom: 12, letterSpacing: "-0.3px" }}>
            🚌 Add a Route
          </button>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
            <button onClick={() => setScreen("leaderboard")}
              style={{ width: "100%", padding: "14px", background: "#0A1F3D", color: "#fff", fontWeight: 700, fontSize: 15, border: "none", borderRadius: 14, cursor: "pointer" }}>
              🏆 Leaderboard
            </button>
            <button onClick={() => setScreen("rewards")}
              style={{ width: "100%", padding: "14px", background: "#10B981", color: "#fff", fontWeight: 700, fontSize: 15, border: "none", borderRadius: 14, cursor: "pointer" }}>
              🎁 View Rewards
            </button>
          </div>

          {/* Recent entries */}
          {entries.length > 0 && (
            <>
              <div style={{ fontWeight: 800, fontSize: 15, color: "#1E293B", marginBottom: 12 }}>Recent contributions</div>
              {entries.slice(0, 5).map(e => (
                <div key={e.id} style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, padding: "14px 16px", marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: "#1E293B" }}>{e.from} → {e.to}</div>
                      <div style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>
                        {e.vehicles?.map(vid => VEHICLES.find(v => v.id === vid)?.emoji).join(" ")} · {fmt(e.baseFare)} base · {e.stops?.length || 0} stops
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

  // ── SUCCESS ───────────────────────────────────────────────────────────────
  if (screen === "success") {
    const newLevel = xpToLevel(myXP);
    return (
      <div style={{ fontFamily: "'Segoe UI', system-ui, sans-serif", maxWidth: 680, margin: "0 auto", padding: 24 }}>
        <div style={{ textAlign: "center", padding: "48px 24px" }}>
          <div style={{ fontSize: 72, marginBottom: 16 }}>🎉</div>
          <div style={{ fontWeight: 900, fontSize: 28, color: "#0A1F3D", marginBottom: 8 }}>Route Logged!</div>
          <div style={{ color: "#64748B", fontSize: 15, marginBottom: 28, lineHeight: 1.6 }}>
            {lastEntry?.from} → {lastEntry?.to} has been saved to the Router database.
          </div>

          {/* XP burst */}
          <div style={{ background: "linear-gradient(135deg, #0A1F3D, #1A3A6C)", borderRadius: 20, padding: "28px 24px", color: "#fff", marginBottom: 24, textAlign: "center" }}>
            <div style={{ fontSize: 13, color: "#93C5FD", marginBottom: 4 }}>You earned</div>
            <div style={{ fontSize: 56, fontWeight: 900, color: "#F5A623", lineHeight: 1 }}>+{lastEntry?.xpEarned}</div>
            <div style={{ fontSize: 16, color: "#93C5FD" }}>XP</div>
            <div style={{ margin: "16px 0 10px", height: 6, background: "rgba(255,255,255,.15)", borderRadius: 3, overflow: "hidden" }}>
              <div style={{ height: "100%", width: pct + "%", background: "#F5A623", borderRadius: 3 }} />
            </div>
            <div style={{ fontSize: 13, color: "#93C5FD" }}>Level {newLevel.n} · {newLevel.title} · {myXP.toLocaleString()} total XP</div>
          </div>

          <div style={{ background: "#F0FDF4", border: "1px solid #86EFAC", borderRadius: 14, padding: "16px 20px", marginBottom: 24, textAlign: "left" }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: "#166534", marginBottom: 10 }}>What was submitted:</div>
            <div style={{ fontSize: 13, color: "#15803D", lineHeight: 2 }}>
              📍 <strong>{lastEntry?.from} → {lastEntry?.to}</strong><br/>
              🚌 {lastEntry?.vehicles?.map(vid => { const v = VEHICLES.find(x => x.id === vid); return v ? `${v.emoji} ${v.label}` : vid; }).join(", ")}<br/>
              💰 Base fare: {fmt(lastEntry?.baseFare)}{lastEntry?.peakFare ? ` · Peak: ${fmt(lastEntry?.peakFare)}` : ""}<br/>
              🚏 {lastEntry?.stops?.length || 0} stop{(lastEntry?.stops?.length || 0) !== 1 ? "s" : ""} logged<br/>
              {lastEntry?.alts?.length > 0 && <>🔀 {lastEntry.alts.length} alternative route{lastEntry.alts.length > 1 ? "s" : ""}</>}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <button onClick={() => { setForm(emptyForm()); setStep(0); setScreen("form"); }}
              style={{ padding: "14px", background: "#F5A623", color: "#fff", fontWeight: 700, border: "none", borderRadius: 12, cursor: "pointer", fontSize: 15 }}>
              ➕ Add Another
            </button>
            <button onClick={() => setScreen("home")}
              style={{ padding: "14px", background: "#0A1F3D", color: "#fff", fontWeight: 700, border: "none", borderRadius: 12, cursor: "pointer", fontSize: 15 }}>
              🏠 Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── LEADERBOARD ───────────────────────────────────────────────────────────
  if (screen === "leaderboard") {
    const medals = ["🥇","🥈","🥉"];
    return (
      <div style={{ fontFamily: "'Segoe UI', system-ui, sans-serif", maxWidth: 680, margin: "0 auto", padding: "0 0 60px" }}>
        <div style={{ background: "linear-gradient(135deg, #0A1F3D, #1A3A6C)", padding: "24px 20px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <button onClick={() => setScreen("home")} style={{ background: "rgba(255,255,255,.15)", border: "none", color: "#fff", fontWeight: 700, padding: "8px 16px", borderRadius: 999, cursor: "pointer", fontSize: 13 }}>← Back</button>
            <button
              onClick={async () => {
                const ok = await fetchServerEntries();
                showToast(ok ? "Leaderboard updated!" : "Already up to date", ok ? "success" : "warn");
              }}
              style={{ background: "rgba(255,255,255,.15)", border: "1px solid rgba(255,255,255,.3)", color: "#fff", fontWeight: 700, padding: "8px 14px", borderRadius: 999, cursor: "pointer", fontSize: 12 }}
            >🔄 Refresh</button>
          </div>
          <div style={{ color: "#fff", fontWeight: 900, fontSize: 24 }}>🏆 Leaderboard</div>
          <div style={{ color: "#93C5FD", fontSize: 13, marginTop: 4 }}>{entries.length} routes logged across all contributors</div>
        </div>

        <div style={{ padding: "20px 20px" }}>
          {lb.length === 0 ? (
            <div style={{ textAlign: "center", padding: 48, color: "#94A3B8" }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🚌</div>
              <div style={{ fontWeight: 700 }}>No entries yet.</div>
              <div style={{ fontSize: 13, marginTop: 4 }}>Be the first to add a route!</div>
              <button
                onClick={async () => { const ok = await fetchServerEntries(); showToast(ok ? "Leaderboard updated!" : "No data found yet", ok ? "success" : "warn"); }}
                style={{ marginTop: 16, padding: "10px 20px", background: "#F5A623", color: "#fff", fontWeight: 700, border: "none", borderRadius: 10, cursor: "pointer", fontSize: 14 }}
              >🔄 Try Refreshing</button>
            </div>
          ) : lb.map((item, i) => (
            <div key={item.id} style={{
              display: "flex", alignItems: "center", gap: 14,
              background: item.id === myUserId ? "#FEF9EE" : (i === 0 ? "#FFFBEB" : "#fff"),
              border: item.id === myUserId ? "2px solid #F5A623" : (i === 0 ? "2px solid #FDE68A" : "1px solid #E2E8F0"),
              borderRadius: 12, padding: "14px 16px", marginBottom: 10
            }}>
              <div style={{ fontSize: 22, width: 32, textAlign: "center", flexShrink: 0 }}>{medals[i] || `#${i + 1}`}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: "#1E293B" }}>
                  {item.name} {item.id === myUserId ? <span style={{ background: "#FEF3C7", color: "#92400E", fontSize: 11, fontWeight: 700, borderRadius: 4, padding: "2px 6px", marginLeft: 4 }}>YOU</span> : ""}
                </div>
                <div style={{ fontSize: 12, color: "#64748B" }}>Level {xpToLevel(item.xp).n} · {xpToLevel(item.xp).title} · {item.entries} route{item.entries !== 1 ? "s" : ""}</div>
              </div>
              <div style={{ fontWeight: 800, fontSize: 18, color: "#F5A623", textAlign: "right" }}>
                {item.xp.toLocaleString()}
                <div style={{ fontSize: 11, color: "#94A3B8", fontWeight: 400 }}>XP</div>
              </div>
            </div>
          ))}

          <div style={{ fontWeight: 800, fontSize: 15, color: "#1E293B", margin: "28px 0 12px" }}>All Entries ({entries.length})</div>
          {entries.map(e => {
            const vs = e.vehicles?.map(vid => VEHICLES.find(v => v.id === vid)).filter(Boolean) || [];
            return (
              <div key={e.id} style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, padding: "14px 16px", marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "#0A1F3D" }}>{e.from} → {e.to}</div>
                  <div style={{ fontSize: 12, color: "#94A3B8" }}>{new Date(e.ts).toLocaleDateString()}</div>
                </div>
                <div style={{ fontSize: 12, color: "#64748B", margin: "4px 0" }}>
                  {vs.map(v => `${v.emoji} ${v.label}`).join(", ")} · Base {fmt(e.baseFare)}{e.peakFare ? ` / Peak ${fmt(e.peakFare)}` : ""}
                </div>
                {e.stops?.length > 0 && (
                  <div style={{ fontSize: 12, color: "#64748B" }}>
                    🚏 {e.stops.filter(s => s.name).map(s => `${s.name}${s.fare ? ` (${fmt(s.fare)})` : ""}`).join(" → ")}
                  </div>
                )}
                {e.alts?.length > 0 && (
                  <div style={{ fontSize: 11, color: "#10B981", marginTop: 4 }}>
                    🔀 {e.alts.length} alt{e.alts.length > 1 ? "s" : ""}: {e.alts.map(a => {
                      const vEmojis = (a.vehicles || []).map(vid => VEHICLES.find(v => v.id === vid)?.emoji).filter(Boolean).join(" ");
                      return vEmojis ? `${vEmojis} (${fmt(a.fare)})` : `${fmt(a.fare)}`;
                    }).join(", ")}
                  </div>
                )}
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, alignItems: "center" }}>
                  <span style={{ fontSize: 11, color: "#94A3B8" }}>by {e.contributor || "Anonymous"}</span>
                  <span style={{ background: "#FEF3C7", color: "#92400E", fontWeight: 700, fontSize: 11, borderRadius: 6, padding: "3px 8px" }}>+{e.xpEarned || XP_PER_ENTRY} XP</span>
                </div>
              </div>
            );
          })}

          <button onClick={() => setScreen("home")}
            style={{ width: "100%", marginTop: 16, padding: "14px", background: "#F5A623", color: "#fff", fontWeight: 700, border: "none", borderRadius: 12, cursor: "pointer", fontSize: 16 }}>
            ➕ Add a Route
          </button>
        </div>
      </div>
    );
  }
  
  // ── REWARDS ───────────────────────────────────────────────────────────────
  if (screen === "rewards") {
    return (
      <div style={{ fontFamily: "'Segoe UI', system-ui, sans-serif", maxWidth: 680, margin: "0 auto", padding: "0 0 60px" }}>
        <div style={{ background: "linear-gradient(135deg, #10B981, #059669)", padding: "24px 20px 20px" }}>
          <button onClick={() => setScreen("home")} style={{ background: "rgba(255,255,255,.15)", border: "none", color: "#fff", fontWeight: 700, padding: "8px 16px", borderRadius: 999, cursor: "pointer", marginBottom: 16, fontSize: 13 }}>← Back</button>
          <div style={{ color: "#fff", fontWeight: 900, fontSize: 24 }}>🎁 Leaderboard Rewards</div>
          <div style={{ color: "#D1FAE5", fontSize: 13, marginTop: 4 }}>Your current balance: <strong style={{ color: "#FFFBEB", fontSize: 16 }}>{myXP.toLocaleString()} XP</strong></div>
        </div>

        <div style={{ padding: "20px 20px" }}>
          <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 14, padding: "16px 18px", marginBottom: 24 }}>
            <div style={{ fontWeight: 800, fontSize: 14, color: "#1E40AF", marginBottom: 6 }}>🏆 How to qualify:</div>
            <p style={{ fontSize: 13, color: "#1E3A8A", margin: 0, lineHeight: 1.6 }}>
              Keep recording your daily commuting routes. Detailed entries with accurate fares and bus stops earn you more XP. Once you reach the required amount of XP, you qualify to claim the reward!
            </p>
            <div style={{ marginTop: 12, background: "#DBEAFE", color: "#1E40AF", fontWeight: 800, fontSize: 12, padding: "8px 12px", borderRadius: 8, display: "inline-block" }}>
              ⏳ Campaign Deadline: September 30th, 11:59 PM
            </div>
            <CountdownWidget light={true} />
          </div>

          {REWARDS.map(r => {
            const isUnlocked = myXP >= r.xp;
            const progressPct = Math.min(100, Math.round((myXP / r.xp) * 100));
            return (
              <div key={r.id} style={{
                background: "#fff",
                border: isUnlocked ? "2px solid #10B981" : "1px solid #E2E8F0",
                borderRadius: 16,
                overflow: "hidden",
                marginBottom: 20,
                boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)"
              }}>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <div style={{ position: "relative", width: "100%", height: 240, background: "#F8FAFC", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                    <img src={r.img} alt={r.title} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
                    <div style={{
                      position: "absolute",
                      top: 12,
                      right: 12,
                      background: isUnlocked ? "#10B981" : "#64748B",
                      color: "#fff",
                      fontWeight: 800,
                      fontSize: 12,
                      padding: "6px 12px",
                      borderRadius: 999
                    }}>
                      {isUnlocked ? "🎉 Qualified" : `${r.xp.toLocaleString()} XP`}
                    </div>
                  </div>

                  <div style={{ padding: 20 }}>
                    <h3 style={{ margin: "0 0 8px 0", fontSize: 18, color: "#0F172A", fontWeight: 800 }}>{r.title}</h3>
                    <p style={{ margin: "0 0 16px 0", fontSize: 13, color: "#64748B", lineHeight: 1.5 }}>{r.desc}</p>
                    
                    {/* Progress Bar */}
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 6 }}>
                        <span>Progress: {progressPct}%</span>
                        <span>{myXP.toLocaleString()} / {r.xp.toLocaleString()} XP</span>
                      </div>
                      <div style={{ height: 8, background: "#E2E8F0", borderRadius: 4, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${progressPct}%`, background: isUnlocked ? "#10B981" : "#3B82F6", borderRadius: 4 }} />
                      </div>
                    </div>

                    <button 
                      disabled={!isUnlocked}
                      onClick={() => alert(`Congratulations! You have qualified for the ${r.title}. We will contact you soon.`)}
                      style={{
                        width: "100%",
                        padding: "12px",
                        background: isUnlocked ? "#10B981" : "#E2E8F0",
                        color: isUnlocked ? "#fff" : "#94A3B8",
                        fontWeight: 700,
                        fontSize: 14,
                        border: "none",
                        borderRadius: 10,
                        cursor: isUnlocked ? "pointer" : "not-allowed",
                        transition: "background 0.2s"
                      }}
                    >
                      {isUnlocked ? "Claim Reward" : "Locked (Insufficient XP)"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── FORM ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ fontFamily: "'Segoe UI', system-ui, sans-serif", maxWidth: 680, margin: "0 auto", padding: "0 0 60px" }}>
      <datalist id="areas-list">{AREAS.map(a => <option key={a} value={a} />)}</datalist>

      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #0A1F3D, #1A3A6C)", padding: "20px 20px 16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <button onClick={() => { setScreen("home"); setStep(0); setForm(emptyForm()); }}
            style={{ background: "rgba(255,255,255,.15)", border: "none", color: "#fff", fontWeight: 700, padding: "7px 14px", borderRadius: 999, cursor: "pointer", fontSize: 12 }}>
            ← Back
          </button>
          <div style={{ background: "#F5A623", color: "#fff", fontWeight: 800, fontSize: 12, borderRadius: 999, padding: "5px 14px" }}>
            Step {step + 1} of {STEPS.length}
          </div>
        </div>
        <div style={{ color: "#fff", fontWeight: 800, fontSize: 20 }}>🗺️ {STEPS[step]}</div>

        {/* Progress bar */}
        <div style={{ height: 4, background: "rgba(255,255,255,.15)", borderRadius: 2, marginTop: 14, overflow: "hidden" }}>
          <div style={{ height: "100%", width: ((step + 1) / STEPS.length * 100) + "%", background: "#F5A623", borderRadius: 2, transition: "width .3s" }} />
        </div>
      </div>

      <div style={{ padding: "20px 20px" }}>

        {/* ── STEP 0: Route & Vehicle ── */}
        {step === 0 && (
          <div>
            <div style={{ background: "#EFF6FF", borderRadius: 12, padding: "12px 16px", marginBottom: 20, fontSize: 13, color: "#1D4ED8", lineHeight: 1.6 }}>
              💡 Fill in where this route starts and ends, then select every type of vehicle that serves this route.
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
              <div>
                <label style={lbl}>📍 From (origin)</label>
                <input style={inp} placeholder="e.g. Oshodi" value={form.from} onChange={e => setF("from", e.target.value)} list="areas-list" />
              </div>
              <div>
                <label style={lbl}>🏁 To (destination)</label>
                <input style={inp} placeholder="e.g. Victoria Island" value={form.to} onChange={e => setF("to", e.target.value)} list="areas-list" />
              </div>
            </div>

            <label style={lbl}>🚌 Vehicle type(s) — select all that apply</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8, marginBottom: 20 }}>
              {VEHICLES.map(v => <VehicleChip key={v.id} v={v} selected={form.vehicles.includes(v.id)} onToggle={toggleVehicle} />)}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
              <div>
                <label style={lbl}>💰 Base fare (₦)</label>
                <input style={inp} type="number" min="0" placeholder="e.g. 300" value={form.baseFare} onChange={e => setF("baseFare", e.target.value)} />
              </div>
              <div>
                <label style={lbl}>📈 Peak fare (₦)</label>
                <input style={inp} type="number" min="0" placeholder="e.g. 500" value={form.peakFare} onChange={e => setF("peakFare", e.target.value)} />
              </div>
              <div>
                <label style={lbl}>📉 Off-peak fare (₦)</label>
                <input style={inp} type="number" min="0" placeholder="e.g. 250" value={form.offPeakFare} onChange={e => setF("offPeakFare", e.target.value)} />
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, background: "#FFFBEB", borderRadius: 10, padding: "12px 14px" }}>
              <input type="checkbox" id="neg" checked={form.negotiable} onChange={e => setF("negotiable", e.target.checked)} style={{ width: 18, height: 18, cursor: "pointer" }} />
              <label htmlFor="neg" style={{ fontSize: 14, color: "#92400E", fontWeight: 600, cursor: "pointer" }}>Fare is negotiable with driver/conductor</label>
            </div>
            {form.negotiable && (
              <div style={{ marginBottom: 16 }}>
                <label style={lbl}>💬 Negotiation tip</label>
                <input style={inp} placeholder={"e.g. \"Best you can get is ₦400, don't go above ₦450\""} value={form.negotiateTip} onChange={e => setF("negotiateTip", e.target.value)} />
              </div>
            )}

            <div style={{ marginBottom: 16 }}>
              <label style={lbl}>🏛️ Known landmark at origin</label>
              <input style={inp} placeholder='e.g. "Beside First Bank, under the bridge"' value={form.landmark} onChange={e => setF("landmark", e.target.value)} />
            </div>
          </div>
        )}

        {/* ── STEP 1: Stops & Fares ── */}
        {step === 1 && (
          <div>
            <div style={{ background: "#EFF6FF", borderRadius: 12, padding: "12px 16px", marginBottom: 20, fontSize: 13, color: "#1D4ED8", lineHeight: 1.6 }}>
              💡 Add every bus stop along the route in order. Include the boarding fare at each stop — this ensures your entry is detailed and correct. The fare listed is what you'd pay boarding FROM that stop.
            </div>

            {form.stops.map((stop, i) => (
              <StopRow key={i} stop={stop} idx={i} onChange={updateStop} onRemove={removeStop} canRemove={form.stops.length > 1} />
            ))}

            <button onClick={addStop} style={{ width: "100%", padding: "12px", background: "#EFF6FF", color: "#1D4ED8", fontWeight: 700, border: "2px dashed #BFDBFE", borderRadius: 10, cursor: "pointer", fontSize: 14, marginBottom: 20 }}>
              + Add Another Stop
            </button>

            <div style={{ background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 12, padding: "14px 16px" }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: "#92400E", marginBottom: 8 }}>⚡ Tip — how stops work</div>
              <div style={{ fontSize: 13, color: "#78350F", lineHeight: 1.7 }}>
                For a route like <strong>Oshodi → CMS → VI</strong>:<br/>
                Stop 1: Oshodi Under Bridge — ₦500<br/>
                Stop 2: CMS Bus Stop — ₦200 (continuing to VI)<br/>
                Stop 3: Victoria Island — end
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 2: Timing & Conditions ── */}
        {step === 2 && (
          <div>
            <div style={{ background: "#EFF6FF", borderRadius: 12, padding: "12px 16px", marginBottom: 20, fontSize: 13, color: "#1D4ED8" }}>
              💡 When did you travel this route? This helps verify commuting fares under different conditions.
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
              <div>
                <label style={lbl}>📅 Day type</label>
                <select style={inp} value={form.dayType} onChange={e => setF("dayType", e.target.value)}>
                  <option value="">Select…</option>
                  {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>🕐 Time of day</label>
                <select style={inp} value={form.timeOfDay} onChange={e => setF("timeOfDay", e.target.value)}>
                  <option value="">Select…</option>
                  {TIMES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={lbl}>🛣️ Road / vehicle condition <span style={{ background: "#DCFCE7", color: "#166534", fontWeight: 700, fontSize: 10, borderRadius: 4, padding: "2px 6px", marginLeft: 6 }}>+{BONUS.condition} XP</span></label>
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

            <div>
              <label style={lbl}>📝 Any other notes</label>
              <textarea style={{ ...inp, height: 80, resize: "vertical" }}
                placeholder="e.g. Danfo only runs this route in the morning. After 7pm you need a keke."
                value={form.notes} onChange={e => setF("notes", e.target.value)} />
            </div>
          </div>
        )}

        {/* ── STEP 3: Alternatives ── */}
        {step === 3 && (
          <div>
            <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 12, padding: "12px 16px", marginBottom: 20, fontSize: 13, color: "#166534", lineHeight: 1.6 }}>
              💡 Know a different vehicle or route that also gets you from <strong>{form.from}</strong> to <strong>{form.to}</strong>? Add it here!
              An alternative can use a completely different path, vehicle type, and stops — as long as it still reaches the same destination.
              Each alternative earns you <strong>+{BONUS.alt} XP</strong>.
            </div>

            {form.alts.length === 0 && (
              <div style={{ textAlign: "center", padding: "28px 20px", color: "#94A3B8" }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>🔀</div>
                <div style={{ fontWeight: 600 }}>No alternatives added yet</div>
                <div style={{ fontSize: 13, marginTop: 4 }}>Optional — skip if there's only one way to travel this route</div>
              </div>
            )}

            {form.alts.map((alt, i) => <AltRow key={i} alt={alt} idx={i} onChange={updateAlt} onRemove={removeAlt} mainFrom={form.from} mainTo={form.to} />)}

            <button onClick={addAlt} style={{ width: "100%", padding: "13px", background: "#F0FDF4", color: "#166534", fontWeight: 700, border: "2px dashed #86EFAC", borderRadius: 12, cursor: "pointer", fontSize: 15, marginBottom: 24 }}>
              🔀 Add Alternative Route / Vehicle
            </button>

            {/* Summary before submit */}
            <div style={{ background: "#0A1F3D", borderRadius: 14, padding: "18px 20px", color: "#fff" }}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12, color: "#93C5FD" }}>📋 Entry Summary</div>
              <div style={{ fontSize: 13, lineHeight: 2, color: "#E2E8F0" }}>
                <div>📍 <strong>{form.from}</strong> → <strong>{form.to}</strong></div>
                <div>🚌 {form.vehicles.map(vid => { const v = VEHICLES.find(x => x.id === vid); return v ? `${v.emoji} ${v.label}` : vid; }).join(", ") || "—"}</div>
                <div>💰 Base: {form.baseFare ? fmt(form.baseFare) : "—"}{form.peakFare ? ` · Peak: ${fmt(form.peakFare)}` : ""}</div>
                <div>🚏 {form.stops.filter(s => s.name).length} stop{form.stops.filter(s => s.name).length !== 1 ? "s" : ""} logged</div>
                {form.alts.length > 0 && <div>🔀 {form.alts.length} alternative{form.alts.length > 1 ? "s" : ""}</div>}
                {form.dayType && <div>📅 {form.dayType}{form.timeOfDay ? ` · ${form.timeOfDay}` : ""}</div>}
              </div>

              {/* XP preview */}
              <div style={{ marginTop: 14, background: "rgba(255,255,255,.1)", borderRadius: 10, padding: "12px 14px" }}>
                <div style={{ fontSize: 12, color: "#93C5FD", marginBottom: 6 }}>XP you'll earn:</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {[
                    { label: "Base entry", pts: XP_PER_ENTRY, always: true },
                    { label: "Alternatives", pts: BONUS.alt * form.alts.length, show: form.alts.length > 0 },
                    { label: "Peak fare", pts: BONUS.peak, show: !!form.peakFare },
                    { label: "Conditions", pts: BONUS.condition, show: !!form.condition },
                  ].filter(x => x.always || x.show).map(x => (
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

        {/* ── Navigation ── */}
        <div style={{ display: "grid", gridTemplateColumns: step > 0 ? "1fr 1fr" : "1fr", gap: 12, marginTop: 24 }}>
          {step > 0 && (
            <button onClick={() => setStep(s => s - 1)}
              style={{ padding: "14px", background: "#F1F5F9", color: "#475569", fontWeight: 700, border: "none", borderRadius: 12, cursor: "pointer", fontSize: 15 }}>
              ← Back
            </button>
          )}
          {step < STEPS.length - 1 ? (
            <button
              disabled={!canProceed()}
              onClick={() => setStep(s => s + 1)}
              style={{ padding: "14px", background: canProceed() ? "#F5A623" : "#E2E8F0", color: canProceed() ? "#fff" : "#94A3B8", fontWeight: 700, border: "none", borderRadius: 12, cursor: canProceed() ? "pointer" : "not-allowed", fontSize: 15, transition: "all .15s" }}>
              {STEPS[step + 1]} →
            </button>
          ) : (
            <button
              disabled={!canProceed() || submitting}
              onClick={submit}
              style={{ padding: "14px", background: submitting ? "#64748B" : "#166534", color: "#fff", fontWeight: 700, border: "none", borderRadius: 12, cursor: submitting ? "not-allowed" : "pointer", fontSize: 15 }}>
              {submitting ? "⌛ Submitting..." : "✅ Submit & Earn XP"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Toast({ msg, type }) {
  const bg = type === "warn" ? "#FEF9C3" : "#DCFCE7";
  const col = type === "warn" ? "#92400E" : "#166534";
  return (
    <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", background: bg, color: col, fontWeight: 700, fontSize: 14, padding: "12px 24px", borderRadius: 999, boxShadow: "0 4px 20px rgba(0,0,0,0.15)", zIndex: 9999, whiteSpace: "nowrap" }}>
      {msg}
    </div>
  );
}
