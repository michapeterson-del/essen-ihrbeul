// Speicher für die Stimmen.
//
// 1) Eigener Server (empfohlen, z. B. Coolify mit dem Dockerfile): hier NICHTS eintragen.
//    Die Seite erkennt den Server automatisch über /api/health.
//
// 2) Nur statisches Hosting (GitHub Pages / Vercel): Supabase-Daten eintragen
//    (Project Settings → API), Tabelle mit supabase-setup.sql anlegen.
//
// Ist beides nicht vorhanden, läuft die Seite im Demo-Modus (Stimmen nur im eigenen Browser).
window.SURVEY_CONFIG = {
  supabaseUrl: "",      // z. B. "https://abcdefgh.supabase.co"
  supabaseAnonKey: "",  // z. B. "eyJhbGciOi..."
  table: "votes"
};
