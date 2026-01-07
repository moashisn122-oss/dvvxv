const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const { createCanvas } = require('canvas');

// Конфигурация
const token = '8542226759:AAHjBAbuqfTnqFoAzfU_k7bjuQkRFa4XUlY';
const bot = new TelegramBot(token, { polling: true });

// Файлы для хранения данных
const dataFile = 'dates.json';
const lastNotifyFile = 'lastNotify.json';
const notifySettingsFile = 'notifySettings.json';
const partnerUsernamesFile = 'partnerUsernames.json';
const milestonesFile = 'milestones.json';
const themesFile = 'themes.json';
const usersStatsFile = 'usersStats.json';

// Загрузка данных из файлов
function loadData(file) {
  try {
    if (fs.existsSync(file)) {
      return JSON.parse(fs.readFileSync(file, 'utf8'));
    }
  } catch (err) {
    console.error(`Ошибка при загрузке файла ${file}:`, err);
  }
  return {};
}

// Сохранение данных в файл
function saveData(file, data) {
  try {
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error(`Ошибка при сохранении файла ${file}:`, err);
  }
}

// Загружаем данные
let dates = loadData(dataFile);
let lastNotify = loadData(lastNotifyFile);
let notifySettings = loadData(notifySettingsFile);
let partnerUsernames = loadData(partnerUsernamesFile);
let milestones = loadData(milestonesFile);
let themes = loadData(themesFile);
let usersStats = loadData(usersStatsFile);
usersStats.totalUsers = usersStats.totalUsers || 0;
usersStats.users = usersStats.users || {};

// Список цитат о любви
const loveQuotes = [
  "Любовь — это когда счастье другого человека важнее твоего собственного.",
  "Любить — это не значит смотреть друг на друга, любить — значит вместе смотреть в одном направлении. (Антуан де Сент-Экзюпери)",
  "Любовь не состоит в том, чтобы смотреть друг на друга, а в том, чтобы вместе смотреть в одном направлении.",
  "Любовь — это не только чувство, это искусство, которое нужно учиться понимать.",
  "Счастье — это когда тебя понимают, большое счастье — это когда тебя любят, настоящее счастье — это когда любишь ты."
];

// Список советов для пар
const loveTips = [
  "Уделите сегодня 10 минут, чтобы поговорить о своих мечтах и планах на будущее.",
  "Сделайте друг другу комплимент — это всегда поднимает настроение!",
  "Попробуйте вместе приготовить новое блюдо — это весело и сближает.",
  "Напишите друг другу письмо с благодарностью за то, что вы вместе.",
  "Посмотрите вместе фильм или сериал, который давно хотели увидеть."
];

// Темы оформления
const availableThemes = {
  romantic: {
    name: "Романтическая",
    emoji: "💖",
    color: "розовый"
  },
  minimal: {
    name: "Минималистичная",
    emoji: "⚪",
    color: "серый"
  },
  holiday: {
    name: "Праздничная",
    emoji: "🎉",
    color: "золотой"
  }
};

// Получение случайной цитаты
function getRandomLoveQuote() {
  const randomIndex = Math.floor(Math.random() * loveQuotes.length);
  return loveQuotes[randomIndex];
}

// Получение случайного совета
function getRandomLoveTip() {
  const randomIndex = Math.floor(Math.random() * loveTips.length);
  return loveTips[randomIndex];
}

// Главное меню
function getMainMenu(chatId) {
  const isNotifyEnabled = notifySettings[chatId] || false;
  const notifyButtonText = isNotifyEnabled ? '🔔 Отключить ежедневные уведомления' : '🔔 Включить ежедневные уведомления';

  return {
    reply_markup: {
      keyboard: [
        [{ text: '📅 Установить дату начала отношений' }],
        [{ text: '❤️ Сколько мы вместе?' }],
        [{ text: notifyButtonText }],
        [{ text: '📊 График отношений' }],
        [{ text: '🎯 Вехи отношений' }],
        [{ text: '💡 Совет на день' }],
        [{ text: '🎨 Изменить тему оформления' }],
        [{ text: '❓ Помощь' }]
      ],
      resize_keyboard: true
    }
  };
}

