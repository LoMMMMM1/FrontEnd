"use strict";

const $  = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const KEYS = {
  favs:   "partygoers:favs",
  cookie: "partygoers:cookie-ok",
};

const state = {
  events: [],             
  activeCats: new Set(),   
  favsOnly: false,         
  favs: loadFavs(),        
};

async function loadEvents() {
  const grid  = $("#event-grid");
  const count = $("#result-count");
  try {
    const res = await fetch("data/events.json");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    state.events = data.events;
    buildFilter(state.events);
    render();
  } catch (err) {
    console.error("Could not load events:", err);
    count.textContent = "";
    grid.innerHTML =
      `<p class="empty-state">Couldn't load events. Please refresh the page.</p>`;
  }
}

function buildFilter(events) {
  const filter = $("#filter");
  const cats = [...new Set(events.map(e => e.category))].sort();

  filter.innerHTML = "";
  cats.forEach(cat => {
    const chip = document.createElement("button");
    chip.className = "chip";
    chip.type = "button";
    chip.textContent = cat;
    chip.setAttribute("aria-pressed", "false");

    chip.addEventListener("click", () => {
      if (state.activeCats.has(cat)) {
        state.activeCats.delete(cat);
        chip.classList.remove("active");
        chip.setAttribute("aria-pressed", "false");
      } else {
        state.activeCats.add(cat);
        chip.classList.add("active");
        chip.setAttribute("aria-pressed", "true");
      }
      render();
    });

    filter.appendChild(chip);
  });
}

function getVisibleEvents() {
  return state.events.filter(ev => {
    const catOk = state.activeCats.size === 0 || state.activeCats.has(ev.category);
    const favOk = !state.favsOnly || state.favs.has(ev.id);
    return catOk && favOk;
  });
}

function render() {
  const grid  = $("#event-grid");
  const count = $("#result-count");
  const empty = $("#empty-state");
  const list  = getVisibleEvents();

  grid.innerHTML = "";
  empty.hidden = list.length !== 0;

  count.textContent =
    `${list.length} ${list.length === 1 ? "night" : "nights"}` +
    (state.favsOnly ? " saved" : "");

  list.forEach(ev => grid.appendChild(makeCard(ev)));
}

function makeCard(ev) {
  const isFav = state.favs.has(ev.id);
  const card = document.createElement("article");
  card.className = "card" + (ev.featured ? " is-featured" : "");
  card.tabIndex = 0;
  card.setAttribute("role", "button");
  card.setAttribute("aria-label", `Read more about ${ev.title}`);

  card.innerHTML = `
    <div class="card-media">
      <img src="${ev.image}" alt="${ev.title} at ${ev.venue}" loading="lazy" />
    </div>
    <div class="card-scrim"></div>
    <span class="card-tag">${ev.featured ? "Featured" : ev.category}</span>
    <button class="fav-btn" aria-pressed="${isFav}"
            aria-label="Save ${ev.title}">${isFav ? "♥" : "♡"}</button>
    <div class="card-caption">
      <p class="card-meta">${ev.category} · ${ev.city}</p>
      <h3>${ev.title}</h3>
      <span class="card-cta">Read more →</span>
    </div>
  `;

  card.querySelector(".fav-btn").addEventListener("click", (e) => {
    e.stopPropagation();
    toggleFav(ev.id);
  });

  card.addEventListener("click", () => openDetail(ev.id));
  card.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openDetail(ev.id); }
  });

  return card;
}

