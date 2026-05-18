// StreamWeaver Marketplace browse site. Consumes the per-type shards generated
// by the publish-registry workflow and renders a filterable card grid. Each card
// links to streamweaver://install for deep-link install in the running app, plus
// a fallback "Download" link for users without the app installed.

const TYPE_LABELS = {
  "plugin": "Plugins",
  "template": "Templates",
  "template-pack": "Template Packs",
  "overlay-component-static": "Static Overlays",
  "overlay-component": "Overlay Components",
  "overlay-theme": "Themes",
  "overlay-preset": "Presets",
  "speech-voice": "Speech Voices",
};

let state = {
  registryIndex: null,
  packagesByType: {},     // type -> [package entry]
  selectedType: "all",
  search: "",
  verifiedOnly: false,
};

function $(sel) { return document.querySelector(sel); }
function $$(sel) { return [...document.querySelectorAll(sel)]; }

async function load() {
  const index = await fetch("registry/index.json").then(r => r.json());
  state.registryIndex = index;

  for (const [type, rel] of Object.entries(index.shards ?? {})) {
    try {
      const shard = await fetch(`registry/${rel.replace(/^registry\//, "")}`).then(r => r.json());
      state.packagesByType[type] = shard.packages ?? [];
    } catch (e) {
      console.warn(`Failed to load shard for ${type}`, e);
    }
  }

  renderFilterChips();
  render();
}

function renderFilterChips() {
  const host = $("#type-filters");
  host.innerHTML = "";
  const chips = [{ key: "all", label: "All" }];
  for (const [type, label] of Object.entries(TYPE_LABELS)) {
    if (state.packagesByType[type]?.length) {
      chips.push({ key: type, label });
    }
  }
  for (const chip of chips) {
    const el = document.createElement("button");
    el.type = "button";
    el.className = "filter-chip" + (chip.key === state.selectedType ? " active" : "");
    el.textContent = chip.label;
    el.addEventListener("click", () => {
      state.selectedType = chip.key;
      renderFilterChips();
      render();
    });
    host.appendChild(el);
  }
}

function render() {
  const host = $("#results");
  const empty = $("#empty");
  host.innerHTML = "";

  const visible = [];
  const sources = state.selectedType === "all"
    ? Object.entries(state.packagesByType)
    : [[state.selectedType, state.packagesByType[state.selectedType] ?? []]];

  for (const [type, entries] of sources) {
    for (const entry of entries) {
      const latest = entry.versions?.[entry.latestVersion];
      if (!latest || latest.yanked) continue;
      if (!matches(latest)) continue;
      visible.push({ type, entry, manifest: latest });
    }
  }

  if (visible.length === 0) {
    empty.classList.remove("hidden");
    return;
  }
  empty.classList.add("hidden");

  for (const v of visible) {
    host.appendChild(buildCard(v));
  }
}

function matches(manifest) {
  if (state.verifiedOnly && !manifest.author?.verified) return false;
  if (!state.search) return true;
  const needle = state.search.toLowerCase();
  const name = manifest.name?.values?.default?.toLowerCase() ?? "";
  const summary = manifest.summary?.values?.default?.toLowerCase() ?? "";
  const tags = (manifest.tags ?? []).map(t => t.toLowerCase());
  return manifest.id.toLowerCase().includes(needle)
    || name.includes(needle)
    || summary.includes(needle)
    || tags.some(t => t.includes(needle));
}

function buildCard({ type, manifest }) {
  const card = document.createElement("article");
  card.className = "card";

  const title = document.createElement("h3");
  title.textContent = manifest.name?.values?.default ?? manifest.id;
  card.appendChild(title);

  const id = document.createElement("div");
  id.className = "id";
  id.textContent = manifest.id;
  card.appendChild(id);

  const summary = document.createElement("div");
  summary.className = "summary";
  summary.textContent = manifest.summary?.values?.default ?? "";
  card.appendChild(summary);

  const meta = document.createElement("div");
  meta.className = "meta";
  const authorText = manifest.author?.name ?? "";
  meta.textContent = `${TYPE_LABELS[type] ?? type} • v${manifest.version}${authorText ? ` • by ${authorText}` : ""}`;
  card.appendChild(meta);

  const badges = document.createElement("div");
  badges.className = "badges";
  if (manifest.author?.verified) {
    const b = document.createElement("span");
    b.className = "badge badge-verified";
    b.textContent = "Verified";
    badges.appendChild(b);
  }
  if (manifest.artifact?.kind === "external") {
    const b = document.createElement("span");
    b.className = "badge badge-paid";
    b.textContent = manifest.priceHint
      ? `${manifest.priceHint.currency} ${manifest.priceHint.amount}`
      : "Paid";
    badges.appendChild(b);
  }
  card.appendChild(badges);

  const actions = document.createElement("div");
  actions.className = "actions";

  if (manifest.artifact?.kind === "external") {
    const buy = document.createElement("a");
    buy.className = "button";
    buy.textContent = "Buy on author site";
    buy.href = manifest.purchaseUrl ?? manifest.artifact.sourceUrl;
    buy.target = "_blank";
    buy.rel = "noopener noreferrer";
    actions.appendChild(buy);
  } else {
    const install = document.createElement("a");
    install.className = "button";
    install.textContent = "Install in StreamWeaver";
    install.href = `streamweaver://install?id=${encodeURIComponent(manifest.id)}&version=${encodeURIComponent(manifest.version)}`;
    actions.appendChild(install);

    if (manifest.artifact?.sourceUrl) {
      const dl = document.createElement("a");
      dl.className = "button secondary";
      dl.textContent = "Download";
      dl.href = manifest.artifact.sourceUrl;
      dl.target = "_blank";
      dl.rel = "noopener noreferrer";
      actions.appendChild(dl);
    }
  }

  card.appendChild(actions);
  return card;
}

$("#search").addEventListener("input", e => {
  state.search = e.target.value;
  render();
});

$("#verified-only").addEventListener("change", e => {
  state.verifiedOnly = e.target.checked;
  render();
});

load().catch(err => {
  console.error("Failed to load registry", err);
  const empty = $("#empty");
  empty.classList.remove("hidden");
  empty.innerHTML = `<h2>Registry unavailable.</h2><p>${err.message}</p>`;
});