// Функция для подсчёта месяцев и дней
function getMonthsAndDays(startDate, endDate) {
  let months = endDate.getMonth() - startDate.getMonth();
  let days = endDate.getDate() - startDate.getDate();
  let years = endDate.getFullYear() - startDate.getFullYear();

  if (days < 0) {
    months--;
    days += new Date(endDate.getFullYear(), endDate.getMonth(), 0).getDate();
  }

  if (months < 0) {
    years--;
    months += 12;
  }

  return { years, months, days };
}

// Функция для склонения слов
function declension(num, words) {
  const cases = [2, 0, 1, 1, 1, 2];
  return words[(num % 100 > 4 && num % 100 < 20) ? 2 : cases[(num % 10 < 5) ? num % 10 : 5]];
}

// Проверка важных вех
function checkMilestones(chatId, totalDays) {
  const importantMilestones = [100, 200, 365, 500, 730];
  if (!milestones[chatId]) {
    milestones[chatId] = [];
  }

  for (const day of importantMilestones) {
    if (totalDays >= day && !milestones[chatId].includes(day)) {
      milestones[chatId].push(day);
      saveData(milestonesFile, milestones);
      const partnerUsername = partnerUsernames[chatId] ? `@${partnerUsernames[chatId]}` : 'вашей второй половинкой';
      bot.sendMessage(chatId, `🎉 Поздравляем! Вы достигли важной вехи: <b>${day} дней</b> вместе с ${partnerUsername}! 🎉`, { parse_mode: 'HTML' });
    }
  }
}

// Генерация графика отношений
async function generateRelationshipGraph(chatId, totalDays) {
  const canvas = createCanvas(600, 300);
  const ctx = canvas.getContext('2d');

  // Оформление
  ctx.fillStyle = '#f5f5f5';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Заголовок
  ctx.fillStyle = '#333';
  ctx.font = 'bold 16px Arial';
  ctx.fillText(`График ваших отношений: ${totalDays} дней`, 20, 30);

  // График
  ctx.strokeStyle = '#ff6b6b';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(50, 250);

  const points = [];
  for (let i = 0; i <= 12; i++) {
    const x = 50 + (i * 45);
    const y = 250 - Math.min((totalDays / 365 * 10 * i), 200);
    points.push({ x, y });
    ctx.lineTo(x, y);
  }

  ctx.stroke();

  // Подписи
  ctx.fillStyle = '#333';
  ctx.font = '12px Arial';
  points.forEach((point, i) => {
    ctx.fillText(`${Math.round((i / 12) * totalDays)}`, point.x - 10, canvas.height - 10);
  });

  // Сохраняем изображение
  const imagePath = `graph_${chatId}.png`;
  const out = fs.createWriteStream(imagePath);
  const stream = canvas.createPNGStream();
  stream.pipe(out);

  return new Promise((resolve) => {
    out.on('finish', () => resolve(imagePath));
  });
}

// Отправка уведомления пользователю
async function sendDailyNotification(chatId) {
  if (!dates[chatId] || !notifySettings[chatId]) {
    return;
  }

  const startDate = new Date(dates[chatId]);
  const today = new Date();
  const { years, months, days } = getMonthsAndDays(startDate, today);
  const totalDays = Math.floor((today - startDate) / (1000 * 60 * 60 * 24));

  checkMilestones(chatId, totalDays);

  let result = '';
  if (years > 0) {
    result += `${years} ${declension(years, ['год', 'года', 'лет'])} `;
  }
  if (months > 0 || years > 0) {
    result += `${months} ${declension(months, ['месяц', 'месяца', 'месяцев'])} `;
  }
  result += `${days} ${declension(days, ['день', 'дня', 'дней'])}`;

  const partnerUsername = partnerUsernames[chatId] ? `@${partnerUsernames[chatId]}` : 'вашей второй половинкой';
  const quote = getRandomLoveQuote();
  const tip = getRandomLoveTip();

  await bot.sendMessage(chatId, `💖 Сегодня вы с ${partnerUsername} уже: <b>${result}</b> (всего <b>${totalDays} дней</b>)! ❤️\n\n`
    + `💬 <i>Цитата дня:</i>\n<i>${quote}</i>\n\n`
    + `💡 <i>Совет на день:</i>\n<i>${tip}</i>`, { parse_mode: 'HTML', ...getMainMenu(chatId) });
}

