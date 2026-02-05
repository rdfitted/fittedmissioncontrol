import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const SQUAD_DIR = path.join(process.cwd(), '..', 'squad');

interface ActivityItem {
  type: 'file_change' | 'task_update' | 'chat_message';
  description: string;
  timestamp: string;
  file: string;
}

async function getRecentFiles(dir: string, baseDir: string = ''): Promise<{ file: string; mtime: Date }[]> {
  const files: { file: string; mtime: Date }[] = [];
  
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = baseDir ? path.join(baseDir, entry.name) : entry.name;
      
      // Skip node_modules and .git
      if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'mission-control') {
        continue;
      }
      
      if (entry.isDirectory()) {
        const subFiles = await getRecentFiles(fullPath, relativePath);
        files.push(...subFiles);
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        const stats = await fs.stat(fullPath);
        files.push({ file: relativePath, mtime: stats.mtime });
      }
    }
  } catch {
    // Ignore errors for inaccessible directories
  }
  
  return files;
}

export async function GET() {
  try {
    const files = await getRecentFiles(SQUAD_DIR);
    
    // Sort by modification time, most recent first
    files.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
    
    // Take the 20 most recent
    const recentFiles = files.slice(0, 20);
    
    const activities: ActivityItem[] = recentFiles.map(({ file, mtime }) => {
      let type: ActivityItem['type'] = 'file_change';
      let description = `File updated: ${file}`;
      
      if (file.includes('tasks/')) {
        type = 'task_update';
        if (file.includes('backlog')) description = 'Backlog updated';
        else if (file.includes('in-progress')) description = 'In-progress tasks updated';
        else if (file.includes('completed')) description = 'Completed tasks updated';
      } else if (file === 'chat.md') {
        type = 'chat_message';
        description = 'New chat activity';
      }
      
      return {
        type,
        description,
        timestamp: mtime.toISOString(),
        file,
      };
    });
    
    return NextResponse.json({ activities });
  } catch (error) {
    console.error('Error reading activity:', error);
    return NextResponse.json({ activities: [] });
  }
}
