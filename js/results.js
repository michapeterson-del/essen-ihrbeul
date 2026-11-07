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
    themeBtn: $("#theme-btn")
  };
  function t() { return i18n[lang]; }

  function render() {
    const tr = t();
    S.translateDom(tr);
    document.title = tr.resultsTitle + " – " + tr.restaurant;
    els.langBtn.textContent = lang === "de" ? "RU" : "DE";
    els.langBtn.title = tr.langSwitch;
    S.detectBackend().then(m => { els.demo.hidden = m !== "demo"; });

    if (loadError) { els.out.innerHTML = '<p class="error">' + S.escapeHtml(tr.resultsError) + "</p>"; return; }
    if (!votes) { els.out.innerHTML = '<p class="muted">' + S.escapeHtml(tr.resultsLoading) + "</p>"; return; }

    els.total.textContent = S.fmt(tr.resultsTotal, { n: votes.length });

    const byNr = new Map();
    for (const v of votes) {
      if (!byNr.has(v.dish_nr)) byNr.set(v.dish_nr, []);
      byNr.get(v.dish_nr).push(v.voter_name);
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
      els.out.innerHTML = '<p class="muted">' + S.escapeHtml(tr.resultsEmpty) + "</p>";
      return;
    }

    els.out.innerHTML = '<ol class="result-list">' + rows.map(({ it, names }) => {
      const named = names.filter(Boolean);
      const anon = names.length - named.length;
      const people = named.map(S.escapeHtml);
      if (anon) people.push('<span class="muted">' + anon + " × " + S.escapeHtml(tr.resultsAnonymous) + "</span>");
      return '<li class="result' + (names.length ? "" : " zero") + '">' +
        '<div class="result-head"><span class="nr">' + it.nr + '</span>' +
        '<span class="name">' + S.escapeHtml(it.name) + (it.ham ? "*" : "") + "</span>" +
        '<span class="count">' + names.length + "</span></div>" +
        '<div class="bar"><span style="width:' + (names.length / max * 100) + '%"></span></div>' +
        (people.length ? '<p class="people">' + people.join(", ") + "</p>" : "") +
        "</li>";
    }).join("") + "</ol>";
  }

  async function load() {
    loadError = false;
    try { votes = await S.fetchVotes(); }
    catch (e) { console.error(e); loadError = true; }
    render();
  }


  els.showAll.addEventListener("change", render);
  els.refresh.addEventListener("click", load);
  els.langBtn.addEventListener("click", () => { lang = lang === "de" ? "ru" : "de"; S.setLang(lang); render(); });
  els.themeBtn.addEventListener("click", S.toggleTheme);

  Promise.all([S.loadJSON("menu.json"), S.loadJSON("i18n.json")])
    .then(([m, i]) => { menu = m; i18n = i; render(); load(); })
    .catch(err => { console.error(err); els.out.textContent = "Fehler beim Laden / Ошибка загрузки"; });
})();
