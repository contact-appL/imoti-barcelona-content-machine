import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseConfig = window.SUPABASE_CONFIG || {};
const supabase = supabaseConfig.url && supabaseConfig.publishableKey
  ? createClient(supabaseConfig.url, supabaseConfig.publishableKey)
  : null;

const nav = [["dashboard","⌂ Dashboard"],["inbox","Inbox"],["approved","Одобрени теми"],["create","Създай публикация"],["idea","Моя идея"],["calendar","Календар"],["archive","Архив"],["brand","Моят бранд"],["settings","Настройки"],["integrations","Интеграции"]];
const navigation = document.querySelector("#navigation");
const app = document.querySelector("#app");

const state = { ideas: [], topics: [], posts: [], brand: null, user: null };

async function loadData() {
  if (!supabase) return;
  const { data: { user } } = await supabase.auth.getUser();
  state.user = user;
  if (!user) return;
  const [ideas, topics, posts, brands] = await Promise.all([
    supabase.from("manual_ideas").select("*").order("created_at", { ascending: false }),
    supabase.from("topics").select("*").order("created_at", { ascending: false }),
    supabase.from("posts").select("*").order("created_at", { ascending: false }),
    supabase.from("brands").select("*").order("created_at", { ascending: true }).limit(1)
  ]);
  state.ideas = ideas.data || [];
  state.topics = topics.data || [];
  state.posts = posts.data || [];
  state.brand = brands.data?.[0] || null;
}

const esc = value => String(value ?? "").replace(/[&<>"']/g, ch => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;" }[ch]));

function dashboard() {
  return `
    <h1>Dashboard</h1>
    <p class="subtitle">Твоят център за съдържание за „Имоти в Барселона“.</p>
    <div class="notice"><strong>${supabase ? "Supabase е свързан." : "Supabase още не е конфигуриран."}</strong> ${state.user ? "Dashboard-ът чете реални данни от твоя workspace." : "Следващата стъпка е вход в системата."}</div>
    <div class="grid">
      <div class="card"><h3>Inbox</h3><div class="metric">${state.topics.filter(t => t.status === "inbox").length}</div><span class="badge">актуални теми</span></div>
      <div class="card"><h3>Одобрени теми</h3><div class="metric">${state.topics.filter(t => t.status === "approved").length}</div><span class="badge">за създаване</span></div>
      <div class="card"><h3>Мои идеи</h3><div class="metric">${state.ideas.length}</div><span class="badge">в Supabase</span></div>
      <div class="card"><h3>Тази седмица</h3><div class="metric">${state.posts.length}</div><span class="badge">записани публикации</span></div>
    </div>
    <div class="card section-card"><h2>Следваща стъпка</h2><p>Когато свържем Supabase, тези данни ще станат лични за твоя workspace и няма да се губят при смяна на устройство.</p></div>
  `;
}

function inbox() {
  return `
    <h1>Inbox</h1>
    <p class="subtitle">Тук ще влизат 10-те най-релевантни теми от Content Hunter.</p>
    <div class="empty card"><strong>Все още няма събрани теми.</strong><p>Inbox вече е свързан със Supabase и ще показва реални теми, когато Content Hunter започне да ги записва.</p></div>
  `;
}

function approved() { return placeholder("Одобрени теми","Тук ще се появяват темите, които си одобрила от Inbox."); }
function create() { return placeholder("Създай публикация","Избираш тема и получаваш основен FB/Instagram текст, CTA, точно 5 hashtags, alt text, източник и визуална задача."); }

function idea() {
  return `
    <h1>Моя идея</h1>
    <p class="subtitle">Добави идея спонтанно, без да чакаш Content Hunter.</p>
    <form id="ideaForm" class="card form-card">
      <label>Заглавие на идеята<input id="ideaTitle" required maxlength="140" placeholder="Напр. Какво трябва да знае родителят преди да купи имот за студент?"></label>
      <label>Бележки<textarea id="ideaNotes" rows="5" placeholder="Какво искаш да кажем, покажем или проверим?"></textarea></label>
      <button class="primary" type="submit">Запази идеята</button>
    </form>
    <div class="section-card"><h2>Запазени идеи</h2>${state.ideas.length ? state.ideas.map((item,index) => `
      <div class="list-item"><div><strong>${esc(item.title)}</strong><p>${esc(item.notes || "Без бележки")}</p><small>${esc(item.createdAt)}</small></div><button class="ghost delete" data-index="${index}">Изтрий</button></div>`).join("") : '<div class="empty card">Все още няма идеи.</div>'}</div>
  `;
}

