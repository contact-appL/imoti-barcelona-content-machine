const pages = {
  dashboard: { title: "Dashboard", render: () => `
    <h1>Добре дошла</h1>
    <p class="subtitle">Това е основата на твоята Content Machine.</p>
    <div class="notice"><strong>V1:</strong> интерфейсът е готов като основа. Supabase, автоматичният Content Hunter и Meta publishing ще се включат само след реална интеграция и тест.</div>
    <div class="grid">
      <div class="card"><h3>Inbox</h3><div class="metric">0</div><span class="badge">Теми</span></div>
      <div class="card"><h3>Одобрени теми</h3><div class="metric">0</div><span class="badge">Готови за работа</span></div>
      <div class="card"><h3>Тази седмица</h3><div class="metric">0</div><span class="badge">Публикации</span></div>
      <div class="card"><h3>Моя идея</h3><div class="metric">+</div><span class="badge">Добави идея</span></div>
    </div>` },
  inbox: { title: "Inbox", render: () => section("Inbox", "Тук ще се показват препоръчани актуални теми след изграждането на Content Hunter.") },
  approved: { title: "Одобрени теми", render: () => section("Одобрени теми", "Теми, които си одобрила за създаване на публикация.") },
  create: { title: "Създай публикация", render: () => section("Създай публикация", "Тук ще се генерират текст, CTA, 5 hashtags, alt text и визуална задача.") },
  idea: { title: "Моя идея", render: () => section("Моя идея", "Добави собствена идея за публикация.") },
  calendar: { title: "Календар", render: () => section("Календар", "Седмичният календар ще показва Draft, Ready, Scheduled, Published и Error.") },
  archive: { title: "Архив", render: () => section("Архив", "История на публикациите.") },
  brand: { title: "Моят бранд", render: () => section("Моят бранд", "Профилът на „Имоти в Барселона“, аудиторията, позиционирането, районите и визуалният стил.") },
  settings: { title: "Настройки", render: () => section("Настройки", "Общи настройки на workspace-а.") },
  integrations: { title: "Интеграции", render: () => section("Интеграции", "Supabase и Meta ще бъдат свързвани и проверявани тук. В момента не са маркирани като активни.") }
};
const nav = [["dashboard","⌂ Dashboard"],["inbox","Inbox"],["approved","Одобрени теми"],["create","Създай публикация"],["idea","Моя идея"],["calendar","Календар"],["archive","Архив"],["brand","Моят бранд"],["settings","Настройки"],["integrations","Интеграции"]];
const navigation = document.querySelector("#navigation");
const app = document.querySelector("#app");
function section(title, text) { return `<h1>${title}</h1><p class="subtitle">${text}</p><div class="card"><strong>V1 Foundation</strong><p>Функцията е подготвена като интерфейс, но още не е свързана с база данни или външен API.</p></div>`; }
function render(route = "dashboard") {
  const page = pages[route] || pages.dashboard;
  navigation.innerHTML = nav.map(([key,label]) => `<button class="${key === route ? "active" : ""}" data-route="${key}">${label}</button>`).join("");
  app.innerHTML = page.render();
  navigation.querySelectorAll("[data-route]").forEach(button => button.addEventListener("click", () => render(button.dataset.route)));
}
render();