// Проверка и отправка уведомлений всем пользователям
async function checkAndSendNotifications() {
  const now = new Date();
  const today = now.toISOString().split('T')[0];

  for (const chatId in dates) {
    if (notifySettings[chatId] && (!lastNotify[chatId] || lastNotify[chatId] !== today)) {
      try {
        await sendDailyNotification(chatId);
        lastNotify[chatId] = today;
      } catch (err) {
        console.error(`Ошибка при отправке уведомления пользователю ${chatId}:`, err);
      }
    }
  }

  saveData(lastNotifyFile, lastNotify);
}

// Запускаем проверку каждые 24 часа
setInterval(checkAndSendNotifications, 24 * 60 * 60 * 1000);

// Обновление статистики пользователей
function updateUserStats(msg) {
  const chatId = msg.chat.id;
  if (!usersStats.users[chatId]) {
    usersStats.users[chatId] = {
      firstName: msg.from.first_name || 'Пользователь',
      lastActive: new Date().toISOString(),
      joinDate: new Date().toISOString()
    };
    usersStats.totalUsers++;
  } else {
    usersStats.users[chatId].lastActive = new Date().toISOString();
  }
  saveData(usersStatsFile, usersStats);
}

// Обработка команды /start
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  updateUserStats(msg);
  bot.sendMessage(chatId, `🌟 Привет, ${msg.from.first_name || 'друг'}! 🌟\n\n`
    + 'Я бот, который поможет тебе отслеживать, сколько времени вы вместе с твоей второй половинкой! ❤️\n\n'
    + 'Что ты хочешь сделать?', getMainMenu(chatId));
});

// Обработка кнопки "Установить дату начала отношений"
bot.onText(/📅 Установить дату начала отношений/, (msg) => {
  const chatId = msg.chat.id;
  updateUserStats(msg);
  bot.sendMessage(chatId, '📅 Отправь мне дату в формате: <b>ГГГГ-ММ-ДД @username</b>\n'
    + 'Например: <code>2024-01-01 @username</code>\n\n'
    + 'Это дата, с которой вы начали встречаться. 😊', { parse_mode: 'HTML' });
});

// Обработка команды /setdate или ввода даты с username
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  updateUserStats(msg);
  const text = msg.text;

  // Проверяем, если пользователь отправил дату и username в формате ГГГГ-ММ-ДД @username
  const dateUsernameMatch = text.match(/^(\d{4}-\d{2}-\d{2})\s+(@\w+)$/);
  if (dateUsernameMatch) {
    const dateStr = dateUsernameMatch[1];
    const username = dateUsernameMatch[2];
    const date = new Date(dateStr);

    if (isNaN(date.getTime()) || date > new Date()) {
      bot.sendMessage(chatId, '❌ Неверный формат даты или дата в будущем. Попробуй ещё раз в формате: <b>ГГГГ-ММ-ДД @username</b>\n'
        + 'Например: <code>2024-01-01 @username</code>', { parse_mode: 'HTML' });
      return;
    }

    dates[chatId] = dateStr;
    partnerUsernames[chatId] = username;
    saveData(dataFile, dates);
    saveData(partnerUsernamesFile, partnerUsernames);
    bot.sendMessage(chatId, `✅ Дата установлена: <b>${dateStr}</b>!\n`
      + `Username второй половинки: <b>${username}</b>!\n\n`
      + 'Теперь ты можешь узнать, сколько времени вы вместе, нажав на кнопку: ❤️ <b>Сколько мы вместе?</b>', { parse_mode: 'HTML', ...getMainMenu(chatId) });
  }
});

// Обработка кнопки "Сколько мы вместе?"
bot.onText(/❤️ Сколько мы вместе\?/, async (msg) => {
  const chatId = msg.chat.id;
  updateUserStats(msg);
  if (!dates[chatId]) {
    bot.sendMessage(chatId, '❌ Сначала установи дату начала отношений, нажав на кнопку: 📅 <b>Установить дату начала отношений</b>', { parse_mode: 'HTML' });
    return;
  }

  const startDate = new Date(dates[chatId]);
  const today = new Date();
  const { years, months, days } = getMonthsAndDays(startDate, today);
  const totalDays = Math.floor((today - startDate) / (1000 * 60 * 60 * 24));

  checkMilestones(chatId, totalDays);

  let result = '';
  if (years > 0) {
    result += `${years} ${declension(years, ['год', 'года', 'лет'])} `;
  }
  if (months > 0 || years > 0) {
    result += `${months} ${declension(months, ['месяц', 'месяца', 'месяцев'])} `;
  }
  result += `${days} ${declension(days, ['день', 'дня', 'дней'])}`;

  const partnerUsername = partnerUsernames[chatId] ? `@${partnerUsernames[chatId]}` : 'вашей второй половинкой';
  const quote = getRandomLoveQuote();
  const tip = getRandomLoveTip();

  await bot.sendMessage(chatId, `💖 Вы с ${partnerUsername} уже: <b>${result}</b> (всего <b>${totalDays} дней</b>)! ❤️\n\n`
    + `💬 <i>Цитата дня:</i>\n<i>${quote}</i>\n\n`
    + `💡 <i>Совет на день:</i>\n<i>${tip}</i>`, { parse_mode: 'HTML', ...getMainMenu(chatId) });
});

