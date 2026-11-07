// Umfrageseite
(function () {
  const S = window.Survey;
  const VOTED_KEY = "irrbuehl_voted"; // speichert {nr, name} nach der Abstimmung

  let menu, i18n, lang = S.getLang(), selectedNr = null, query = "";

  const $ = sel => document.querySelector(sel);
  const els = {
    form: $("#survey"),
    list: $("#menu"),
    search: $("#search"),
    clear: $("#search-clear"),
    searchRow: $("#search-row"),
    empty: $("#no-results"),
    name: $("#voter-name"),
    bar: $("#vote-bar"),
    selected: $("#selected-dish"),
    submit: $("#submit"),
    error: $("#error"),
    thanks: $("#thanks"),
    thanksChoice: $("#thanks-choice"),
    already: $("#already"),
    demo: $("#demo-banner"),
    langBtn: $("#lang-btn"),
  };

  function t() { return i18n[lang]; }
  function allItems() { return menu.categories.flatMap(c => c.items); }
  function findItem(nr) { return allItems().find(i => i.nr === nr); }
  // Im russischen Modus russischer Name, sonst Original (wie auf der Karte)
  function dishName(item) { return lang === "ru" && item.name_ru ? item.name_ru : item.name; }
  function dishLabel(item) { return item.nr + ". " + dishName(item) + (item.ham ? "*" : ""); }

  function getVoted() {
    try { return JSON.parse(S.store.get(VOTED_KEY)); } catch (e) { return null; }
  }

  function normalize(s) {
    return String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/ß/g, "ss").replace(/ё/g, "е");
  }

  function matches(item) {
    if (!query) return true;
    const q = normalize(query.trim());
    if (!q) return true;
    if (/^\d+$/.test(q)) return String(item.nr) === q || String(item.nr).startsWith(q);
    const hay = normalize([item.nr, item.name, item.name_ru || "", item.desc.de, item.desc.ru].join(" "));
    return q.split(/\s+/).every(w => hay.includes(w));
  }

  const CHECK = '<svg class="check" viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  function renderMenu() {
    const tr = t();
    let html = "", visible = 0;
    for (const cat of menu.categories) {
      const items = cat.items.filter(matches);
      if (!items.length) continue;
      visible += items.length;
      const ct = tr.categories[cat.id] || { title: cat.id };
      html += '<section class="section"><h2 class="section-header">' + S.escapeHtml(ct.title) + "</h2>";
      if (ct.note) html += '<p class="section-note">' + S.escapeHtml(ct.note) + "</p>";
      html += '<ul class="group dish-list">';
      for (const it of items) {
        const id = "dish-" + it.nr;
        html +=
          '<li><input type="radio" name="dish" id="' + id + '" value="' + it.nr + '"' +
          (selectedNr === it.nr ? " checked" : "") + ">" +
          '<label for="' + id + '" class="row dish">' +
          '<span class="dish-nr">' + it.nr + "</span>" +
          '<span class="dish-main"><span><span class="dish-name">' + S.escapeHtml(dishName(it)) + "</span>" +
          (it.ham ? '<span class="ham" title="' + S.escapeHtml(tr.hamNote) + '">*</span>' : "") + "</span>" +
          (dishName(it) !== it.name ? '<span class="dish-orig" lang="de">' + S.escapeHtml(it.name) + "</span>" : "") +
          '<span class="dish-desc">' + S.escapeHtml(it.desc[lang] || it.desc.de) + "</span></span>" +
          '<span class="dish-side"><span class="dish-price">' + S.formatPrice(it.price, lang) + "</span>" +
          CHECK + "</span>" +
          "</label></li>";
      }
      html += "</ul>";
      if (ct.info && !query) html += '<p class="section-footer">' + S.escapeHtml(ct.info) + "</p>";
      html += "</section>";
    }
    els.list.innerHTML = html;
    els.empty.hidden = visible > 0;
  }

  function renderSelection() {
    const item = selectedNr != null ? findItem(selectedNr) : null;
    els.selected.textContent = item ? dishLabel(item) : t().nothingSelected;
    els.submit.disabled = !item;
    els.bar.classList.toggle("has-selection", !!item);
  }

  function showThanks(voted, justNow) {
    els.form.hidden = true;
    els.bar.hidden = true;
    els.thanks.hidden = false;
    els.searchRow.hidden = true;
    els.already.hidden = justNow;
    const item = findItem(voted.nr);
    els.thanksChoice.textContent = item ? dishLabel(item) : voted.name;
    window.scrollTo(0, 0);
  }

  function renderAll() {
    S.translateDom(t());
    document.title = t().pageTitle;
    els.langBtn.textContent = lang === "de" ? "RU" : "DE";
    els.langBtn.setAttribute("aria-label", t().langSwitch);
    els.langBtn.title = t().langSwitch;
    S.detectBackend().then(m => { els.demo.hidden = m !== "demo"; });
    const voted = getVoted();
    if (voted) { showThanks(voted, false); return; }
    renderMenu();
    renderSelection();
  }

  // ---------- Events ----------
  els.list.addEventListener("change", e => {
    if (e.target.name === "dish") { selectedNr = Number(e.target.value); renderSelection(); }
  });

  els.search.addEventListener("input", () => {
    query = els.search.value;
    els.clear.hidden = !query;
    renderMenu();
  });
  els.clear.addEventListener("click", () => {
    els.search.value = ""; query = ""; els.clear.hidden = true; renderMenu(); els.search.focus();
  });

  els.langBtn.addEventListener("click", () => {
    lang = lang === "de" ? "ru" : "de";
    S.setLang(lang);
    renderAll();
  });

  els.form.addEventListener("submit", async e => {
    e.preventDefault();
    if (getVoted()) { renderAll(); return; }
    const item = findItem(selectedNr);
    if (!item) return;
    if (!window.confirm(S.fmt(t().confirm, { dish: dishLabel(item) }))) return;

    els.error.hidden = true;
    els.submit.disabled = true;
    els.submit.textContent = t().submitting;
    try {
      const voterName = els.name.value.trim().slice(0, 60) || null;
      await S.submitVote({ dish_nr: item.nr, dish_name: item.name, voter_name: voterName, lang });
      const voted = { nr: item.nr, name: item.name, at: new Date().toISOString() };
      S.store.set(VOTED_KEY, JSON.stringify(voted));
      showThanks(voted, true);
    } catch (err) {
      console.error(err);
      if (err.status === 409) { // Server kennt diesen Browser schon
        const voted = { nr: item.nr, name: item.name, already: true };
        S.store.set(VOTED_KEY, JSON.stringify(voted));
        showThanks(voted, false);
        return;
      }
      els.error.textContent = t().error;
      els.error.hidden = false;
      els.submit.disabled = false;
    } finally {
      els.submit.textContent = t().submit;
    }
  });

  // ---------- Start ----------
  Promise.all([S.loadJSON("menu.json"), S.loadJSON("i18n.json")])
    .then(([m, i]) => { menu = m; i18n = i; renderAll(); document.body.classList.remove("loading"); })
    .catch(err => {
      console.error(err);
      document.body.classList.remove("loading");
      els.list.innerHTML = '<p class="error">Speisekarte konnte nicht geladen werden. / Не удалось загрузить меню.</p>';
    });
})();
