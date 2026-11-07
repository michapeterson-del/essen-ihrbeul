// Speicherdienst für die Stimmen (Supabase).
// Leer lassen = Demo-Modus (Stimmen nur im eigenen Browser).
// Werte findest du in Supabase unter: Project Settings → API.
// Der "anon public" Key darf öffentlich sein – die Rechte regelt supabase-setup.sql.
window.SURVEY_CONFIG = {
  supabaseUrl: "",      // z. B. "https://abcdefgh.supabase.co"
  supabaseAnonKey: "",  // z. B. "eyJhbGciOi..."
  table: "votes"
};
