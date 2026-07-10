import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const WEBHOOK_URL = 'https://hook.eu2.make.com/vwou9sujl9raypmcsunyp4nhsno4hme1';
const COURSE_TITLE = 'צעירים מתעשרים';
const COURSE_DESCRIPTION = 'ליווי אישי פרימיום';

function formatDate(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    let testEmail = null;
    try {
      const body = await req.json();
      testEmail = body?.test_email ? body.test_email.toLowerCase() : null;
    } catch (e) {
      testEmail = null;
    }

    const courses = await base44.asServiceRole.entities.Course.filter({ title: COURSE_TITLE });
    const course = courses.find((c) => c.description === COURSE_DESCRIPTION) || courses[0];
    if (!course) {
      return Response.json({ error: 'Course not found' }, { status: 404 });
    }

    const [lessons, accesses, clients, progress] = await Promise.all([
      base44.asServiceRole.entities.Lesson.filter({ course_id: course.id }),
      base44.asServiceRole.entities.ClientCourseAccess.filter({ course_id: course.id }),
      base44.asServiceRole.entities.AllowedClient.list(),
      base44.asServiceRole.entities.LessonProgress.filter({ course_id: course.id })
    ]);

    const totalLessons = lessons.length;

    const clientsByEmail = {};
    for (const c of clients) {
      const email = (c.email || '').toLowerCase();
      if (email) clientsByEmail[email] = c;
    }

    const results = [];
    for (const access of accesses) {
      const email = (access.email || '').toLowerCase();
      if (!email) continue;
      if (testEmail && email !== testEmail) continue;
      const client = clientsByEmail[email];
      const completedCount = progress.filter(
        (p) => (p.user_email || '').toLowerCase() === email && p.completed
      ).length;

      const payload = {
        name: client?.name || '',
        email: email,
        registration_date: formatDate(access.created_date),
        first_login_date: formatDate(client?.first_login_date),
        last_login_date: formatDate(client?.last_login_date),
        lessons_watched: completedCount,
        total_lessons: totalLessons
      };

      try {
        await fetch(WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        results.push({ email, sent: true });
      } catch (err) {
        results.push({ email, sent: false, error: err.message });
      }
    }

    return Response.json({ success: true, course: course.title, totalStudents: results.length, results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});