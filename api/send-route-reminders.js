// Vercel Cron target — sends a Web Push reminder to every subscribed
// contributor, scheduled 5x/day in vercel.json. Subscriptions live in the
// Google Sheet (PushSubscriptions tab), written via the app's existing
// "subscribePush" Apps Script action; this function only reads and sends.
//
// NOTE: Vercel's Hobby (free) plan runs cron jobs at most once a day
// regardless of how many schedule entries are configured — 5x/day delivery
// needs a Pro plan or higher. See vercel.json for the 5 configured times.

import webpush from "web-push";

const REMINDER_MESSAGES = [
  "Spotted a route today? Log it before you forget — every entry earns XP.",
  "Quiet moment? Perfect time to log a route you took earlier today.",
  "Missed any fares today? Add them now and climb the leaderboard.",
  "A few minutes logging a route could land you in a Lucky Window — 100x XP if you catch one!",
  "Your next entry could be exactly what another commuter needed today."
];

export default async function handler(req, res) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers["authorization"];
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const sheetsUrl = process.env.VITE_GOOGLE_SHEETS_URL;
  const apiKey = process.env.VITE_ROUTER_API_KEY;
  const vapidPublic = process.env.VITE_VAPID_PUBLIC_KEY;
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
  const vapidSubject = process.env.VAPID_SUBJECT || "https://ijenkeoma.com";

  if (!sheetsUrl || !vapidPublic || !vapidPrivate) {
    return res.status(500).json({ error: "Missing required environment variables" });
  }

  webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);

  let subs;
  try {
    const subsRes = await fetch(
      `${sheetsUrl}?action=pushSubscriptions&key=${encodeURIComponent(apiKey)}&t=${Date.now()}`
    );
    subs = await subsRes.json();
  } catch (err) {
    return res.status(502).json({ error: "Failed to fetch subscriptions", detail: String(err) });
  }
  if (!Array.isArray(subs)) {
    return res.status(200).json({ sent: 0, failed: 0, note: "no subscriptions returned" });
  }

  const body = REMINDER_MESSAGES[Math.floor(Math.random() * REMINDER_MESSAGES.length)];
  const payload = JSON.stringify({ title: "🚌 Ìjènkéọ́mā", body, url: "/" });

  let sent = 0;
  let failed = 0;
  const expiredEndpoints = [];

  await Promise.all(
    subs.map(async (s) => {
      if (!s.endpoint || !s.p256dh || !s.auth) return;
      const subscription = { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } };
      try {
        await webpush.sendNotification(subscription, payload);
        sent++;
      } catch (err) {
        failed++;
        if (err.statusCode === 404 || err.statusCode === 410) expiredEndpoints.push(s.endpoint);
      }
    })
  );

  if (expiredEndpoints.length > 0) {
    try {
      await fetch(sheetsUrl, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({ action: "pruneExpiredPush", key: apiKey, endpoints: expiredEndpoints })
      });
    } catch {}
  }

  return res.status(200).json({ sent, failed, pruned: expiredEndpoints.length });
}
