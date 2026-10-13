// Nightly – Supabase-connected prototype
// The publishable/anon key is intended for browser use. Never put a service_role/secret key here.
const SUPABASE_URL = "https://qjybsyywcuxmdbjeqhwi.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_GY4lX8hd4wRYMOdWNtyWgQ_Jb3Ks7KD";

let events = [];
let saved = new Set();
const $ = id => document.getElementById(id);
let toastTimer;

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}
function fmt(d) {
  const date = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(date.getTime())) return "DATUM OFFEN";
  return date.toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "short" }).toUpperCase();
}
function dateOnly(d) {
  const date = new Date(d);
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
}
function timeOnly(d) {
  return new Date(d).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
}
function showToast(s) {
  const t = $("toast");
  if (!t) return;
  t.textContent = s;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 3000);
}
function crowdLabel(level) {
  // Show only values stored by an organizer/moderator; unknown is not presented as a live crowd estimate.
  return ({ low: "Wenig los", medium: "Gut besucht", high: "Sehr voll", unknown: "Keine Angabe" })[level] || "Keine Angabe";
}
function colorPair(id) {
  const palettes = [["#5b2b88", "#e2478d"], ["#174b58", "#39b8b0"], ["#7c4a23", "#dca85b"], ["#224b2f", "#b0cf57"], ["#803329", "#f07a43"], ["#263e79", "#7d9aff"]];
  let n = 0;
  for (const ch of String(id)) n = (n + ch.charCodeAt(0)) % palettes.length;
  return palettes[n];
}
function mapDbEvent(row) {
  const start = new Date(row.starts_at);
  const colors = colorPair(row.id);
  const price = row.price_eur == null ? "Preis offen" : Number(row.price_eur) === 0 ? "Kostenlos" : `${Number(row.price_eur).toLocaleString("de-DE", {maximumFractionDigits: 2})} €`;
  return {
    id: String(row.id), title: row.title, venue: row.venue_name, city: row.city,
    date: dateOnly(start), time: timeOnly(start), startsAt: start.toISOString(),
    category: row.category || "Party", crowd: crowdLabel(row.crowd_level),
    price, free: row.price_eur != null && Number(row.price_eur) === 0,
    colors, sourceUrl: row.source_url || row.ticket_url || null,
    description: row.description || "", fromDatabase: true
  };
}
function render(listOverride = null) {
  const city = $("cityInput").value.trim().toLocaleLowerCase("de-DE");
  const cat = $("categoryFilter").value;
  const crowd = $("crowdFilter").value;
  const price = $("priceFilter").value;
  const source = listOverride || events;
  const list = source.filter(e =>
    (!city || e.city.toLocaleLowerCase("de-DE").includes(city)) &&
    (cat === "Alle" || e.category === cat) &&
    (crowd === "Alle" || e.crowd === crowd) &&
    (price === "Alle" || (price === "Kostenlos" ? e.free : !e.free))
  );
  $("resultCount").textContent = `${list.length} ${list.length === 1 ? "Event" : "Events"}`;
  $("eventGrid").innerHTML = list.length ? list.map(e => `
    <article class="event-card">
      <div class="event-art" style="--a:${e.colors[0]};--b:${e.colors[1]}">
        <span class="tag">${esc(e.category)}</span>
        <button class="heart ${saved.has(e.id) ? "saved" : ""}" data-save="${esc(e.id)}" aria-label="Event merken">${saved.has(e.id) ? "♥" : "♡"}</button>
      </div>
      <div class="event-body">
        <div class="event-date">${fmt(e.startsAt || e.date)} · ${esc(e.time)}</div>
        <h3>${esc(e.title)}</h3>
        <p class="venue">${esc(e.venue)}</p>
        <p class="location">⌖ ${esc(e.city)}</p>
        ${e.description ? `<p>${esc(e.description)}</p>` : ""}
        <div class="meta-row"><span class="crowd ${e.crowd === "Sehr voll" ? "full" : e.crowd === "Gut besucht" ? "busy" : ""}">${esc(e.crowd)}</span><span class="price">${esc(e.price)}</span></div>
        ${e.sourceUrl ? `<p><a href="${esc(e.sourceUrl)}" target="_blank" rel="noopener noreferrer">Event-Infos</a></p>` : ""}
      </div>
    </article>`).join("") : `
    <div class="empty"><h3>Keine veröffentlichten Events gefunden</h3><p>Es werden nur freigegebene Veranstaltungen aus der Datenbank angezeigt. Ändere deine Stadt oder Filter oder schau später noch einmal vorbei.</p></div>`;
  document.querySelectorAll("[data-save]").forEach(b => b.addEventListener("click", () => {
    const id = b.dataset.save;
    saved.has(id) ? saved.delete(id) : saved.add(id);
    render();
    showToast(saved.has(id) ? "Event gemerkt" : "Aus Merkliste entfernt");
  }));
}
async function loadEvents() {
  showToast("Veranstaltungen werden geladen …");
  try {
    const query = new URLSearchParams({
      select: "id,title,venue_name,city,address,starts_at,ends_at,category,price_eur,ticket_url,source_url,source_name,description,image_url,crowd_level,status",
      status: "eq.published",
      starts_at: `gte.${new Date().toISOString()}`,
      order: "starts_at.asc",
      limit: "200"
    });
    const response = await fetch(`${SUPABASE_URL}/rest/v1/events?${query.toString()}`, {
      headers: {
        apikey: SUPABASE_PUBLISHABLE_KEY,
        Accept: "application/json"
      }
    });
    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`Supabase ${response.status}: ${detail}`);
    }
    const rows = await response.json();
    events = rows.map(mapDbEvent);
    render();
    if (events.length) showToast(`${events.length} veröffentlichte Events geladen`);
    else showToast("Datenbank verbunden – noch keine kommenden veröffentlichten Events");
  } catch (err) {
    console.error("Supabase event load failed:", err);
    events = [];
    render();
    showToast("Datenbank konnte nicht geladen werden. Prüfe Verbindung und Tabellensicherheit.");
  }
}

