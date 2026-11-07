// Gemeinsame Helfer für Umfrage- und Ergebnisseite.
(function () {
  const LANG_KEY = "irrbuehl_lang";
  const THEME_KEY = "irrbuehl_theme";
  const LOCAL_VOTES_KEY = "irrbuehl_demo_votes";

  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* ignore */ } }
  };

  async function loadJSON(url) {
    const res = await fetch(url, { cache: "no-cache" });
    if (!res.ok) throw new Error(url + ": " + res.status);
    return res.json();
  }

  function getLang() {
    const l = store.get(LANG_KEY);
    return l === "ru" ? "ru" : "de";
  }
  function setLang(l) { store.set(LANG_KEY, l); }

  function fmt(str, vars) {
    return String(str).replace(/\{(\w+)\}/g, (_, k) => (vars && k in vars ? vars[k] : ""));
  }

  function formatPrice(value, lang) {
    return new Intl.NumberFormat(lang === "ru" ? "ru-RU" : "de-DE", {
      style: "currency", currency: "EUR"
    }).format(value);
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
  }

  // Theme: "light" | "dark" | null (= System)
  function applyTheme() {
    const t = store.get(THEME_KEY);
    if (t === "light" || t === "dark") document.documentElement.dataset.theme = t;
    else delete document.documentElement.dataset.theme;
  }
  function toggleTheme() {
    const isDark = document.documentElement.dataset.theme
      ? document.documentElement.dataset.theme === "dark"
      : window.matchMedia("(prefers-color-scheme: dark)").matches;
    store.set(THEME_KEY, isDark ? "light" : "dark");
    applyTheme();
  }
  applyTheme();

  // Übersetzt alle Elemente mit data-i18n / data-i18n-placeholder / data-i18n-aria.
  function translateDom(t) {
    document.documentElement.lang = t.htmlLang;
    document.querySelectorAll("[data-i18n]").forEach(el => {
      const v = t[el.dataset.i18n]; if (v != null) el.textContent = v;
    });
    document.querySelectorAll("[data-i18n-placeholder]").forEach(el => {
      const v = t[el.dataset.i18nPlaceholder]; if (v != null) el.placeholder = v;
    });
    document.querySelectorAll("[data-i18n-aria]").forEach(el => {
      const v = t[el.dataset.i18nAria]; if (v != null) { el.setAttribute("aria-label", v); el.title = v; }
    });
  }

  // ---------- Speicher ----------
  // Stimmen gehen an server.js (/api/votes). Läuft kein Server (z. B. lokal mit
  // python -m http.server), speichert die Seite nur im eigenen Browser (Demo-Modus).
  let mode = null; // "server" | "demo"

  async function detectBackend() {
    if (mode) return mode;
    try {
      const res = await fetch("api/health", { cache: "no-store" });
      mode = res.ok && (await res.json()).ok ? "server" : "demo";
    } catch (e) { mode = "demo"; }
    return mode;
  }

  function errorWithStatus(msg, status) { const e = new Error(msg); e.status = status; return e; }

  async function submitVote(vote) {
    if ((await detectBackend()) === "demo") {
      const all = JSON.parse(store.get(LOCAL_VOTES_KEY) || "[]");
      all.push(Object.assign({ created_at: new Date().toISOString() }, vote));
      store.set(LOCAL_VOTES_KEY, JSON.stringify(all));
      return;
    }
    const res = await fetch("api/votes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(vote)
    });
    if (!res.ok) throw errorWithStatus("Vote failed: " + res.status, res.status);
  }

  async function fetchVotes() {
    if ((await detectBackend()) === "demo") return JSON.parse(store.get(LOCAL_VOTES_KEY) || "[]");
    const res = await fetch("api/votes", { cache: "no-store" });
    if (!res.ok) throw errorWithStatus("Load failed: " + res.status, res.status);
    return res.json();
  }

  window.Survey = {
    store, loadJSON, getLang, setLang, fmt, formatPrice, escapeHtml,
    toggleTheme, translateDom, detectBackend, submitVote, fetchVotes
  };
})();
