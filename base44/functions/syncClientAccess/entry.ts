import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// Sync: creates AllowedClient records for anyone who has ClientCourseAccess but is missing from AllowedClient
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const [allClients, allAccess] = await Promise.all([
      base44.asServiceRole.entities.AllowedClient.list(),
      base44.asServiceRole.entities.ClientCourseAccess.list(),
    ]);

    const allowedEmails = new Set(allClients.map(c => c.email?.toLowerCase()));

    // Find unique emails that have course access but no AllowedClient entry
    const missingEmails = [...new Set(
      allAccess
        .map(a => a.email?.toLowerCase())
        .filter(e => e && !allowedEmails.has(e))
    )];

    let fixed = 0;
    for (const email of missingEmails) {
      await base44.asServiceRole.entities.AllowedClient.create({ email });
      fixed++;
    }

    return Response.json({
      success: true,
      fixed,
      message: `Created ${fixed} missing AllowedClient records`,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});