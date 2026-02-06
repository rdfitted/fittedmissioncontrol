import { NextRequest, NextResponse } from 'next/server';
import { getAllContent, ContentType, ContentStatus } from '@/lib/content';

/**
 * GET /api/content
 * 
 * List all content items with optional filters
 * 
 * Query params:
 *   type: 'blog' | 'social' | 'research' | 'outreach' (optional)
 *   status: 'draft' | 'review' | 'approved' | 'published' (optional)
 *   author: string (optional, partial match)
 *   limit: number (optional, default 50)
 *   offset: number (optional, default 0)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const type = searchParams.get('type') as ContentType | null;
    const status = searchParams.get('status') as ContentStatus | null;
    const author = searchParams.get('author');
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    
    const result = await getAllContent({
      type: type || undefined,
      status: status || undefined,
      author: author || undefined,
      limit,
      offset,
    });
    
    // Transform to match frontend expectations
    const content = result.items.map(item => ({
      id: item.id,
      title: item.title,
      type: mapTypeToUI(item.type),
      author: item.author || getDefaultAuthor(item.type),
      date: item.date || new Date(item.modifiedAt).toISOString(),
      status: item.status,
      preview: item.preview,
      filePath: item.filepath,
    }));
    
    return NextResponse.json({
      content,
      total: result.total,
      types: result.types,
    });
  } catch (error) {
    console.error('Error fetching content:', error);
    return NextResponse.json(
      { error: 'Failed to fetch content', content: [] },
      { status: 500 }
    );
  }
}

// Map internal content types to UI-friendly types
function mapTypeToUI(type: ContentType): 'blog' | 'social' | 'research' | 'outreach' {
  const mapping: Record<ContentType, 'blog' | 'social' | 'research' | 'outreach'> = {
    blog: 'blog',
    research: 'research',
    social: 'social',
    content: 'social', // Treat generic content as social for now
    outreach: 'outreach',
  };
  return mapping[type] || 'blog';
}

// Default authors by content type
function getDefaultAuthor(type: ContentType): string {
  const authors: Record<ContentType, string> = {
    blog: 'Slate',
    research: 'Recon',
    social: 'Pulse',
    content: 'Iris',
    outreach: 'Reach',
  };
  return authors[type] || 'Unknown';
}
