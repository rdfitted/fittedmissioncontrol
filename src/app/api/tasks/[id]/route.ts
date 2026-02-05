import { NextRequest, NextResponse } from 'next/server';
import { getTaskById, updateTask, archiveTask, TaskStatus, Priority } from '@/lib/tasks';

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
 *   status?: 'backlog' | 'in-progress' | 'completed'
 *   priority?: 'low' | 'medium' | 'high' | 'critical'
 *   assigned?: string
 *   deliverable?: string
 *   completedBy?: string
 *   tags?: string[]
 * }
 */
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    // Validate status if provided
    const validStatuses: TaskStatus[] = ['backlog', 'in-progress', 'completed'];
    if (body.status && !validStatuses.includes(body.status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be: backlog, in-progress, or completed' },
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
    
    // Build update object with only provided fields
    const updates: Parameters<typeof updateTask>[1] = {};
    if (body.title !== undefined) updates.title = body.title.trim();
    if (body.description !== undefined) updates.description = body.description.trim();
    if (body.status !== undefined) updates.status = body.status;
    if (body.priority !== undefined) updates.priority = body.priority;
    if (body.assigned !== undefined) updates.assigned = body.assigned.trim();
    if (body.deliverable !== undefined) updates.deliverable = body.deliverable.trim();
    if (body.completedBy !== undefined) updates.completedBy = body.completedBy.trim();
    if (body.tags !== undefined) updates.tags = body.tags;
    
    const task = await updateTask(id, updates);
    
    if (!task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
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
