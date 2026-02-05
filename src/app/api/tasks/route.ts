import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const TASKS_DIR = path.join(process.cwd(), '..', 'squad', 'tasks');

interface Task {
  id: string;
  title: string;
  assigned?: string;
  priority?: string;
  description?: string;
  deliverable?: string;
  completedBy?: string;
  date?: string;
  summary?: string;
}

function parseTasks(content: string): Task[] {
  const tasks: Task[] = [];
  const taskBlocks = content.split(/^###\s+/m).filter(block => block.trim());
  
  for (const block of taskBlocks) {
    const lines = block.split('\n');
    const titleLine = lines[0];
    
    // Parse [ID] Title format
    const titleMatch = titleLine.match(/^\[([^\]]+)\]\s*(.+)/);
    if (!titleMatch) continue;
    
    const task: Task = {
      id: titleMatch[1],
      title: titleMatch[2].trim(),
    };
    
    // Parse metadata
    for (const line of lines.slice(1)) {
      const assignedMatch = line.match(/^\*\*Assigned:\*\*\s*(.+)/);
      if (assignedMatch) task.assigned = assignedMatch[1].trim();
      
      const priorityMatch = line.match(/^\*\*Priority:\*\*\s*(.+)/);
      if (priorityMatch) task.priority = priorityMatch[1].trim();
      
      const descMatch = line.match(/^\*\*Description:\*\*\s*(.+)/);
      if (descMatch) task.description = descMatch[1].trim();
      
      const deliverableMatch = line.match(/^\*\*Deliverable:\*\*\s*(.+)/);
      if (deliverableMatch) task.deliverable = deliverableMatch[1].trim();
      
      const completedByMatch = line.match(/^\*\*Completed by:\*\*\s*(.+)/);
      if (completedByMatch) task.completedBy = completedByMatch[1].trim();
      
      const dateMatch = line.match(/^\*\*Date:\*\*\s*(.+)/);
      if (dateMatch) task.date = dateMatch[1].trim();
      
      const summaryMatch = line.match(/^\*\*Summary:\*\*\s*(.+)/);
      if (summaryMatch) task.summary = summaryMatch[1].trim();
    }
    
    tasks.push(task);
  }
  
  return tasks;
}

export async function GET() {
  try {
    const [backlogContent, inProgressContent, completedContent] = await Promise.all([
      fs.readFile(path.join(TASKS_DIR, 'backlog.md'), 'utf-8').catch(() => ''),
      fs.readFile(path.join(TASKS_DIR, 'in-progress.md'), 'utf-8').catch(() => ''),
      fs.readFile(path.join(TASKS_DIR, 'completed.md'), 'utf-8').catch(() => ''),
    ]);

    return NextResponse.json({
      backlog: parseTasks(backlogContent),
      inProgress: parseTasks(inProgressContent),
      completed: parseTasks(completedContent),
    });
  } catch (error) {
    console.error('Error reading tasks:', error);
    return NextResponse.json({ error: 'Failed to read tasks' }, { status: 500 });
  }
}
