import { NextRequest, NextResponse } from 'next/server';
import { getContentFull, updateContentStatus, updateContentFile, ContentStatus } from '@/lib/content';

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/content/:id
 * 
 * Get a single content item with full content
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    
    const result = await getContentFull(id);
    
    if (!result) {
      return NextResponse.json(
        { error: 'Content not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      ...result.item,
      content: result.content,
    });
  } catch (error) {
    console.error('Error fetching content:', error);
    return NextResponse.json(
      { error: 'Failed to fetch content' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/content/:id
 * 
 * Update content file body
 * 
 * Body:
 * {
 *   content: string  // Full file content to save
 * }
 */
export async function PUT(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    
    if (typeof body.content !== 'string') {
      return NextResponse.json(
        { error: 'Content is required and must be a string' },
        { status: 400 }
      );
    }
    
    const updated = await updateContentFile(id, body.content);
    
    if (!updated) {
      return NextResponse.json(
        { error: 'Content not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ success: true, item: updated });
  } catch (error) {
    console.error('Error updating content file:', error);
    return NextResponse.json(
      { error: 'Failed to update content' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/content/:id
 * 
 * Update content status (draft, review, approved, published)
 * 
 * Body:
 * {
 *   status: 'draft' | 'review' | 'approved' | 'published'
 *   actor?: string  // Who is making the change
 * }
 */
export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    
    // Validate status
    const validStatuses: ContentStatus[] = ['draft', 'review', 'approved', 'published'];
    if (!body.status || !validStatuses.includes(body.status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }
    
    const actor = body.actor || 'system';
    const updated = await updateContentStatus(id, body.status, actor);
    
    if (!updated) {
      return NextResponse.json(
        { error: 'Content not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating content:', error);
    return NextResponse.json(
      { error: 'Failed to update content' },
      { status: 500 }
    );
  }
}
