import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    // Only allow POST requests
    if (req.method !== 'POST') {
      return Response.json(
        { error: 'Method not allowed. Use POST.' },
        { status: 405 }
      );
    }

    const base44 = createClientFromRequest(req);

    // Check if user is authenticated and is admin
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 401 }
      );
    }

    // Get data from request body
    const body = await req.json();
    const { email, name } = body;

    // Validate email
    if (!email) {
      return Response.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Check if client already exists
    const existingClients = await base44.asServiceRole.entities.AllowedClient.filter({ email });
    if (existingClients.length > 0) {
      return Response.json(
        { 
          error: 'Client already exists',
          client: existingClients[0]
        },
        { status: 409 }
      );
    }

    // Create new allowed client
    const newClient = await base44.asServiceRole.entities.AllowedClient.create({
      email,
      name: name || ''
    });

    return Response.json({
      success: true,
      message: 'Client added successfully',
      client: newClient
    }, { status: 201 });

  } catch (error) {
    console.error('Error adding client:', error);
    return Response.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
});