import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

const PUSH_CONTENT = 'לא נכנסת מעל שבוע ללמוד על כסף, זה הזמן להיכנס';
const PUSH_TITLE = 'האקדמיה של צעירים מתעשרים';
const APP_URL = 'https://academy.matanhen.com';

function toTime(value) {
  if (!value) return null;
  const ts = new Date(value).getTime();
  return isNaN(ts) ? null : ts;
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth
      .me()
      .catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const dryRun = body?.dry_run === true;
    const days = Number(body?.days) > 0 ? Number(body.days) : 7;
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;

    const [clients, users] = await Promise.all([
      base44.asServiceRole.entities.AllowedClient.list(),
      base44.asServiceRole.entities.User.list()
    ]);

    const userIdByEmail = new Map();
    for (const u of users) {
      const email = (u.email || '').toLowerCase();
      if (email) userIdByEmail.set(email, u.id);
    }

    const inactive = [];
    for (const client of clients) {
      const email = (client.email || '').toLowerCase();
      if (!email) continue;
      const lastActivity = toTime(client.last_login_date) ?? toTime(client.first_login_date) ?? toTime(client.created_date);
      if (lastActivity !== null && lastActivity > cutoff) continue;
      const userId = userIdByEmail.get(email);
      if (!userId) continue;
      inactive.push({ email, name: client.name || '', last_login_date: client.last_login_date || null, user_id: userId });
    }

    const results = [];
    for (let i = 0; i < inactive.length; i += 6) {
      const batch = inactive.slice(i, i + 6);
      const settled = await Promise.allSettled(
        batch.map((client) =>
          dryRun
            ? Promise.resolve({ dry_run: true })
            : base44.asServiceRole.integrations.Core.SendPushNotification({
                user_id: client.user_id,
                title: PUSH_TITLE,
                content: PUSH_CONTENT,
                action_label: 'כניסה לאקדמיה',
                action_url: APP_URL
              })
        )
      );
      settled.forEach((outcome, index) => {
        const client = batch[index];
        results.push({
          email: client.email,
          last_login_date: client.last_login_date,
          sent: outcome.status === 'fulfilled',
          error: outcome.status === 'rejected' ? outcome.reason?.message || String(outcome.reason) : null
        });
      });
    }

    const sent = results.filter((r) => r.sent).length;

    return Response.json({
      success: true,
      dry_run: dryRun,
      days,
      clients_checked: clients.length,
      inactive_found: inactive.length,
      sent,
      failed: results.length - sent,
      results
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}