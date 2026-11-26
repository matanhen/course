import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const email = (body?.email || '').trim().toLowerCase();
    if (!email) return Response.json({ error: 'email is required' }, { status: 400 });

    const [clients, users] = await Promise.all([
      base44.asServiceRole.entities.AllowedClient.filter({ email }),
      base44.asServiceRole.entities.User.filter({ email })
    ]);

    const isClient = clients.length > 0;
    const isAdmin = users.some((u) => u.role === 'admin');

    return Response.json({ allowed: isClient || isAdmin });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}