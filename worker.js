// ═══════════════════════════════════════════════════════
//  Cloudflare Worker — прокси для Telegram уведомлений
//  Токен бота хранится в секретах (Environment Variables)
// ═══════════════════════════════════════════════════════

export default {
  async fetch(request, env) {
    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    try {
      const { user_id } = await request.json();

      const now = new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' });
      const text = `👤 Вход в приложение\nUser ID: ${user_id || 'unknown'}\n🕐 ${now}`;

      // BOT_TOKEN и CHAT_ID берутся из секретов Cloudflare
      const resp = await fetch(
        `https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: env.CHAT_ID,
            text,
          }),
        }
      );

      const ok = resp.ok;
      return new Response(JSON.stringify({ ok }), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    } catch (e) {
      return new Response(JSON.stringify({ ok: false }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }
  },
};
