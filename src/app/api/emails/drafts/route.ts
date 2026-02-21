import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

/**
 * GET /api/emails/drafts
 * 
 * Read all email drafts from data/email-drafts/ folders
 * Returns pending, sent, and rejected drafts
 */
export async function GET(request: NextRequest) {
  try {
    // Path relative to mission-control root
    const basePath = path.join(process.cwd(), '..', 'data', 'email-drafts');
    
    const pending = await readDraftsFromFolder(path.join(basePath, 'pending'));
    const sent = await readDraftsFromFolder(path.join(basePath, 'sent'));
    const rejected = await readDraftsFromFolder(path.join(basePath, 'rejected'));
    
    return NextResponse.json({
      pending,
      sent,
      rejected,
      total: pending.length + sent.length + rejected.length,
    });
  } catch (error) {
    console.error('Error fetching email drafts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch drafts', pending: [], sent: [], rejected: [] },
      { status: 500 }
    );
  }
}

async function readDraftsFromFolder(folderPath: string) {
  try {
    await fs.access(folderPath);
  } catch {
    // Folder doesn't exist, return empty array
    return [];
  }

  try {
    const files = await fs.readdir(folderPath);
    const jsonFiles = files.filter(f => f.endsWith('.json'));
    
    const drafts = await Promise.all(
      jsonFiles.map(async (file) => {
        const filePath = path.join(folderPath, file);
        const content = await fs.readFile(filePath, 'utf-8');
        return JSON.parse(content);
      })
    );
    
    // Sort by createdAt descending
    return drafts.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  } catch (error) {
    console.error(`Error reading drafts from ${folderPath}:`, error);
    return [];
  }
}
