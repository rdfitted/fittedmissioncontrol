import { NextRequest, NextResponse } from 'next/server';
import { getAllTodos, addTodo } from '@/lib/tasks';

/**
 * GET /api/todos
 * 
 * Get Ryan's personal todo list
 */
export async function GET() {
  try {
    const todos = await getAllTodos();
    
    // Separate active and completed
    const active = todos.filter(t => !t.completed);
    const completed = todos.filter(t => t.completed);
    
    return NextResponse.json({
      todos,
      active,
      completed,
      counts: {
        total: todos.length,
        active: active.length,
        completed: completed.length,
      },
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('Error fetching todos:', error);
    return NextResponse.json(
      { error: 'Failed to fetch todos' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/todos
 * 
 * Add a new todo item
 * 
 * Body:
 * {
 *   text: string (required)
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    if (!body.text || typeof body.text !== 'string') {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      );
    }
    
    const todo = await addTodo(body.text.trim());
    
    return NextResponse.json(todo, { status: 201 });
  } catch (error) {
    console.error('Error adding todo:', error);
    return NextResponse.json(
      { error: 'Failed to add todo' },
      { status: 500 }
    );
  }
}
