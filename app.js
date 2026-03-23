window.SoftNoise = (() => {
  const STORAGE_KEY = "softnoise_web_v1";

  const MOODS = [
    { id: "sad", label: "Sad", src: "./assets/sad.png" },
    { id: "anxious", label: "Anxious", src: "./assets/anxious.png" },
    { id: "angry", label: "Angry", src: "./assets/angry.png" },
    { id: "overwhelmed", label: "Overwhelmed", src: "./assets/overwhelmed.png" }
  ];

  const THEMES = {
    sad: { bg1: "#ECE3D8", bg2: "#ECE3D8", glow: "rgba(255,255,255,0)" },
    anxious: { bg1: "#ECE3D8", bg2: "#ECE3D8", glow: "rgba(255,255,255,0)" },
    angry: { bg1: "#ECE3D8", bg2: "#ECE3D8", glow: "rgba(255,255,255,0)" },
    overwhelmed: { bg1: "#ECE3D8", bg2: "#ECE3D8", glow: "rgba(255,255,255,0)" },
    neutral: { bg1: "#ECE3D8", bg2: "#ECE3D8", glow: "rgba(255,255,255,0)" }
  };

  function getQuery(name) {
    return new URLSearchParams(location.search).get(name);
  }

  function getLocalDateKey() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  function parseDateKey(dateKey) {
    const [y, m, d] = String(dateKey).split("-").map(Number);
    return { y, m, d };
  }

  function formatPrettyDate(dateKey) {
    const { y, m, d } = parseDateKey(dateKey);
    const dt = new Date(y, m - 1, d);
    const weekday = dt.toLocaleDateString("en-US", { weekday: "long" });
    const month = dt.toLocaleDateString("en-US", { month: "long" });
    return `${weekday} ${month} ${d}, ${y}`;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "\"": "&quot;",
      "'": "&#039;"
    }[c]));
  }

  function uid() {
    return "e_" + Date.now() + "_" + Math.random().toString(16).slice(2);
  }

  function getEntries() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  function saveEntries(entries) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  }

  function getEntryById(id) {
    return getEntries().find(e => e.id === id) || null;
  }

  function addEntry({ moodId, text }) {
    const t = String(text || "").trim();
    if (!t) throw new Error("text missing");

    const now = Date.now();
    const entry = {
      id: uid(),
      moodId,
      dateKey: getLocalDateKey(),
      text: t,
      createdAt: now,
      updatedAt: now
    };

    const entries = getEntries();
    entries.push(entry);
    saveEntries(entries);
    return entry.id;
  }

  function updateEntry(id, newText) {
    const t = String(newText || "").trim();
    if (!t) return false;

    const entries = getEntries();
    const idx = entries.findIndex(e => e.id === id);
    if (idx === -1) return false;

    entries[idx].text = t;
    entries[idx].updatedAt = Date.now();
    saveEntries(entries);
    return true;
  }

  function deleteEntry(id) {
    const entries = getEntries().filter(e => e.id !== id);
    saveEntries(entries);
  }

  function applyThemeToBody(moodId) {
    const key = THEMES[moodId] ? moodId : "neutral";
    const t = THEMES[key];
    document.body.setAttribute("data-theme", key);
    document.documentElement.style.setProperty("--bg1", t.bg1);
    document.documentElement.style.setProperty("--bg2", t.bg2);
    document.documentElement.style.setProperty("--glow", t.glow);
  }

  function renderMoodGrid(containerId, onPick) {
    const el = document.getElementById(containerId);
    if (!el) return;

    el.innerHTML = MOODS.map(m => `
      <button class="tile" type="button" data-mood="${m.id}">
        <div class="tile-top">
          <img class="tile-img" src="${m.src}" alt="${escapeHtml(m.label)}">
        </div>
        <div class="tile-body">
          <p class="tile-title">${escapeHtml(m.label)}</p>
        </div>
      </button>
    `).join("");

    el.addEventListener("click", e => {
      const btn = e.target.closest(".tile");
      if (!btn) return;
      onPick(btn.dataset.mood);
    });
  }

  function renderMoodChip(containerEl, moodId) {
    const mood = MOODS.find(m => m.id === moodId);
    if (!mood) {
      containerEl.innerHTML = "";
      return;
    }

    containerEl.innerHTML = `
      <img src="${mood.src}" alt="${escapeHtml(mood.label)}">
      <div class="name">${escapeHtml(mood.label)}</div>
    `;
  }

  function monthName(m) {
    const names = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    return names[m - 1] || "";
  }

  function renderHistoryByMonth(containerEl, year, onOpen) {
    const all = getEntries().slice().sort((a, b) => b.createdAt - a.createdAt);
    const inYear = all.filter(e => parseDateKey(e.dateKey).y === year);

    if (inYear.length === 0) {
      containerEl.innerHTML = `
        <section class="month-block">
          <div class="month-head">
            <div class="month-name">${year}</div>
            <div class="month-count">0 entries</div>
          </div>
          <div class="empty-state">No entries yet.</div>
        </section>
      `;
      return;
    }

    const byMonth = new Map();
    for (const e of inYear) {
      const { m } = parseDateKey(e.dateKey);
      if (!byMonth.has(m)) byMonth.set(m, []);
      byMonth.get(m).push(e);
    }

    const months = Array.from(byMonth.keys()).sort((a, b) => b - a);

    containerEl.innerHTML = months.map(m => {
      const list = byMonth.get(m).slice().sort((a, b) => b.createdAt - a.createdAt);
      const count = list.length;

      const icons = list.map(en => {
        const mood = MOODS.find(x => x.id === en.moodId);
        const { d } = parseDateKey(en.dateKey);
        const src = mood ? mood.src : "";

        return `
          <button class="entry-btn" type="button" data-id="${en.id}">
            <img src="${src}" alt="">
            <div class="entry-day">${String(d).padStart(2, "0")}</div>
          </button>
        `;
      }).join("");

      return `
        <section class="month-block">
          <div class="month-head">
            <div class="month-name">${monthName(m)}</div>
            <div class="month-count">${count} ${count === 1 ? "entry" : "entries"}</div>
          </div>
          <div class="entries">${icons}</div>
        </section>
      `;
    }).join("");

    containerEl.onclick = function(e) {
      const btn = e.target.closest(".entry-btn");
      if (!btn) return;
      onOpen(btn.dataset.id);
    };
  }

  return {
    getQuery,
    getLocalDateKey,
    formatPrettyDate,
    escapeHtml,
    getEntries,
    getEntryById,
    addEntry,
    updateEntry,
    deleteEntry,
    applyThemeToBody,
    renderMoodGrid,
    renderMoodChip,
    renderHistoryByMonth
  };
})();