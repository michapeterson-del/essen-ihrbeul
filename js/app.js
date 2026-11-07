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
    themeBtn: $("#theme-btn")
  };

  function t() { return i18n[lang]; }
  function allItems() { return menu.categories.flatMap(c => c.items); }
  function findItem(nr) { return allItems().find(i => i.nr === nr); }
  function dishLabel(item) { return item.nr + ". " + item.name + (item.ham ? "*" : ""); }

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
    const hay = normalize([item.nr, item.name, item.desc.de, item.desc.ru].join(" "));
    return q.split(/\s+/).every(w => hay.includes(w));
  }

  function renderMenu() {
    const tr = t();
    let html = "", visible = 0;
    for (const cat of menu.categories) {
      const items = cat.items.filter(matches);
      if (!items.length) continue;
      visible += items.length;
      const ct = tr.categories[cat.id] || { title: cat.id };
      html += '<section class="category"><h2>' + S.escapeHtml(ct.title) + "</h2>";
      if (ct.note) html += '<p class="cat-note">' + S.escapeHtml(ct.note) + "</p>";
      html += '<ul class="dishes">';
      for (const it of items) {
        const id = "dish-" + it.nr;
        html +=
          '<li><input type="radio" name="dish" id="' + id + '" value="' + it.nr + '"' +
          (selectedNr === it.nr ? " checked" : "") + ">" +
          '<label for="' + id + '" class="dish">' +
          '<span class="nr">' + it.nr + "</span>" +
          '<span class="body"><span class="top"><span class="name">' + S.escapeHtml(it.name) +
          (it.ham ? '<sup class="ham" title="' + S.escapeHtml(tr.hamNote) + '">*</sup>' : "") +
          '</span><span class="price">' + S.formatPrice(it.price, lang) + "</span></span>" +
          '<span class="desc">' + S.escapeHtml(it.desc[lang] || it.desc.de) + "</span></span>" +
          "</label></li>";
      }
      html += "</ul>";
      if (ct.info && !query) html += '<p class="cat-info">' + S.escapeHtml(ct.info) + "</p>";
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
    els.demo.hidden = S.hasBackend;
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
  els.themeBtn.addEventListener("click", S.toggleTheme);

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
