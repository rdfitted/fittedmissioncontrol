import { NextRequest, NextResponse } from 'next/server';
import { toggleSubtask, addSubtask } from '@/lib/tasks';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/tasks/[id]/subtask
 * 
 * Add a new subtask to a task
 * 
 * Body:
 * {
 *   title: string
 *   assigned?: string
 * }
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    if (!body.title?.trim()) {
      return NextResponse.json(
        { error: 'Subtask title is required' },
        { status: 400 }
      );
    }
    
    const subtask = await addSubtask(id, body.title.trim(), body.assigned);
    
    if (!subtask) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(subtask);
  } catch (error) {
    console.error('Error adding subtask:', error);
    return NextResponse.json(
      { error: 'Failed to add subtask' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/tasks/[id]/subtask
 * 
 * Toggle a subtask's completion status
 * 
 * Body:
 * {
 *   subtaskId: string
 * }
 */
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    if (!body.subtaskId) {
      return NextResponse.json(
        { error: 'subtaskId is required' },
        { status: 400 }
      );
    }
    
    const subtask = await toggleSubtask(id, body.subtaskId);
    
    if (!subtask) {
      return NextResponse.json(
        { error: 'Task or subtask not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(subtask);
  } catch (error) {
    console.error('Error toggling subtask:', error);
    return NextResponse.json(
      { error: 'Failed to toggle subtask' },
      { status: 500 }
    );
  }
}