function calendar() { return placeholder("Календар","Тук ще виждаш седмичния график и реалните статуси Draft, Ready, Scheduled, Published и Error."); }
function archive() { return placeholder("Архив","Тук ще остава историята на създаденото и публикуваното съдържание."); }

function brand() {
  return `
    <h1>Моят бранд</h1>
    <p class="subtitle">Основните настройки, върху които Content Machine ще стъпва.</p>
    <div class="grid">
      <div class="card"><h3>Позициониране</h3><p>„Ние сме до клиента, не до агенцията.“</p></div>
      <div class="card"><h3>Основен CTA</h3><p>WhatsApp: 34691917074</p></div>
      <div class="card"><h3>Език</h3><p>Български</p></div>
      <div class="card"><h3>Визия</h3><p>Бяло, сиво, черно · минималистично · професионално · реалистична фотография</p></div>
    </div>
    <div class="card section-card"><h2>Основни аудитории</h2><ul><li>Български родители на студенти</li><li>Българи с капитал за инвестиция</li><li>Млади двойки за първо жилище</li><li>Българи, които живеят или се местят в Испания</li></ul></div>
  `;
}

function settings() { return placeholder("Настройки","Тук ще управляваме честота, предпочитани часове, източници, формати и други настройки."); }
function integrations() {
  return `
    <h1>Интеграции</h1><p class="subtitle">Само реално свързани услуги ще бъдат показвани като активни.</p>
    <div class="grid">
      <div class="card"><h3>Supabase</h3><span class="badge">Не е свързан</span><p>Ще съхранява workspace, теми, публикации и настройки.</p></div>
      <div class="card"><h3>Meta</h3><span class="badge">Не е свързан</span><p>Ще публикува/насрочва към Facebook и Instagram след проверка на разрешенията.</p></div>
    </div>`;
}

function placeholder(title,text) {
  return `<h1>${title}</h1><p class="subtitle">${text}</p><div class="empty card"><strong>Подготвено за следващата фаза.</strong><p>Няма да симулираме функционалност, която още не е свързана.</p></div>`;
}

const pages = {dashboard, inbox, approved, create, idea, calendar, archive, brand, settings, integrations};

async function render(route = "dashboard") {
  await loadData();
  const page = pages[route] || dashboard;
  navigation.innerHTML = nav.map(([key,label]) => `<button class="${key === route ? "active" : ""}" data-route="${key}">${label}</button>`).join("");
  app.innerHTML = page();
  navigation.querySelectorAll("[data-route]").forEach(button => button.addEventListener("click", () => render(button.dataset.route)));
  const form = document.querySelector("#ideaForm");
  if (form) {
    form.addEventListener("submit", event => {
      event.preventDefault();
      if (!supabase || !state.user) { alert("Няма активен вход в системата."); return; }
      const { error } = await supabase.from("manual_ideas").insert({ user_id: state.user.id, brand_id: state.brand?.id || null, title: document.querySelector("#ideaTitle").value.trim(), notes: document.querySelector("#ideaNotes").value.trim() });
      if (error) { alert("Грешка при запис: " + error.message); return; }
      await render("idea");
    });
  }
  document.querySelectorAll(".delete").forEach(button => button.addEventListener("click", () => {
    if (!supabase || !state.user) return;
    const item = state.ideas[Number(button.dataset.index)];
    const { error } = await supabase.from("manual_ideas").delete().eq("id", item.id);
    if (error) { alert("Грешка при изтриване: " + error.message); return; }
    await render("idea");
  }));
}
render();
