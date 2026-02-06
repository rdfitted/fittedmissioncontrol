import { NextRequest, NextResponse } from 'next/server';
import { getTaskById, updateTask, archiveTask, TaskStatus, Priority, checkReadyEligibility } from '@/lib/tasks';
import { 
  registerFileOwnership, 
  releaseFileOwnership, 
  updateFileOwnership,
  ConflictWarning 
} from '@/lib/coordination';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/tasks/[id]
 * 
 * Get a single task with its full chat thread
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;
    const task = await getTaskById(id);
    
    if (!task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(task);
  } catch (error) {
    console.error('Error fetching task:', error);
    return NextResponse.json(
      { error: 'Failed to fetch task' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/tasks/[id]
 * 
 * Update a task (status, assignment, priority, etc.)
 * 
 * Body (all optional):
 * {
 *   title?: string
 *   description?: string
 *   status?: 'backlog' | 'in-progress' | 'blocked' | 'completed'
 *   priority?: 'low' | 'medium' | 'high' | 'critical'
 *   assigned?: string
 *   deliverable?: string
 *   completedBy?: string
 *   blockedBy?: string       // Human-readable blocker reason (recommended when status='blocked')
 *   blockedAt?: number       // Unix ms timestamp (auto-set if not provided when blocking)
 *   tags?: string[]
 *   files?: string[]         // Files this task touches (for coordination)
 *   position?: number        // Position within column for ordering (lower = higher priority)
 * }
 * 
 * Coordination behavior:
 * - Status → 'in-progress': Register file ownership, warn on conflicts
 * - Status → 'completed': Release file ownership
 * - Files updated: Update coordination.json, warn on conflicts
 * 
 * Response includes `warnings[]` if file conflicts detected.
 */
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    // Get current task for comparison
    const currentTask = await getTaskById(id);
    if (!currentTask) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }
    
    // Validate status if provided
    const validStatuses: TaskStatus[] = ['backlog', 'in-progress', 'blocked', 'completed'];
    if (body.status && !validStatuses.includes(body.status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be: backlog, in-progress, blocked, or completed' },
        { status: 400 }
      );
    }
    
    // Validate priority if provided
    const validPriorities: Priority[] = ['low', 'medium', 'high', 'critical'];
    if (body.priority && !validPriorities.includes(body.priority)) {
      return NextResponse.json(
        { error: 'Invalid priority. Must be: low, medium, high, or critical' },
        { status: 400 }
      );
    }
    
    // Warn if setting blocked status without blockedBy reason
    if (body.status === 'blocked' && !body.blockedBy) {
      console.warn(`[PATCH /api/tasks/${id}] Setting status to 'blocked' without blockedBy reason`);
    }
    
    // mc-002: Validate emergencyOverride if provided
    if (body.emergencyOverride) {
      if (body.emergencyOverride.authorizedBy?.toLowerCase() !== 'ryan') {
        return NextResponse.json(
          { error: 'Only Ryan can authorize emergency override' },
          { status: 403 }
        );
      }
      if (!body.emergencyOverride.reason?.trim()) {
        return NextResponse.json(
          { error: 'Emergency override requires a reason' },
          { status: 400 }
        );
      }
    }
    
    // mc-002: Enforce ready eligibility check
    // To move to 'ready' status, task needs 4+ participants including ryan, hex, and a manager
    // Exception: emergency override bypasses this check
    if (body.status === 'ready') {
      const hasValidOverride = currentTask.emergencyOverride?.authorizedBy?.toLowerCase() === 'ryan' ||
                               body.emergencyOverride?.authorizedBy?.toLowerCase() === 'ryan';
      
      if (!hasValidOverride) {
        // Check with potentially updated participants
        const taskForCheck = {
          ...currentTask,
          participants: body.participants ?? currentTask.participants,
        };
        const eligibility = checkReadyEligibility(taskForCheck);
        
        if (!eligibility.eligible) {
          return NextResponse.json(
            { 
              error: 'Task not eligible for ready status',
              missing: eligibility.missing,
              hint: 'Need 4+ participants including ryan, hex, and a team manager. Or Ryan can authorize emergency override.'
            },
            { status: 400 }
          );
        }
      }
    }
    
    // Build update object with only provided fields
    const updates: Parameters<typeof updateTask>[1] = {};
    if (body.title !== undefined) updates.title = body.title.trim();
    if (body.description !== undefined) updates.description = body.description.trim();
    if (body.status !== undefined) updates.status = body.status;
    if (body.priority !== undefined) updates.priority = body.priority;
    if (body.assigned !== undefined) updates.assigned = body.assigned.trim();
    if (body.deliverable !== undefined) updates.deliverable = body.deliverable.trim();
    if (body.completedBy !== undefined) updates.completedBy = body.completedBy.trim();
    if (body.blockedBy !== undefined) updates.blockedBy = body.blockedBy.trim();
    if (body.blockedAt !== undefined) updates.blockedAt = body.blockedAt;
    if (body.tags !== undefined) updates.tags = body.tags;
    if (body.files !== undefined) updates.files = Array.isArray(body.files) ? body.files : undefined;
    if (body.participants !== undefined) updates.participants = Array.isArray(body.participants) ? body.participants : undefined;
    if (body.position !== undefined) updates.position = body.position;
    if (body.emergencyOverride !== undefined) {
      updates.emergencyOverride = body.emergencyOverride ? {
        authorizedBy: body.emergencyOverride.authorizedBy,
        reason: body.emergencyOverride.reason,
        timestamp: body.emergencyOverride.timestamp || Date.now(),
        bypassedState: body.emergencyOverride.bypassedState,
      } : undefined;
    }
    
    // Determine actor for stateHistory (prefer assigned agent, fallback to body.actor or 'api')
    const actor = body.actor || currentTask.assigned || 'api';
    
    const task = await updateTask(id, updates, { actor });
    
    if (!task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }
    
    // Handle coordination based on status changes
    let warnings: ConflictWarning[] = [];
    const newStatus = body.status;
    const oldStatus = currentTask.status;
    const taskFiles = task.files || [];
    const agent = task.assigned;
    
    // Status transition: → in-progress (active)
    if (newStatus === 'in-progress' && oldStatus !== 'in-progress') {
      if (taskFiles.length > 0) {
        const result = await registerFileOwnership(id, taskFiles, agent);
        warnings = result.warnings;
        if (warnings.length > 0) {
          console.warn(`[PATCH /api/tasks/${id}] File conflict warnings:`, warnings);
        }
      }
    }
    // Status transition: → completed (release ownership)
    else if (newStatus === 'completed' && oldStatus !== 'completed') {
      await releaseFileOwnership(id);
    }
    // Files updated while task is active
    else if (body.files !== undefined && oldStatus === 'in-progress') {
      const result = await updateFileOwnership(id, taskFiles, agent);
      warnings = result.warnings;
    }
    
    // Return task with warnings if any
    if (warnings.length > 0) {
      return NextResponse.json({
        task,
        warnings,
        message: `Task updated with ${warnings.length} file conflict warning(s)`,
      });
    }
    
    return NextResponse.json(task);
  } catch (error) {
    console.error('Error updating task:', error);
    return NextResponse.json(
      { error: 'Failed to update task' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/tasks/[id]
 * 
 * Archive a task (moves to archived/ directory)
 * 
 * This is a soft delete - the task is preserved but marked as archived.
 * Also releases any file ownership in coordination.json.
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;
    const task = await archiveTask(id);
    
    if (!task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }
    
    // Release file ownership when task is archived
    await releaseFileOwnership(id);
    
    return NextResponse.json({
      message: 'Task archived successfully',
      task,
    });
  } catch (error) {
    console.error('Error archiving task:', error);
    return NextResponse.json(
      { error: 'Failed to archive task' },
      { status: 500 }
    );
  }
}
