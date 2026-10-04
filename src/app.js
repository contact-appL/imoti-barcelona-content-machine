let supabase = null;
let supabaseError = null;

async function initSupabase() {
  if (supabase || supabaseError) return;
  try {
    const config = window.SUPABASE_CONFIG || {};
    if (!config.url || !config.publishableKey) return;
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    supabase = createClient(config.url, config.publishableKey);
  } catch (error) {
    console.error("Supabase init failed:", error);
    supabaseError = error;
  }
}

const nav = [["dashboard","⌂ Dashboard"],["inbox","Inbox"],["approved","Одобрени теми"],["create","Създай публикация"],["idea","Моя идея"],["calendar","Календар"],["archive","Архив"],["profile","Моят профил"],["brand","Моят бранд"],["settings","Настройки"],["integrations","Интеграции"]];
const navigation = document.querySelector("#navigation");
const app = document.querySelector("#app");

const state = { ideas: [], topics: [], posts: [], brand: null, user: null, authMode: "login", authMessage: "" };

async function loadData() {
  await initSupabase();
  if (!supabase) return;
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;
    state.user = user;
    if (!user) return;
    const [ideas, topics, posts, brands] = await Promise.all([
      supabase.from("manual_ideas").select("*").order("created_at", { ascending: false }),
      supabase.from("topics").select("*").order("created_at", { ascending: false }),
      supabase.from("posts").select("*").order("created_at", { ascending: false }),
      supabase.from("brands").select("*").order("created_at", { ascending: true }).limit(1)
    ]);
    if (ideas.error) throw ideas.error;
    if (topics.error) throw topics.error;
    if (posts.error) throw posts.error;
    if (brands.error) throw brands.error;
    state.ideas = ideas.data || [];
    state.topics = topics.data || [];
    state.posts = posts.data || [];
    state.brand = brands.data?.[0] || null;
  } catch (error) {
    console.error("Supabase data load failed:", error);
  }
}

const esc = value => String(value ?? "").replace(/[&<>"']/g, ch => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;" }[ch]));

function authPanel() {
  const isRegister = state.authMode === "register";
  return `
    <div class="auth-wrap">
      <div class="auth-card">
        <div class="auth-brand">Имоти в Барселона</div>
        <h1>${isRegister ? "Създай акаунт" : "Вход"}</h1>
        <p class="subtitle">${isRegister ? "Създай личен workspace за Content Machine." : "Влез в своя Content Machine workspace."}</p>
        ${state.authMessage ? `<div class="auth-message">${esc(state.authMessage)}</div>` : ""}
        <form id="authForm" class="form-card">
          <label>Имейл<input id="authEmail" type="email" required autocomplete="email" placeholder="you@example.com"></label>
          <label>Парола<input id="authPassword" type="password" required minlength="6" autocomplete="${isRegister ? "new-password" : "current-password"}" placeholder="Минимум 6 символа"></label>
          <button class="primary" type="submit">${isRegister ? "Регистрация" : "Вход"}</button>
        </form>
        <button class="auth-switch" id="authSwitch">${isRegister ? "Вече имам акаунт → Вход" : "Нямам акаунт → Регистрация"}</button>
      </div>
    </div>
  `;
}

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
      <div class="list-item"><div><strong>${esc(item.title)}</strong><p>${esc(item.notes || "Без бележки")}</p><small>${esc(item.created_at || "")}</small></div><button class="ghost delete" data-index="${index}">Изтрий</button></div>`).join("") : '<div class="empty card">Все още няма идеи.</div>'}</div>
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

async function profile() {
  if (!state.user) return "";
  let profileData = null;
  const result = await supabase.from("profiles").select("*").eq("id", state.user.id).maybeSingle();
  if (!result.error) profileData = result.data;
  if (!state.brand) {
    const created = await supabase.from("brands").insert({
      user_id: state.user.id,
      name: "Имоти в Барселона",
      description: "Помощ на българи при покупка на имот в Барселона, Каталуния и Испания.",
      positioning: "Ние сме до клиента, не до агенцията.",
      primary_language: "bg",
      country: "Spain",
      regions: ["Barcelona","Badalona","Santa Coloma","L’Hospitalet","Torrevieja"],
      audiences: ["Български родители на студенти","Българи с капитал за инвестиция","Млади двойки за първо жилище","Българи, които живеят или се местят в Испания"],
      content_pillars: ["Покупка на имот","Инвестиции","Студенти","Първо жилище","Живот в Испания","Пазар и новини","Квартали","Реални оферти"],
      visual_style: "Бяло, сиво, черно; минималистично, професионално, елегантно; реалистична фотография.",
      default_cta: "Пиши ни директно в WhatsApp.",
      whatsapp_url: "https://wa.me/34691917074",
      instagram_url: "https://www.instagram.com/imotibarcelona/"
    }).select("*").single();
    if (!created.error) state.brand = created.data;
  }
  const b = state.brand || {};
  return `
    <h1>Моят профил</h1>
    <p class="subtitle">Тук въвеждаш информацията, която машината ще използва за твоя бранд и социалните профили.</p>
    <div class="card section-card">
      <h2>Личен профил</h2>
      <form id="profileForm" class="form-card">
        <label>Име<input id="profileName" value="${esc(profileData?.full_name || "")}" placeholder="Твоето име"></label>
        <label>Имейл<input value="${esc(state.user.email || "")}" disabled></label>
        <button class="primary" type="submit">Запази профила</button>
      </form>
    </div>
    <div class="card section-card">
      <h2>Социални профили</h2>
      <form id="brandProfilesForm" class="form-card">
        <label>Instagram<input id="instagramUrl" type="url" value="${esc(b.instagram_url || "")}" placeholder="https://www.instagram.com/..."></label>
        <label>Facebook<input id="facebookUrl" type="url" value="${esc(b.facebook_url || "")}" placeholder="https://www.facebook.com/..."></label>
        <label>TikTok<input id="tiktokUrl" type="url" value="${esc(b.tiktok_url || "")}" placeholder="https://www.tiktok.com/@..."></label>
        <label>WhatsApp<input id="whatsappUrl" type="url" value="${esc(b.whatsapp_url || "")}" placeholder="https://wa.me/..."></label>
        <button class="primary" type="submit">Запази социалните профили</button>
      </form>
    </div>
    <div class="card section-card">
      <h2>Бранд</h2>
      <p><strong>Имоти в Барселона</strong></p>
      <p>Следващата стъпка е тук да направим всички бранд настройки editable — аудитории, теми, CTA, райони, визуален стил и източници.</p>
    </div>
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

