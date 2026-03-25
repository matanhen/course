import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Get all lesson progress records
    const allProgress = await base44.asServiceRole.entities.LessonProgress.list();
    
    let updatedCount = 0;
    let alreadyCompletedCount = 0;

    // Update records where progress_percent >= 80 but not yet marked as completed
    for (const progress of allProgress) {
      if (!progress.completed && progress.progress_percent >= 80) {
        await base44.asServiceRole.entities.LessonProgress.update(progress.id, {
          completed: true
        });
        updatedCount++;
      } else if (progress.completed) {
        alreadyCompletedCount++;
      }
    }

    return Response.json({ 
      success: true,
      message: `Updated ${updatedCount} progress records to completed. ${alreadyCompletedCount} were already completed.`,
      totalRecords: allProgress.length,
      updatedCount,
      alreadyCompletedCount
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});