$("searchBtn").addEventListener("click", () => render());
$("cityInput").addEventListener("keydown", e => { if (e.key === "Enter") render(); });
document.querySelectorAll("[data-city]").forEach(b => b.addEventListener("click", () => { $("cityInput").value = b.dataset.city; render(); }));
["categoryFilter", "crowdFilter", "priceFilter"].forEach(id => $(id).addEventListener("change", () => render()));
$("addEventBtn").addEventListener("click", () => $("eventDialog").showModal());
$("closeDialog").addEventListener("click", () => $("eventDialog").close());
$("eventForm").addEventListener("submit", e => {
  e.preventDefault();
  const f = new FormData(e.target);
  const title = f.get("title").trim(), city = f.get("city").trim(), date = f.get("date"), venue = f.get("venue").trim();
  if (!title || !city || !date || !venue) return;
  const url = f.get("url").trim();
  events.unshift({ id: `local-${Date.now()}`, title, venue, city, date, time: "21:00", startsAt: `${date}T21:00:00`, category: "Party", crowd: "Keine Angabe", price: "Preis offen", free: false, colors: ["#424267", "#a36bc7"], sourceUrl: url || null });
  $("eventDialog").close(); e.target.reset(); $("cityInput").value = city;
  $("categoryFilter").value = $("crowdFilter").value = $("priceFilter").value = "Alle";
  render(); showToast("Nur lokale Vorschau – noch nicht in der Datenbank gespeichert.");
});
$("loginBtn").addEventListener("click", () => showToast("Anmeldung kommt im nächsten Entwicklungsschritt."));
$("friendsBtn").addEventListener("click", () => showToast("Freundesfunktion folgt mit den Benutzerkonten."));
$("profileBtn").addEventListener("click", () => showToast("Profile folgen im nächsten Entwicklungsschritt."));
$("savedBtn").addEventListener("click", () => {
  const list = events.filter(e => saved.has(e.id));
  $("resultCount").textContent = `${list.length} gemerkt`;
  $("eventGrid").innerHTML = list.length ? list.map(e => `<article class="event-card"><div class="event-art" style="--a:${e.colors[0]};--b:${e.colors[1]}"><span class="tag">${esc(e.category)}</span><button class="heart saved" data-save="${esc(e.id)}">♥</button></div><div class="event-body"><div class="event-date">${fmt(e.startsAt || e.date)} · ${esc(e.time)}</div><h3>${esc(e.title)}</h3><p class="venue">${esc(e.venue)}</p><p class="location">⌖ ${esc(e.city)}</p></div></article>`).join("") : '<div class="empty">Du hast noch keine Events gemerkt.</div>';
  document.querySelectorAll("[data-save]").forEach(b => b.addEventListener("click", () => { saved.delete(b.dataset.save); render(); }));
});
loadEvents();
if ("serviceWorker" in navigator) window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(() => {}));
