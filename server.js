// Kleiner Server für Coolify / Docker: liefert die Seite aus und speichert Stimmen.
// Keine Abhängigkeiten – nur Node.js (>= 18).
//
// Umgebungsvariablen:
//   PORT              Port (Standard 3000)
//   DATA_DIR          Ordner für votes.json (Standard ./data) – in Coolify als Volume einbinden!

const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = Number(process.env.PORT) || 3000;
const ROOT = __dirname;
const DATA_DIR = process.env.DATA_DIR || path.join(ROOT, "data");
const VOTES_FILE = path.join(DATA_DIR, "votes.json");
const COOKIE = "irrbuehl_voted";

// Nur diese Dateien werden ausgeliefert (server.js, data/ usw. bleiben privat).
const PUBLIC = /^\/(index\.html|results\.html|menu\.json|i18n\.json|(css|js)\/[\w.-]+\.(css|js))$/;
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8"
};

fs.mkdirSync(DATA_DIR, { recursive: true });
let votes = [];
try { votes = JSON.parse(fs.readFileSync(VOTES_FILE, "utf8")); } catch (e) { votes = []; }

function validDishes() {
  const menu = JSON.parse(fs.readFileSync(path.join(ROOT, "menu.json"), "utf8"));
  return new Map(menu.categories.flatMap(c => c.items).map(i => [i.nr, i.name]));
}

// Schreibvorgänge nacheinander und atomar (temp-Datei + rename).
let writing = Promise.resolve();
function persist() {
  writing = writing.then(() => {
    const tmp = VOTES_FILE + ".tmp";
    fs.writeFileSync(tmp, JSON.stringify(votes, null, 1));
    fs.renameSync(tmp, VOTES_FILE);
  }).catch(err => console.error("Speichern fehlgeschlagen:", err));
  return writing;
}

function send(res, status, body, headers) {
  const isJson = typeof body !== "string" && !Buffer.isBuffer(body);
  res.writeHead(status, Object.assign({
    "Content-Type": isJson ? "application/json; charset=utf-8" : "text/plain; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff"
  }, headers || {}));
  res.end(isJson ? JSON.stringify(body) : body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", chunk => {
      data += chunk;
      if (data.length > 10000) { reject(new Error("too large")); req.destroy(); }
    });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

function hasVotedCookie(req) {
  return (req.headers.cookie || "").split(/;\s*/).some(c => c.startsWith(COOKIE + "="));
}

async function handleApi(req, res, url) {
  if (url.pathname === "/api/health") {
    return send(res, 200, { ok: true });
  }

  if (url.pathname !== "/api/votes") return send(res, 404, { error: "not found" });

  if (req.method === "GET") {
    return send(res, 200, votes);
  }

  if (req.method === "POST") {
    if (hasVotedCookie(req)) return send(res, 409, { error: "already voted" });
    let input;
    try { input = JSON.parse(await readBody(req)); } catch (e) { return send(res, 400, { error: "bad json" }); }
    const dishes = validDishes();
    const nr = Number(input.dish_nr);
    if (!dishes.has(nr)) return send(res, 400, { error: "unknown dish" });
    const name = typeof input.voter_name === "string" ? input.voter_name.trim().slice(0, 60) : "";
    const vote = {
      dish_nr: nr,
      dish_name: dishes.get(nr),
      voter_name: name || null,
      lang: input.lang === "ru" ? "ru" : "de",
      created_at: new Date().toISOString()
    };
    votes.push(vote);
    await persist();
    const secure = (req.headers["x-forwarded-proto"] || "").includes("https") ? "; Secure" : "";
    return send(res, 201, { ok: true }, {
      "Set-Cookie": COOKIE + "=1; Path=/; Max-Age=31536000; HttpOnly; SameSite=Lax" + secure
    });
  }

  return send(res, 405, { error: "method not allowed" });
}

function serveStatic(req, res, url) {
  let p = decodeURIComponent(url.pathname);
  if (p === "/" ) p = "/index.html";
  if (p === "/results" || p === "/ergebnisse") p = "/results.html";
  if (!PUBLIC.test(p)) return send(res, 404, "Not found");
  const file = path.join(ROOT, p);
  fs.readFile(file, (err, data) => {
    if (err) return send(res, 404, "Not found");
    res.writeHead(200, {
      "Content-Type": TYPES[path.extname(file)] || "application/octet-stream",
      "Cache-Control": "no-cache", // immer die aktuelle Version laden (kleine Seite, kein Caching nötig)
      "X-Content-Type-Options": "nosniff"
    });
    res.end(data);
  });
}

http.createServer((req, res) => {
  const url = new URL(req.url, "http://localhost");
  if (url.pathname.startsWith("/api/")) {
    handleApi(req, res, url).catch(err => { console.error(err); send(res, 500, { error: "server error" }); });
  } else if (req.method === "GET" || req.method === "HEAD") {
    serveStatic(req, res, url);
  } else {
    send(res, 405, "Method not allowed");
  }
}).listen(PORT, () => {
  console.log(`Umfrage läuft auf Port ${PORT} – Stimmen in ${VOTES_FILE} (${votes.length} bisher)`);
});
