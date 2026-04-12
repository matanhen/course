import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get all allowed clients, course access, and courses
    const [allClients, allAccess, courses] = await Promise.all([
      base44.asServiceRole.entities.AllowedClient.list(),
      base44.asServiceRole.entities.ClientCourseAccess.list(),
      base44.asServiceRole.entities.Course.list(),
    ]);

    if (courses.length === 0) {
      return Response.json({ message: 'No courses found', fixed: 0 });
    }

    // Find the default course (first published, or first overall)
    const defaultCourse = courses.find(c => c.is_published) || courses[0];

    // Build set of emails that have at least one course access
    const emailsWithAccess = new Set(allAccess.map(a => a.email?.toLowerCase()));

    // Clients without any course access (non-consultants)
    const clientsWithoutAccess = allClients.filter(c => 
      !c.is_consultant && !emailsWithAccess.has(c.email?.toLowerCase())
    );

    let fixed = 0;
    for (const client of clientsWithoutAccess) {
      const email = client.email?.toLowerCase();
      if (!email) continue;
      await base44.asServiceRole.entities.ClientCourseAccess.create({
        email,
        course_id: defaultCourse.id,
      });
      fixed++;
    }

    return Response.json({ 
      success: true, 
      fixed, 
      defaultCourse: defaultCourse.title,
      message: `Fixed ${fixed} clients without course access`
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});