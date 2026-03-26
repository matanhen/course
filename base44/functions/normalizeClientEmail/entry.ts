import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data } = await req.json();

    const entityName = event.entity_name;
    const emailField = 'email';

    if (event.type === 'create' && data && data[emailField]) {
      const email = data[emailField];

      if (email !== email.toLowerCase()) {
        const normalizedEmail = email.toLowerCase();
        await base44.asServiceRole.entities[entityName].update(event.entity_id, {
          email: normalizedEmail
        });
        return Response.json({ success: true, message: `Email normalized: ${email} → ${normalizedEmail}` });
      }
    }

    return Response.json({ success: true, message: 'No action needed' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});