import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (user?.role !== 'admin') {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Normalize ClientCourseAccess emails
  const allAccess = await base44.asServiceRole.entities.ClientCourseAccess.list();
  let fixedAccess = 0;
  for (const record of allAccess) {
    const lower = record.email?.toLowerCase();
    if (lower && lower !== record.email) {
      await base44.asServiceRole.entities.ClientCourseAccess.update(record.id, { email: lower });
      fixedAccess++;
    }
  }

  // Normalize AllowedClient emails
  const allClients = await base44.asServiceRole.entities.AllowedClient.list();
  let fixedClients = 0;
  for (const record of allClients) {
    const lower = record.email?.toLowerCase();
    if (lower && lower !== record.email) {
      await base44.asServiceRole.entities.AllowedClient.update(record.id, { email: lower });
      fixedClients++;
    }
  }

  return Response.json({
    success: true,
    fixedClientCourseAccess: fixedAccess,
    fixedAllowedClients: fixedClients,
    totalAccess: allAccess.length,
    totalClients: allClients.length
  });
});