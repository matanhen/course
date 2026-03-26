import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return Response.json({ error: 'Method not allowed. Use POST.' }, { status: 405 });
    }

    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { email: rawEmail, name, course_name } = body;
    const email = rawEmail?.toLowerCase();

    if (!email) {
      return Response.json({ error: 'Email is required' }, { status: 400 });
    }

    // Check if client already exists
    const existingClients = await base44.asServiceRole.entities.AllowedClient.filter({ email });
    let client;

    if (existingClients.length > 0) {
      client = existingClients[0];
    } else {
      client = await base44.asServiceRole.entities.AllowedClient.create({
        email,
        name: name || ''
      });
    }

    if (course_name) {
      const courses = await base44.asServiceRole.entities.Course.filter({ title: course_name });

      if (courses.length === 0) {
        return Response.json({ error: `Course "${course_name}" not found` }, { status: 404 });
      }

      const course = courses[0];
      const existingAccess = await base44.asServiceRole.entities.ClientCourseAccess.filter({
        email,
        course_id: course.id
      });

      if (existingAccess.length === 0) {
        await base44.asServiceRole.entities.ClientCourseAccess.create({
          email,
          course_id: course.id
        });
      }
    }

    return Response.json({ success: true, message: 'Client added successfully', client }, { status: 201 });

  } catch (error) {
    return Response.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
});