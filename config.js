// config.js (no-modules version)
// Paste your Supabase keys here
window.CONFIG = {
  SUPABASE_URL: "https://phclbufylvlnfqoqtfcn.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBoY2xidWZ5bHZsbmZxb3F0ZmNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc1MTI2NzAsImV4cCI6MjA4MzA4ODY3MH0.Rl2C23AECjTctuax-w6kx6oi4g4nQ3ZR4_qRoTGiNhU",

  SESSION_CAPACITY: 20,

  // 5 sessions (1 hour) with 30 min gaps
  TIME_SLOTS: [
    { value: "09:00–10:00", label: "09:00–10:00" },
    { value: "10:30–11:30", label: "10:30–11:30" },
    { value: "12:00–13:00", label: "12:00–13:00" },
    { value: "13:30–14:30", label: "13:30–14:30" },
    { value: "15:00–16:00", label: "15:00–16:00" },
  ],

  DAYS: [
    { value: "Day 1", label: "Day 1 — 1 اليوم" },
    { value: "Day 2", label: "Day 2 — 2 اليوم" },
    { value: "Day 3", label: "Day 3 — 3 اليوم" },
  ],

  WORKSHOPS: [
    { value: "Workshop 1", label: "Workshop 1 — 1 ورشة" },
    { value: "Workshop 2", label: "Workshop 2 — 2 ورشة" },
    { value: "Workshop 3", label: "Workshop 3 — 3 ورشة" },
  ],

  TRACKS: [
    { value: "Resource Sustainability", label: "Resource Sustainability — موارد" },
    { value: "Smart Technology", label: "Smart Technology — التقنية الذكية" },
    { value: "Safety & Security", label: "Safety & Security — السلامة والأمن" },
  ],
};
