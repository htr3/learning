const SITE_NAV = [
  { id: "home", label: "Home", path: "index.html" },
  { id: "behavioral", label: "Behavioral", path: "behavioral/behavioral.html" },
  { id: "projects", label: "Projects", path: "projects/projects.html" },
  { id: "java", label: "Java", path: "java/java.html" },
  { id: "springboot", label: "Spring Boot", path: "springboot/springboot.html" },
  { id: "microservices", label: "Microservices", path: "microservices/microservices.html" },
  { id: "sql", label: "SQL", path: "sql/sql.html" },
  { id: "testing", label: "Testing", path: "testing/testing.html" },
  { id: "devops", label: "DevOps", path: "devops/devops.html" },
  { id: "production", label: "Production", path: "production/production.html" },
  { id: "kafka", label: "Kafka", path: "kafka/kafka.html" },
  { id: "aws", label: "AWS", path: "aws/aws.html" },
  { id: "networking", label: "Networking", path: "networking/networking.html" },
  { id: "linux", label: "Linux", path: "linux/linux.html" },
  { id: "dsa", label: "DSA", path: "dsa/dsa.html" },
  { id: "striver-sheet", label: "Striver Sheet", path: "dsa/striver-sheet.html" },
  { id: "dsa-visuals", label: "DSA Visuals", path: "dsa/dsa-visuals.html" },
  { id: "system-design", label: "System Design", path: "system design/system-design.html" },
  { id: "system-design-diagrams", label: "SD Diagrams", path: "system design/system-design-diagrams.html" }
];

function getBasePath() {
  const path = window.location.pathname.replace(/\\/g, "/");
  if (path.includes("/behavioral/") || path.includes("/java/") ||
      path.includes("/springboot/") || path.includes("/microservices/") ||
      path.includes("/sql/") || path.includes("/testing/") ||
      path.includes("/devops/") || path.includes("/production/") ||
      path.includes("/kafka/") || path.includes("/networking/") ||
      path.includes("/aws/") || path.includes("/linux/") ||
      path.includes("/dsa/") || path.includes("/projects/") ||
      path.includes("/system%20design/") || path.includes("/system design/")) {
    return "../";
  }
  return "";
}

function renderSidebar(activeId) {
  const base = getBasePath();
  const nav = document.getElementById("site-nav");
  if (!nav) return;
  nav.innerHTML = SITE_NAV.map(item => {
    const href = base + item.path;
    const active = item.id === activeId ? " active" : "";
    return `<a href="${href}" class="${active.trim()}">${item.label}</a>`;
  }).join("");
}

function storageKey(pageId) {
  return `interview-prep-${pageId}`;
}

function loadProgress(pageId) {
  try {
    return JSON.parse(localStorage.getItem(storageKey(pageId)) || "{}");
  } catch {
    return {};
  }
}

function saveProgress(pageId, data) {
  localStorage.setItem(storageKey(pageId), JSON.stringify(data));
}

function updateStats(pageId) {
  const cards = document.querySelectorAll(".qa-card:not(.hidden-by-filter):not(.hidden-by-search)");
  const allCards = document.querySelectorAll(".qa-card");
  const progress = loadProgress(pageId);
  const practiced = [...allCards].filter(c => progress[c.dataset.id]).length;
  const total = allCards.length;
  const visible = cards.length;
  const elTotal = document.getElementById("stat-total");
  const elDone = document.getElementById("stat-done");
  const elPct = document.getElementById("stat-pct");
  const elVisible = document.getElementById("stat-visible");
  if (elTotal) elTotal.textContent = total;
  if (elDone) elDone.textContent = practiced;
  if (elVisible) elVisible.textContent = visible;
  if (elPct && total) elPct.textContent = Math.round((practiced / total) * 100) + "%";
}

function applyFilters(cards) {
  const search = document.getElementById("search");
  const levelFilter = document.getElementById("level-filter");
  const vimpOnly = document.getElementById("vimp-only");
  const q = (search?.value || "").toLowerCase().trim();
  const level = levelFilter?.value || "all";
  const vimp = vimpOnly?.checked || false;

  cards.forEach(card => {
    const text = card.textContent.toLowerCase();
    const matchSearch = !q || text.includes(q);
    const cardLevel = card.dataset.level || "medium";
    const matchLevel = level === "all" || cardLevel === level;
    const matchVimp = !vimp || card.dataset.vimp === "true";
    const hidden = !(matchSearch && matchLevel && matchVimp);
    card.classList.toggle("hidden-by-search", !matchSearch);
    card.classList.toggle("hidden-by-filter", !matchLevel || !matchVimp);
  });
}

function initQAPage(pageId) {
  const progress = loadProgress(pageId);
  const cards = document.querySelectorAll(".qa-card");

  cards.forEach((card, index) => {
    const id = card.dataset.id || `q-${index}`;
    card.dataset.id = id;

    if (progress[id]) card.classList.add("practiced");

    const question = card.querySelector(".qa-question");
    const checkbox = card.querySelector(".mark-practiced");

    question?.addEventListener("click", (e) => {
      if (e.target.closest(".mark-practiced")) return;
      card.classList.toggle("open");
    });

    checkbox?.addEventListener("change", () => {
      progress[id] = checkbox.checked;
      card.classList.toggle("practiced", checkbox.checked);
      saveProgress(pageId, progress);
      updateStats(pageId);
    });

    if (checkbox) checkbox.checked = !!progress[id];
  });

  const onFilter = () => {
    applyFilters(cards);
    updateStats(pageId);
  };

  document.getElementById("search")?.addEventListener("input", onFilter);
  document.getElementById("level-filter")?.addEventListener("change", onFilter);
  document.getElementById("vimp-only")?.addEventListener("change", onFilter);

  const practiceToggle = document.getElementById("practice-mode");
  practiceToggle?.addEventListener("change", () => {
    document.body.classList.toggle("practice-mode", practiceToggle.checked);
    if (practiceToggle.checked) cards.forEach(c => c.classList.remove("open"));
  });

  document.getElementById("expand-all")?.addEventListener("click", () => {
    cards.forEach(c => {
      if (!c.classList.contains("hidden-by-search") && !c.classList.contains("hidden-by-filter")) {
        c.classList.add("open");
      }
    });
  });

  document.getElementById("collapse-all")?.addEventListener("click", () => {
    cards.forEach(c => c.classList.remove("open"));
  });

  onFilter();
}

function initHomeProgress() {
  const grid = document.getElementById("topic-progress");
  if (!grid) return;
  SITE_NAV.filter(n => n.id !== "home").forEach(item => {
    const p = loadProgress(item.id);
    const count = Object.values(p).filter(Boolean).length;
    const card = grid.querySelector(`[data-topic="${item.id}"]`);
    if (card && count > 0) {
      const badge = card.querySelector(".progress-badge");
      if (badge) badge.textContent = `${count} practiced`;
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const page = document.body.dataset.page || "home";
  renderSidebar(page);

  document.getElementById("sidebar-toggle")?.addEventListener("click", () => {
    document.querySelector(".sidebar")?.classList.toggle("open");
  });

  if (page === "home") initHomeProgress();
  else if (page !== "dsa-visuals" && page !== "system-design-diagrams" && page !== "striver-sheet") initQAPage(page);
});