function openDetail(id) {
  const ev = state.events.find(e => e.id === id);
  if (!ev) return;

  const listing = $("#events-listing");
  const detail  = $("#event-detail");
  const isFav = state.favs.has(ev.id);

  const sectionsHtml = ev.article.sections.map(s => `
    <div class="detail-section">
      <h3>${s.heading}</h3>
      <p>${s.text}</p>
    </div>
  `).join("");

  detail.innerHTML = `
    <button class="detail-back" id="detail-back">← Back to all events</button>
    <figure class="detail-figure">
      <img src="${ev.image}" alt="${ev.title} at ${ev.venue}" />
    </figure>
    <div class="detail-meta">
      <span>${ev.category}</span><span class="dot">•</span>
      <span>${ev.venue}, ${ev.city}</span><span class="dot">•</span>
      <span>${formatDate(ev.date)} · ${ev.time}</span><span class="dot">•</span>
      <span class="detail-price">€${ev.price}</span>
    </div>
    <h2>${ev.title}</h2>
    <p class="detail-lead">${ev.article.lead}</p>
    ${sectionsHtml}
    <div class="detail-actions">
      <button class="btn btn-primary" id="detail-fav" aria-pressed="${isFav}">
        ${isFav ? "♥ Saved" : "♡ Save this night"}
      </button>
      <button class="btn btn-ghost" id="detail-back-2">Back to all events</button>
    </div>
  `;

  listing.hidden = true;
  detail.hidden = false;

  $("#events").scrollIntoView({ behavior: "smooth", block: "start" });

  $("#detail-back").addEventListener("click", closeDetail);
  $("#detail-back-2").addEventListener("click", closeDetail);
  $("#detail-fav").addEventListener("click", () => {
    toggleFav(ev.id);
    const nowFav = state.favs.has(ev.id);
    const favBtn = $("#detail-fav");
    favBtn.setAttribute("aria-pressed", String(nowFav));
    favBtn.textContent = nowFav ? "♥ Saved" : "♡ Save this night";
  });
}

function closeDetail() {
  $("#event-detail").hidden = true;
  $("#events-listing").hidden = false;
  render();
  $("#events").scrollIntoView({ behavior: "smooth", block: "start" });
}

function formatDate(iso) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-GB",
    { weekday: "short", day: "numeric", month: "short" });
}

function loadFavs() {
  try {
    return new Set(JSON.parse(localStorage.getItem(KEYS.favs)) || []);
  } catch {
    return new Set();
  }
}
function saveFavs() {
  localStorage.setItem(KEYS.favs, JSON.stringify([...state.favs]));
}
function toggleFav(id) {
  state.favs.has(id) ? state.favs.delete(id) : state.favs.add(id);
  saveFavs();
  if (!$("#events-listing").hidden) render();
}

function initFavsToggle() {
  const btn = $("#show-favs");
  btn.addEventListener("click", () => {
    state.favsOnly = !state.favsOnly;
    btn.setAttribute("aria-pressed", String(state.favsOnly));
    btn.textContent = state.favsOnly ? "Show all events" : "Show saved only ♥";
    render();
  });
}

function initBurger() {
  const burger = $("#burger");
  const list   = $("#nav-list");

  burger.addEventListener("click", () => {
    const open = list.classList.toggle("open");
    burger.setAttribute("aria-expanded", String(open));
    burger.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  });

  $$(".nav-list a").forEach(a =>
    a.addEventListener("click", () => {
      list.classList.remove("open");
      burger.setAttribute("aria-expanded", "false");
    })
  );
}

function initScroll() {
  const header = $(".site-header");
  const toTop  = $("#to-top");

  const onScroll = () => {
    const y = window.scrollY;
    header.classList.toggle("scrolled", y > 20);

    if (y > 600) {
      toTop.hidden = false;
      toTop.classList.add("show");
    } else {
      toTop.classList.remove("show");
    }
  };

  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  toTop.addEventListener("click", () =>
    window.scrollTo({ top: 0, behavior: "smooth" })
  );
}

function initReveal() {
  const items = $$(".reveal");
  if (!("IntersectionObserver" in window)) {
    items.forEach(el => el.classList.add("visible"));
    return;
  }
  const io = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });

  items.forEach(el => io.observe(el));
}

function initCookie() {
  const bar    = $("#cookie");
  const accept = $("#cookie-accept");

  if (!localStorage.getItem(KEYS.cookie)) {
    bar.hidden = false;
  }
  accept.addEventListener("click", () => {
    localStorage.setItem(KEYS.cookie, "1");
    bar.hidden = true;
  });
}

function initForm() {
  const form = $("#join-form");
  const input = $("#email");
  const msg = $("#form-msg");

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const value = input.value.trim();
    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

    msg.style.color = "var(--accent)";
    if (!valid) {
      msg.textContent = "Please enter a valid email address.";
      return;
    }
    msg.textContent = "You're on the list — see you Thursday.";
    form.reset();
  });
}

document.addEventListener("DOMContentLoaded", () => {
  $("#year").textContent = new Date().getFullYear();
  loadEvents();
  initFavsToggle();
  initBurger();
  initScroll();
  initReveal();
  initCookie();
  initForm();
});