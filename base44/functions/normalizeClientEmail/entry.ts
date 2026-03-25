import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data } = await req.json();

    // Check if this is a create event for AllowedClient
    if (event.type === 'create' && event.entity_name === 'AllowedClient' && data) {
      const email = data.email;
      
      // Check if email contains uppercase letters
      if (email && email !== email.toLowerCase()) {
        const normalizedEmail = email.toLowerCase();
        
        // Update the client with normalized email
        await base44.asServiceRole.entities.AllowedClient.update(event.entity_id, {
          email: normalizedEmail
        });
        
        return Response.json({ 
          success: true, 
          message: `Email normalized from ${email} to ${normalizedEmail}`,
          entity_id: event.entity_id
        });
      }
      
      return Response.json({ 
        success: true, 
        message: 'Email already lowercase',
        entity_id: event.entity_id
      });
    }

    return Response.json({ success: true, message: 'No action needed' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});