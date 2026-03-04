// =============================================
//  Gosha — Cloudflare Worker (fixed)
// =============================================

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const REMINDERS = [
  'Привет! Гоша скучает — загляни позаниматься сегодня!',
  'Пора потренироваться! Загадки и ребусы ждут тебя в Гоше.',
  'Серия дней в опасности! Зайди в Гошу и позанимайся.',
  'День без занятий — день без прогресса. Открой Гошу!',
  'В Гоше появились новые песенки — послушаем?',
  'До нового значка совсем немного! Зайди в Гошу.',
];

function randomReminder() {
  return REMINDERS[Math.floor(Math.random() * REMINDERS.length)];
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}

async function sendTelegram(botToken, chatId, text, appUrl) {
  const keyboard = appUrl ? {
    inline_keyboard: [[{ text: 'Открыть Гошу', url: appUrl }]]
  } : undefined;

  return fetch('https://api.telegram.org/bot' + botToken + '/sendMessage', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      ...(keyboard ? { reply_markup: keyboard } : {}),
    }),
  });
}

async function handleFetch(request, env) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: CORS });
  }

  const url = new URL(request.url);
  const path = url.pathname;

  if (path === '/ping' || path === '/') {
    return jsonResponse({ ok: true, ts: Date.now() });
  }

  if (request.method !== 'POST') {
    return jsonResponse({ ok: false, error: 'Method not allowed' }, 405);
  }

  let body;
  try { body = await request.json(); }
  catch { return jsonResponse({ ok: false, error: 'Invalid JSON' }, 400); }

  const { user_id } = body;
  if (!user_id) return jsonResponse({ ok: false, error: 'user_id required' }, 400);

  // DEV_IDS — заходы этих пользователей не считаются в статистику
  const DEV_IDS = new Set(['319941252', '8134419471',
    ...(env.DEV_USER_ID ? [String(env.DEV_USER_ID)] : [])]);

  // ИСПРАВЛЕНО: удалена `const devId = null` — локальная переменная handleFetch,
  // которую использовали как аргумент в handleCron → sendVisitReport.
  // В handleCron она не определена → ReferenceError → cron молча падал всегда.
  // Отчёты и напоминания никогда не отправлялись именно по этой причине.

  const key = 'user:' + user_id;

  if (path === '/register') {
    const { reminders_enabled = true, remind_hour = 10, child_name = '', app_url = '' } = body;
    const existing = await env.USERS.get(key, { type: 'json' }) || {};
    const record = {
      user_id: String(user_id),
      child_name,
      app_url,
      reminders_enabled: Boolean(reminders_enabled),
      remind_hour: Number(remind_hour),
      last_visit: Date.now(),
      registered_at: existing.registered_at || Date.now(),
      last_reminded: existing.last_reminded || 0,
      tz_offset: Number(body.tz_offset ?? 0),
    };
    const isNew = !existing.registered_at;
    await env.USERS.put(key, JSON.stringify(record));
    if (!DEV_IDS.has(String(user_id))) await recordVisit(env, user_id, isNew);
    return jsonResponse({ ok: true });
  }

  if (path === '/visit') {
    const existing = await env.USERS.get(key, { type: 'json' });
    if (existing) {
      existing.last_visit = Date.now();
      await env.USERS.put(key, JSON.stringify(existing));
      if (!DEV_IDS.has(String(user_id))) await recordVisit(env, user_id, false);
    }
    return jsonResponse({ ok: true });
  }

  if (path === '/unsubscribe') {
    const existing = await env.USERS.get(key, { type: 'json' });
    if (existing) {
      existing.reminders_enabled = false;
      await env.USERS.put(key, JSON.stringify(existing));
    }
    return jsonResponse({ ok: true });
  }

  // ── POST /report-now — немедленный отчёт (только для администратора) ──
  if (path === '/report-now') {
    if (!env.CHAT_ID) return jsonResponse({ ok: false, error: 'CHAT_ID not configured' }, 500);
    // Простая защита: принимаем только от самого бота/администратора.
    // Воркер открыт публично, поэтому проверяем секрет.
    const { secret } = body;
    if (!secret || secret !== env.REPORT_SECRET) {
      return jsonResponse({ ok: false, error: 'Forbidden' }, 403);
    }
    const nowMs = Date.now();
    const nowHourUTC = new Date(nowMs).getUTCHours();
    await sendVisitReport(env, nowMs, nowHourUTC);
    return jsonResponse({ ok: true });
  }

  return jsonResponse({ ok: false, error: 'Unknown endpoint' }, 404);
}

