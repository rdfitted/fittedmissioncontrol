import { NextRequest, NextResponse } from 'next/server';
import { toggleTodo, deleteTodo } from '@/lib/tasks';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * PATCH /api/todos/[id]
 * 
 * Toggle todo completion status (zero-token operation)
 * 
 * This is designed as a simple toggle - no body required.
 * Just PATCH the endpoint and the todo flips between completed/uncompleted.
 */
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;
    const todo = await toggleTodo(id);
    
    if (!todo) {
      return NextResponse.json(
        { error: 'Todo not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(todo);
  } catch (error) {
    console.error('Error toggling todo:', error);
    return NextResponse.json(
      { error: 'Failed to toggle todo' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/todos/[id]
 * 
 * Delete a todo item permanently
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;
    const deleted = await deleteTodo(id);
    
    if (!deleted) {
      return NextResponse.json(
        { error: 'Todo not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      message: 'Todo deleted successfully',
      id,
    });
  } catch (error) {
    console.error('Error deleting todo:', error);
    return NextResponse.json(
      { error: 'Failed to delete todo' },
      { status: 500 }
    );
  }
}