const pages = {dashboard, inbox, approved, create, idea, calendar, archive, profile, brand, settings, integrations};

async function render(route = "dashboard") {
  await loadData();
  const page = pages[route] || dashboard;
  navigation.innerHTML = nav.map(([key,label]) => `<button class="${key === route ? "active" : ""}" data-route="${key}">${label}</button>`).join("");
  navigation.insertAdjacentHTML("beforeend", '<button class="logout" id="logoutButton">Изход</button>');
  const logoutButton = document.querySelector("#logoutButton");
  logoutButton.addEventListener("click", async () => {
    await supabase?.auth.signOut();
    state.user = null;
    state.ideas = [];
    state.topics = [];
    state.posts = [];
    state.brand = null;
    state.authMode = "login";
    await render("dashboard");
  });
  app.innerHTML = await page();
  navigation.querySelectorAll("[data-route]").forEach(button => button.addEventListener("click", () => render(button.dataset.route)));
  const profileForm = document.querySelector("#profileForm");
  if (profileForm) profileForm.addEventListener("submit", async event => {
    event.preventDefault();
    const { error } = await supabase.from("profiles").upsert({ id: state.user.id, full_name: document.querySelector("#profileName").value.trim(), updated_at: new Date().toISOString() });
    alert(error ? "Грешка при запис: " + error.message : "Профилът е записан.");
  });
  const brandProfilesForm = document.querySelector("#brandProfilesForm");
  if (brandProfilesForm) brandProfilesForm.addEventListener("submit", async event => {
    event.preventDefault();
    if (!state.brand) { alert("Брандът още не е създаден."); return; }
    const { data, error } = await supabase.from("brands").update({
      instagram_url: document.querySelector("#instagramUrl").value.trim(),
      facebook_url: document.querySelector("#facebookUrl").value.trim(),
      tiktok_url: document.querySelector("#tiktokUrl").value.trim(),
      whatsapp_url: document.querySelector("#whatsappUrl").value.trim()
    }).eq("id", state.brand.id).select("*").single();
    if (error) { alert("Грешка при запис: " + error.message); return; }
    state.brand = data;
    alert("Социалните профили са записани.");
  });
  const form = document.querySelector("#ideaForm");
  if (form) {
    form.addEventListener("submit", async event => {
      event.preventDefault();
      if (!supabase || !state.user) { alert("Няма активен вход в системата."); return; }
      const { error } = await supabase.from("manual_ideas").insert({ user_id: state.user.id, brand_id: state.brand?.id || null, title: document.querySelector("#ideaTitle").value.trim(), notes: document.querySelector("#ideaNotes").value.trim() });
      if (error) { alert("Грешка при запис: " + error.message); return; }
      await render("idea");
    });
  }
  document.querySelectorAll(".delete").forEach(button => button.addEventListener("click", async () => {
    if (!supabase || !state.user) return;
    const item = state.ideas[Number(button.dataset.index)];
    const { error } = await supabase.from("manual_ideas").delete().eq("id", item.id);
    if (error) { alert("Грешка при изтриване: " + error.message); return; }
    await render("idea");
  }));
}
render();