// Отчёты: 9, 12, 15, 18, 21 МСК = 6, 9, 12, 15, 18 UTC
const REPORT_HOURS_UTC = [6, 9, 12, 15, 18];

async function handleCron(env) {
  if (!env.USERS || !env.BOT_TOKEN) return;

  const nowMs      = Date.now();
  const nowHourUTC = new Date(nowMs).getUTCHours();

  // ИСПРАВЛЕНО: убран аргумент devId — не определён в этой области видимости.
  // Именно это вызывало ReferenceError и роняло весь cron без каких-либо логов.
  if (REPORT_HOURS_UTC.includes(nowHourUTC) && env.CHAT_ID) {
    await sendVisitReport(env, nowMs, nowHourUTC);
  }

  const list = await env.USERS.list({ prefix: 'user:' });
  let sent = 0;

  for (const { name } of list.keys) {
    const user = await env.USERS.get(name, { type: 'json' });
    if (!user || !user.reminders_enabled) continue;

    const userHour = (nowHourUTC + (user.tz_offset || 0) + 24) % 24;
    if (userHour !== user.remind_hour) continue;

    const hoursSinceVisit    = (nowMs - (user.last_visit    || 0)) / 3600000;
    const hoursSinceReminder = (nowMs - (user.last_reminded || 0)) / 3600000;
    if (hoursSinceVisit < 20 || hoursSinceReminder < 20) continue;

    const text = randomReminder() + (user.child_name ? '\n\n— Гоша для ' + user.child_name : '');
    const resp = await sendTelegram(env.BOT_TOKEN, user.user_id, text, user.app_url || '');

    if (resp.ok) {
      user.last_reminded = nowMs;
      await env.USERS.put(name, JSON.stringify(user));
      sent++;
    }
  }

  console.log('[Cron] Напоминаний отправлено: ' + sent);
}

// ИСПРАВЛЕНО: убран параметр devId из сигнатуры — нигде внутри не использовался
async function sendVisitReport(env, nowMs, nowHourUTC) {
  const statsRaw = await env.USERS.get('stats:visits', { type: 'json' }) || {
    total: 0, new_users: 0, returning: 0,
    last_report_ts: 0, last_report_total: 0,
    new_since_report: 0, unique_users: 0,
  };

  const periodTotal     = statsRaw.total - statsRaw.last_report_total;
  const periodNew       = statsRaw.new_since_report || 0;
  const periodReturning = Math.max(periodTotal - periodNew, 0);

  const mskHour = (nowHourUTC + 3) % 24;
  const dateStr = new Date(nowMs).toLocaleDateString('ru-RU', {
    timeZone: 'Europe/Moscow', day: 'numeric', month: 'long'
  });

  const lines = [
    '<b>Гоша — заходы</b>  ' + dateStr + ', ' + mskHour + ':00',
    '',
    '<b>За период:</b>',
    '  Всего заходов: <b>' + periodTotal + '</b>',
    '  Новые: ' + periodNew,
    '  Постоянные: ' + periodReturning,
    '',
    '<b>Накопительно:</b>',
    '  Всего заходов: <b>' + statsRaw.total + '</b>',
    '  Уникальных пользователей: <b>' + (statsRaw.unique_users || 0) + '</b>',
  ];

  await sendTelegram(env.BOT_TOKEN, env.CHAT_ID, lines.join('\n'), null);

  statsRaw.last_report_ts    = nowMs;
  statsRaw.last_report_total = statsRaw.total;
  statsRaw.new_since_report  = 0;
  await env.USERS.put('stats:visits', JSON.stringify(statsRaw));
}

async function recordVisit(env, userId, isNew) {
  const statsRaw = await env.USERS.get('stats:visits', { type: 'json' }) || {
    total: 0, new_users: 0, returning: 0,
    last_report_ts: 0, last_report_total: 0,
    new_since_report: 0, unique_users: 0,
  };
  statsRaw.total++;
  if (isNew) {
    statsRaw.new_users++;
    statsRaw.new_since_report = (statsRaw.new_since_report || 0) + 1;
    statsRaw.unique_users     = (statsRaw.unique_users     || 0) + 1;
  } else {
    statsRaw.returning++;
  }
  await env.USERS.put('stats:visits', JSON.stringify(statsRaw));
}

export default {
  fetch: handleFetch,
  scheduled: (event, env) => handleCron(env),
};
