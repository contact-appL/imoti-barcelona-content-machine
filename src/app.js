let supabaseClient = null;
let supabaseError = null;

async function initSupabase() {
  if (supabaseClient || supabaseError) return;
  try {
    const config = window.SUPABASE_CONFIG || {};
    if (!config.url || !config.publishableKey) return;
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    supabaseClient = createClient(config.url, config.publishableKey);
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
  if (!supabaseClient) return;
  try {
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError) throw userError;
    state.user = user;
    if (!user) return;
    const [ideas, topics, posts, brands] = await Promise.all([
      supabaseClient.from("manual_ideas").select("*").order("created_at", { ascending: false }),
      supabaseClient.from("topics").select("*").order("created_at", { ascending: false }),
      supabaseClient.from("posts").select("*").order("created_at", { ascending: false }),
      supabaseClient.from("brands").select("*").order("created_at", { ascending: true }).limit(1)
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
    <div class="notice"><strong>${supabaseClient ? "Supabase е свързан." : "Supabase още не е конфигуриран."}</strong> ${state.user ? "Dashboard-ът чете реални данни от твоя workspace." : "Следващата стъпка е вход в системата."}</div>
    <div class="grid">
      <div class="card"><h3>Inbox</h3><div class="metric">${state.topics.filter(t => t.status === "inbox").length}</div><span class="badge">актуални теми</span></div>
      <div class="card"><h3>Одобрени теми</h3><div class="metric">${state.topics.filter(t => t.status === "approved").length}</div><span class="badge">за създаване</span></div>
      <div class="card"><h3>Мои идеи</h3><div class="metric">${state.ideas.length}</div><span class="badge">в Supabase</span></div>
      <div class="card"><h3>Тази седмица</h3><div class="metric">${state.posts.length}</div><span class="badge">записани публикации</span></div>
    </div>
    <div class="card section-card"><h2>Следваща стъпка</h2><p>Когато свържем Supabase, тези данни ще станат лични за твоя workspace и няма да се губят при смяна на устройство.</p></div>
  `;
}
function inbox() { return `<h1>Inbox</h1><p class="subtitle">Тук ще влизат 10-те най-релевантни теми от Content Hunter.</p><div class="empty card"><strong>Все още няма събрани теми.</strong><p>Inbox вече е свързан със Supabase и ще показва реални теми, когато Content Hunter започне да ги записва.</p></div>`; }
function approved() { return placeholder("Одобрени теми","Тук ще се появяват темите, които си одобрила от Inbox."); }
function create() {
  const topics = state.topics.filter(t => t.status === "approved" || t.status === "inbox");
  return `
    <h1>Създай публикация</h1>
    <p class="subtitle">Избери тема или въведи своя и генерирай готов текст за Facebook/Instagram.</p>
    <div class="card form-card">
      <label>Тема
        <select id="postTopic">
          <option value="">— Избери тема —</option>
          ${topics.map(t => `<option value="${esc(t.id)}">${esc(t.title || t.name || "Без заглавие")}</option>`).join("")}
        </select>
      </label>
      <label>Или въведи собствена тема
        <input id="manualPostTopic" maxlength="200" placeholder="Напр. Цените на имотите в Барселона през 2026 г.">
      </label>
      <button class="primary" id="generatePost" type="button">Генерирай публикация</button>
    </div>
    <div id="generatedPost"></div>
  `;
}

function buildPost(topic) {
  const title = topic.trim();
  const content = `🏠 ${title}

Какво е важно да знаете, ако обмисляте покупка на имот в Барселона?

Пазарът се променя постоянно и доброто решение започва с актуална информация, реалистичен бюджет и ясна стратегия. Преди да направите следващата си стъпка, проверете района, цената, разходите по сделката и потенциала на имота.

Ако търсите имот в Барселона или искате професионална насока, можем да ви помогнем да се ориентирате по-лесно и уверено.`;

  const cta = "📲 Пиши ни директно в WhatsApp за консултация и актуални предложения.";
  const hashtags = "#ИмотиВБарселона #ИмотиИспания #Барселона #ИнвестицияВИмот #БългариВИспания";
  const alt = `Имот в Барселона, Испания — ${title}`;
  const visual = `Реалистична професионална снимка на модерен имот или улица в Барселона, естествена светлина, минималистичен премиум стил, без текст върху изображението.`;

  return { title, content, cta, hashtags, alt, visual };
}

function generatedPostHtml(post) {
  return `
    <div class="card section-card">
      <h2>Готова публикация</h2>
      <label>Текст<textarea id="postContent" rows="10">${esc(post.content)}</textarea></label>
      <label>CTA<input id="postCta" value="${esc(post.cta)}"></label>
      <label>Hashtags<input id="postHashtags" value="${esc(post.hashtags)}"></label>
      <label>Alt text<input id="postAlt" value="${esc(post.alt)}"></label>
      <label>Визуална задача<textarea id="postVisual" rows="4">${esc(post.visual)}</textarea></label>
      <div class="form-actions">
        <button class="primary" id="savePost" type="button">Запази публикацията</button>
        <button class="ghost" id="copyPost" type="button">Копирай текста</button>
      </div>
      <p id="postStatus" class="subtitle"></p>
    </div>
  `;
}

function idea() {
  return `<h1>Моя идея</h1><p class="subtitle">Добави идея спонтанно, без да чакаш Content Hunter.</p><form id="ideaForm" class="card form-card"><label>Заглавие на идеята<input id="ideaTitle" required maxlength="140" placeholder="Напр. Какво трябва да знае родителят преди да купи имот за студент?"></label><label>Бележки<textarea id="ideaNotes" rows="5" placeholder="Какво искаш да кажем, покажем или проверим?"></textarea></label><button class="primary" type="submit">Запази идеята</button></form><div class="section-card"><h2>Запазени идеи</h2>${state.ideas.length ? state.ideas.map((item,index) => `<div class="list-item"><div><strong>${esc(item.title)}</strong><p>${esc(item.notes || "Без бележки")}</p><small>${esc(item.created_at || "")}</small></div><button class="ghost delete" data-index="${index}">Изтрий</button></div>`).join("") : '<div class="empty card">Все още няма идеи.</div>'}</div>`;
}
function calendar() { return placeholder("Календар","Тук ще виждаш седмичния график и реалните статуси Draft, Ready, Scheduled, Published и Error."); }
function archive() { return placeholder("Архив","Тук ще остава историята на създаденото и публикуваното съдържание."); }
function brand() { return `<h1>Моят бранд</h1><p class="subtitle">Основните настройки, върху които Content Machine ще стъпва.</p><div class="grid"><div class="card"><h3>Позициониране</h3><p>„Ние сме до клиента, не до агенцията.“</p></div><div class="card"><h3>Основен CTA</h3><p>WhatsApp: 34691917074</p></div><div class="card"><h3>Език</h3><p>Български</p></div><div class="card"><h3>Визия</h3><p>Бяло, сиво, черно · минималистично · професионално · реалистична фотография</p></div></div><div class="card section-card"><h2>Основни аудитории</h2><ul><li>Български родители на студенти</li><li>Българи с капитал за инвестиция</li><li>Млади двойки за първо жилище</li><li>Българи, които живеят или се местят в Испания</li></ul></div>`; }

async function profile() {
  if (!state.user) return `<h1>Моят профил</h1><div class="empty card"><strong>Няма активна сесия.</strong><p>Излез и влез отново, за да заредим личния ти профил.</p></div>`;
  try {
    let profileData = null;
    const result = await supabaseClient.from("profiles").select("*").eq("id", state.user.id).maybeSingle();
    if (result.error) console.warn("Profile load warning:", result.error);
    profileData = result.data || null;
    if (!state.brand) {
      const created = await supabaseClient.from("brands").insert({ user_id: state.user.id, name: "Имоти в Барселона", description: "Помощ на българи при покупка на имот в Барселона, Каталуния и Испания.", positioning: "Ние сме до клиента, не до агенцията.", primary_language: "bg", country: "Spain", regions: ["Barcelona","Badalona","Santa Coloma","L’Hospitalet","Torrevieja"], audiences: ["Български родители на студенти","Българи с капитал за инвестиция","Млади двойки за първо жилище","Българи, които живеят или се местят в Испания"], content_pillars: ["Покупка на имот","Инвестиции","Студенти","Първо жилище","Живот в Испания","Пазар и новини","Квартали","Реални оферти"], visual_style: "Бяло, сиво, черно; минималистично, професионално, елегантно; реалистична фотография.", default_cta: "Пиши ни директно в WhatsApp.", whatsapp_url: "https://wa.me/34691917074", instagram_url: "https://www.instagram.com/imotibarcelona/" }).select("*").single();
      if (created.error) console.warn("Brand creation warning:", created.error); else state.brand = created.data;
    }
    const b = state.brand || {};
    return `<h1>Моят профил</h1><p class="subtitle">Тук въвеждаш информацията, която машината ще използва за твоя бранд и социалните профили.</p><div class="card section-card"><h2>Личен профил</h2><form id="profileForm" class="form-card"><label>Име<input id="profileName" value="${esc(profileData?.full_name || "")}" placeholder="Твоето име"></label><label>Имейл<input value="${esc(state.user.email || "")}" disabled></label><button class="primary" type="submit">Запази профила</button></form></div><div class="card section-card"><h2>Социални профили</h2><form id="brandProfilesForm" class="form-card"><label>Instagram<input id="instagramUrl" type="url" value="${esc(b.instagram_url || "")}" placeholder="https://www.instagram.com/..."></label><label>Facebook<input id="facebookUrl" type="url" value="${esc(b.facebook_url || "")}" placeholder="https://www.facebook.com/..."></label><label>TikTok<input id="tiktokUrl" type="url" value="${esc(b.tiktok_url || "")}" placeholder="https://www.tiktok.com/@..."></label><label>WhatsApp<input id="whatsappUrl" type="url" value="${esc(b.whatsapp_url || "")}" placeholder="https://wa.me/..."></label><button class="primary" type="submit">Запази социалните профили</button></form></div><div class="card section-card"><h2>Бранд</h2><p><strong>Имоти в Барселона</strong></p><p>Тук по-късно ще можем да редактираме аудитории, теми, CTA, райони, визуален стил и източници.</p></div>`;
  } catch (error) { console.error("Profile page failed:", error); return `<h1>Моят профил</h1><div class="empty card"><strong>Профилът не можа да се зареди.</strong><p>Системата е влязла успешно, но има проблем при зареждането на данните. Не е необходимо да променяш нищо — ще го поправим от системата.</p></div>`; }
}
function settings() { return placeholder("Настройки","Тук ще управляваме честота, предпочитани часове, източници, формати и други настройки."); }
function integrations() {
  const supabaseStatus = supabaseClient ? "Свързан" : "Не е свързан";
  const supabaseClass = supabaseClient ? "connected" : "disconnected";
  return `<h1>Интеграции</h1><p class="subtitle">Тук виждаш реалното състояние на интеграциите. Няма да маркираме услуга като свързана, ако няма истинска интеграция.</p><div class="grid"><div class="card"><h3>Supabase</h3><span class="badge ${supabaseClass}">${supabaseStatus}</span><p>${supabaseClient ? "Supabase е активен: входът работи и приложението чете/записва данни от твоя workspace." : "Supabase не е конфигуриран в приложението."}</p></div><div class="card"><h3>Meta</h3><span class="badge disconnected">Не е свързан</span><p>Facebook/Instagram профилите могат да бъдат записани като адреси, но реалното Meta OAuth свързване и разрешенията за публикуване още не са настроени.</p><p><strong>Следваща фаза:</strong> свързване на Meta OAuth, Facebook Page и Instagram Business/Professional account.</p></div><div class="card"><h3>WhatsApp</h3><span class="badge disconnected">Не е свързан</span><p>В момента имаме WhatsApp контакт/линк, но не и WhatsApp Business API интеграция.</p></div></div>`;
}
function placeholder(title,text) { return `<h1>${title}</h1><p class="subtitle">${text}</p><div class="empty card"><strong>Подготвено за следващата фаза.</strong><p>Няма да симулираме функционалност, която още не е свързана.</p></div>`; }

const pages = {dashboard, inbox, approved, create, idea, calendar, archive, profile, brand, settings, integrations};

async function render(route = "dashboard") {
  await loadData();
  if (!state.user) {
    navigation.innerHTML = "";
    app.innerHTML = authPanel();
    const authSwitch = document.querySelector("#authSwitch");
    if (authSwitch) authSwitch.addEventListener("click", () => { state.authMode = state.authMode === "login" ? "register" : "login"; state.authMessage = ""; render("dashboard"); });
    const authForm = document.querySelector("#authForm");
    if (authForm) authForm.addEventListener("submit", async event => {
      event.preventDefault();
      state.authMessage = "";
      const email = document.querySelector("#authEmail").value.trim();
      const password = document.querySelector("#authPassword").value;
      if (!supabaseClient) { state.authMessage = "Supabase не е конфигуриран."; await render("dashboard"); return; }
      const result = state.authMode === "register"
        ? await supabaseClient.auth.signUp({ email, password, options: { emailRedirectTo: "https://contact-appl.github.io/imoti-barcelona-content-machine/" } })
        : await supabaseClient.auth.signInWithPassword({ email, password });
      if (result.error) { state.authMessage = result.error.message; await render("dashboard"); return; }
      if (state.authMode === "register" && !result.data.session) { state.authMessage = "Регистрацията е създадена. Провери имейла си и потвърди адреса, след което влез."; state.authMode = "login"; await render("dashboard"); return; }
      state.user = result.data.user;
      state.authMessage = "";
      await render("dashboard");
    });
    return;
  }
  const page = pages[route] || dashboard;
  navigation.innerHTML = nav.map(([key,label]) => `<button class="${key === route ? "active" : ""}" data-route="${key}">${label}</button>`).join("");
  navigation.insertAdjacentHTML("beforeend", '<button class="logout" id="logoutButton">Изход</button>');
  const logoutButton = document.querySelector("#logoutButton");
  logoutButton.addEventListener("click", async () => { await supabaseClient?.auth.signOut(); state.user = null; state.ideas = []; state.topics = []; state.posts = []; state.brand = null; state.authMode = "login"; await render("dashboard"); });
  app.innerHTML = await page();
  navigation.querySelectorAll("[data-route]").forEach(button => button.addEventListener("click", () => render(button.dataset.route)));
  const profileForm = document.querySelector("#profileForm");
  if (profileForm) profileForm.addEventListener("submit", async event => { event.preventDefault(); const { error } = await supabaseClient.from("profiles").upsert({ id: state.user.id, full_name: document.querySelector("#profileName").value.trim(), updated_at: new Date().toISOString() }); alert(error ? "Грешка при запис: " + error.message : "Профилът е записан."); });
  const brandProfilesForm = document.querySelector("#brandProfilesForm");
  if (brandProfilesForm) brandProfilesForm.addEventListener("submit", async event => { event.preventDefault(); if (!state.brand) { alert("Брандът още не е създаден."); return; } const { data, error } = await supabaseClient.from("brands").update({ instagram_url: document.querySelector("#instagramUrl").value.trim(), facebook_url: document.querySelector("#facebookUrl").value.trim(), tiktok_url: document.querySelector("#tiktokUrl").value.trim(), whatsapp_url: document.querySelector("#whatsappUrl").value.trim() }).eq("id", state.brand.id).select("*").single(); if (error) { alert("Грешка при запис: " + error.message); return; } state.brand = data; alert("Социалните профили са записани."); });
  const generatePost = document.querySelector("#generatePost");
  if (generatePost) generatePost.addEventListener("click", async () => {
    const selectedId = document.querySelector("#postTopic")?.value;
    const manualTopic = document.querySelector("#manualPostTopic")?.value.trim();
    const selected = state.topics.find(t => String(t.id) === String(selectedId));
    const topic = (selected?.title || selected?.name || manualTopic || "").trim();
    const target = document.querySelector("#generatedPost");
    if (!topic) {
      if (target) target.innerHTML = '<div class="empty card"><strong>Избери или въведи тема.</strong></div>';
      return;
    }
    const post = buildPost(topic);
    if (target) target.innerHTML = generatedPostHtml(post);
    const copyPost = document.querySelector("#copyPost");
    if (copyPost) copyPost.addEventListener("click", async () => {
      const textToCopy = [document.querySelector("#postContent")?.value, document.querySelector("#postCta")?.value, document.querySelector("#postHashtags")?.value].filter(Boolean).join("\n\n");
      await navigator.clipboard.writeText(textToCopy);
      document.querySelector("#postStatus").textContent = "Копирано. Можеш да го поставиш във Facebook или Instagram.";
    });
    const savePost = document.querySelector("#savePost");
    if (savePost) savePost.addEventListener("click", async () => {
      if (!supabaseClient || !state.user) {
        document.querySelector("#postStatus").textContent = "Готово за копиране. Няма активен вход за запис в Supabase.";
        return;
      }
      const payload = {
        user_id: state.user.id,
        brand_id: state.brand?.id || null,
        topic_id: selected?.id || null,
        title: post.title,
        content: document.querySelector("#postContent").value,
        cta: document.querySelector("#postCta").value,
        hashtags: document.querySelector("#postHashtags").value,
        alt_text: document.querySelector("#postAlt").value,
        visual_task: document.querySelector("#postVisual").value,
        status: "draft"
      };
      let data = null;
      let error = null;
      const adaptivePayload = { ...payload };
      for (let attempt = 0; attempt < 8; attempt += 1) {
        const result = await supabaseClient.from("posts").insert(adaptivePayload).select("*").single();
        data = result.data;
        error = result.error;
        if (!error) break;
        const match = String(error.message || "").match(/Could not find the '([^']+)' column of 'posts'/i);
        if (!match || !(match[1] in adaptivePayload)) break;
        delete adaptivePayload[match[1]];
      }
      if (error) {
        document.querySelector("#postStatus").textContent = "Публикацията е генерирана, но не беше записана: " + error.message;
        return;
      }
      state.posts.unshift(data);
      document.querySelector("#postStatus").textContent = "Публикацията е записана като Draft.";
    });
  });

  const form = document.querySelector("#ideaForm");
  if (form) form.addEventListener("submit", async event => { event.preventDefault(); if (!supabaseClient || !state.user) { alert("Няма активен вход в системата."); return; } const { error } = await supabaseClient.from("manual_ideas").insert({ user_id: state.user.id, brand_id: state.brand?.id || null, title: document.querySelector("#ideaTitle").value.trim(), notes: document.querySelector("#ideaNotes").value.trim() }); if (error) { alert("Грешка при запис: " + error.message); return; } await render("idea"); });
  document.querySelectorAll(".delete").forEach(button => button.addEventListener("click", async () => { if (!supabaseClient || !state.user) return; const item = state.ideas[Number(button.dataset.index)]; const { error } = await supabaseClient.from("manual_ideas").delete().eq("id", item.id); if (error) { alert("Грешка при изтриване: " + error.message); return; } await render("idea"); }));
}
render();
