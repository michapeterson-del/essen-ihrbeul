// Ergebnisseite: Anzahl und Namen pro Gericht
(function () {
  const S = window.Survey;
  let menu, i18n, votes = null, loadError = false, lang = S.getLang();

  const $ = sel => document.querySelector(sel);
  const els = {
    out: $("#results"),
    total: $("#total"),
    showAll: $("#show-all"),
    refresh: $("#refresh"),
    demo: $("#demo-banner"),
    langBtn: $("#lang-btn"),
    deleteAll: $("#delete-all"),
  };
  const TRASH = '<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  function timeOf(iso) {
    try { return new Date(iso).toLocaleTimeString(lang === "ru" ? "ru-RU" : "de-DE", { hour: "2-digit", minute: "2-digit" }); }
    catch (e) { return ""; }
  }
  function t() { return i18n[lang]; }

  function render() {
    const tr = t();
    S.translateDom(tr);
    document.title = tr.resultsTitle + " – " + tr.restaurant;
    els.langBtn.textContent = lang === "de" ? "RU" : "DE";
    els.langBtn.title = tr.langSwitch;
    S.detectBackend().then(m => { els.demo.hidden = m !== "demo"; });

    els.deleteAll.hidden = !(votes && votes.length);
    if (loadError) { els.out.innerHTML = '<p class="error">' + S.escapeHtml(tr.resultsError) + "</p>"; return; }
    if (!votes) { els.out.innerHTML = '<p class="subhead">' + S.escapeHtml(tr.resultsLoading) + "</p>"; return; }

    els.total.textContent = S.fmt(tr.resultsTotal, { n: votes.length });

    const byNr = new Map();
    for (const v of votes) {
      if (!byNr.has(v.dish_nr)) byNr.set(v.dish_nr, []);
      byNr.get(v.dish_nr).push(v);
    }
    const max = Math.max(1, ...[...byNr.values()].map(a => a.length));

    let rows = menu.categories.flatMap(c => c.items).map(it => ({ it, names: byNr.get(it.nr) || [] }));
    // Stimmen für Gerichte, die nicht (mehr) in der Karte stehen
    for (const [nr, names] of byNr) {
      if (!rows.some(r => r.it.nr === nr)) {
        const v = votes.find(x => x.dish_nr === nr);
        rows.push({ it: { nr, name: v.dish_name, price: null }, names });
      }
    }
    if (!els.showAll.checked) rows = rows.filter(r => r.names.length);
    rows.sort((a, b) => b.names.length - a.names.length || a.it.nr - b.it.nr);

    if (!votes.length && !els.showAll.checked) {
      els.out.innerHTML = '<p class="subhead">' + S.escapeHtml(tr.resultsEmpty) + "</p>";
      return;
    }

    els.out.innerHTML = '<ol class="group results-list">' + rows.map(({ it, names }) => {
      const dish = lang === "ru" && it.name_ru ? it.name_ru : it.name;
      const orders = names.map(v => {
        const who = v.voter_name ? S.escapeHtml(v.voter_name) : '<span class="order-anon">' + S.escapeHtml(tr.resultsAnonymous) + "</span>";
        return '<li class="order"><span class="order-who">' + who +
          ' <span class="order-time">' + S.escapeHtml(timeOf(v.created_at)) + "</span></span>" +
          '<button type="button" class="btn-delete" data-id="' + S.escapeHtml(v.id) + '" data-who="' +
          S.escapeHtml(v.voter_name || tr.resultsAnonymous) + '" data-dish="' + S.escapeHtml(dish) + '" aria-label="' +
          S.escapeHtml(tr.resultsDelete) + '" title="' + S.escapeHtml(tr.resultsDelete) + '">' + TRASH + "</button></li>";
      }).join("");
      return '<li class="row result' + (names.length ? "" : " zero") + '">' +
        '<span class="result-nr">' + it.nr + "</span>" +
        '<span class="result-name">' + S.escapeHtml(lang === "ru" && it.name_ru ? it.name_ru : it.name) + (it.ham ? "*" : "") + "</span>" +
        '<span class="result-count">' + names.length + "</span>" +
        '<span class="result-bar" aria-hidden="true"><span style="width:' + (names.length / max * 100) + '%"></span></span>' +
        (orders ? '<ul class="order-list">' + orders + "</ul>" : "") +
        "</li>";
    }).join("") + "</ol>";
  }

  async function load() {
    loadError = false;
    try { votes = await S.fetchVotes(); }
    catch (e) { console.error(e); loadError = true; }
    render();
  }


  els.out.addEventListener("click", async e => {
    const btn = e.target.closest(".btn-delete");
    if (!btn) return;
    const msg = S.fmt(t().resultsDeleteConfirm, { name: btn.dataset.who, dish: btn.dataset.dish });
    if (!window.confirm(msg)) return;
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

  els.showAll.addEventListener("change", render);
  els.refresh.addEventListener("click", load);
  els.langBtn.addEventListener("click", () => { lang = lang === "de" ? "ru" : "de"; S.setLang(lang); render(); });

  Promise.all([S.loadJSON("menu.json"), S.loadJSON("i18n.json")])
    .then(([m, i]) => { menu = m; i18n = i; render(); load(); })
    .catch(err => { console.error(err); els.out.textContent = "Fehler beim Laden / Ошибка загрузки"; });
})();