// Обработка кнопки "График отношений"
bot.onText(/📊 График отношений/, async (msg) => {
  const chatId = msg.chat.id;
  updateUserStats(msg);
  if (!dates[chatId]) {
    bot.sendMessage(chatId, '❌ Сначала установи дату начала отношений, нажав на кнопку: 📅 <b>Установить дату начала отношений</b>', { parse_mode: 'HTML' });
    return;
  }

  const startDate = new Date(dates[chatId]);
  const today = new Date();
  const totalDays = Math.floor((today - startDate) / (1000 * 60 * 60 * 24));

  const graphPath = await generateRelationshipGraph(chatId, totalDays);
  await bot.sendPhoto(chatId, fs.createReadStream(graphPath), {
    caption: `📊 Ваш график отношений: <b>${totalDays} дней</b> вместе!`, parse_mode: 'HTML',
    ...getMainMenu(chatId)
  });
});

// Обработка кнопки "Вехи отношений"
bot.onText(/🎯 Вехи отношений/, (msg) => {
  const chatId = msg.chat.id;
  updateUserStats(msg);
  if (!dates[chatId]) {
    bot.sendMessage(chatId, '❌ Сначала установи дату начала отношений, нажав на кнопку: 📅 <b>Установить дату начала отношений</b>', { parse_mode: 'HTML' });
    return;
  }

  const startDate = new Date(dates[chatId]);
  const today = new Date();
  const totalDays = Math.floor((today - startDate) / (1000 * 60 * 60 * 24));

  const importantMilestones = [100, 200, 365, 500, 730];
  if (!milestones[chatId]) {
    milestones[chatId] = [];
  }

  const partnerUsername = partnerUsernames[chatId] ? `@${partnerUsernames[chatId]}` : 'вашей второй половинкой';
  let message = `🎯 Ваши вехи с ${partnerUsername}:\n\n`;

  importantMilestones.forEach((day) => {
    const isAchieved = totalDays >= day;
    const emoji = isAchieved ? '✅' : '🔄';
    message += `${emoji} ${day} дней — ${isAchieved ? 'достигнуто!' : 'впереди'}\n`;
  });

  bot.sendMessage(chatId, message, getMainMenu(chatId));
});

// Обработка кнопки "Совет на день"
bot.onText(/💡 Совет на день/, (msg) => {
  const chatId = msg.chat.id;
  updateUserStats(msg);
  const tip = getRandomLoveTip();
  bot.sendMessage(chatId, `💡 <i>Совет на день:</i>\n<i>${tip}</i>`, { parse_mode: 'HTML', ...getMainMenu(chatId) });
});

// Обработка кнопки "Изменить тему оформления"
bot.onText(/🎨 Изменить тему оформления/, (msg) => {
  const chatId = msg.chat.id;
  updateUserStats(msg);
  let message = '🎨 Выберите тему оформления:\n\n';
  Object.keys(availableThemes).forEach(themeKey => {
    const theme = availableThemes[themeKey];
    message += `🔹 ${theme.emoji} ${theme.name} (${theme.color})\n`;
  });

  bot.sendMessage(chatId, message, {
    reply_markup: {
      keyboard: [
        Object.keys(availableThemes).map(themeKey => ({ text: `${availableThemes[themeKey].emoji} ${availableThemes[themeKey].name}` })),
        [{ text: '⬅️ Назад' }]
      ],
      resize_keyboard: true
    }
  });
});

