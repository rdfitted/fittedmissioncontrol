import { NextResponse } from 'next/server';
import { listPlanningSessions } from '@/lib/planning';

/**
 * GET /api/planning
 * 
 * List all planning sessions (excluding TEMPLATE.md)
 * Returns sessions sorted by date, newest first
 */
export async function GET() {
  try {
    const sessions = await listPlanningSessions();
    
    return NextResponse.json({
      sessions,
      total: sessions.length,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('Error fetching planning sessions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch planning sessions' },
      { status: 500 }
    );
  }
}
