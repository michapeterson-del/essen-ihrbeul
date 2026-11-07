// Bestellübersicht: Ansicht „Nach Gericht“ (zum Bestellen beim Restaurant)
// und „Nach Person“ (wer hat was, mit Löschen-Knöpfen).
(function () {
  const S = window.Survey;
  const VIEW_KEY = "irrbuehl_results_view";
  let menu, i18n, votes = null, loadError = false, lang = S.getLang();
  let view = S.store.get(VIEW_KEY) === "person" ? "person" : "dish";

  const $ = sel => document.querySelector(sel);
  const els = {
    out: $("#results"),
    total: $("#total"),
    refresh: $("#refresh"),
    demo: $("#demo-banner"),
    langBtn: $("#lang-btn"),
    deleteAll: $("#delete-all"),
    segments: document.querySelectorAll(".segmented button")
  };
  const TRASH = '<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  function t() { return i18n[lang]; }
  const esc = s => S.escapeHtml(s);

  function timeOf(iso) {
    try { return new Date(iso).toLocaleTimeString(lang === "ru" ? "ru-RU" : "de-DE", { hour: "2-digit", minute: "2-digit" }); }
    catch (e) { return ""; }
  }

  const itemsByNr = () => new Map(menu.categories.flatMap(c => c.items).map(i => [i.nr, i]));
  function dishOf(v, items) {
    const it = items.get(v.dish_nr) || { nr: v.dish_nr, name: v.dish_name };
    return { it, name: (lang === "ru" && it.name_ru ? it.name_ru : it.name) + (it.ham ? "*" : "") };
  }
  function personOf(v) { return (v.voter_name || "").trim() || t().resultsAnonymous; }

  // „Anna, Micha 2×“ – gleiche Namen zusammenfassen
  function namesSummary(list) {
    const counts = new Map();
    for (const v of list) { const p = personOf(v); counts.set(p, (counts.get(p) || 0) + 1); }
    return [...counts].sort((a, b) => a[0].localeCompare(b[0], lang))
      .map(([p, n]) => esc(p) + (n > 1 ? ' <span class="times">' + n + "×</span>" : "")).join(", ");
  }

  function renderByDish(items) {
    const groups = new Map();
    for (const v of votes) {
      if (!groups.has(v.dish_nr)) groups.set(v.dish_nr, []);
      groups.get(v.dish_nr).push(v);
    }
    const rows = [...groups].map(([nr, list]) => ({ d: dishOf(list[0], items), list }))
      .sort((a, b) => b.list.length - a.list.length || a.d.it.nr - b.d.it.nr);
    return '<ul class="group summary-list">' + rows.map(({ d, list }) =>
      '<li class="row summary">' +
        '<span class="result-nr">' + d.it.nr + "</span>" +
        '<span class="summary-main"><span class="result-name">' + esc(d.name) + "</span>" +
        '<span class="summary-names">' + namesSummary(list) + "</span></span>" +
        '<span class="result-count" aria-label="' + list.length + '">' + list.length + "×</span>" +
      "</li>").join("") + "</ul>";
  }

  function renderByPerson(items) {
    const tr = t();
    const people = new Map();
    for (const v of votes) {
      const p = personOf(v);
      if (!people.has(p)) people.set(p, []);
      people.get(p).push(v);
    }
    return [...people].sort((a, b) => a[0].localeCompare(b[0], lang)).map(([p, list]) =>
      '<section class="person">' +
        '<h2 class="section-header person-header"><span>' + esc(p) + '</span><span class="person-count">' +
          esc(S.fmt(list.length === 1 ? tr.resultsOneOrder : tr.resultsOrders, { n: list.length })) + "</span></h2>" +
        '<ul class="group">' + list.map(v => {
          const d = dishOf(v, items), time = timeOf(v.created_at);
          return '<li class="row person-order">' +
            '<span class="result-nr">' + d.it.nr + "</span>" +
            '<span class="summary-main"><span class="result-name">' + esc(d.name) + "</span>" +
            '<span class="order-time">' + esc(time) + "</span></span>" +
            '<button type="button" class="btn-delete" data-id="' + esc(v.id) + '" data-who="' + esc(p) +
            '" data-dish="' + esc(d.name) + '" aria-label="' + esc(tr.resultsDelete) + '" title="' + esc(tr.resultsDelete) + '">' +
            TRASH + "</button></li>";
        }).join("") + "</ul>" +
      "</section>").join("");
  }

  function render() {
    const tr = t();
    S.translateDom(tr);
    document.title = tr.resultsTitle + " – " + tr.restaurant;
    els.langBtn.textContent = lang === "de" ? "RU" : "DE";
    els.langBtn.title = tr.langSwitch;
    S.detectBackend().then(m => { els.demo.hidden = m !== "demo"; });
    els.segments.forEach(b => b.setAttribute("aria-pressed", String(b.dataset.view === view)));

    els.deleteAll.hidden = !(votes && votes.length);
    if (loadError) { els.out.innerHTML = '<p class="error">' + esc(tr.resultsError) + "</p>"; return; }
    if (!votes) { els.out.innerHTML = '<p class="subhead">' + esc(tr.resultsLoading) + "</p>"; return; }

    const persons = new Set(votes.map(personOf)).size;
    els.total.textContent = S.fmt(tr.resultsTotal, { n: votes.length, p: persons });
    if (!votes.length) { els.out.innerHTML = '<p class="subhead">' + esc(tr.resultsEmpty) + "</p>"; return; }

    const items = itemsByNr();
    els.out.innerHTML = view === "person" ? renderByPerson(items) : renderByDish(items);
  }

  async function load() {
    loadError = false;
    try { votes = await S.fetchVotes(); }
    catch (e) { console.error(e); loadError = true; }
    render();
  }

  els.segments.forEach(b => b.addEventListener("click", () => {
    view = b.dataset.view;
    S.store.set(VIEW_KEY, view);
    render();
  }));

  els.out.addEventListener("click", async e => {
    const btn = e.target.closest(".btn-delete");
    if (!btn) return;
    if (!window.confirm(S.fmt(t().resultsDeleteConfirm, { name: btn.dataset.who, dish: btn.dataset.dish }))) return;
    btn.disabled = true;
    try { await S.deleteVotes(btn.dataset.id); } catch (err) { console.error(err); window.alert(t().resultsDeleteError); }
    load();
  });

  els.deleteAll.addEventListener("click", async () => {
    if (!votes || !votes.length) return;
    if (!window.confirm(S.fmt(t().resultsDeleteAllConfirm, { n: votes.length }))) return;
    try { await S.deleteVotes(); } catch (err) { console.error(err); window.alert(t().resultsDeleteError); }
    load();
  });

  els.refresh.addEventListener("click", load);
  els.langBtn.addEventListener("click", () => { lang = lang === "de" ? "ru" : "de"; S.setLang(lang); render(); });

  Promise.all([S.loadJSON("menu.json"), S.loadJSON("i18n.json")])
    .then(([m, i]) => { menu = m; i18n = i; render(); load(); })
    .catch(err => { console.error(err); els.out.textContent = "Fehler beim Laden / Ошибка загрузки"; });
})();