// Обработка выбора темы
bot.onText(/(💖 Романтическая|⚪ Минималистичная|🎉 Праздничная)/, (msg) => {
  const chatId = msg.chat.id;
  updateUserStats(msg);
  const text = msg.text;

  let selectedTheme;
  if (text.includes('Романтическая')) {
    selectedTheme = 'romantic';
  } else if (text.includes('Минималистичная')) {
    selectedTheme = 'minimal';
  } else if (text.includes('Праздничная')) {
    selectedTheme = 'holiday';
  }

  if (selectedTheme) {
    themes[chatId] = selectedTheme;
    saveData(themesFile, themes);
    bot.sendMessage(chatId, `✅ Тема оформления изменена на: <b>${availableThemes[selectedTheme].name}</b>!`, { parse_mode: 'HTML', ...getMainMenu(chatId) });
  }
});

// Обработка кнопки "Назад"
bot.onText(/⬅️ Назад/, (msg) => {
  const chatId = msg.chat.id;
  updateUserStats(msg);
  bot.sendMessage(chatId, 'Вы вернулись в главное меню.', getMainMenu(chatId));
});

// Обработка кнопки "Включить/Отключить ежедневные уведомления"
bot.onText(/🔔 (Включить|Отключить) ежедневные уведомления/, (msg) => {
  const chatId = msg.chat.id;
  updateUserStats(msg);
  const isNotifyEnabled = notifySettings[chatId] || false;

  if (isNotifyEnabled) {
    notifySettings[chatId] = false;
    bot.sendMessage(chatId, '🔔 Ежедневные уведомления <b>отключены</b>!', { parse_mode: 'HTML', ...getMainMenu(chatId) });
  } else {
    notifySettings[chatId] = true;
    bot.sendMessage(chatId, '🔔 Ежедневные уведомления <b>включены</b>!', { parse_mode: 'HTML', ...getMainMenu(chatId) });
  }

  saveData(notifySettingsFile, notifySettings);
});

// Команда для администратора для получения статистики
bot.onText(/\/stats/, (msg) => {
  const chatId = msg.chat.id;
  updateUserStats(msg);
  if (msg.from.id.toString() === '6286583518') {
    const activeUsers = Object.keys(usersStats.users || {}).length;
    let userList = Object.keys(usersStats.users || {}).map(id => {
      const user = usersStats.users[id];
      return `\n- ${user.firstName} (${new Date(user.lastActive).toLocaleDateString()})`;
    }).join('');

    bot.sendMessage(chatId, `📊 Статистика бота:\n\n`
      + `👥 Всего пользователей: ${usersStats.totalUsers}\n`
      + `🟢 Активных пользователей: ${activeUsers}\n`
      + `📅 Последние активности:${userList || ' Нет данных'}`);
  } else {
    bot.sendMessage(chatId, '🔒 У вас нет доступа к этой команде.');
  }
});

// Обработка кнопки "Помощь"
bot.onText(/❓ Помощь/, (msg) => {
  const chatId = msg.chat.id;
  updateUserStats(msg);
  bot.sendMessage(chatId, '📌 <b>Как пользоваться ботом:</b>\n\n'
    + '1. Нажми на кнопку: 📅 <b>Установить дату начала отношений</b>\n'
    + '   Отправь мне дату в формате: <b>ГГГГ-ММ-ДД @username</b> (например, <code>2024-01-01 @username</code>)\n\n'
    + '2. Нажми на кнопку: ❤️ <b>Сколько мы вместе?</b>\n'
    + '   Я покажу, сколько времени вы вместе, и дам совет на день! ❤️\n\n'
    + '3. Нажми на кнопку: 📊 <b>График отношений</b>\n'
    + '   Я сгенерирую график ваших отношений.\n\n'
    + '4. Нажми на кнопку: 🎯 <b>Вехи отношений</b>\n'
    + '   Посмотри, какие важные вехи вы уже достигли.\n\n'
    + '5. Нажми на кнопку: 💡 <b>Совет на день</b>\n'
    + '   Получи полезный совет для ваших отношений.\n\n'
    + '6. Нажми на кнопку: 🎨 <b>Изменить тему оформления</b>\n'
    + '   Выбери понравившуюся тему для сообщений.\n\n'
    + '7. Нажми на кнопку: 🔔 <b>Включить/Отключить ежедневные уведомления</b>\n'
    + '   Я буду присылать уведомление каждый день о том, сколько времени вы вместе! 😊\n\n'
    + 'Если у тебя есть вопросы — пиши! 😊', { parse_mode: 'HTML', ...getMainMenu(chatId) });
});

console.log('Бот запущен!');
