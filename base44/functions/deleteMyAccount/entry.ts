import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const emails = [...new Set([user.email, user.email?.toLowerCase()].filter(Boolean))];

    for (const email of emails) {
      await base44.asServiceRole.entities.AllowedClient.deleteMany({ email });
      await base44.asServiceRole.entities.ClientCourseAccess.deleteMany({ email });
      await base44.asServiceRole.entities.LessonProgress.deleteMany({ user_email: email });
    }

    await base44.asServiceRole.entities.User.delete(user.id);

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}