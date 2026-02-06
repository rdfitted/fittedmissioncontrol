import { NextRequest, NextResponse } from 'next/server';
import { getAllTasks, createTask, Task, Priority } from '@/lib/tasks';
import { checkFileConflicts, ConflictWarning } from '@/lib/coordination';

/**
 * GET /api/tasks
 * 
 * List all active tasks from squad/tasks/json/*.json
 * 
 * Query params:
 *   - status: filter by status (backlog, in-progress, completed)
 *   - assigned: filter by assigned agent
 *   - priority: filter by priority (low, medium, high, critical)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status');
    const assignedFilter = searchParams.get('assigned');
    const priorityFilter = searchParams.get('priority');
    
    let tasks = await getAllTasks();
    
    // Apply filters
    if (statusFilter) {
      tasks = tasks.filter(t => t.status === statusFilter);
    }
    if (assignedFilter) {
      tasks = tasks.filter(t => t.assigned?.toLowerCase() === assignedFilter.toLowerCase());
    }
    if (priorityFilter) {
      tasks = tasks.filter(t => t.priority === priorityFilter);
    }
    
    // Group by status for convenience
    const grouped = {
      backlog: tasks.filter(t => t.status === 'backlog'),
      inProgress: tasks.filter(t => t.status === 'in-progress'),
      completed: tasks.filter(t => t.status === 'completed'),
    };
    
    return NextResponse.json({
      tasks,
      grouped,
      total: tasks.length,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tasks' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/tasks
 * 
 * Create a new task
 * 
 * Body:
 * {
 *   title: string (required)
 *   description?: string
 *   priority?: 'low' | 'medium' | 'high' | 'critical'
 *   assigned?: string
 *   deliverable?: string
 *   tags?: string[]
 *   files?: string[]  // Files this task will touch (for coordination)
 * }
 * 
 * Response includes `warnings[]` if files conflict with other active tasks.
 * Warnings don't block creation — they're informational.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.title || typeof body.title !== 'string') {
      return NextResponse.json(
        { error: 'Title is required' },
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
    
    // Check for file conflicts if files specified (warn, don't block)
    let warnings: ConflictWarning[] = [];
    const files = Array.isArray(body.files) ? body.files.filter((f: unknown) => typeof f === 'string') : undefined;
    if (files && files.length > 0) {
      // Use a temporary ID for conflict checking (task doesn't exist yet)
      warnings = await checkFileConflicts('__new_task__', files);
    }
    
    const task = await createTask({
      title: body.title.trim(),
      description: body.description?.trim(),
      priority: body.priority,
      assigned: body.assigned?.trim(),
      deliverable: body.deliverable?.trim(),
      tags: Array.isArray(body.tags) ? body.tags : undefined,
      files,
    });
    
    // Return task with warnings if any
    if (warnings.length > 0) {
      return NextResponse.json(
        { 
          task,
          warnings,
          message: `Task created with ${warnings.length} file conflict warning(s)`,
        }, 
        { status: 201 }
      );
    }
    
    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    console.error('Error creating task:', error);
    return NextResponse.json(
      { error: 'Failed to create task' },
      { status: 500 }
    );
  }
}
