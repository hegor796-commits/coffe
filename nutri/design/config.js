// Настройки подключения мини-аппа к бэкенду.
// После деплоя бэкенда на Railway впишите сюда его публичный адрес
// (Settings → Networking → Public Domain) и закоммитьте — GitHub Pages
// передеплоится сам.
window.LM_CONFIG = {
    apiBase: 'https://REPLACE-WITH-YOUR-RAILWAY-URL.up.railway.app',
    // Кофейня по умолчанию. Для мультитенанта каждая кнопка бота ведёт на
    // свою ссылку вида ?t=slug — тогда этот дефолт не используется.
    tenant: 'lubov',
};
