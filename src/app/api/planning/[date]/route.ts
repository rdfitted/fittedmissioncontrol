import { NextRequest, NextResponse } from 'next/server';
import { getPlanningSession, getSessionNavigation } from '@/lib/planning';

/**
 * GET /api/planning/[date]
 * 
 * Fetch a specific planning session by date
 * 
 * Returns:
 *   - session: { date, filename, title, content }
 *   - navigation: { prev, next } - dates for adjacent sessions
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ date: string }> }
) {
  try {
    const { date } = await params;
    
    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { error: 'Invalid date format. Expected YYYY-MM-DD' },
        { status: 400 }
      );
    }
    
    const session = await getPlanningSession(date);
    
    if (!session) {
      return NextResponse.json(
        { error: `Planning session not found for ${date}` },
        { status: 404 }
      );
    }
    
    // Get navigation info
    const navigation = await getSessionNavigation(date);
    
    return NextResponse.json({
      session,
      navigation,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('Error fetching planning session:', error);
    return NextResponse.json(
      { error: 'Failed to fetch planning session' },
      { status: 500 }
    );
  }
}
