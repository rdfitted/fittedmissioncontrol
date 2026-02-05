import { NextRequest, NextResponse } from 'next/server';
import { getTaskById, addChatMessage } from '@/lib/tasks';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/tasks/[id]/chat
 * 
 * Get the chat thread for a task
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
    
    return NextResponse.json({
      taskId: id,
      taskTitle: task.title,
      messages: task.chat,
      count: task.chat.length,
    });
  } catch (error) {
    console.error('Error fetching chat:', error);
    return NextResponse.json(
      { error: 'Failed to fetch chat' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/tasks/[id]/chat
 * 
 * Add a message to the task chat thread
 * 
 * Body:
 * {
 *   author: string (required) - Agent name or "Ryan"
 *   content: string (required) - Message content
 * }
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    // Validate required fields
    if (!body.author || typeof body.author !== 'string') {
      return NextResponse.json(
        { error: 'Author is required' },
        { status: 400 }
      );
    }
    
    if (!body.content || typeof body.content !== 'string') {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      );
    }
    
    const message = await addChatMessage(
      id,
      body.author.trim(),
      body.content.trim()
    );
    
    if (!message) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(message, { status: 201 });
  } catch (error) {
    console.error('Error adding chat message:', error);
    return NextResponse.json(
      { error: 'Failed to add message' },
      { status: 500 }
    );
  }
}
