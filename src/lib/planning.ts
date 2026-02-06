import * as fs from 'fs';
import * as path from 'path';

// Planning sessions are stored in squad/planning/YYYY-MM-DD.md
const PLANNING_DIR = path.join(process.cwd(), '..', 'squad', 'planning');

export interface PlanningSession {
  date: string;        // YYYY-MM-DD
  filename: string;    // full filename
  title?: string;      // extracted from first H1 if present
}

export interface PlanningSessionDetail extends PlanningSession {
  content: string;     // full markdown content
}

/**
 * List all planning sessions (excluding TEMPLATE.md)
 * Sorted by date, newest first
 */
export async function listPlanningSessions(): Promise<PlanningSession[]> {
  try {
    const files = await fs.promises.readdir(PLANNING_DIR);
    
    const sessions: PlanningSession[] = [];
    
    for (const file of files) {
      // Skip template and non-md files
      if (file === 'TEMPLATE.md' || !file.endsWith('.md')) continue;
      
      // Extract date from filename (YYYY-MM-DD.md)
      const dateMatch = file.match(/^(\d{4}-\d{2}-\d{2})\.md$/);
      if (!dateMatch) continue;
      
      const date = dateMatch[1];
      
      // Try to extract title from first line
      let title: string | undefined;
      try {
        const content = await fs.promises.readFile(
          path.join(PLANNING_DIR, file),
          'utf-8'
        );
        const firstLine = content.split('\n')[0];
        const titleMatch = firstLine.match(/^#\s+(.+)$/);
        if (titleMatch) {
          title = titleMatch[1].trim();
        }
      } catch {
        // Ignore read errors for title extraction
      }
      
      sessions.push({
        date,
        filename: file,
        title,
      });
    }
    
    // Sort by date, newest first
    sessions.sort((a, b) => b.date.localeCompare(a.date));
    
    return sessions;
  } catch (error) {
    console.error('Error listing planning sessions:', error);
    return [];
  }
}

/**
 * Get a specific planning session by date
 */
export async function getPlanningSession(date: string): Promise<PlanningSessionDetail | null> {
  try {
    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return null;
    }
    
    const filename = `${date}.md`;
    const filepath = path.join(PLANNING_DIR, filename);
    
    // Check file exists
    try {
      await fs.promises.access(filepath);
    } catch {
      return null;
    }
    
    const content = await fs.promises.readFile(filepath, 'utf-8');
    
    // Extract title from first H1
    let title: string | undefined;
    const firstLine = content.split('\n')[0];
    const titleMatch = firstLine.match(/^#\s+(.+)$/);
    if (titleMatch) {
      title = titleMatch[1].trim();
    }
    
    return {
      date,
      filename,
      title,
      content,
    };
  } catch (error) {
    console.error(`Error getting planning session ${date}:`, error);
    return null;
  }
}

/**
 * Get navigation info (prev/next dates) for a session
 */
export async function getSessionNavigation(currentDate: string): Promise<{
  prev: string | null;
  next: string | null;
}> {
  const sessions = await listPlanningSessions();
  const currentIndex = sessions.findIndex(s => s.date === currentDate);
  
  if (currentIndex === -1) {
    return { prev: null, next: null };
  }
  
  // Sessions are sorted newest first, so:
  // - prev = older = higher index
  // - next = newer = lower index
  return {
    prev: currentIndex < sessions.length - 1 ? sessions[currentIndex + 1].date : null,
    next: currentIndex > 0 ? sessions[currentIndex - 1].date : null,
  };
}
